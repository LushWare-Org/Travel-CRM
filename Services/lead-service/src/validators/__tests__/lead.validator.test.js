import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema, addOptionalFlightSchema } from '../lead.validator.js';

describe('createLeadSchema', () => {
  it('accepts valid full payload', () => {
    const result = createLeadSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      lifecycleStatus: 'NEW',
      numberOfTravelers: 4,
      packageId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty body (all fields optional)', () => {
    const result = createLeadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = createLeadSchema.safeParse({ email: 'notanemail' });
    expect(result.success).toBe(false);
  });

  it('rejects negative numberOfTravelers', () => {
    const result = createLeadSchema.safeParse({ numberOfTravelers: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid uuid for packageId', () => {
    const result = createLeadSchema.safeParse({ packageId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown lifecycleStatus', () => {
    const result = createLeadSchema.safeParse({ lifecycleStatus: 'BOGUS' });
    expect(result.success).toBe(false);
  });

  it('accepts isManualItinerary true', () => {
    const result = createLeadSchema.safeParse({ isManualItinerary: true });
    expect(result.success).toBe(true);
    expect(result.data.isManualItinerary).toBe(true);
  });

  it('accepts isManualItinerary false', () => {
    const result = createLeadSchema.safeParse({ isManualItinerary: false });
    expect(result.success).toBe(true);
    expect(result.data.isManualItinerary).toBe(false);
  });

  it('rejects a non-boolean isManualItinerary', () => {
    const result = createLeadSchema.safeParse({ isManualItinerary: 'yes' });
    expect(result.success).toBe(false);
  });

  it('accepts each valid lifecycleStatus', () => {
    const valid = ['NEW', 'DRAFTING', 'QUOTED', 'REVISION', 'APPROVED', 'BOOKING_IN_PROGRESS', 'CONFIRMED', 'CLOSED_LOST', 'BOOKING_FAILED', 'CANCELLED'];
    for (const status of valid) {
      const result = createLeadSchema.safeParse({ lifecycleStatus: status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects legacy financials and status fields', () => {
    const result = createLeadSchema.safeParse({
      status: 'new',
      financials: { estimated: { packageBaseCost: 100 } },
      optionalFlights: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects remarks without text', () => {
    const result = createLeadSchema.safeParse({
      remarks: [{ date: '2026-08-02T10:00:00Z' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts date-only remark dates', () => {
    const result = createLeadSchema.safeParse({
      remarks: [{ text: 'Called the client', date: '2026-08-02' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('updateLeadSchema', () => {
  it('accepts lifecycleStatus updates with notes', () => {
    const result = updateLeadSchema.safeParse({
      lifecycleStatus: 'DRAFTING',
      statusChangeNotes: 'Started drafting',
    });
    expect(result.success).toBe(true);
  });

  it('accepts pricing settings', () => {
    const result = updateLeadSchema.safeParse({
      pricing: {
        currency: 'USD',
        marginType: 'PERCENTAGE',
        marginValue: 10,
        depositType: 'FIXED',
        depositValue: 250,
        discountType: 'percentage',
        discountValue: 5,
        serviceChargeRate: 2,
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid pricing settings', () => {
    const result = updateLeadSchema.safeParse({
      pricing: { marginType: 'BOGUS' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    const result = updateLeadSchema.safeParse({ status: 'new' });
    expect(result.success).toBe(false);
  });

  it('accepts isManualItinerary alongside a packageId switch', () => {
    const result = updateLeadSchema.safeParse({
      packageId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      isManualItinerary: true,
    });
    expect(result.success).toBe(true);
    expect(result.data.isManualItinerary).toBe(true);
  });
});

describe('addOptionalFlightSchema', () => {
  it('accepts a full valid payload', () => {
    const result = addOptionalFlightSchema.safeParse({
      flightType: 'TO_START',
      origin: 'CMB',
      destination: 'DXB',
      date: '2026-03-01',
      cabinClass: 'Business',
      departureTime: 'morning',
      airlinePreference: 'EK',
      notes: 'Prefers window seat',
      estimatedUnitPrice: 500,
    });
    expect(result.success).toBe(true);
  });

  it('accepts either flightType direction', () => {
    for (const flightType of ['TO_START', 'RETURN_HOME']) {
      expect(addOptionalFlightSchema.safeParse({ flightType }).success).toBe(true);
    }
  });

  it('requires flightType', () => {
    const result = addOptionalFlightSchema.safeParse({ origin: 'CMB' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown flightType', () => {
    const result = addOptionalFlightSchema.safeParse({ flightType: 'SIDEWAYS' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    const result = addOptionalFlightSchema.safeParse({ flightType: 'TO_START', foo: 'bar' });
    expect(result.success).toBe(false);
  });

  it('rejects a negative estimatedUnitPrice', () => {
    const result = addOptionalFlightSchema.safeParse({ flightType: 'TO_START', estimatedUnitPrice: -10 });
    expect(result.success).toBe(false);
  });
});
