import { describe, it, expect } from 'vitest';
import { customizedPackageWebsiteSchema, updateCustomizedPackageSchema } from '../customizedPackage.validator.js';

describe('customizedPackageWebsiteSchema', () => {
  const valid = {
    packageId: 'pkg-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+94770000000',
    travelers: 2,
    travelDate: '2027-01-01',
    budget: '$2000-3000',
    message: 'Please add a cooking class',
    overrides: { name: 'My Custom Trip', duration: 7, price: 1500 },
  };

  it('accepts a valid full payload', () => {
    expect(customizedPackageWebsiteSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a minimal payload (only packageId/name/email required)', () => {
    expect(
      customizedPackageWebsiteSchema.safeParse({ packageId: 'pkg-1', name: 'Jane Doe', email: 'jane@example.com' }).success,
    ).toBe(true);
  });

  it('rejects a missing packageId', () => {
    const { packageId, ...rest } = valid;
    expect(customizedPackageWebsiteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing email', () => {
    const { email, ...rest } = valid;
    expect(customizedPackageWebsiteSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an invalid email format', () => {
    expect(customizedPackageWebsiteSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(customizedPackageWebsiteSchema.safeParse({ ...valid, extraField: 'nope' }).success).toBe(false);
  });

  it('rejects an unknown field inside overrides', () => {
    expect(
      customizedPackageWebsiteSchema.safeParse({ ...valid, overrides: { ...valid.overrides, extra: 'x' } }).success,
    ).toBe(false);
  });
});

describe('updateCustomizedPackageSchema', () => {
  it('accepts a partial update', () => {
    expect(updateCustomizedPackageSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts an empty object (no changes)', () => {
    expect(updateCustomizedPackageSchema.safeParse({}).success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    expect(updateCustomizedPackageSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });

  it('accepts a valid status value', () => {
    expect(updateCustomizedPackageSchema.safeParse({ status: 'confirmed' }).success).toBe(true);
  });

  it('rejects an unknown field', () => {
    expect(updateCustomizedPackageSchema.safeParse({ leadId: 'lead-1' }).success).toBe(false);
  });
});
