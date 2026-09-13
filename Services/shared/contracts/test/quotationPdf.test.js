import { describe, it, expect } from 'vitest';
import { QuotationForPdf } from '../src/quotationPdf.js';

describe('QuotationForPdf', () => {
  it('tolerates extra Quotation fields not modeled by the schema', () => {
    const row = {
      currency: 'USD',
      mode: 'detailed',
      advisorName: 'Alex',
      advisorPhone: '555-0100',
      advisorEmail: 'alex@example.com',
      quotationNumber: 'Q-1001',
    };
    expect(() => QuotationForPdf.parse(row)).not.toThrow();
  });

  it('accepts itineraryDays as a stringified array', () => {
    const row = { itineraryDays: JSON.stringify([{ day: 1, title: 'Arrival', locations: [], meals: [] }]) };
    expect(() => QuotationForPdf.parse(row)).not.toThrow();
  });

  it('accepts itineraryDays as null', () => {
    expect(() => QuotationForPdf.parse({ itineraryDays: null })).not.toThrow();
  });

  it('coerces a Decimal-as-string item totalPrice', () => {
    const row = { items: [{ category: 'accommodation', totalPrice: '450.00' }] };
    expect(QuotationForPdf.parse(row).items[0].totalPrice).toBe(450);
  });

  it('rejects an itineraryDays entry missing locations', () => {
    const row = { itineraryDays: [{ day: 1, title: 'Arrival', meals: [] }] };
    expect(() => QuotationForPdf.parse(row)).toThrow();
  });
});
