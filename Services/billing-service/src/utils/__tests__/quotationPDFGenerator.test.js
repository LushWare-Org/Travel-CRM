import { describe, it, expect } from 'vitest';
import { generateQuotationPDF } from '../quotationPDFGenerator.js';

const baseQuotation = {
  id: 'q-1',
  quotationNumber: 'QT-202608-0001',
  currency: 'USD',
  customerName: 'Alice Traveller',
  customerEmail: 'alice@test.com',
  customerPhone: '+15551234567',
  mode: 'summary',
  status: 'draft',
  issueDate: new Date('2026-08-01'),
  validUntil: new Date('2026-09-01'),
  subtotal: 1600,
  discountType: 'percentage',
  discountValue: 10,
  discountAmount: 160,
  taxRate: 18,
  taxAmount: 259.2,
  serviceChargeRate: 5,
  serviceChargeAmount: 80,
  totalAmount: 1779.2,
  includedServices: ['Hotel stay', 'Airport transfers'],
  excludedServices: ['Airfare'],
  items: [
    { description: 'Package', category: 'package', quantity: 1, unitPrice: 800, totalPrice: 800 },
    { description: 'Flights', category: 'transportation', quantity: 4, unitPrice: 200, totalPrice: 800 },
  ],
};

describe('generateQuotationPDF', () => {
  it('returns a PDF Buffer with a valid %PDF header', async () => {
    const buffer = await generateQuotationPDF(baseQuotation);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a detailed-mode quotation without throwing', async () => {
    const buffer = await generateQuotationPDF({ ...baseQuotation, mode: 'detailed' });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders when optional content (items, inclusions) is empty', async () => {
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      items: [],
      includedServices: [],
      excludedServices: [],
      notes: null,
      terms: null,
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
