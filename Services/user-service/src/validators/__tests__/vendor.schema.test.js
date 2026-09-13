import { describe, it, expect } from 'vitest';
import {
  createVendorSchema, updateVendorSchema, updateVendorStatusSchema,
  updateVendorRatingSchema, listVendorsQuerySchema,
} from '../vendor.validator.js';

describe('createVendorSchema', () => {
  const valid = { name: 'Sunrise Hotels', email: 'sunrise@test.com' };

  it('accepts a minimal valid payload', () => {
    expect(createVendorSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a full payload with nested address/contactPerson/bankDetails', () => {
    const result = createVendorSchema.safeParse({
      ...valid,
      businessName: 'Sunrise Hotels Pvt Ltd',
      serviceType: 'hotel',
      address: { city: 'Colombo', country: 'LK' },
      contactPerson: { name: 'Jane Doe', email: 'jane@sunrise.com' },
      bankDetails: { accountNumber: '12345', bankName: 'BOC' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown serviceType', () => {
    expect(createVendorSchema.safeParse({ ...valid, serviceType: 'spaceship' }).success).toBe(false);
  });

  it('rejects unknown keys inside the nested address object', () => {
    expect(createVendorSchema.safeParse({ ...valid, address: { planet: 'Mars' } }).success).toBe(false);
  });
});

describe('updateVendorSchema', () => {
  it('accepts an empty object', () => {
    expect(updateVendorSchema.safeParse({}).success).toBe(true);
  });
});

describe('updateVendorStatusSchema', () => {
  it('requires a valid vendorStatus enum value', () => {
    expect(updateVendorStatusSchema.safeParse({ vendorStatus: 'verified' }).success).toBe(true);
    expect(updateVendorStatusSchema.safeParse({ vendorStatus: 'approved' }).success).toBe(false);
  });
});

describe('updateVendorRatingSchema', () => {
  it('accepts a rating within 0-5', () => {
    expect(updateVendorRatingSchema.safeParse({ rating: 4.5 }).success).toBe(true);
  });

  it('rejects a rating above 5', () => {
    expect(updateVendorRatingSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it('coerces a numeric string rating', () => {
    const result = updateVendorRatingSchema.safeParse({ rating: '3.2' });
    expect(result.success).toBe(true);
    expect(result.data.rating).toBe(3.2);
  });
});

describe('listVendorsQuerySchema', () => {
  it('accepts a vendorStatus filter', () => {
    expect(listVendorsQuerySchema.safeParse({ vendorStatus: 'suspended' }).success).toBe(true);
  });

  it('rejects an invalid vendorStatus filter', () => {
    expect(listVendorsQuerySchema.safeParse({ vendorStatus: 'bogus' }).success).toBe(false);
  });
});
