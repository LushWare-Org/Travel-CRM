import { describe, it, expect } from 'vitest';
import { classifyTripRecency, isSamePerson, STALE_AFTER_DAYS } from '../trip-recency.js';

const NOW = new Date('2026-09-11T00:00:00.000Z');
const days = (n) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('classifyTripRecency', () => {
  it('returns PAST for a trip whose last day has already gone by', () => {
    expect(classifyTripRecency({ travelDate: days(-20), endDate: days(-13) }, NOW)).toBe('PAST');
  });

  it('returns LIVE for a trip that has started but not yet ended', () => {
    expect(classifyTripRecency({ travelDate: days(-2), endDate: days(5) }, NOW)).toBe('LIVE');
  });

  it('returns LIVE for a trip that has not started yet', () => {
    expect(classifyTripRecency({ travelDate: days(30), endDate: days(37) }, NOW)).toBe('LIVE');
  });

  it('returns PAST for a confirmed booking whose end date has gone by', () => {
    expect(classifyTripRecency({ lifecycleStatus: 'CONFIRMED', endDate: days(-1) }, NOW)).toBe('PAST');
  });

  it('returns LIVE for a confirmed booking that has not travelled yet', () => {
    expect(classifyTripRecency({ lifecycleStatus: 'CONFIRMED', endDate: days(1) }, NOW)).toBe('LIVE');
  });

  it('falls back to the start date when no end date was ever recorded', () => {
    expect(classifyTripRecency({ travelDate: days(-4) }, NOW)).toBe('PAST');
    expect(classifyTripRecency({ travelDate: days(4) }, NOW)).toBe('LIVE');
  });

  it('returns LIVE for a dateless enquiry that was touched recently', () => {
    const lead = { lifecycleStatus: 'NEW', updatedAt: days(-3) };
    expect(classifyTripRecency(lead, NOW)).toBe('LIVE');
  });

  it('returns PAST for a dateless enquiry left untouched past the stale window', () => {
    const lead = { lifecycleStatus: 'NEW', updatedAt: days(-(STALE_AFTER_DAYS + 1)) };
    expect(classifyTripRecency(lead, NOW)).toBe('PAST');
  });

  it('returns PAST for a dateless booking that already completed', () => {
    expect(classifyTripRecency({ lifecycleStatus: 'CONFIRMED', updatedAt: NOW }, NOW)).toBe('PAST');
  });

  it('returns LIVE for a lead carrying no dates and no timestamps at all', () => {
    expect(classifyTripRecency({ lifecycleStatus: 'NEW' }, NOW)).toBe('LIVE');
  });

  it('ignores an unparseable date rather than treating it as the epoch', () => {
    const lead = { endDate: 'not-a-date', lifecycleStatus: 'NEW', updatedAt: days(-1) };
    expect(classifyTripRecency(lead, NOW)).toBe('LIVE');
  });
});

describe('isSamePerson', () => {
  it('is true when every named lead carries the same name', () => {
    expect(isSamePerson(['Nimal Perera', 'nimal  perera', ' Nimal Perera '])).toBe(true);
  });

  it('is false when two different people share the number', () => {
    expect(isSamePerson(['Nimal Perera', 'Kamala Silva'])).toBe(false);
  });

  it('is true for a single lead', () => {
    expect(isSamePerson(['Nimal Perera'])).toBe(true);
  });

  it('is true when no lead has a name to compare', () => {
    expect(isSamePerson([null, '', '  '])).toBe(true);
  });

  it('lets an unnamed lead sit alongside a named one without breaking the match', () => {
    expect(isSamePerson(['Nimal Perera', null])).toBe(true);
  });

  it('is true for an empty list', () => {
    expect(isSamePerson([])).toBe(true);
  });
});
