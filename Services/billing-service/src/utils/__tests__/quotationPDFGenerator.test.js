import { describe, it, expect, vi } from 'vitest';
import { generateQuotationPDF } from '../quotationPDFGenerator.js';

// Avoids a real network call to user-service during unit tests — exercises
// the same fallback shape getOrgSettings() returns when it can't be reached.
vi.mock('../../config/orgSettings.js', async () => {
  const actual = await vi.importActual('../../config/orgSettings.js');
  return {
    ...actual,
    getOrgSettings: vi.fn().mockResolvedValue({
      companyName: 'Travel CRM',
      themeInk: '#1F2937',
      themeMuted: '#64748B',
      themeAccent: '#F5A623',
      themeAccentDark: '#D98A0B',
      paymentMethods: ['Bank Transfer', 'UPI'],
      ratingTagline: 'Rated 4.9',
      quotationTerms: 'Default terms',
      cancellationPolicy: 'Default cancellation policy',
      bankName: 'Test Bank',
      bankAccountNumber: '12345',
    }),
  };
});

/** Count page objects in the PDF (`/Type /Page` but not the `/Pages` tree). */
const countPages = (buffer) => {
  const s = buffer.toString('latin1');
  return (s.match(/\/Type\s*\/Page(?![s])/g) || []).length;
};

const makeDays = (n) =>
  Array.from({ length: n }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1} Title`,
    locations: ['Location A', 'Location B'],
    meals: ['Breakfast', 'Dinner'],
  }));

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

  it('produces at least a cover page plus a content page', async () => {
    const buffer = await generateQuotationPDF(baseQuotation);
    expect(countPages(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('grows the page count as itinerary content grows', async () => {
    const few = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDays(1) });
    const many = await generateQuotationPDF({ ...baseQuotation, itineraryDays: makeDays(20) });
    expect(countPages(many)).toBeGreaterThan(countPages(few));
  });

  it('renders the cover from rich trip fields', async () => {
    const buffer = await generateQuotationPDF({
      ...baseQuotation,
      destination: 'Maldives',
      packageTitle: 'Coco Bodu Hithi Honeymoon Escape',
      travelStartDate: new Date('2026-05-10'),
      travelEndDate: new Date('2026-05-15'),
      paxCount: 2,
      durationNights: 5,
      durationDays: 6,
      highlights: ['Private-pool villas', 'Full-board meals', 'Speedboat transfers'],
      itineraryDays: makeDays(5),
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(countPages(buffer)).toBeGreaterThanOrEqual(2);
  });

  it('degrades gracefully when every optional trip field is absent', async () => {
    const buffer = await generateQuotationPDF({
      quotationNumber: 'QT-000',
      currency: 'USD',
      mode: 'summary',
      customerName: 'Minimal',
      subtotal: 100,
      totalAmount: 100,
      items: [],
    });
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(countPages(buffer)).toBeGreaterThanOrEqual(1);
  });

  it('rejects instead of silently rendering blanks when an itinerary day is malformed', async () => {
    // generateQuotationPDF is async (it awaits org settings before rendering),
    // so even its up-front validation surfaces as a rejected promise, not a
    // synchronous throw on the call itself.
    await expect(
      generateQuotationPDF({
        ...baseQuotation,
        // missing locations/meals — a real shape mismatch, not just an empty trip
        itineraryDays: [{ day: 1, title: 'Day 1' }],
      }),
    ).rejects.toThrow();
  });
});
