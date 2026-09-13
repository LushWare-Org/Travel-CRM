import { describe, it, expect } from 'vitest';
import { QuotationSummary } from '../src/quotationSummary.js';

function quotationRow(overrides = {}) {
  return {
    id: 'quote-1',
    quotationNumber: 'QT-0001',
    status: 'draft',
    leadId: 'lead-1',
    ...overrides,
  };
}

describe('QuotationSummary', () => {
  it('parses a quotation row with the four required fields', () => {
    expect(() => QuotationSummary.parse(quotationRow())).not.toThrow();
  });

  it('passes through extra fields not modeled by the contract', () => {
    const row = quotationRow({ items: [], images: [], customerEmail: 'a@test.com' });
    const parsed = QuotationSummary.parse(row);
    expect(parsed.customerEmail).toBe('a@test.com');
  });

  it.each(['id', 'quotationNumber', 'status', 'leadId'])(
    'rejects a row missing %s',
    (field) => {
      const row = quotationRow();
      delete row[field];
      expect(() => QuotationSummary.parse(row)).toThrow();
    }
  );
});
