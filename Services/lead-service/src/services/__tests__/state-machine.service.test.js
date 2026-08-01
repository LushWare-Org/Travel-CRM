import { describe, it, expect } from 'vitest';
import { validateTransition, StateMachineError } from '../state-machine.service.js';

describe('validateTransition', () => {
  // ── Happy path transitions ──────────────────────────

  it('allows NEW -> DRAFTING', () => {
    const r = validateTransition({ currentStatus: 'NEW', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
    expect(r.recalculate).toBe(false);
  });

  it('allows DRAFTING -> QUOTED when quotedSellingPrice > 0', () => {
    const r = validateTransition({
      currentStatus: 'DRAFTING',
      nextStatus: 'QUOTED',
      financials: { clientPricing: { quotedSellingPrice: 1000 } },
    });
    expect(r.nextStatus).toBe('QUOTED');
  });

  it('allows QUOTED -> APPROVED when depositPaid > 0', () => {
    const r = validateTransition({
      currentStatus: 'QUOTED',
      nextStatus: 'APPROVED',
      financials: { clientPricing: { depositPaid: 500 } },
    });
    expect(r.nextStatus).toBe('APPROVED');
  });

  it('allows REVISION -> DRAFTING', () => {
    const r = validateTransition({ currentStatus: 'REVISION', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
  });

  it('allows REVISION -> QUOTED', () => {
    const r = validateTransition({ currentStatus: 'REVISION', nextStatus: 'QUOTED' });
    expect(r.nextStatus).toBe('QUOTED');
  });

  it('allows APPROVED -> BOOKING_IN_PROGRESS', () => {
    const r = validateTransition({ currentStatus: 'APPROVED', nextStatus: 'BOOKING_IN_PROGRESS' });
    expect(r.nextStatus).toBe('BOOKING_IN_PROGRESS');
  });

  it('allows BOOKING_IN_PROGRESS -> BOOKING_FAILED', () => {
    const r = validateTransition({ currentStatus: 'BOOKING_IN_PROGRESS', nextStatus: 'BOOKING_FAILED' });
    expect(r.nextStatus).toBe('BOOKING_FAILED');
  });

  it('allows BOOKING_FAILED -> BOOKING_IN_PROGRESS', () => {
    const r = validateTransition({ currentStatus: 'BOOKING_FAILED', nextStatus: 'BOOKING_IN_PROGRESS' });
    expect(r.nextStatus).toBe('BOOKING_IN_PROGRESS');
  });

  it('allows BOOKING_FAILED -> CLOSED_LOST with lostReason', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_FAILED',
      nextStatus: 'CLOSED_LOST',
      lostReason: 'Client found another provider',
    });
    expect(r.nextStatus).toBe('CLOSED_LOST');
  });

  it('allows CONFIRMED -> CANCELLED', () => {
    const r = validateTransition({ currentStatus: 'CONFIRMED', nextStatus: 'CANCELLED' });
    expect(r.nextStatus).toBe('CANCELLED');
  });

  it('same status is no-op', () => {
    const r = validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'DRAFTING' });
    expect(r.nextStatus).toBe('DRAFTING');
    expect(r.recalculate).toBe(false);
  });

  // ── Blocked transitions ─────────────────────────────

  it('blocks DRAFTING -> CONFIRMED (invalid jump)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'CONFIRMED' }),
    ).toThrow(StateMachineError);
  });

  it('blocks NEW -> APPROVED (invalid jump)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'NEW', nextStatus: 'APPROVED' }),
    ).toThrow(StateMachineError);
  });

  it('blocks CONFIRMED -> DRAFTING (terminal)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'CONFIRMED', nextStatus: 'DRAFTING' }),
    ).toThrow(StateMachineError);
  });

  it('blocks CLOSED_LOST -> anything (terminal)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'CLOSED_LOST', nextStatus: 'NEW' }),
    ).toThrow(StateMachineError);
  });

  // ── Gatekeeper: QUOTED price ────────────────────────

  it('blocks DRAFTING -> QUOTED when quotedSellingPrice is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'DRAFTING',
        nextStatus: 'QUOTED',
        financials: { clientPricing: { quotedSellingPrice: 0 } },
      }),
    ).toThrow(/quotedSellingPrice/);
  });

  it('blocks DRAFTING -> QUOTED when financials is empty', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'QUOTED' }),
    ).toThrow(/quotedSellingPrice/);
  });

  // ── Gatekeeper: APPROVED deposit ────────────────────

  it('blocks QUOTED -> APPROVED when depositPaid is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'QUOTED',
        nextStatus: 'APPROVED',
        financials: { clientPricing: { depositPaid: 0 } },
      }),
    ).toThrow(/depositPaid/);
  });

  it('blocks REVISION -> APPROVED when depositPaid is missing', () => {
    expect(() =>
      validateTransition({ currentStatus: 'REVISION', nextStatus: 'APPROVED' }),
    ).toThrow(/depositPaid/);
  });

  // ── Gatekeeper: CONFIRMED actual costs ──────────────

  it('blocks BOOKING_IN_PROGRESS -> CONFIRMED when actualFlightCost is 0', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'BOOKING_IN_PROGRESS',
        nextStatus: 'CONFIRMED',
        financials: { actual: { actualFlightCost: 0, actualHotelCost: 200 } },
      }),
    ).toThrow(/actualFlightCost/);
  });

  it('blocks BOOKING_IN_PROGRESS -> CONFIRMED when actualHotelCost is missing', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'BOOKING_IN_PROGRESS',
        nextStatus: 'CONFIRMED',
        financials: { actual: { actualFlightCost: 300 } },
      }),
    ).toThrow(/actualHotelCost/);
  });

  it('allows BOOKING_IN_PROGRESS -> CONFIRMED when both actual costs > 0', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_IN_PROGRESS',
      nextStatus: 'CONFIRMED',
      financials: { actual: { actualFlightCost: 300, actualHotelCost: 200 } },
    });
    expect(r.nextStatus).toBe('CONFIRMED');
    expect(r.recalculate).toBe(true);
  });

  // ── Gatekeeper: CLOSED_LOST reason ──────────────────

  it('blocks any -> CLOSED_LOST without lostReason', () => {
    expect(() =>
      validateTransition({ currentStatus: 'DRAFTING', nextStatus: 'CLOSED_LOST' }),
    ).toThrow(/lostReason/);
  });

  it('blocks CLOSED_LOST with empty lostReason string', () => {
    expect(() =>
      validateTransition({
        currentStatus: 'DRAFTING',
        nextStatus: 'CLOSED_LOST',
        lostReason: '   ',
      }),
    ).toThrow(/lostReason/);
  });

  // ── Edge cases ──────────────────────────────────────

  it('throws when currentStatus is null', () => {
    expect(() =>
      validateTransition({ currentStatus: null, nextStatus: 'DRAFTING' }),
    ).toThrow(StateMachineError);
  });

  it('throws when currentStatus is undefined', () => {
    expect(() =>
      validateTransition({ currentStatus: undefined, nextStatus: 'DRAFTING' }),
    ).toThrow(StateMachineError);
  });

  it('recalculate flag is true on BOOKING_IN_PROGRESS -> CONFIRMED', () => {
    const r = validateTransition({
      currentStatus: 'BOOKING_IN_PROGRESS',
      nextStatus: 'CONFIRMED',
      financials: { actual: { actualFlightCost: 500, actualHotelCost: 400 } },
    });
    expect(r.recalculate).toBe(true);
  });

  it('recalculate flag is false on non-CONFIRMED transitions', () => {
    const r = validateTransition({ currentStatus: 'NEW', nextStatus: 'DRAFTING' });
    expect(r.recalculate).toBe(false);
  });

  // ── Additional transition paths ─────────────────────

  it('allows DRAFTING -> CLOSED_LOST with reason', () => {
    const r = validateTransition({
      currentStatus: 'DRAFTING',
      nextStatus: 'CLOSED_LOST',
      lostReason: 'Client not interested',
    });
    expect(r.nextStatus).toBe('CLOSED_LOST');
  });

  it('allows QUOTED -> REVISION', () => {
    const r = validateTransition({ currentStatus: 'QUOTED', nextStatus: 'REVISION' });
    expect(r.nextStatus).toBe('REVISION');
  });

  it('allows REVISION -> APPROVED with deposit', () => {
    const r = validateTransition({
      currentStatus: 'REVISION',
      nextStatus: 'APPROVED',
      financials: { clientPricing: { depositPaid: 100 } },
    });
    expect(r.nextStatus).toBe('APPROVED');
  });

  it('allows BOOKING_FAILED -> REVISION', () => {
    const r = validateTransition({ currentStatus: 'BOOKING_FAILED', nextStatus: 'REVISION' });
    expect(r.nextStatus).toBe('REVISION');
  });

  it('allows APPROVED -> CLOSED_LOST with reason', () => {
    const r = validateTransition({
      currentStatus: 'APPROVED',
      nextStatus: 'CLOSED_LOST',
      lostReason: 'Client went with competitor',
    });
    expect(r.nextStatus).toBe('CLOSED_LOST');
  });

  it('blocks CANCELLED -> anything (terminal)', () => {
    expect(() =>
      validateTransition({ currentStatus: 'CANCELLED', nextStatus: 'NEW' }),
    ).toThrow(StateMachineError);
  });
});
