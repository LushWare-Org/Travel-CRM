import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindUnique, mockUpdate,
  mockGeneratePDF, mockSendEmail, mockSendWhatsapp, mockUpload,
  mockCreateOrVersion, mockLogLeadCommunication,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGeneratePDF: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendWhatsapp: vi.fn(),
  mockUpload: vi.fn(),
  mockCreateOrVersion: vi.fn(),
  mockLogLeadCommunication: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: { quotation: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('../../utils/quotationPDFGenerator.js', () => ({ generateQuotationPDF: mockGeneratePDF }));
vi.mock('../../utils/emailService.js', () => ({ sendQuotationEmail: mockSendEmail }));
vi.mock('../../utils/whatsappService.js', () => ({ sendQuotationWhatsapp: mockSendWhatsapp }));
vi.mock('../../utils/cloudinary.js', () => ({ uploadPdfBuffer: mockUpload }));
vi.mock('../../services/events.client.js', () => ({ emitLeadEvent: vi.fn(), logLeadCommunication: mockLogLeadCommunication }));
vi.mock('../../services/quotation.service.js', () => ({
  createOrVersionQuotation: mockCreateOrVersion,
  quotationTotals: vi.fn(),
}));

import { sendQuotation, createQuotationFromLead } from '../quotation.controller.js';

const quotation = {
  id: 'q-1',
  quotationNumber: 'QT-202608-0001',
  customerEmail: 'alice@test.com',
  customerPhone: '+15551234567',
  currency: 'USD',
  totalAmount: 1779.2,
  items: [],
};

function mockRes() {
  return { json: vi.fn(), setHeader: vi.fn(), send: vi.fn(), status: vi.fn().mockReturnThis() };
}

/** Invoke the asyncHandler-wrapped controller and surface any error it forwards to next. */
async function run(handler, req) {
  const res = mockRes();
  req.log = req.log || { error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  let nextErr;
  await handler(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue({ ...quotation });
  mockUpdate.mockImplementation(async ({ data }) => ({ ...quotation, ...data }));
  mockGeneratePDF.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  mockSendEmail.mockResolvedValue({ messageId: 'm-1' });
  mockSendWhatsapp.mockResolvedValue({ sid: 'SM1' });
  mockUpload.mockResolvedValue('https://cdn.example.com/quotations/q.pdf');
  mockLogLeadCommunication.mockResolvedValue({ matched: true });
});

describe('sendQuotation', () => {
  it('emails the quotation with the generated PDF and marks it sent', async () => {
    const { res, nextErr } = await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'email' } });

    expect(nextErr).toBeUndefined();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: 'alice@test.com',
      pdfBuffer: expect.any(Buffer),
    }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'sent', emailSent: true }),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('uses the body email override instead of the customer snapshot', async () => {
    await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'email', email: 'override@test.com' } });
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ recipientEmail: 'override@test.com' }));
  });

  it('uploads the PDF and sends over WhatsApp with the media URL', async () => {
    const { res } = await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'whatsapp' } });

    expect(mockUpload).toHaveBeenCalledWith(expect.any(Buffer), 'quotation-QT-202608-0001');
    expect(mockSendWhatsapp).toHaveBeenCalledWith(expect.objectContaining({
      phone: '+15551234567',
      mediaUrl: 'https://cdn.example.com/quotations/q.pdf',
    }));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'sent', whatsappSent: true, pdfUrl: 'https://cdn.example.com/quotations/q.pdf' }),
    }));
    expect(res.json).toHaveBeenCalled();
  });

  it('returns a 400 (not a crash) when the channel is not configured', async () => {
    mockSendEmail.mockRejectedValue(new Error('Email is not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)'));

    const { nextErr } = await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'email' } });

    expect(nextErr).toBeDefined();
    expect(nextErr.statusCode).toBe(400);
    expect(nextErr.message).toMatch(/not configured/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('404s when the quotation does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { nextErr } = await run(sendQuotation, { params: { id: 'missing' }, body: { channel: 'email' } });
    expect(nextErr.statusCode).toBe(404);
  });

  it('rejects an invalid channel via the Zod schema', async () => {
    const { nextErr } = await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'carrier-pigeon' } });
    expect(nextErr).toBeDefined();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('400s on a WhatsApp send when no phone is available anywhere', async () => {
    mockFindUnique.mockResolvedValue({ ...quotation, customerPhone: null });
    const { nextErr } = await run(sendQuotation, { params: { id: 'q-1' }, body: { channel: 'whatsapp' } });
    expect(nextErr.statusCode).toBe(400);
    expect(mockSendWhatsapp).not.toHaveBeenCalled();
  });
});

describe('createQuotationFromLead (internal handoff)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateOrVersion.mockResolvedValue({ id: 'quote-1', version: 1 });
  });

  /** A full LeadSnapshotForQuotation-shaped body, matching what lead-service actually sends. */
  function validSnapshotBody(overrides = {}) {
    return {
      leadId: 'lead-1',
      packageId: 'pkg-1',
      createdById: null,
      currency: 'USD',
      customer: { name: 'Alice', email: 'alice@test.com', phone: '+15551234567', address: 'Colombo' },
      items: [],
      discountType: 'none',
      discountValue: 0,
      serviceChargeRate: 0,
      notes: null,
      terms: null,
      paymentTerms: null,
      includedServices: [],
      excludedServices: [],
      destination: 'Sri Lanka',
      packageTitle: 'Island Escape',
      travelStartDate: null,
      travelEndDate: null,
      paxCount: 2,
      durationNights: 7,
      durationDays: 8,
      highlights: [],
      itineraryDays: [],
      coverImage: null,
      ...overrides,
    };
  }

  it('uses the body createdById when there is no request user (internal call)', async () => {
    const req = { body: validSnapshotBody({ createdById: 'user-9' }) };
    const { res, nextErr } = await run(createQuotationFromLead, req);

    expect(nextErr).toBeUndefined();
    expect(mockCreateOrVersion).toHaveBeenCalledWith(expect.objectContaining({ createdById: 'user-9', leadId: 'lead-1' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('prefers the request user id over the body when one is present', async () => {
    const req = { user: { id: 'req-user' }, body: validSnapshotBody({ createdById: 'user-9' }) };
    await run(createQuotationFromLead, req);
    expect(mockCreateOrVersion).toHaveBeenCalledWith(expect.objectContaining({ createdById: 'req-user' }));
  });

  it('400s when neither a request user nor a body createdById is supplied', async () => {
    const req = { body: validSnapshotBody({ createdById: null }) };
    const { nextErr } = await run(createQuotationFromLead, req);
    expect(nextErr.statusCode).toBe(400);
    expect(mockCreateOrVersion).not.toHaveBeenCalled();
  });

  it('400s when the body fails LeadSnapshotForQuotation validation instead of reaching createOrVersionQuotation', async () => {
    const req = { body: { currency: 'USD' } }; // missing leadId, customer, items, ...
    const { nextErr } = await run(createQuotationFromLead, req);
    expect(nextErr).toBeDefined();
    expect(nextErr.statusCode).toBe(400);
    expect(mockCreateOrVersion).not.toHaveBeenCalled();
  });

  it('400s when items is not an array', async () => {
    const req = { body: validSnapshotBody({ createdById: 'user-9', items: 'not-an-array' }) };
    const { nextErr } = await run(createQuotationFromLead, req);
    expect(nextErr).toBeDefined();
    expect(nextErr.statusCode).toBe(400);
    expect(mockCreateOrVersion).not.toHaveBeenCalled();
  });
});
