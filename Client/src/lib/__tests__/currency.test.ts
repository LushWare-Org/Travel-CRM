import { describe, expect, it } from 'vitest';
import { formatCurrency, getCurrencySymbol } from '../currency';

// VITE_CURRENCY_SYMBOL is unset in the test env, so these exercise the
// Intl.NumberFormat fallback path (default currency INR, locale en-IN).

describe('formatCurrency', () => {
  it('formats a positive number as currency', () => {
    expect(formatCurrency(1200)).toMatch(/1,200/);
  });

  it('formats zero for a non-numeric value', () => {
    expect(formatCurrency('not-a-number')).toMatch(/0/);
  });

  it('formats zero for null', () => {
    expect(formatCurrency(null)).toMatch(/0/);
  });

  it('formats zero for undefined', () => {
    expect(formatCurrency(undefined)).toMatch(/0/);
  });

  it('coerces a numeric string', () => {
    expect(formatCurrency('4500')).toMatch(/4,500/);
  });
});

describe('getCurrencySymbol', () => {
  it('returns a non-empty currency symbol', () => {
    expect(getCurrencySymbol().length).toBeGreaterThan(0);
  });
});
