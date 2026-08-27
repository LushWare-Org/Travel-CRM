import { describe, it, expect } from 'vitest';
import { manualItineraryWebsiteSchema, upsertManualItineraryDaysSchema } from '../manualItinerary.validator.js';

const validDay = {
  dayNumber: 1,
  title: 'Arrival',
  description: 'Land and check in',
  locations: ['Colombo'],
  activities: ['City tour'],
  accommodation: { name: 'Cinnamon Grand', type: 'hotel' },
  meals: { breakfast: true, lunch: false, dinner: true },
  transport: 'car',
  places: ['Galle Face Green'],
  notes: 'Pickup at 10am',
};

describe('manualItineraryWebsiteSchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+94770000000',
    destination: 'Sri Lanka',
    destinationCountry: 'LK',
    travelDate: '2027-02-01',
    endDate: '2027-02-08',
    numberOfTravelers: 2,
    budget: '$2000-3000',
    message: 'Prefer beach resorts',
    days: [validDay],
  };

  it('accepts a valid payload with one or more days', () => {
    expect(manualItineraryWebsiteSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a minimal payload (only email/days required)', () => {
    expect(
      manualItineraryWebsiteSchema.safeParse({ email: 'jane@example.com', days: [{ dayNumber: 1 }] }).success,
    ).toBe(true);
  });

  it('rejects an empty days array', () => {
    expect(manualItineraryWebsiteSchema.safeParse({ ...valid, days: [] }).success).toBe(false);
  });

  it('rejects a missing days field', () => {
    const { days, ...rest } = valid;
    expect(manualItineraryWebsiteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid transport enum value', () => {
    expect(
      manualItineraryWebsiteSchema.safeParse({ ...valid, days: [{ ...validDay, transport: 'teleport' }] }).success,
    ).toBe(false);
  });

  it('rejects an invalid accommodation type enum value', () => {
    expect(
      manualItineraryWebsiteSchema.safeParse({
        ...valid,
        days: [{ ...validDay, accommodation: { ...validDay.accommodation, type: 'castle' } }],
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(manualItineraryWebsiteSchema.safeParse({ ...valid, extraField: 'nope' }).success).toBe(false);
  });
});

describe('upsertManualItineraryDaysSchema', () => {
  it('accepts a valid days array', () => {
    expect(upsertManualItineraryDaysSchema.safeParse({ days: [validDay] }).success).toBe(true);
  });

  it('rejects an empty days array', () => {
    expect(upsertManualItineraryDaysSchema.safeParse({ days: [] }).success).toBe(false);
  });
});
