import { describe, it, expect } from 'vitest';
import { flipLegForReturn, getOutboundModalDefaults } from '../flightLegDefaults.ts';

describe('flipLegForReturn', () => {
  it('swaps origin and destination', () => {
    const result = flipLegForReturn({ origin: 'CMB', destination: 'DXB' });
    expect(result.origin).toBe('DXB');
    expect(result.destination).toBe('CMB');
  });

  it('carries cabinClass and airlinePreference over unchanged', () => {
    const result = flipLegForReturn({ origin: 'CMB', destination: 'DXB', cabinClass: 'Business', airlinePreference: 'EK' });
    expect(result.cabinClass).toBe('Business');
    expect(result.airlinePreference).toBe('EK');
  });

  it('clears departureTime — no sensible default across legs', () => {
    const result = flipLegForReturn({ origin: 'CMB', destination: 'DXB', departureTime: 'morning' });
    expect(result.departureTime).toBe('');
  });

  it('returns null when inbound has neither origin nor destination', () => {
    expect(flipLegForReturn({ cabinClass: 'Business' })).toBeNull();
    expect(flipLegForReturn({})).toBeNull();
  });

  it('returns null when inbound prefs are missing entirely', () => {
    expect(flipLegForReturn(null)).toBeNull();
    expect(flipLegForReturn(undefined)).toBeNull();
  });

  it('handles a one-sided route (only origin set)', () => {
    const result = flipLegForReturn({ origin: 'CMB' });
    expect(result.origin).toBe('');
    expect(result.destination).toBe('CMB');
  });
});

describe('getOutboundModalDefaults', () => {
  it('prefers existing outbound prefs over a flip', () => {
    const inbound = { origin: 'CMB', destination: 'DXB' };
    const outbound = { origin: 'DXB', destination: 'CMB', cabinClass: 'Economy' };
    expect(getOutboundModalDefaults(inbound, outbound)).toBe(outbound);
  });

  it('falls back to the flipped inbound leg when outbound is unset', () => {
    const inbound = { origin: 'CMB', destination: 'DXB', cabinClass: 'Business' };
    const result = getOutboundModalDefaults(inbound, null);
    expect(result).toEqual({ origin: 'DXB', destination: 'CMB', cabinClass: 'Business', airlinePreference: '', departureTime: '' });
  });

  it('falls back to the flipped inbound leg when outbound is an empty object', () => {
    const inbound = { origin: 'CMB', destination: 'DXB' };
    const result = getOutboundModalDefaults(inbound, {});
    expect(result.origin).toBe('DXB');
  });

  it('returns empty object when neither leg is set', () => {
    expect(getOutboundModalDefaults(null, null)).toEqual({});
    expect(getOutboundModalDefaults({}, {})).toEqual({});
  });
});
