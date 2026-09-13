import { describe, it, expect } from 'vitest';
import { numberToWords } from '../numberToWords.js';

describe('numberToWords — INR (Indian numbering)', () => {
  it('renders the sample invoice amount (₹1,43,000) as Lakh/Thousand', () => {
    expect(numberToWords(143000, 'INR')).toBe('One Lakh Forty Three Thousand Only');
  });

  it('renders a Crore-scale amount', () => {
    expect(numberToWords(12345678, 'INR')).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only');
  });

  it('renders a decimal amount with Paise', () => {
    expect(numberToWords(1500.5, 'INR')).toBe('One Thousand Five Hundred and Fifty Paise');
  });

  it('renders zero as "Zero Only"', () => {
    expect(numberToWords(0, 'INR')).toBe('Zero Only');
  });

  it('renders a plain hundred with no thousand/lakh part', () => {
    expect(numberToWords(100, 'INR')).toBe('One Hundred Only');
  });
});

describe('numberToWords — international grouping (non-INR)', () => {
  it('renders a Million-scale USD amount', () => {
    expect(numberToWords(1234567, 'USD')).toBe('One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven Only');
  });

  it('renders a decimal amount with Cents', () => {
    expect(numberToWords(99.99, 'USD')).toBe('Ninety Nine and Ninety Nine Cents');
  });

  it('defaults to international grouping when currency is omitted', () => {
    expect(numberToWords(1000)).toBe('One Thousand Only');
  });
});

describe('numberToWords — invalid input', () => {
  it('returns "Zero Only" for a negative amount', () => {
    expect(numberToWords(-50, 'USD')).toBe('Zero Only');
  });

  it('returns "Zero Only" for a non-numeric amount', () => {
    expect(numberToWords('not-a-number', 'USD')).toBe('Zero Only');
  });
});
