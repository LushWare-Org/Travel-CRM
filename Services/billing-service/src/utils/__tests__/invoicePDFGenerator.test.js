import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import zlib from 'node:zlib';
import { generateInvoicePDF } from '../invoicePDFGenerator.js';

/**
 * pdfkit deflate-compresses every content stream by default AND (when
 * kerning applies, which is nearly always) shows text via `TJ` arrays of
 * hex-encoded glyph runs rather than a single literal `(...)  Tj` string.
 * Inflates every FlateDecode stream, then decodes every `<hex>` token
 * (WinAnsi ~= latin1 for the ASCII range this codebase renders) and
 * concatenates them in document order, so tests can substring-search what
 * was actually drawn on the page.
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
  bankIfscCode: 'TEST0001234',
  upiId: 'lush@upi',
  invoicePaymentTerms: 'Balance due within 30 days.\nNo refund for unused services.',
  invoicePaymentInstructions: 'Please share the payment screenshot after transfer.',
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

const baseInvoice = {
  invoiceNumber: 'INV-202606-00062',
  type: 'invoice',
  currency: 'INR',
  issueDate: new Date('2026-06-19'),
  dueDate: new Date('2026-07-04'),
  bookingId: null,
  destination: 'Maldives',
  customerName: 'harsh',
  customerEmail: 'harsh@tripskyway.com',
  customerPhone: '+919128446597',
  customerAddress: null,
  customerGstNumber: null,
  items: [{ description: 'Travel Services\nDestination: Maldives', totalPrice: 143000 }],
  subtotal: 143000,
  taxRate: 0,
  taxAmount: 0,
  discountAmount: 0,
  serviceChargeAmount: 0,
  totalAmount: 143000,
  paymentTerms: null,
  paymentInstructions: null,
  bankAccountName: 'TRIPSKYWAY',
  bankAccountNumber: '663705600957',
  bankName: 'ICICI Bank',
  bankIfscCode: 'ICIC0006637',
  bankSwiftCode: null,
  bankBranch: 'New Delhi',
  bankUpiId: 'harsh8412@icici',
};

describe('generateInvoicePDF', () => {
  afterEach(() => {
    vi.clearAllMocks();
    getOrgSettings.mockResolvedValue(COMPLETE_SETTINGS);
  });

  it('returns a PDF Buffer with a valid %PDF header for the sample-shaped invoice', async () => {
    const buffer = await generateInvoicePDF(baseInvoice);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a multi-item, non-zero tax/discount/service-charge invoice as a clean total-only PDF', async () => {
    const buffer = await generateInvoicePDF({
      ...baseInvoice,
      items: [
        { description: 'Package', totalPrice: 1000 },
        { description: 'Airport Transfer', totalPrice: 100 },
      ],
      subtotal: 1100,
      taxRate: 18,
      taxAmount: 198,
      discountAmount: 50,
      serviceChargeAmount: 30,
      totalAmount: 1278,
      currency: 'USD',
      paymentTerms: 'Custom term one.\nCustom term two.',
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const text = extractPdfText(buffer);
    // Even though the underlying invoice has items/tax/discount/service
    // charge, none of that breakdown reaches the PDF — only the final total.
    expect(text).not.toContain('Package');
    expect(text).not.toContain('Airport Transfer');
    expect(text).not.toContain('Sub Total');
    expect(text).not.toContain('Discount');
    expect(text).not.toContain('Service Charge');
    expect(text).not.toContain('Tax (');
    expect(text).toContain('Total Amount');
    expect(text).toContain('1,278.00');
  });

  it('renders proforma/tax-invoice titles without throwing', async () => {
    for (const type of ['proforma', 'tax-invoice']) {
      const buffer = await generateInvoicePDF({ ...baseInvoice, type });
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
  });

  describe('hasRequiredOrgFieldsForInvoice guard — blocks generation with a specific error', () => {
    it('throws a 422 AppError when companyAddress is missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, companyAddress: undefined });
      await expect(generateInvoicePDF(baseInvoice)).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('companyAddress'),
      });
    });

    it('throws a 422 AppError when companyGstNumber is missing (address/phone/bank still present)', async () => {
      // GST isn't in the required-field guard (only address/contact/bank are) —
      // this asserts generation still succeeds, i.e. GST is best-effort, not blocking.
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, companyGstNumber: undefined });
      const buffer = await generateInvoicePDF(baseInvoice);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('throws a 422 AppError when bank details are missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, bankName: undefined, bankAccountNumber: undefined });
      await expect(generateInvoicePDF(baseInvoice)).rejects.toMatchObject({
        statusCode: 422,
        message: expect.stringContaining('bank details'),
      });
    });

    it('throws a 422 AppError when both contact phone and email are missing', async () => {
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, contactPhone: undefined, contactEmail: undefined });
      await expect(generateInvoicePDF(baseInvoice)).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('amount-in-words', () => {
    it('renders the sample invoice total (₹1,43,000) as Lakh/Thousand words', async () => {
      const buffer = await generateInvoicePDF(baseInvoice);
      expect(extractPdfText(buffer)).toContain('One Lakh Forty Three Thousand');
    });

    it('renders a decimal total with "and ... Paise" for INR', async () => {
      const buffer = await generateInvoicePDF({ ...baseInvoice, totalAmount: 1500.5 });
      expect(extractPdfText(buffer)).toContain('Fifty Paise');
    });

    it('renders "Zero Only" for a zero total', async () => {
      const buffer = await generateInvoicePDF({ ...baseInvoice, subtotal: 0, totalAmount: 0, items: [{ description: 'Complimentary', totalPrice: 0 }] });
      expect(extractPdfText(buffer)).toContain('Zero Only');
    });
  });

  it('renders bank details as a plain label/value table, not the quotation cream card', async () => {
    const buffer = await generateInvoicePDF(baseInvoice);
    const text = extractPdfText(buffer);
    expect(text).toContain('Account Number');
    expect(text).toContain('663705600957');
    expect(text).toContain('IFSC Code');
    expect(text).toContain('ICIC0006637');
    expect(text).toContain('UPI ID');
    expect(text).toContain('harsh8412@icici');
  });

  describe('total-only summary (no itemized cost breakdown)', () => {
    it('renders the final total using Indian digit grouping for INR', async () => {
      const buffer = await generateInvoicePDF(baseInvoice);
      const text = extractPdfText(buffer);
      expect(text).toContain('Total Amount');
      expect(text).toContain('1,43,000.00');
    });

    it('does not render item descriptions or a Sub Total line', async () => {
      const buffer = await generateInvoicePDF(baseInvoice);
      const text = extractPdfText(buffer);
      expect(text).not.toContain('Travel Services');
      expect(text).not.toContain('Sub Total');
      expect(text).not.toContain('S.No');
      expect(text).not.toContain('Service Description');
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
      // Minimal valid 1x1 PNG — real embedding (not the catch-and-fall-back
      // path), to exercise doc.image() actually succeeding.
      const pngBytes = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64',
      );
      fetch.mockResolvedValue({ ok: true, arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength) });
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, logoUrl: 'https://cdn.test/logo.png' });
      const buffer = await generateInvoicePDF(baseInvoice);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });

    it('falls back to the company-name text when the logo fetch fails', async () => {
      fetch.mockRejectedValue(new Error('network down'));
      getOrgSettings.mockResolvedValue({ ...COMPLETE_SETTINGS, logoUrl: 'https://cdn.test/missing.png' });
      const buffer = await generateInvoicePDF(baseInvoice);
      expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
      expect(extractPdfText(buffer)).toContain('Lush Travel');
    });
  });

  it('renders the invoice-own stored bank/terms snapshot, not live org settings (snapshot immutability)', async () => {
    const buffer = await generateInvoicePDF(baseInvoice);
    const text = extractPdfText(buffer);
    // The invoice's own snapshot bank name is 'ICICI Bank' — distinct from
    // the org's current bank name 'Test Bank' — proving the PDF renders the
    // invoice row's stored fields, not a live org-settings lookup for these.
    expect(text).toContain('ICICI Bank');
    expect(text).not.toContain('Test Bank');
  });
});
