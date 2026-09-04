import { describe, it, expect } from 'vitest';
import { GenerateDayPreviewRequest, GenerateDayPreviewResult } from '../src/generateDayPreview.js';

describe('GenerateDayPreviewRequest', () => {
  const base = { destination: 'Kandy, Sri Lanka', dayNumber: 3, totalDuration: 7 };

  it('parses a valid minimal request', () => {
    expect(GenerateDayPreviewRequest.parse(base)).toEqual(base);
  });

  it('parses a valid request with existingDays context', () => {
    const req = {
      ...base,
      travelers: 2,
      budget: 'moderate',
      preferences: 'temples',
      existingDays: [{ dayNumber: 1, title: 'Arrival', locations: ['Ubud'], activities: ['Temple visit'] }],
    };
    expect(GenerateDayPreviewRequest.parse(req)).toEqual(req);
  });

  it('rejects a request missing dayNumber', () => {
    expect(() => GenerateDayPreviewRequest.parse({ destination: 'Kandy', totalDuration: 7 })).toThrow();
  });

  it('rejects dayNumber: 0', () => {
    expect(() => GenerateDayPreviewRequest.parse({ ...base, dayNumber: 0 })).toThrow();
  });

  it('rejects totalDuration: 31', () => {
    expect(() => GenerateDayPreviewRequest.parse({ ...base, totalDuration: 31 })).toThrow();
  });
});

describe('GenerateDayPreviewResult', () => {
  it('parses a valid result', () => {
    const result = { day: { dayNumber: 3, locations: ['Ubud'], activities: ['Rice terrace walk'] } };
    expect(GenerateDayPreviewResult.parse(result)).toEqual(result);
  });

  it('rejects a result missing day.dayNumber', () => {
    expect(() => GenerateDayPreviewResult.parse({ day: { locations: [], activities: [] } })).toThrow();
  });
});
