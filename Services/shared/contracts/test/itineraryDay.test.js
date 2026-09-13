import { describe, it, expect } from 'vitest';
import { ItineraryDay } from '../src/itineraryDay.js';

describe('ItineraryDay', () => {
  it('parses a valid day with empty locations and meals', () => {
    const day = { day: 1, title: 'Arrival', locations: [], meals: [] };
    expect(ItineraryDay.parse(day)).toEqual({ ...day, activities: [], images: [] });
  });

  it('defaults activities and images to [] when omitted, for older persisted rows', () => {
    const day = { day: 2, title: 'City Tour', locations: ['Colombo'], meals: ['Breakfast'] };
    expect(ItineraryDay.parse(day)).toEqual({ ...day, activities: [], images: [] });
  });

  it('parses activities and images when present', () => {
    const day = {
      day: 3,
      title: 'Beach Day',
      locations: ['Galle'],
      meals: [],
      activities: [{ name: 'Snorkeling', description: 'Guided reef tour', cost: 40 }],
      images: ['https://res.cloudinary.com/x/day3.jpg'],
    };
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
