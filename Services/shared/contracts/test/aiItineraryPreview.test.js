import { describe, it, expect } from 'vitest';
import { GenerateItineraryPreviewRequest, GenerateItineraryPreviewResult } from '../src/aiItineraryPreview.js';

describe('GenerateItineraryPreviewRequest', () => {
  it('parses a valid request', () => {
    const req = {
      destination: 'Kandy, Sri Lanka',
      duration: 3,
      travelers: 2,
      budget: 'moderate',
      preferences: 'beachside hotels',
    };
    expect(GenerateItineraryPreviewRequest.parse(req)).toEqual(req);
  });

  it('rejects a request missing destination', () => {
    const req = { duration: 3 };
    expect(() => GenerateItineraryPreviewRequest.parse(req)).toThrow();
  });

  it('rejects duration: 0', () => {
    const req = { destination: 'Kandy', duration: 0 };
    expect(() => GenerateItineraryPreviewRequest.parse(req)).toThrow();
  });

  it('rejects duration: 31', () => {
    const req = { destination: 'Kandy', duration: 31 };
    expect(() => GenerateItineraryPreviewRequest.parse(req)).toThrow();
  });
});

describe('GenerateItineraryPreviewResult', () => {
  it('parses a valid result', () => {
    const result = { days: [{ dayNumber: 1, locations: ['Kandy'], activities: ['Temple visit'] }] };
    expect(GenerateItineraryPreviewResult.parse(result)).toEqual({
      days: [{ dayNumber: 1, locations: ['Kandy'], activities: ['Temple visit'] }],
    });
  });

  it('rejects a result with days: []', () => {
    const result = { days: [] };
    expect(() => GenerateItineraryPreviewResult.parse(result)).toThrow();
  });
});
