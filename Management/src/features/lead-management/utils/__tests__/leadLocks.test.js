import { describe, it, expect } from 'vitest';
import { isLeadFieldLocked, FIELD_LOCKED_STATUSES } from '../leadLocks.js';

describe('isLeadFieldLocked', () => {
  it('is unlocked for NEW', () => {
    expect(isLeadFieldLocked('NEW')).toBe(false);
  });

  it('is unlocked for DRAFTING', () => {
    expect(isLeadFieldLocked('DRAFTING')).toBe(false);
  });

  it.each(FIELD_LOCKED_STATUSES)('is locked for %s', (status) => {
    expect(isLeadFieldLocked(status)).toBe(true);
  });

  it('is locked for REVISION specifically — going back to DRAFTING is required to unlock', () => {
    expect(isLeadFieldLocked('REVISION')).toBe(true);
  });

  it('is unlocked for an undefined/missing status', () => {
    expect(isLeadFieldLocked(undefined)).toBe(false);
  });
});
