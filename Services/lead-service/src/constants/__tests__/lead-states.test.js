import { describe, it, expect } from 'vitest';
import { LIFECYCLE_STATUSES, TERMINAL_STATUSES, REQUIRES_LOST_REASON, ALLOWED_TRANSITIONS } from '../lead-states.js';

describe('lead-states constants', () => {
  it('LIFECYCLE_STATUSES has exactly 10 entries', () => {
    expect(LIFECYCLE_STATUSES).toHaveLength(10);
  });

  it('LIFECYCLE_STATUSES contains all expected values', () => {
    expect(LIFECYCLE_STATUSES).toContain('NEW');
    expect(LIFECYCLE_STATUSES).toContain('DRAFTING');
    expect(LIFECYCLE_STATUSES).toContain('QUOTED');
    expect(LIFECYCLE_STATUSES).toContain('REVISION');
    expect(LIFECYCLE_STATUSES).toContain('APPROVED');
    expect(LIFECYCLE_STATUSES).toContain('BOOKING_IN_PROGRESS');
    expect(LIFECYCLE_STATUSES).toContain('CONFIRMED');
    expect(LIFECYCLE_STATUSES).toContain('CLOSED_LOST');
    expect(LIFECYCLE_STATUSES).toContain('BOOKING_FAILED');
    expect(LIFECYCLE_STATUSES).toContain('CANCELLED');
  });

  it('TERMINAL_STATUSES includes CLOSED_LOST and CANCELLED', () => {
    expect(TERMINAL_STATUSES).toContain('CLOSED_LOST');
    expect(TERMINAL_STATUSES).toContain('CANCELLED');
    expect(TERMINAL_STATUSES).toHaveLength(2);
  });

  it('REQUIRES_LOST_REASON includes CLOSED_LOST', () => {
    expect(REQUIRES_LOST_REASON).toContain('CLOSED_LOST');
  });

  it('ALLOWED_TRANSITIONS is an empty object (Phase 1 placeholder)', () => {
    expect(ALLOWED_TRANSITIONS).toEqual({});
  });
});
