import { describe, it, expect } from 'vitest';
import { GenerateDaysRangePreviewRequest, GenerateDaysRangePreviewResult } from '../src/generateDaysRangePreview.js';

describe('GenerateDaysRangePreviewRequest', () => {
  const base = { destination: 'Bali, Indonesia', dayNumbers: [4, 5], totalDuration: 7 };

  it('parses a valid minimal request', () => {
    expect(GenerateDaysRangePreviewRequest.parse(base)).toEqual(base);
  });

  it('parses non-contiguous dayNumbers (gaps left by out-of-order manual deletes)', () => {
    const req = { ...base, dayNumbers: [2, 5, 6] };
    expect(GenerateDaysRangePreviewRequest.parse(req)).toEqual(req);
  });

  it('rejects dayNumbers: []', () => {
    expect(() => GenerateDaysRangePreviewRequest.parse({ ...base, dayNumbers: [] })).toThrow();
  });

  it('rejects a dayNumbers entry: 0', () => {
    expect(() => GenerateDaysRangePreviewRequest.parse({ ...base, dayNumbers: [0, 1] })).toThrow();
  });

  it('rejects totalDuration: 31', () => {
    expect(() => GenerateDaysRangePreviewRequest.parse({ ...base, totalDuration: 31 })).toThrow();
  });
});

describe('GenerateDaysRangePreviewResult', () => {
  it('parses a valid result', () => {
    const result = {
      days: [
        { dayNumber: 4, locations: ['Seminyak Beach'], activities: ['Surfing lesson'] },
        { dayNumber: 5, locations: ['Airport'], activities: ['Souvenir shopping'] },
      ],
    };
    expect(GenerateDaysRangePreviewResult.parse(result)).toEqual(result);
  });

  it('parses days: [] — a partial shortfall is a valid (if degenerate) result, not padded', () => {
    expect(GenerateDaysRangePreviewResult.parse({ days: [] })).toEqual({ days: [] });
  });
});
