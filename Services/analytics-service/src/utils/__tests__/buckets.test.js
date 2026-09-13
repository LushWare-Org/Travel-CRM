import { describe, it, expect } from 'vitest';
import { priceRangeLabel, parseBudgetToRange, durationRangeLabel } from '../buckets.js';

describe('priceRangeLabel', () => {
  it('returns "Under $2K" for amounts below 2000', () => {
    expect(priceRangeLabel(1500)).toBe('Under $2K');
  });

  it('returns "$20K+" for amounts at or above 20000', () => {
    expect(priceRangeLabel(25000)).toBe('$20K+');
  });

  it('returns the boundary range for an amount exactly on a boundary', () => {
    expect(priceRangeLabel(5000)).toBe('$5K–$10K');
  });
});

describe('parseBudgetToRange', () => {
  it('returns "Unknown" for a null budget', () => {
    expect(parseBudgetToRange(null)).toBe('Unknown');
  });

  it('returns "Unknown" for an empty string', () => {
    expect(parseBudgetToRange('')).toBe('Unknown');
  });

  it('returns "Unknown" for text with no digits', () => {
    expect(parseBudgetToRange('flexible')).toBe('Unknown');
  });

  it('extracts a plain numeric budget', () => {
    expect(parseBudgetToRange('7500')).toBe('$5K–$10K');
  });

  it('extracts the first number from a comma-formatted range string', () => {
    expect(parseBudgetToRange('$12,000 - $15,000')).toBe('$10K–$20K');
  });

  it('returns "Unknown" for a zero amount', () => {
    expect(parseBudgetToRange('0')).toBe('Unknown');
  });
});

describe('durationRangeLabel', () => {
  it('buckets a 2-day package as "1-3 days"', () => {
    expect(durationRangeLabel(2)).toBe('1-3 days');
  });

  it('buckets a 20-day package as "15+ days"', () => {
    expect(durationRangeLabel(20)).toBe('15+ days');
  });

  it('buckets a boundary value of 7 as "4-7 days"', () => {
    expect(durationRangeLabel(7)).toBe('4-7 days');
  });
});
