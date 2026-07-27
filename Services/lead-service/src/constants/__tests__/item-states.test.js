import { describe, it, expect } from 'vitest';
import { ITEM_BOOKING_STATES, deriveItemState } from '../item-states.js';

describe('ITEM_BOOKING_STATES', () => {
  it('has exactly 4 values', () => {
    expect(ITEM_BOOKING_STATES).toHaveLength(4);
  });

  it('contains expected values', () => {
    expect(ITEM_BOOKING_STATES).toContain('PENDING');
    expect(ITEM_BOOKING_STATES).toContain('READY_TO_BOOK');
    expect(ITEM_BOOKING_STATES).toContain('BOOKED');
    expect(ITEM_BOOKING_STATES).toContain('FAILED');
  });
});

describe('deriveItemState', () => {
  it('returns PENDING when lead is DRAFTING and no booking', () => {
    expect(deriveItemState('DRAFTING', false, false)).toBe('PENDING');
  });

  it('returns PENDING when lead is NEW', () => {
    expect(deriveItemState('NEW', false, false)).toBe('PENDING');
  });

  it('returns PENDING when lead is QUOTED', () => {
    expect(deriveItemState('QUOTED', false, false)).toBe('PENDING');
  });

  it('returns READY_TO_BOOK when lead is APPROVED and no booking', () => {
    expect(deriveItemState('APPROVED', false, false)).toBe('READY_TO_BOOK');
  });

  it('returns READY_TO_BOOK when lead is BOOKING_IN_PROGRESS and no booking', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', false, false)).toBe('READY_TO_BOOK');
  });

  it('returns BOOKED when booking exists', () => {
    expect(deriveItemState('APPROVED', true, false)).toBe('BOOKED');
  });

  it('returns BOOKED even when lead is DRAFTING (booking already made)', () => {
    expect(deriveItemState('DRAFTING', true, false)).toBe('BOOKED');
  });

  it('returns FAILED when booking failed, regardless of lead status', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', false, true)).toBe('FAILED');
  });

  it('prioritizes FAILED over BOOKED when both are true', () => {
    expect(deriveItemState('BOOKING_IN_PROGRESS', true, true)).toBe('FAILED');
  });

  it('returns PENDING when lead status is CLOSED_LOST', () => {
    expect(deriveItemState('CLOSED_LOST', false, false)).toBe('PENDING');
  });
});
