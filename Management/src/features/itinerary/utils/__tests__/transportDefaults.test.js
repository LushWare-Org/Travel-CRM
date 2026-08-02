import { describe, it, expect } from 'vitest';
import {
  TRANSPORT_PRICING_DEFAULTS,
  getDefaultPricingModel,
  createDefaultTransportRow,
  applyTransportModeDefault,
  applyPricingModelChange,
} from '../transportDefaults.js';

const row = (overrides = {}) => ({
  routeType: 'DAILY_ROUTING',
  transportMode: 'CAR',
  pricingModel: 'PER_KM',
  unitCost: 100,
  distanceKm: 25,
  ...overrides,
});

describe('TRANSPORT_PRICING_DEFAULTS', () => {
  it('maps every supported mode', () => {
    expect(TRANSPORT_PRICING_DEFAULTS).toEqual({
      CAR: 'PER_KM',
      VAN: 'PER_KM',
      FLIGHT: 'PER_PERSON',
      TRAIN: 'PER_PERSON',
      BUS: 'PER_PERSON',
      BOAT: 'PER_PERSON',
    });
  });
});

describe('getDefaultPricingModel', () => {
  it('returns PER_KM for car and van', () => {
    expect(getDefaultPricingModel('CAR')).toBe('PER_KM');
    expect(getDefaultPricingModel('VAN')).toBe('PER_KM');
  });

  it('returns PER_PERSON for passenger modes', () => {
    expect(getDefaultPricingModel('FLIGHT')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('TRAIN')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('BUS')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('BOAT')).toBe('PER_PERSON');
  });

  it('falls back to PER_VEHICLE for unknown modes', () => {
    expect(getDefaultPricingModel('WALK')).toBe('PER_VEHICLE');
    expect(getDefaultPricingModel(undefined)).toBe('PER_VEHICLE');
  });
});

describe('createDefaultTransportRow', () => {
  it('creates a CAR row with the PER_KM default', () => {
    expect(createDefaultTransportRow()).toEqual({
      routeType: 'DAILY_ROUTING',
      transportMode: 'CAR',
      pricingModel: 'PER_KM',
      unitCost: 0,
      distanceKm: null,
    });
  });
});

describe('applyTransportModeDefault', () => {
  it('sets the mode default pricing and keeps the unit cost', () => {
    const result = applyTransportModeDefault(row(), 'FLIGHT');
    expect(result.transportMode).toBe('FLIGHT');
    expect(result.pricingModel).toBe('PER_PERSON');
    expect(result.unitCost).toBe(100);
  });

  it('clears distance when leaving PER_KM', () => {
    const result = applyTransportModeDefault(row({ distanceKm: 25 }), 'FLIGHT');
    expect(result.pricingModel).toBe('PER_PERSON');
    expect(result.distanceKm).toBeNull();
  });

  it('keeps distance when switching into PER_KM', () => {
    const result = applyTransportModeDefault(row({ transportMode: 'FLIGHT', pricingModel: 'PER_PERSON', distanceKm: null }), 'CAR');
    expect(result.pricingModel).toBe('PER_KM');
    expect(result.distanceKm).toBeNull();
  });

  it('is a no-op when the mode is unchanged', () => {
    const original = row();
    expect(applyTransportModeDefault(original, 'CAR')).toBe(original);
  });
});

describe('applyPricingModelChange', () => {
  it('keeps the unit cost and clears distance when leaving PER_KM', () => {
    const result = applyPricingModelChange(row({ distanceKm: 25 }), 'PER_PERSON');
    expect(result.pricingModel).toBe('PER_PERSON');
    expect(result.unitCost).toBe(100);
    expect(result.distanceKm).toBeNull();
  });

  it('keeps distance when switching into PER_KM', () => {
    const result = applyPricingModelChange(row({ transportMode: 'FLIGHT', pricingModel: 'PER_PERSON', distanceKm: null }), 'PER_KM');
    expect(result.pricingModel).toBe('PER_KM');
    expect(result.distanceKm).toBeNull();
  });

  it('is a no-op when the pricing model is unchanged', () => {
    const original = row();
    expect(applyPricingModelChange(original, 'PER_KM')).toBe(original);
  });
});
