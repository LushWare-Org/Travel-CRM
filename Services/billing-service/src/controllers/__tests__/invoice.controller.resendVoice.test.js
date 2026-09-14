import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindUnique, mockUpdate, mockGeneratePDF, mockSendEmail, mockSendWhatsapp, mockUpload, mockLogLeadCommunication } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockGeneratePDF: vi.fn(),
  mockSendEmail: vi.fn(),
  mockSendWhatsapp: vi.fn(),
  mockUpload: vi.fn(),
  mockLogLeadCommunication: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: { invoice: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('../../utils/invoicePDFGenerator.js', () => ({ generateInvoicePDF: mockGeneratePDF }));
vi.mock('../../utils/emailService.js', () => ({ sendInvoiceEmail: mockSendEmail }));
vi.mock('../../utils/whatsappService.js', () => ({ sendInvoiceWhatsapp: mockSendWhatsapp }));
vi.mock('../../utils/cloudinary.js', () => ({ uploadPdfBuffer: mockUpload }));
vi.mock('../../services/events.client.js', () => ({ logLeadCommunication: mockLogLeadCommunication }));

import { resendInvoiceForVoice } from '../invoice.controller.js';

const sentInvoice = (over = {}) => ({
  id: 'inv-1', leadId: 'lead-1', invoiceNumber: 'INV-202608-00001',
  customerEmail: 'alice@test.com', customerPhone: '+15551234567',
  sentAt: new Date('2026-08-01T00:00:00.000Z'), currency: 'USD', totalAmount: 1200, items: [],
  ...over,
});

function mockRes() { return { json: vi.fn(), status: vi.fn().mockReturnThis() }; }

async function run(req) {
  const res = mockRes();
  req.log = req.log || { error: vi.fn() };
  req.params = req.params || { id: 'inv-1' };
  let nextErr;
  await resendInvoiceForVoice(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(sentInvoice());
  mockUpdate.mockImplementation(async ({ data }) => ({ ...sentInvoice(), ...data }));
  mockGeneratePDF.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  mockSendEmail.mockResolvedValue({ success: true });
  mockSendWhatsapp.mockResolvedValue({ success: true });
  mockUpload.mockResolvedValue('https://cdn.test/invoice.pdf');
  mockLogLeadCommunication.mockResolvedValue({});
});

describe('resendInvoiceForVoice', () => {
  it('refuses to resend an invoice that has never been sent', async () => {
    mockFindUnique.mockResolvedValue(sentInvoice({ sentAt: null }));
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(409);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 404 for an invoice that does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(404);
  });

  it('sends to both email and WhatsApp when the customer has both on file', async () => {
    const { res } = await run({});
    expect(mockSendEmail).toHaveBeenCalled();
    expect(mockSendWhatsapp).toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'sent', whatsapp: 'sent' });
  });

  it('sends only to email when no phone is on file', async () => {
    mockFindUnique.mockResolvedValue(sentInvoice({ customerPhone: null }));
    const { res } = await run({});
    expect(mockSendWhatsapp).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'sent', whatsapp: null });
  });

  it('reports one channel failed without failing the other', async () => {
    mockSendEmail.mockRejectedValue(new Error('smtp down'));
    const { res } = await run({});
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'failed', whatsapp: 'sent' });
  });

  it('does not throw when every channel fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('smtp down'));
    mockSendWhatsapp.mockRejectedValue(new Error('whatsapp down'));
    const { res, nextErr } = await run({});
    expect(nextErr).toBeUndefined();
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'failed', whatsapp: 'failed' });
  });

  it('logs the resend on the lead timeline when at least one channel succeeds', async () => {
    await run({});
    expect(mockLogLeadCommunication).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead-1', type: 'message' }));
  });

  it('never generates more than one PDF for a single resend', async () => {
    await run({});
    expect(mockGeneratePDF).toHaveBeenCalledTimes(1);
  });
});
