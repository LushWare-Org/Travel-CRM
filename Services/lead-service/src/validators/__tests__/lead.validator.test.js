import { describe, it, expect } from 'vitest';
import { createLeadSchema, updateLeadSchema } from '../lead.validator.js';

describe('createLeadSchema', () => {
  it('accepts valid full payload', () => {
    const result = createLeadSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      lifecycleStatus: 'NEW',
      financials: {
        estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 },
        clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 10 },
      },
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

  it('rejects negative packageBaseCost in financials', () => {
    const result = createLeadSchema.safeParse({
      financials: { estimated: { packageBaseCost: -100 } },
    });
    expect(result.success).toBe(false);
  });

  it('accepts financials with only estimated fields', () => {
    const result = createLeadSchema.safeParse({
      financials: { estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown markupStrategy', () => {
    const result = createLeadSchema.safeParse({
      financials: { clientPricing: { markupStrategy: 'INVALID' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative depositPaid', () => {
    const result = createLeadSchema.safeParse({
      financials: { clientPricing: { depositPaid: -50 } },
    });
    expect(result.success).toBe(false);
  });
});

describe('updateLeadSchema', () => {
  it('accepts partial update', () => {
    const result = updateLeadSchema.safeParse({ name: 'Updated Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty body', () => {
    const result = updateLeadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts statusChangeNotes', () => {
    const result = updateLeadSchema.safeParse({ lifecycleStatus: 'QUOTED', statusChangeNotes: 'Sent proposal' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields', () => {
    const result = updateLeadSchema.safeParse({ bogusField: 'value' });
    expect(result.success).toBe(false);
  });
});
