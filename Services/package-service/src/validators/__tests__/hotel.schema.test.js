import { describe, it, expect } from 'vitest';
import {
  searchSchema, detailsSchema, prebookSchema, bookSchema,
  cancelBookingSchema, listBookingsQuerySchema, bookingIdParamSchema,
  leadIdParamSchema, bookWithContextSchema,
} from '../hotel.schema.js';

describe('searchSchema', () => {
  it('should pass a valid search', () => {
    const r = searchSchema.safeParse({
      checkin: '2026-09-01', checkout: '2026-09-03',
      occupancies: [{ adults: 2, children: 1 }], city: 'Colombo',
    });
    expect(r.success).toBe(true);
    expect(r.data.guestNationality).toBe('US');
    expect(r.data.currency).toBe('USD');
  });

  it('should apply defaults', () => {
    const r = searchSchema.safeParse({ checkin: '2026-09-01', checkout: '2026-09-03' });
    expect(r.success).toBe(true);
    expect(r.data.occupancies[0].adults).toBe(1);
    expect(r.data.limit).toBe(20);
    expect(r.data.radiusUnit).toBe('km');
  });

  it('should reject missing dates', () => {
    expect(searchSchema.safeParse({ checkin: '2026-09-01' }).success).toBe(false);
  });

  it('should reject adults exceeding 9', () => {
    expect(searchSchema.safeParse({
      checkin: '2026-09-01', checkout: '2026-09-03',
      occupancies: [{ adults: 10 }],
    }).success).toBe(false);
  });

  it('should reject children exceeding 9', () => {
    expect(searchSchema.safeParse({
      checkin: '2026-09-01', checkout: '2026-09-03',
      occupancies: [{ adults: 1, children: 10 }],
    }).success).toBe(false);
  });

  it('should reject empty occupancies array', () => {
    expect(searchSchema.safeParse({
      checkin: '2026-09-01', checkout: '2026-09-03', occupancies: [],
    }).success).toBe(false);
  });
});

describe('detailsSchema', () => {
  it('should pass with hotelId', () => {
    expect(detailsSchema.safeParse({ hotelId: 'abc123' }).success).toBe(true);
  });
  it('should reject empty hotelId', () => {
    expect(detailsSchema.safeParse({ hotelId: '' }).success).toBe(false);
  });
});

describe('prebookSchema', () => {
  it('should pass with offerId', () => {
    expect(prebookSchema.safeParse({ offerId: 'offer-123' }).success).toBe(true);
  });
  it('should reject empty offerId', () => {
    expect(prebookSchema.safeParse({ offerId: '' }).success).toBe(false);
  });
  it('should reject missing offerId', () => {
    expect(prebookSchema.safeParse({}).success).toBe(false);
  });
});

describe('bookSchema', () => {
  it('should pass a valid booking', () => {
    const r = bookSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
    });
    expect(r.success).toBe(true);
  });

  it('should reject empty guests', () => {
    const r = bookSchema.safeParse({ prebookId: 'x', guests: [], contact: { email: 'a@b.com' } });
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toContain('At least one guest');
  });

  it('should reject invalid email', () => {
    const r = bookSchema.safeParse({ prebookId: 'x', guests: [{ firstName: 'J', lastName: 'D' }], contact: { email: 'bad' } });
    expect(r.success).toBe(false);
  });

  it('should reject missing first name', () => {
    const r = bookSchema.safeParse({ prebookId: 'x', guests: [{ lastName: 'D' }], contact: { email: 'a@b.com' } });
    expect(r.success).toBe(false);
  });

  it('should reject missing prebookId', () => {
    const r = bookSchema.safeParse({ guests: [{ firstName: 'J', lastName: 'D' }], contact: { email: 'a@b.com' } });
    expect(r.success).toBe(false);
  });
});

describe('bookWithContextSchema', () => {
  it('should pass with lead context fields', () => {
    const r = bookWithContextSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
      leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      dayNumber: 3,
    });
    expect(r.success).toBe(true);
  });

  it('should pass without optional lead context', () => {
    const r = bookWithContextSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
    });
    expect(r.success).toBe(true);
  });

  it('should reject invalid leadId UUID', () => {
    const r = bookWithContextSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
      leadId: 'not-a-uuid',
    });
    expect(r.success).toBe(false);
  });

  it('should reject zero dayNumber', () => {
    const r = bookWithContextSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
      dayNumber: 0,
    });
    expect(r.success).toBe(false);
  });

  it('should reject negative dayNumber', () => {
    const r = bookWithContextSchema.safeParse({
      prebookId: 'pb-1',
      guests: [{ firstName: 'John', lastName: 'Doe' }],
      contact: { email: 'john@test.com' },
      dayNumber: -1,
    });
    expect(r.success).toBe(false);
  });
});

describe('cancelBookingSchema', () => {
  it('should pass with and without reason', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'test' }).success).toBe(true);
    expect(cancelBookingSchema.safeParse({}).success).toBe(true);
  });

  it('should reject reason exceeding 500 chars', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
  });

  it('should pass reason at max 500 chars', () => {
    expect(cancelBookingSchema.safeParse({ reason: 'x'.repeat(500) }).success).toBe(true);
  });
});

describe('listBookingsQuerySchema', () => {
  it('should pass valid status', () => {
    expect(listBookingsQuerySchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });
  it('should reject invalid status', () => {
    expect(listBookingsQuerySchema.safeParse({ status: 'nope' }).success).toBe(false);
  });
});

describe('bookingIdParamSchema', () => {
  it('should accept UUID', () => {
    expect(bookingIdParamSchema.safeParse({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }).success).toBe(true);
  });
  it('should reject non-UUID', () => {
    expect(bookingIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
  });
});

describe('leadIdParamSchema', () => {
  it('should accept UUID', () => {
    expect(leadIdParamSchema.safeParse({ leadId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }).success).toBe(true);
  });
  it('should reject non-UUID', () => {
    expect(leadIdParamSchema.safeParse({ leadId: 'abc' }).success).toBe(false);
  });
});
