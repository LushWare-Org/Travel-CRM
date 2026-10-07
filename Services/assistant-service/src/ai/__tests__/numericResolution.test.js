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
  it('catches the internal ids and plumbing, which are unsafe regardless of grounding', () => {
    // Internal record ids are UUIDs in this system, which is the shape that must
    // never reach operator prose.
    expect(hasUnsafeProse('See 2a000000-0000-4000-8000-000000000071.')).toBe(true);
    expect(hasUnsafeProse('From tool:listLeads:1.')).toBe(true);
    expect(hasUnsafeProse('The evidenceIds are cited.')).toBe(true);
    expect(hasUnsafeProse('{"tool": "listLeads"}')).toBe(true);
  });

  it('lets a grounded number through, which is the whole point', () => {
    expect(hasUnsafeProse('Bali has 12 open leads, ahead of Dubai at 8.')).toBe(false);
    expect(hasUnsafeProse('₹1,500 outstanding since 2026-09-12.')).toBe(false);
  });

  it('lets an operator-facing document number through', () => {
    // The rule this replaced (`[A-Z]{2,}-\d[\w-]*`) matched these and deleted
    // every claim that named one, so "tell me more" about overdue invoices was
    // refused. A document number is what the panel and the billing list show the
    // operator; whether the claim may state it is decided by grounding, below.
    expect(hasUnsafeProse('INV-202608-00027 is past due.')).toBe(false);
    expect(hasUnsafeProse('Invoice INV-4471 is 62 days overdue.')).toBe(false);
  });
});

describe('document numbers in prose', () => {
  it('reads a document number as one token, so it resolves against the row that carries it', () => {
    expect(proseNumericTokens('Invoice INV-202608-00027 is past due.')).toEqual(['INV-202608-00027']);
  });

  it('does not swallow ordinary hyphenated prose', () => {
    expect(proseNumericTokens('the top-10 destinations')).toEqual(['10']);
  });

  it('still refuses a document number nothing cited carries', () => {
    const context = { evidenceValues: new Set(['inv-202608-00027']) };

    expect(unresolvedNumericTokens('Invoice INV-202608-00027 is past due.', context)).toEqual([]);
    expect(unresolvedNumericTokens('Invoice INV-999999-00001 is past due.', context)).toEqual(['INV-999999-00001']);
  });
});

describe('quantities spelled as words', () => {
  it('reads a spelled-out quantity as the number it names', () => {
    // Live, an answer said "twenty past due invoices". Nothing checked it, because
    // the rule extracted only digits — a value stated with no source, which is
    // exactly what this validator exists to catch.
    expect(proseNumericTokens('twenty past due invoices')).toEqual(['20']);
    expect(proseNumericTokens('Twenty invoices are unpaid.')).toEqual(['20']);
    expect(proseNumericTokens('five overdue invoices')).toEqual(['5']);
  });

  it('leaves ordinary prose alone, where the same word is not a count', () => {
    // Both of these are why the rule is narrow: rejecting them would bring back the
    // over-rejection that made counting questions unanswerable in the first place.
    expect(proseNumericTokens('one of the leads')).toEqual([]);
    expect(proseNumericTokens('the first two')).toEqual([]);
    expect(proseNumericTokens('one-off invoices')).toEqual([]);
  });

  it('leaves a compound figure unchecked rather than reading it in fragments', () => {
    // "two" out of "eighty-two dollars" resolves to nothing, so it would reject a
    // sentence that is true. A missed quantity goes unchecked, as it did before.
    expect(proseNumericTokens('eighty-one thousand and eighty-two dollars')).toEqual([]);
    expect(proseNumericTokens('one hundred invoices')).toEqual([]);
    expect(proseNumericTokens('twenty-six invoices')).toEqual([]);
  });

  it('resolves a spelled-out quantity against the same evidence a digit one uses', () => {
    const context = { evidenceValues: new Set(['20']) };

    expect(unresolvedNumericTokens('twenty past due invoices', context)).toEqual([]);
    expect(unresolvedNumericTokens('ninety past due invoices', context)).toEqual(['90']);
  });
});
