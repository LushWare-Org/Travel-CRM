import { describe, it, expect } from 'vitest';
import {
  searchSchema, priceSchema, bookSchema,
  cancelBookingSchema, listBookingsQuerySchema, bookingIdParamSchema,
} from '../flight.schema.js';

describe('searchSchema', () => {
  it('should pass a valid one-way search', () => {
    const result = searchSchema.safeParse({
      origin: 'CMB', destination: 'DXB', departureDate: '2026-08-01',
      adults: 2, cabinClass: 'Business', tripType: 'oneWay',
    });
    expect(result.success).toBe(true);
    expect(result.data.adults).toBe(2);
    expect(result.data.children).toBe(0);
    expect(result.data.cabinClass).toBe('Business');
  });

  it('should apply defaults', () => {
    const result = searchSchema.safeParse({
      origin: 'LHR', destination: 'JFK', departureDate: '2026-09-01',
    });
    expect(result.success).toBe(true);
    expect(result.data.adults).toBe(1);
    expect(result.data.children).toBe(0);
    expect(result.data.infants).toBe(0);
    expect(result.data.cabinClass).toBe('Economy');
    expect(result.data.tripType).toBe('oneWay');
  });

  it('should reject same origin and destination', () => {
    const result = searchSchema.safeParse({
      origin: 'DXB', destination: 'DXB', departureDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('different');
  });

  it('should reject invalid IATA codes', () => {
    const result = searchSchema.safeParse({
      origin: 'XX', destination: 'dubai', departureDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = searchSchema.safeParse({ origin: 'CMB' });
    expect(result.success).toBe(false);
  });
});

describe('priceSchema', () => {
  it('should pass with a valid offerId', () => {
    expect(priceSchema.safeParse({ offerId: 'off_123' }).success).toBe(true);
  });

  it('should reject empty offerId', () => {
    expect(priceSchema.safeParse({ offerId: '' }).success).toBe(false);
  });
});

describe('bookSchema', () => {
  it('should pass a valid booking', () => {
    const result = bookSchema.safeParse({
      offer: { offerId: 'off_123', airline: 'EK', fareTotal: 300 },
      tripType: 'oneWay',
      travelers: [{ type: 'adult', firstName: 'John', lastName: 'Doe' }],
      contact: { name: 'John', email: 'john@test.com' },
    });
    expect(result.success).toBe(true);
    expect(result.data.offer.airline).toBe('EK');
  });

  it('should reject empty travelers', () => {
    const result = bookSchema.safeParse({
      offer: { offerId: 'X' },
      travelers: [],
      contact: { email: 'a@b.com' },
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('At least one traveler');
  });

  it('should reject missing firstName', () => {
    const result = bookSchema.safeParse({
      offer: { offerId: 'X' },
      travelers: [{ type: 'adult', lastName: 'Doe' }],
      contact: { email: 'a@b.com' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid contact email', () => {
    const result = bookSchema.safeParse({
      offer: { offerId: 'X' },
      travelers: [{ type: 'adult', firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'not-an-email' },
    });
    expect(result.success).toBe(false);
  });
});

describe('cancelBookingSchema', () => {
  it('should pass with reason', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'Cancelled by agent' }).success).toBe(true);
  });

  it('should pass with empty body', () => {
    expect(cancelBookingSchema.safeParse({}).success).toBe(true);
  });
});

describe('listBookingsQuerySchema', () => {
  it('should pass with valid status', () => {
    expect(listBookingsQuerySchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });

  it('should reject invalid status', () => {
    expect(listBookingsQuerySchema.safeParse({ status: 'invalid' }).success).toBe(false);
  });

  it('should pass with no params', () => {
    expect(listBookingsQuerySchema.safeParse({}).success).toBe(true);
  });
});

describe('bookingIdParamSchema', () => {
  it('should accept valid UUID', () => {
    expect(bookingIdParamSchema.safeParse({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }).success).toBe(true);
  });

  it('should reject non-UUID', () => {
    expect(bookingIdParamSchema.safeParse({ id: 'b1' }).success).toBe(false);
  });
});
