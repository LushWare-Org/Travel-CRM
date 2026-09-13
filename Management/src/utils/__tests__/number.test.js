import { describe, it, expect } from 'vitest';
import { formatNumber, formatRating, formatPercent } from '../number';

describe('formatNumber', () => {
  it('rounds to the requested precision', () => {
    expect(formatNumber(4.333333333333333, 1)).toBe('4.3');
    expect(formatNumber(1234.5678, 1)).toBe('1,234.6');
    expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
    expect(formatNumber(1234.5678, 0)).toBe('1,235');
  });

  it('pads to the requested precision rather than trimming it', () => {
    expect(formatNumber(7, 1)).toBe('7.0');
    expect(formatNumber('4.2', 1)).toBe('4.2');
  });

  it('rounds half away from zero, unlike toFixed', () => {
    // toFixed(2.5) would give '3' too, but toFixed(1.005, 2) gives '1.00' where
    // Intl gives '1.01'. Pinned so a future swap to toFixed is a visible change.
    expect(formatNumber(2.5, 0)).toBe('3');
    expect(formatNumber(1.005, 2)).toBe('1.01');
  });

  it('rounds negatives away from zero', () => {
    expect(formatNumber(-1.25, 1)).toBe('-1.3');
  });

  it('renders missing or unusable input as zero, never NaN', () => {
    for (const value of [null, undefined, NaN, 'abc', '', Infinity, -Infinity]) {
      expect(formatNumber(value, 1), String(value)).toBe('0.0');
    }
  });

  it('accepts a numeric string', () => {
    expect(formatNumber('  12.345  ', 2)).toBe('12.35');
  });

  it('keeps large numbers grouped', () => {
    expect(formatNumber(1234567, 0)).toBe((1234567).toLocaleString(undefined, { maximumFractionDigits: 0 }));
  });
});

describe('formatRating', () => {
  it('renders the raw backend average at one decimal', () => {
    // The reported defect: getPackageStats returns a raw Postgres AVG.
    expect(formatRating(4.333333333333333)).toBe('4.3');
  });

  it('renders a whole number at one decimal', () => {
    expect(formatRating(5)).toBe('5.0');
  });

  it('renders a missing rating as 0.0 rather than NaN', () => {
    expect(formatRating(undefined)).toBe('0.0');
    expect(formatRating(null)).toBe('0.0');
    expect(formatRating(0)).toBe('0.0');
  });
});

describe('formatPercent', () => {
  it('appends the sign to the rounded value', () => {
    expect(formatPercent(4.333333333333333)).toBe('4.3%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('honours a custom precision', () => {
    expect(formatPercent(12.3456, 2)).toBe('12.35%');
    expect(formatPercent(50, 0)).toBe('50%');
  });

  it('renders a missing percentage as 0.0%', () => {
    expect(formatPercent(undefined)).toBe('0.0%');
  });
});
