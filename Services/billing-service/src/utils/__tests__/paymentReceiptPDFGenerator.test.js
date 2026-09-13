import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import zlib from 'node:zlib';
import { generatePaymentReceiptPDF } from '../paymentReceiptPDFGenerator.js';

/**
 * See invoicePDFGenerator.test.js for why this is necessary: pdfkit
 * deflate-compresses every content stream and draws text via hex `TJ`
 * arrays rather than literal strings. Inflates + decodes so tests can
 * substring-search what was actually drawn.
 */
function extractPdfText(buffer) {
  const raw = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  const contentChunks = [];
  let match;
  while ((match = streamRegex.exec(raw))) {
    try {
      contentChunks.push(zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1'));
    } catch {
      // Not a FlateDecode stream (e.g. an embedded image) — skip it.
    }
  }
  const content = contentChunks.join('\n');

  const hexTokenRegex = /<([0-9a-fA-F]+)>/g;
  let text = '';
  let hexMatch;
  while ((hexMatch = hexTokenRegex.exec(content))) {
    const hex = hexMatch[1];
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
  }
  return text;
}

const COMPLETE_SETTINGS = vi.hoisted(() => ({
  companyName: 'Lush Travel',
  companyLegalName: 'Lush Travel Solutions Pvt Ltd',
  companyAddress: '221B Baker Street, London',
  companyGstNumber: '07BGTPT9665E1ZH',
  contactPhone: '+44 20 0000 0000',
  contactEmail: 'hi@lush.test',
  bankName: 'Test Bank',
  bankAccountName: 'LUSH TRAVEL',
  bankAccountNumber: '12345',
  themeInk: '#1F2937',
  themeMuted: '#64748B',
  themeAccent: '#F5A623',
  themeAccentDark: '#D98A0B',
}));

vi.mock('../../config/orgSettings.js', async () => {
  const actual = await vi.importActual('../../config/orgSettings.js');
  return { ...actual, getOrgSettings: vi.fn().mockResolvedValue(COMPLETE_SETTINGS) };
});

import { getOrgSettings } from '../../config/orgSettings.js';

const baseReceipt = {
  receiptNumber: 'REC-202606-00092',
  currency: 'INR',
  paymentDate: new Date('2026-06-19'),
  paymentMethod: 'upi',
  transactionId: null,
  customerName: 'harsh',
  customerEmail: 'harsh@tripskyway.com',
  customerPhone: '+919128446597',
  amount: 10000,
  previousBalance: 143000,
  outstandingBalance: 133000,
  invoice: {
    invoiceNumber: 'INV-202606-00062',
    totalAmount: 143000,
    bookingId: null,
  },
};

describe('generatePaymentReceiptPDF', () => {
  afterEach(() => {
    vi.clearAllMocks();
    getOrgSettings.mockResolvedValue(COMPLETE_SETTINGS);
  });

  it('returns a PDF Buffer with a valid %PDF header for the sample-shaped receipt', async () => {
    const buffer = await generatePaymentReceiptPDF(baseReceipt);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders receipt number, payment mode, customer and the linked invoice reference', async () => {
    const buffer = await generatePaymentReceiptPDF(baseReceipt);
    const text = extractPdfText(buffer);
    expect(text).toContain('PAYMENT RECEIPT');
    expect(text).toContain('REC-202606-00092');
    expect(text).toContain('UPI');
    expect(text).toContain('harsh');
    expect(text).toContain('harsh@tripskyway.com');
    expect(text).toContain('INV-202606-00062');
  });

  it('renders the account summary (total / paid / balance due)', async () => {
    const buffer = await generatePaymentReceiptPDF(baseReceipt);
    const text = extractPdfText(buffer);
    expect(text).toContain('Total Invoice Amount');
    expect(text).toContain('1,43,000.00');
    expect(text).toContain('Amount Paid');
    expect(text).toContain('10,000.00');
    expect(text).toContain('Balance Due');
    expect(text).toContain('1,33,000.00');
  });

  it('maps the underscore Prisma enum value to a readable payment-mode label', async () => {
    const buffer = await generatePaymentReceiptPDF({ ...baseReceipt, paymentMethod: 'bank_transfer' });
    expect(extractPdfText(buffer)).toContain('Bank Transfer');
  });

  it('does not render bank-transfer instructions or an itemized breakdown (receipt-only, unlike the invoice)', async () => {
    const buffer = await generatePaymentReceiptPDF(baseReceipt);
    const text = extractPdfText(buffer);
    expect(text).not.toContain('Payment Instructions');
    expect(text).not.toContain('IFSC');
  });

  it('renders "Payment received" when the receipt has no linked invoice', async () => {
    const buffer = await generatePaymentReceiptPDF({ ...baseReceipt, invoice: null });
    expect(extractPdfText(buffer)).toContain('Payment received');
  });

  describe('hasRequiredOrgFieldsForReceipt guard — blocks generation with a specific error', () => {
    it('throws a 422 AppError when companyAddress is missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, companyAddress: undefined });
      await expect(generatePaymentReceiptPDF(baseReceipt)).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('companyAddress'),
      });
    });

    it('throws a 422 AppError when both contact phone and email are missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, contactPhone: undefined, contactEmail: undefined });
      await expect(generatePaymentReceiptPDF(baseReceipt)).rejects.toMatchObject({ statusCode: 422 });
    });

    it('succeeds without bank details (a receipt does not require them, unlike an invoice)', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, bankName: undefined, bankAccountNumber: undefined });
      const buffer = await generatePaymentReceiptPDF(baseReceipt);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });
  });

  describe('logo rendering', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('embeds a fetched https logo without throwing', async () => {
      const pngBytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );
      fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength) });
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, logoUrl: 'https://cdn.test/logo.png' });
      const buffer = await generatePaymentReceiptPDF(baseReceipt);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('falls back to the company-name text when the logo fetch fails', async () => {
      fetch.mockRejectedValue(new Error('network down'));
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, logoUrl: 'https://cdn.test/missing.png' });
      const buffer = await generatePaymentReceiptPDF(baseReceipt);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(extractPdfText(buffer)).toContain('Lush Travel');
    });
  });

  it('renders the receipt-own stored customer snapshot, not a live invoice lookup beyond what is included', async () => {
    const buffer = await generatePaymentReceiptPDF({ ...baseReceipt, customerName: 'Snapshot Customer' });
    const text = extractPdfText(buffer);
    expect(text).toContain('Snapshot Customer');
  });
});
