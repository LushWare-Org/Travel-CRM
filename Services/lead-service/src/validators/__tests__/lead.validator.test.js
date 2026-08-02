import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../lead.validator.js';

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
});
