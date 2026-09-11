import { describe, it, expect } from 'vitest';
import {
  splitLegs,
  legStops,
  legDurationMinutes,
  journeyStops,
  routeChain,
} from '../flightSegments.ts';

// Segment shapes mirror the live Duffel normalization: one object per segment,
// a round trip flattened into outbound segments followed by return segments.
const seg = (origin, destination, durationMinutes) => ({ origin, destination, durationMinutes });

const ONE_WAY_CONNECTING = [seg('LHR', 'IST', 120), seg('IST', 'DXB', 255)];
const ROUND_TRIP_NONSTOP = [seg('LHR', 'DXB', 420), seg('DXB', 'LHR', 430)];
const ROUND_TRIP_ONE_EACH_WAY = [seg('LHR', 'IST', 120), seg('IST', 'DXB', 255), seg('DXB', 'AMS', 90), seg('AMS', 'LHR', 100)];
const ROUND_TRIP_THREE_AND_TWO = [
  seg('LHR', 'IST', 100),
  seg('IST', 'DXB', 200),
  seg('DXB', 'CMB', 300),
  seg('CMB', 'AUH', 100),
  seg('AUH', 'LHR', 200),
];

describe('splitLegs', () => {
  it('keeps a one-way as a single leg', () => {
    const legs = splitLegs(ONE_WAY_CONNECTING, 'DXB');
    expect(legs).toHaveLength(1);
    expect(legs[0]).toBe(ONE_WAY_CONNECTING);
  });

  it('splits a round trip at the searched destination', () => {
    const legs = splitLegs(ROUND_TRIP_ONE_EACH_WAY, 'DXB');
    expect(legs).toHaveLength(2);
    expect(legs[0]).toHaveLength(2);
    expect(legs[1]).toHaveLength(2);
    expect(legs[0].map((s) => s.destination)).toEqual(['IST', 'DXB']);
    expect(legs[1].map((s) => s.destination)).toEqual(['AMS', 'LHR']);
  });

  it('returns one leg when the turn point is omitted', () => {
    expect(splitLegs(ROUND_TRIP_NONSTOP)).toHaveLength(1);
  });

  it('returns one leg when the turn point is never reached', () => {
    expect(splitLegs(ROUND_TRIP_NONSTOP, 'CMB')).toHaveLength(1);
  });

  it('returns one leg when the turn point is only reached at the last segment', () => {
    expect(splitLegs(ROUND_TRIP_NONSTOP, 'LHR')).toHaveLength(1);
  });

  it('splits at a turn point that is reached mid-list', () => {
    const legs = splitLegs(ONE_WAY_CONNECTING, 'IST');
    expect(legs).toHaveLength(2);
    expect(legs[0]).toHaveLength(1);
    expect(legs[1]).toHaveLength(1);
  });

  it('returns no legs for an empty or missing segment list', () => {
    expect(splitLegs(undefined)).toEqual([]);
    expect(splitLegs([])).toEqual([]);
  });
});

describe('stops', () => {
  it('counts connections per leg, never below zero', () => {
    expect(legStops([])).toBe(0);
    expect(legStops([seg('LHR', 'DXB', 1)])).toBe(0);
    expect(legStops(ONE_WAY_CONNECTING)).toBe(1);
  });

  it('sums every leg of the journey', () => {
    expect(journeyStops(splitLegs(ROUND_TRIP_NONSTOP, 'DXB'))).toBe(0);
    expect(journeyStops(splitLegs(ROUND_TRIP_ONE_EACH_WAY, 'DXB'))).toBe(2);
    expect(journeyStops(splitLegs(ROUND_TRIP_THREE_AND_TWO, 'CMB'))).toBe(3);
    expect(journeyStops(splitLegs(ONE_WAY_CONNECTING, 'DXB'))).toBe(1);
    expect(journeyStops(splitLegs([], 'DXB'))).toBe(0);
  });
});

describe('legDurationMinutes', () => {
  it('adds the leg’s own segment durations', () => {
    const [outbound] = splitLegs(ROUND_TRIP_ONE_EACH_WAY, 'DXB');
    expect(legDurationMinutes(outbound)).toBe(375);
  });
});

describe('routeChain', () => {
  it('names each city once, in order, for a one-way', () => {
    expect(routeChain(ONE_WAY_CONNECTING)).toBe('LHR → IST → DXB');
  });

  it('does not repeat the turn-around city for a round trip', () => {
    expect(routeChain(ROUND_TRIP_NONSTOP)).toBe('LHR → DXB → LHR');
    expect(routeChain(ROUND_TRIP_ONE_EACH_WAY)).toBe('LHR → IST → DXB → AMS → LHR');
  });

  it('handles missing segments and unnamed cities', () => {
    expect(routeChain(undefined)).toBe('');
    expect(routeChain([])).toBe('');
    expect(routeChain([{ origin: '', destination: 'DXB' }, { origin: 'DXB', destination: '' }])).toBe('DXB');
  });

  it('does not repeat a city when a segment starts and ends in the same place', () => {
    expect(routeChain([seg('CMB', 'CMB', 30)])).toBe('CMB');
  });
});
