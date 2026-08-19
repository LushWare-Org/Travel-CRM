import { describe, it, expect } from 'vitest';
import { createSalesRepSchema, updateSalesRepSchema, listSalesRepsQuerySchema } from '../salesRep.validator.js';

describe('createSalesRepSchema', () => {
  it('accepts a valid payload', () => {
    expect(createSalesRepSchema.safeParse({ name: 'Priya Nair', email: 'priya@test.com' }).success).toBe(true);
  });

  it('rejects a missing email', () => {
    expect(createSalesRepSchema.safeParse({ name: 'Priya Nair' }).success).toBe(false);
  });

  it('rejects a role field (role is fixed server-side, not client-settable)', () => {
    expect(createSalesRepSchema.safeParse({ name: 'Priya Nair', email: 'priya@test.com', role: 'admin' }).success).toBe(false);
  });
});

describe('updateSalesRepSchema', () => {
  it('accepts a partial update', () => {
    expect(updateSalesRepSchema.safeParse({ phone: '+94770000000' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(updateSalesRepSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('listSalesRepsQuerySchema', () => {
  it('coerces limit from a query-string value', () => {
    const result = listSalesRepsQuerySchema.safeParse({ limit: '5' });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(5);
  });
});
