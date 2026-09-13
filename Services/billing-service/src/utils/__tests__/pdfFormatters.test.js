import { describe, it, expect } from 'vitest';
import { formatMoney } from '../pdfFormatters.js';

describe('formatMoney', () => {
  it('groups INR amounts with Indian lakh grouping', () => {
    expect(formatMoney(143000, 'INR')).toBe('INR 1,43,000.00');
  });

  it('groups INR amounts in the crore range with Indian grouping', () => {
    expect(formatMoney(1234567, 'INR')).toBe('INR 12,34,567.00');
  });

  it('does not group a 3-digit or smaller INR integer part', () => {
    expect(formatMoney(500, 'INR')).toBe('INR 500.00');
  });

  it('leaves USD amounts on Western 3-digit grouping', () => {
    expect(formatMoney(143000, 'USD')).toBe('$143,000.00');
  });

  it('defaults to USD when no currency is given', () => {
    expect(formatMoney(1000)).toBe('$1,000.00');
  });
});
