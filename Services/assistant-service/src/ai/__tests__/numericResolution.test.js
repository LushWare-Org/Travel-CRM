import { describe, it, expect } from 'vitest';
import {
  canonicalScalar,
  canonicalScalars,
  hasUnsafeProse,
  proseNumericTokens,
  unresolvedNumericTokens,
} from '../groundingValidator.js';

// The numeric rule is "every number the reader sees must resolve to something
// the claim cites". These tests own the two halves that make it work: turning an
// evidence value into comparable scalars, and turning a sentence into the
// numbers a reader would actually see.

describe('canonicalScalar', () => {
  it('renders numbers, booleans and strings in one comparable form', () => {
    expect(canonicalScalar(1500)).toBe('1500');
    expect(canonicalScalar(0)).toBe('0');
    expect(canonicalScalar(true)).toBe('true');
    expect(canonicalScalar('NEW')).toBe('new');
  });

  it('returns null for anything that is not a scalar, so callers flatten instead of guessing', () => {
    expect(canonicalScalar(null)).toBeNull();
    expect(canonicalScalar(undefined)).toBeNull();
    expect(canonicalScalar('   ')).toBeNull();
    expect(canonicalScalar({ a: 1 })).toBeNull();
    expect(canonicalScalar([1])).toBeNull();
    expect(canonicalScalar(Number.NaN)).toBeNull();
  });
});

describe('canonicalScalars', () => {
  it('flattens nested objects and arrays to their leaves', () => {
    const scalars = canonicalScalars({ total: 1500, rows: [{ amount: 20 }, { amount: 30 }], ok: true });

    expect([...scalars].sort()).toEqual(['1500', '20', '30', 'true']);
  });

  it('lets a token resolve against a leaf inside an object-valued tool result', () => {
    const scalars = canonicalScalars({ tool: 'listLeads', result: { count: 12, destination: 'Bali' } });

    expect(scalars.has('12')).toBe(true);
    expect(scalars.has('bali')).toBe(true);
  });

  it('handles a scalar directly', () => {
    expect([...canonicalScalars(450000)]).toEqual(['450000']);
  });
});

describe('proseNumericTokens', () => {
  it('reads the numbers a reader would see', () => {
    expect(proseNumericTokens('12 leads want Bali, 8 want Dubai.')).toEqual(['12', '8']);
  });

  it('strips thousands separators so a formatted amount matches a canonical number', () => {
    expect(proseNumericTokens('Total is ₹1,500 today.')).toEqual(['1500']);
    expect(proseNumericTokens('About 1,234,567 in value.')).toEqual(['1234567']);
  });

  it('keeps an ISO date as ONE token instead of splitting it into components', () => {
    expect(proseNumericTokens('Due 2026-09-12, please.')).toEqual(['2026-09-12']);
  });

  it('handles decimals', () => {
    expect(proseNumericTokens('Conversion is 0.64.')).toEqual(['0.64']);
  });

  it('returns nothing for prose with no numbers', () => {
    expect(proseNumericTokens('Nothing needs you today.')).toEqual([]);
    expect(proseNumericTokens(undefined)).toEqual([]);
  });
});

describe('unresolvedNumericTokens', () => {
  const context = { factValues: new Set(['12', '62']), evidenceValues: new Set(['450000', 'new']) };

  it('passes prose whose numbers all resolve', () => {
    expect(unresolvedNumericTokens('12 leads, unedited for 62 days.', context)).toEqual([]);
  });

  it('names the tokens that resolve to nothing', () => {
    expect(unresolvedNumericTokens('12 leads and 99 invoices.', context)).toEqual(['99']);
  });

  it('resolves against a canonical number, not a formatted one', () => {
    expect(unresolvedNumericTokens('Budget ₹450,000.', context)).toEqual([]);
  });

  it('does not resolve a token contained inside a longer value', () => {
    expect(unresolvedNumericTokens('About 45 of them.', context)).toEqual(['45']);
  });

  it('ignores punctuation-only and number-free prose', () => {
    expect(unresolvedNumericTokens('Bali leads demand.', context)).toEqual([]);
  });
});

describe('hasUnsafeProse', () => {
  it('catches ids and plumbing, which are unsafe regardless of grounding', () => {
    expect(hasUnsafeProse('See LEAD-8F21.')).toBe(true);
    expect(hasUnsafeProse('From tool:listLeads:1.')).toBe(true);
    expect(hasUnsafeProse('The evidenceIds are cited.')).toBe(true);
    expect(hasUnsafeProse('{"tool": "listLeads"}')).toBe(true);
  });

  it('lets a grounded number through, which is the whole point', () => {
    expect(hasUnsafeProse('Bali has 12 open leads, ahead of Dubai at 8.')).toBe(false);
    expect(hasUnsafeProse('₹1,500 outstanding since 2026-09-12.')).toBe(false);
  });
});
