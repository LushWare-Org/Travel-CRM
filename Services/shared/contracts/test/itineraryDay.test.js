import { describe, it, expect } from 'vitest';
import { ItineraryDay } from '../src/itineraryDay.js';

describe('ItineraryDay', () => {
  it('parses a valid day with empty locations and meals', () => {
    const day = { day: 1, title: 'Arrival', locations: [], meals: [] };
    expect(ItineraryDay.parse(day)).toEqual(day);
  });

  it('rejects a non-array locations field', () => {
    const day = { day: 1, title: 'Arrival', locations: 'Colombo', meals: [] };
    expect(() => ItineraryDay.parse(day)).toThrow();
  });

  it('rejects a missing title', () => {
    const day = { day: 1, locations: [], meals: [] };
    expect(() => ItineraryDay.parse(day)).toThrow();
  });
});
