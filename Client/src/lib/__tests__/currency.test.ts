import { describe, expect, it } from 'vitest';
import { formatCurrency, getCurrencySymbol, getPriceRangeOptions } from '../currency';

// Defaults are USD/en-US (see lib/currency.ts) and a deployment overrides them
// through VITE_CURRENCY_*. The assertions below hold whether or not Vite loads
// Client/.env, which sets VITE_CURRENCY_SYMBOL=$: the symbol path and the
// Intl.NumberFormat fallback both render a dollar amount.

describe('formatCurrency', () => {
  it('formats a positive number as currency', () => {
    expect(formatCurrency(1200)).toMatch(/1,200/);
  });

  it('renders the dollar amount by default, never rupees', () => {
    expect(formatCurrency(1200)).toMatch(/^\$\s?1,200$/);
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
  it('returns the configured currency symbol', () => {
    expect(getCurrencySymbol()).toMatch(/\$/);
  });
});

describe('getPriceRangeOptions', () => {
  it('labels USD-scaled budget buckets in the configured currency', () => {
    const options = getPriceRangeOptions();

    expect(options).toHaveLength(5);
    expect(options[0].label).toBe('Below $ 1,000');
    expect(options[options.length - 1].label).toBe('Above $ 5,000');
    expect(options[options.length - 1].max).toBe(Infinity);
  });

  it('emits contiguous, strictly increasing bounds', () => {
    const options = getPriceRangeOptions();

    options.forEach((option, index) => {
      expect(option.max).toBeGreaterThan(option.min);
      if (index > 0) expect(option.min).toBe(options[index - 1].max);
    });
  });
});
