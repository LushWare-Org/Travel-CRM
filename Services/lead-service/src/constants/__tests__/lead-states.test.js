import { describe, it, expect } from 'vitest';
import { LIFECYCLE_STATUSES, TERMINAL_STATUSES, REQUIRES_LOST_REASON, ALLOWED_TRANSITIONS } from '../lead-states.js';

describe('lead-states constants', () => {
  it('LIFECYCLE_STATUSES has exactly 11 entries', () => {
    expect(LIFECYCLE_STATUSES).toHaveLength(11);
  });

  it('LIFECYCLE_STATUSES contains all expected values', () => {
    expect(LIFECYCLE_STATUSES).toContain('PENDING_VERIFICATION');
    expect(LIFECYCLE_STATUSES).toContain('NEW');
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

  it('every transition target is a valid status', () => {
    for (const [from, toList] of Object.entries(ALLOWED_TRANSITIONS)) {
      expect(LIFECYCLE_STATUSES).toContain(from);
      for (const to of toList) {
        expect(LIFECYCLE_STATUSES).toContain(to);
      }
    }
  });

  it('terminal statuses have no outgoing transitions', () => {
    for (const status of TERMINAL_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toEqual([]);
    }
  });

  it('NEW can transition to DRAFTING and CLOSED_LOST', () => {
    expect(ALLOWED_TRANSITIONS['NEW']).toContain('DRAFTING');
    expect(ALLOWED_TRANSITIONS['NEW']).toContain('CLOSED_LOST');
    expect(ALLOWED_TRANSITIONS['NEW']).toHaveLength(2);
  });

  it('DRAFTING can transition to QUOTED and CLOSED_LOST', () => {
    expect(ALLOWED_TRANSITIONS['DRAFTING']).toContain('QUOTED');
    expect(ALLOWED_TRANSITIONS['DRAFTING']).toContain('CLOSED_LOST');
  });

  it('QUOTED can transition to REVISION, APPROVED, and CLOSED_LOST', () => {
    expect(ALLOWED_TRANSITIONS['QUOTED']).toContain('REVISION');
    expect(ALLOWED_TRANSITIONS['QUOTED']).toContain('APPROVED');
    expect(ALLOWED_TRANSITIONS['QUOTED']).toContain('CLOSED_LOST');
  });

  it('BOOKING_IN_PROGRESS can transition to CONFIRMED and BOOKING_FAILED', () => {
    expect(ALLOWED_TRANSITIONS['BOOKING_IN_PROGRESS']).toContain('CONFIRMED');
    expect(ALLOWED_TRANSITIONS['BOOKING_IN_PROGRESS']).toContain('BOOKING_FAILED');
  });

  it('CLOSED_LOST is terminal (no outgoing transitions)', () => {
    expect(ALLOWED_TRANSITIONS['CLOSED_LOST']).toEqual([]);
  });

  it('CANCELLED is terminal (no outgoing transitions)', () => {
    expect(ALLOWED_TRANSITIONS['CANCELLED']).toEqual([]);
  });
});
