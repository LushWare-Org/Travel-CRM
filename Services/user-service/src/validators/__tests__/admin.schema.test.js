import { describe, it, expect } from 'vitest';
import {
  createStaffSchema, updateUserSchema, updateUserStatusSchema,
  updateAdminPermissionsSchema, promoteSuperAdminSchema, demoteSuperAdminSchema,
} from '../admin.validator.js';

describe('createStaffSchema', () => {
  const valid = { name: 'Bob Staff', email: 'bob@test.com', role: 'admin' };

  it('accepts a valid payload', () => {
    expect(createStaffSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an optional permissions list', () => {
    const result = createStaffSchema.safeParse({ ...valid, permissions: ['manage_leads', 'manage_billing'] });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown permission string', () => {
    expect(createStaffSchema.safeParse({ ...valid, permissions: ['nuke_database'] }).success).toBe(false);
  });

  it('rejects a missing role', () => {
    const { role, ...rest } = valid;
    expect(createStaffSchema.safeParse(rest).success).toBe(false);
  });
});

describe('updateUserSchema (admin variant)', () => {
  it('accepts an empty object', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it('rejects an unrecognized field', () => {
    expect(updateUserSchema.safeParse({ notAField: 1 }).success).toBe(false);
  });
});

describe('updateUserStatusSchema', () => {
  it('requires isActive to be a boolean', () => {
    expect(updateUserStatusSchema.safeParse({}).success).toBe(false);
    expect(updateUserStatusSchema.safeParse({ isActive: 'true' }).success).toBe(false);
    expect(updateUserStatusSchema.safeParse({ isActive: true }).success).toBe(true);
  });
});

describe('updateAdminPermissionsSchema', () => {
  it('defaults to an empty array when permissions is omitted', () => {
    const result = updateAdminPermissionsSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.permissions).toEqual([]);
  });

  it('rejects a permissions entry outside the allowed list', () => {
    expect(updateAdminPermissionsSchema.safeParse({ permissions: ['god_mode'] }).success).toBe(false);
  });

  it('accepts a valid permissions list', () => {
    const result = updateAdminPermissionsSchema.safeParse({ permissions: ['manage_vendors'] });
    expect(result.success).toBe(true);
    expect(result.data.permissions).toEqual(['manage_vendors']);
  });
});

describe('promoteSuperAdminSchema / demoteSuperAdminSchema', () => {
  it('requires userId to be a UUID', () => {
    expect(promoteSuperAdminSchema.safeParse({ userId: 'not-a-uuid' }).success).toBe(false);
    expect(promoteSuperAdminSchema.safeParse({ userId: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
  });

  it('demoteSuperAdminSchema has the same shape', () => {
    expect(demoteSuperAdminSchema.safeParse({ userId: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
  });
});
