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
  default: { paymentReceipt: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('../../utils/paymentReceiptPDFGenerator.js', () => ({ generatePaymentReceiptPDF: mockGeneratePDF }));
vi.mock('../../utils/emailService.js', () => ({ sendReceiptEmail: mockSendEmail }));
vi.mock('../../utils/whatsappService.js', () => ({ sendReceiptWhatsapp: mockSendWhatsapp }));
vi.mock('../../utils/cloudinary.js', () => ({ uploadPdfBuffer: mockUpload }));
vi.mock('../../services/events.client.js', () => ({ emitLeadEvent: vi.fn(), logLeadCommunication: mockLogLeadCommunication }));

import { resendPaymentReceiptForVoice } from '../paymentReceipt.controller.js';

const sentReceipt = (over = {}) => ({
  id: 'rec-1', leadId: 'lead-1', receiptNumber: 'RCPT-202608-00001',
  customerEmail: 'alice@test.com', customerPhone: '+15551234567',
  sentAt: new Date('2026-08-01T00:00:00.000Z'),
  ...over,
});

function mockRes() { return { json: vi.fn(), status: vi.fn().mockReturnThis() }; }

async function run(req) {
  const res = mockRes();
  req.log = req.log || { error: vi.fn() };
  req.params = req.params || { id: 'rec-1' };
  let nextErr;
  await resendPaymentReceiptForVoice(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(sentReceipt());
  mockUpdate.mockImplementation(async ({ data }) => ({ ...sentReceipt(), ...data }));
  mockGeneratePDF.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  mockSendEmail.mockResolvedValue({ success: true });
  mockSendWhatsapp.mockResolvedValue({ success: true });
  mockUpload.mockResolvedValue('https://cdn.test/receipt.pdf');
  mockLogLeadCommunication.mockResolvedValue({});
});

describe('resendPaymentReceiptForVoice', () => {
  it('refuses to resend a receipt that has never been sent', async () => {
    mockFindUnique.mockResolvedValue(sentReceipt({ sentAt: null }));
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(409);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('returns 404 for a receipt that does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(404);
  });

  it('sends to both email and WhatsApp when the customer has both on file', async () => {
    const { res } = await run({});
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'sent', whatsapp: 'sent' });
  });

  it('sends only to WhatsApp when no email is on file', async () => {
    mockFindUnique.mockResolvedValue(sentReceipt({ customerEmail: null }));
    const { res } = await run({});
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].data).toEqual({ email: null, whatsapp: 'sent' });
  });

  it('does not throw when every channel fails', async () => {
    mockSendEmail.mockRejectedValue(new Error('smtp down'));
    mockSendWhatsapp.mockRejectedValue(new Error('whatsapp down'));
    const { nextErr } = await run({});
    expect(nextErr).toBeUndefined();
  });

  it('logs the resend on the lead timeline when at least one channel succeeds', async () => {
    await run({});
    expect(mockLogLeadCommunication).toHaveBeenCalledWith(expect.objectContaining({ leadId: 'lead-1', type: 'message' }));
  });
});
