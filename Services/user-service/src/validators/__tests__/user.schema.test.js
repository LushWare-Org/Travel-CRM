import { describe, it, expect } from 'vitest';
import {
  createUserSchema, updateUserSchema, updateCurrentUserProfileSchema,
  updateUserPasswordSchema, assignUserRoleSchema, listUsersQuerySchema,
} from '../user.validator.js';

describe('createUserSchema', () => {
  const valid = { name: 'Alice Smith', email: 'alice@test.com', role: 'customer' };

  it('accepts a valid minimal payload', () => {
    expect(createUserSchema.safeParse(valid).success).toBe(true);
  });

  it('lowercases and trims the email', () => {
    const result = createUserSchema.safeParse({ ...valid, email: '  Alice@Test.com  ' });
    expect(result.success).toBe(true);
    expect(result.data.email).toBe('alice@test.com');
  });

  it('rejects a missing name', () => {
    const { name, ...rest } = valid;
    expect(createUserSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a name longer than 50 characters', () => {
    const result = createUserSchema.safeParse({ ...valid, name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email format', () => {
    expect(createUserSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects an unknown role', () => {
    expect(createUserSchema.safeParse({ ...valid, role: 'ceo' }).success).toBe(false);
  });

  it('rejects a password shorter than 6 characters', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'abc' }).success).toBe(false);
  });

  it('accepts a valid password', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'abcdef' }).success).toBe(true);
  });

  it('rejects unknown fields (whitelist validation)', () => {
    expect(createUserSchema.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(updateUserSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a partial update', () => {
    expect(updateUserSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects isActive as a non-boolean', () => {
    expect(updateUserSchema.safeParse({ isActive: 'yes' }).success).toBe(false);
  });

  it('rejects a permissions entry not on the allowed list', () => {
    expect(updateUserSchema.safeParse({ permissions: ['delete_everything'] }).success).toBe(false);
  });

  it('accepts a valid permissions list', () => {
    expect(updateUserSchema.safeParse({ permissions: ['manage_users'] }).success).toBe(true);
  });
});

describe('updateCurrentUserProfileSchema', () => {
  it('accepts a name-only update', () => {
    expect(updateCurrentUserProfileSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('rejects role in the payload (not an editable self-service field)', () => {
    expect(updateCurrentUserProfileSchema.safeParse({ role: 'admin' }).success).toBe(false);
  });
});

describe('updateUserPasswordSchema', () => {
  it('requires a password', () => {
    expect(updateUserPasswordSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a password over 128 characters', () => {
    expect(updateUserPasswordSchema.safeParse({ password: 'a'.repeat(129) }).success).toBe(false);
  });

  it('accepts a valid password', () => {
    expect(updateUserPasswordSchema.safeParse({ password: 'newpass123' }).success).toBe(true);
  });
});

describe('assignUserRoleSchema', () => {
  it('requires a valid role', () => {
    expect(assignUserRoleSchema.safeParse({}).success).toBe(false);
    expect(assignUserRoleSchema.safeParse({ role: 'vendor' }).success).toBe(true);
  });
});

describe('listUsersQuerySchema', () => {
  it('coerces page and limit from query-string strings', () => {
    const result = listUsersQuerySchema.safeParse({ page: '2', limit: '25' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 2, limit: 25 });
  });

  it('rejects a limit above 100', () => {
    expect(listUsersQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });

  it('accepts isActive as the string "true" or "false"', () => {
    expect(listUsersQuerySchema.safeParse({ isActive: 'true' }).success).toBe(true);
    expect(listUsersQuerySchema.safeParse({ isActive: 'maybe' }).success).toBe(false);
  });
});
