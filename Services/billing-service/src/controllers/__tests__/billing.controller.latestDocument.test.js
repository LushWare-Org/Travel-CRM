import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockQuotationFindFirst, mockInvoiceFindFirst, mockReceiptFindFirst, mockVoucherFindFirst,
} = vi.hoisted(() => ({
  mockQuotationFindFirst: vi.fn(),
  mockInvoiceFindFirst: vi.fn(),
  mockReceiptFindFirst: vi.fn(),
  mockVoucherFindFirst: vi.fn(),
}));

vi.mock('../../db/client.js', () => ({
  default: {
    quotation: { findFirst: mockQuotationFindFirst },
    invoice: { findFirst: mockInvoiceFindFirst },
    paymentReceipt: { findFirst: mockReceiptFindFirst },
    voucher: { findFirst: mockVoucherFindFirst },
  },
}));

import { getLatestSentDocumentForVoice } from '../billing.controller.js';

function mockRes() { return { json: vi.fn() }; }

async function run(leadId) {
  const res = mockRes();
  await getLatestSentDocumentForVoice({ params: { leadId } }, res, vi.fn());
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuotationFindFirst.mockResolvedValue(null);
  mockInvoiceFindFirst.mockResolvedValue(null);
  mockReceiptFindFirst.mockResolvedValue(null);
  mockVoucherFindFirst.mockResolvedValue(null);
});

describe('getLatestSentDocumentForVoice', () => {
  it('returns null when the lead has no sent document of any type', async () => {
    const res = await run('lead-1');
    expect(res.json.mock.calls[0][0].data).toEqual({ latest: null });
  });

  it('never includes a money field in the response', async () => {
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1', sentAt: new Date() });
    const res = await run('lead-1');
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/amount|total|price|balance/i);
  });

  it('returns the most recently sent document across all four types', async () => {
    mockQuotationFindFirst.mockResolvedValue({ id: 'q-1', quotationNumber: 'QT-1', sentAt: new Date('2026-08-01') });
    mockInvoiceFindFirst.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1', sentAt: new Date('2026-08-05') });
    const res = await run('lead-1');
    expect(res.json.mock.calls[0][0].data.latest).toMatchObject({ type: 'invoice', id: 'inv-1' });
  });

  it('picks the quotation when it is the only one sent', async () => {
    mockQuotationFindFirst.mockResolvedValue({ id: 'q-1', quotationNumber: 'QT-1', sentAt: new Date('2026-08-01') });
    const res = await run('lead-1');
    expect(res.json.mock.calls[0][0].data.latest).toMatchObject({ type: 'quotation', id: 'q-1' });
  });

  it('picks a voucher sent only via WhatsApp, with no sentAt column at all', async () => {
    mockVoucherFindFirst.mockResolvedValue({ id: 'vch-1', voucherNumber: 'VCH-1', updatedAt: new Date('2026-08-10') });
    const res = await run('lead-1');
    expect(res.json.mock.calls[0][0].data.latest).toMatchObject({ type: 'voucher', id: 'vch-1' });
  });

  it('prefers a more recent voucher over an older quotation', async () => {
    mockQuotationFindFirst.mockResolvedValue({ id: 'q-1', quotationNumber: 'QT-1', sentAt: new Date('2026-08-01') });
    mockVoucherFindFirst.mockResolvedValue({ id: 'vch-1', voucherNumber: 'VCH-1', updatedAt: new Date('2026-08-20') });
    const res = await run('lead-1');
    expect(res.json.mock.calls[0][0].data.latest.type).toBe('voucher');
  });

  it('scopes every lookup to the given leadId', async () => {
    await run('lead-42');
    expect(mockQuotationFindFirst.mock.calls[0][0].where.leadId).toBe('lead-42');
    expect(mockInvoiceFindFirst.mock.calls[0][0].where.leadId).toBe('lead-42');
    expect(mockReceiptFindFirst.mock.calls[0][0].where.leadId).toBe('lead-42');
    expect(mockVoucherFindFirst.mock.calls[0][0].where.leadId).toBe('lead-42');
  });

  it('only considers a voucher sent via email or WhatsApp, never a draft', async () => {
    await run('lead-1');
    expect(mockVoucherFindFirst.mock.calls[0][0].where.OR).toEqual([{ emailSent: true }, { whatsappSent: true }]);
  });

  it('only considers a quotation with sentAt set, never a draft', async () => {
    await run('lead-1');
    expect(mockQuotationFindFirst.mock.calls[0][0].where.sentAt).toEqual({ not: null });
  });
});
