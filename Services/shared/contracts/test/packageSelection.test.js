import { describe, it, expect } from 'vitest';
import { LeadPackageSelectionRaw, LeadPackageSelectionSummary, QuotePackageSelectionResult } from '../src/packageSelection.js';

function rawSelection(overrides = {}) {
  return {
    id: 'sel-1',
    leadId: 'lead-1',
    packageId: 'pkg-1',
    isManual: false,
    packageName: 'Island Escape',
    currentQuoteId: null,
    ...overrides,
  };
}

describe('LeadPackageSelectionRaw', () => {
  it('accepts a bare Prisma-shaped selection without presented keys', () => {
    const selection = rawSelection();
    expect(() => LeadPackageSelectionRaw.parse(selection)).not.toThrow();
  });
});

describe('LeadPackageSelectionSummary', () => {
  it('requires isMaterialized and the presented keys', () => {
    const selection = rawSelection();
    expect(() => LeadPackageSelectionSummary.parse(selection)).toThrow();
  });

  it('parses a fully presented selection', () => {
    const selection = {
      ...rawSelection(),
      itineraryDays: [],
      costLines: [],
      pricing: null,
      isMaterialized: false,
    };
    expect(LeadPackageSelectionSummary.parse(selection).isMaterialized).toBe(false);
  });
});

describe('QuotePackageSelectionResult', () => {
  it('rejects a raw (non-presented) selection nested under selection', () => {
    const result = { selection: rawSelection(), lead: {}, quotation: {} };
    expect(() => QuotePackageSelectionResult.parse(result)).toThrow();
  });

  it('parses when selection is the presented shape', () => {
    const result = {
      selection: { ...rawSelection(), itineraryDays: [], costLines: [], pricing: null, isMaterialized: true },
      lead: { id: 'lead-1' },
      quotation: { id: 'quote-1' },
    };
    expect(() => QuotePackageSelectionResult.parse(result)).not.toThrow();
  });
});
