import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  TRANSPORT_MODE,
  PRICING_MODEL,
  ROUTE_TYPE,
  TRANSPORT_PRICING_DEFAULTS,
  getDefaultPricingModel,
  createDefaultTransportRow,
  applyTransportModeDefault,
  applyPricingModelChange,
} from '../index.js';

describe('shared enums', () => {
  it('defines the exact transport modes', () => {
    expect(TRANSPORT_MODE).toEqual({
      FLIGHT: 'FLIGHT',
      CAR: 'CAR',
      TRAIN: 'TRAIN',
      BOAT: 'BOAT',
      VAN: 'VAN',
      BUS: 'BUS',
    });
  });

  it('defines the exact pricing models', () => {
    expect(PRICING_MODEL).toEqual({
      PER_KM: 'PER_KM',
      PER_PERSON: 'PER_PERSON',
      PER_VEHICLE: 'PER_VEHICLE',
    });
  });

  it('defines the exact route types', () => {
    expect(ROUTE_TYPE).toEqual({
      DAILY_ROUTING: 'DAILY_ROUTING',
      POINT_TO_POINT: 'POINT_TO_POINT',
    });
  });

  it('matches the package-service Prisma schema enums', () => {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // Services/shared/constants/src/__tests__ → package-service/prisma
    const schemaPath = path.resolve(here, '../../../../package-service/prisma/schema.prisma');
    const schema = readFileSync(schemaPath, 'utf8');

    const parseEnum = (name) => {
      const match = schema.match(new RegExp(`enum ${name} \\{([^}]*)\\}`));
      if (!match) throw new Error(`Prisma enum ${name} not found`);
      return match[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('@@') && !line.startsWith('//'));
    };

    expect(parseEnum('TransportMode').sort()).toEqual(Object.values(TRANSPORT_MODE).sort());
    expect(parseEnum('PricingModel').sort()).toEqual(Object.values(PRICING_MODEL).sort());
    expect(parseEnum('RouteType').sort()).toEqual(Object.values(ROUTE_TYPE).sort());
  });
});

describe('per-mode pricing defaults', () => {
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

  it('returns PER_KM for car and van, PER_PERSON for passenger modes', () => {
    expect(getDefaultPricingModel('CAR')).toBe('PER_KM');
    expect(getDefaultPricingModel('VAN')).toBe('PER_KM');
    expect(getDefaultPricingModel('FLIGHT')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('TRAIN')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('BUS')).toBe('PER_PERSON');
    expect(getDefaultPricingModel('BOAT')).toBe('PER_PERSON');
  });

  it('falls back to PER_VEHICLE for unknown modes', () => {
    expect(getDefaultPricingModel('WALK')).toBe('PER_VEHICLE');
    expect(getDefaultPricingModel(undefined)).toBe('PER_VEHICLE');
  });

  it('creates a CAR row with the PER_KM default', () => {
    expect(createDefaultTransportRow()).toEqual({
      routeType: 'DAILY_ROUTING',
      transportMode: 'CAR',
      pricingModel: 'PER_KM',
      unitCost: 0,
      distanceKm: null,
    });
  });

  it('applies the mode default, keeps unit cost, clears distance leaving PER_KM', () => {
    const result = applyTransportModeDefault({
      transportMode: 'CAR',
      pricingModel: 'PER_KM',
      unitCost: 100,
      distanceKm: 25,
    }, 'FLIGHT');
    expect(result).toEqual({
      transportMode: 'FLIGHT',
      pricingModel: 'PER_PERSON',
      unitCost: 100,
      distanceKm: null,
    });
  });

  it('keeps distance when switching into PER_KM', () => {
    const result = applyTransportModeDefault({
      transportMode: 'FLIGHT',
      pricingModel: 'PER_PERSON',
      unitCost: 100,
      distanceKm: null,
    }, 'CAR');
    expect(result.pricingModel).toBe('PER_KM');
    expect(result.distanceKm).toBeNull();
  });

  it('is a no-op for same mode or same pricing model', () => {
    const row = { transportMode: 'CAR', pricingModel: 'PER_KM', unitCost: 100, distanceKm: 25 };
    expect(applyTransportModeDefault(row, 'CAR')).toBe(row);
    expect(applyPricingModelChange(row, 'PER_KM')).toBe(row);
  });

  it('clears distance when pricing leaves PER_KM and keeps it entering PER_KM', () => {
    const row = { transportMode: 'CAR', pricingModel: 'PER_KM', unitCost: 100, distanceKm: 25 };
    const left = applyPricingModelChange(row, 'PER_PERSON');
    expect(left).toMatchObject({ pricingModel: 'PER_PERSON', unitCost: 100, distanceKm: null });
    const entered = applyPricingModelChange({ ...left, distanceKm: null }, 'PER_KM');
    expect(entered.distanceKm).toBeNull();
  });
});
