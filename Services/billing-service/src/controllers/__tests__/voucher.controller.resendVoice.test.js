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
  default: { voucher: { findUnique: mockFindUnique, update: mockUpdate } },
}));
vi.mock('../../utils/voucherPDFGenerator.js', () => ({ generateVoucherPDF: mockGeneratePDF }));
vi.mock('../../utils/emailService.js', () => ({ sendVoucherEmail: mockSendEmail }));
vi.mock('../../utils/whatsappService.js', () => ({ sendVoucherWhatsapp: mockSendWhatsapp }));
vi.mock('../../utils/cloudinary.js', () => ({ uploadPdfBuffer: mockUpload }));
vi.mock('../../services/events.client.js', () => ({ logLeadCommunication: mockLogLeadCommunication }));

import { resendVoucherForVoice } from '../voucher.controller.js';

// Voucher has no single sentAt column — the gate checks the per-channel
// emailSent/whatsappSent flags instead (see the controller comment).
const sentVoucher = (over = {}) => ({
  id: 'vch-1', leadId: 'lead-1', voucherNumber: 'VCH-202608-00001',
  customerEmail: 'alice@test.com', customerPhone: '+15551234567',
  emailSent: true, whatsappSent: false,
  ...over,
});

function mockRes() { return { json: vi.fn(), status: vi.fn().mockReturnThis() }; }

async function run(req) {
  const res = mockRes();
  req.log = req.log || { error: vi.fn() };
  req.params = req.params || { id: 'vch-1' };
  let nextErr;
  await resendVoucherForVoice(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindUnique.mockResolvedValue(sentVoucher());
  mockUpdate.mockImplementation(async ({ data }) => ({ ...sentVoucher(), ...data }));
  mockGeneratePDF.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  mockSendEmail.mockResolvedValue({ success: true });
  mockSendWhatsapp.mockResolvedValue({ success: true });
  mockUpload.mockResolvedValue('https://cdn.test/voucher.pdf');
  mockLogLeadCommunication.mockResolvedValue({});
});

describe('resendVoucherForVoice', () => {
  it('refuses to resend a voucher that has never been sent on any channel', async () => {
    mockFindUnique.mockResolvedValue(sentVoucher({ emailSent: false, whatsappSent: false }));
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(409);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it('allows a resend when only whatsappSent is true (emailSent false)', async () => {
    mockFindUnique.mockResolvedValue(sentVoucher({ emailSent: false, whatsappSent: true }));
    const { res } = await run({});
    expect(res.json.mock.calls[0][0].data.email).toBe('sent');
  });

  it('returns 404 for a voucher that does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const { nextErr } = await run({});
    expect(nextErr.statusCode).toBe(404);
  });

  it('sends to both email and WhatsApp when the customer has both on file', async () => {
    const { res } = await run({});
    expect(res.json.mock.calls[0][0].data).toEqual({ email: 'sent', whatsapp: 'sent' });
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
