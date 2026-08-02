import { describe, it, expect } from 'vitest';
import {
  isFlightIncomplete,
  resolveFlightAdd,
  resolveFlightEdit,
  resolveFlightRemove,
  countUnlinkedFlightRows,
  reconcileFlightsForSave,
} from '../flightSync.js';

const flightRow = (overrides = {}) => ({
  routeType: 'DAILY_ROUTING',
  transportMode: 'FLIGHT',
  pricingModel: 'PER_VEHICLE',
  unitCost: 0,
  distanceKm: null,
  ...overrides,
});

const carRow = (overrides = {}) => ({
  routeType: 'DAILY_ROUTING',
  transportMode: 'CAR',
  pricingModel: 'PER_VEHICLE',
  unitCost: 120,
  distanceKm: null,
  ...overrides,
});

const completeFlight = (overrides = {}) => ({
  id: 'f-1',
  origin: 'CMB',
  destination: 'DXB',
  cabinClass: 'Economy',
  departureTime: '',
  airlinePreference: '',
  totalAmount: 0,
  ...overrides,
});

describe('isFlightIncomplete', () => {
  it('treats null/undefined as incomplete', () => {
    expect(isFlightIncomplete(null)).toBe(true);
    expect(isFlightIncomplete(undefined)).toBe(true);
  });

  it('treats an empty flight as incomplete', () => {
    expect(isFlightIncomplete({})).toBe(true);
  });

  it('treats a flight missing origin or destination as incomplete', () => {
    expect(isFlightIncomplete({ origin: 'CMB' })).toBe(true);
    expect(isFlightIncomplete({ destination: 'DXB' })).toBe(true);
  });

  it('treats a routed flight as complete even with price 0', () => {
    expect(isFlightIncomplete({ origin: 'CMB', destination: 'DXB', totalAmount: 0 })).toBe(false);
  });
});

describe('resolveFlightAdd', () => {
  it('appends a flight and a linked row on an empty day', () => {
    const { flights, transports } = resolveFlightAdd({ flightData: { origin: 'CMB', destination: 'DXB' } });
    expect(flights).toHaveLength(1);
    expect(flights[0].origin).toBe('CMB');
    expect(flights[0].id).toBeTruthy();
    expect(transports).toHaveLength(1);
    expect(transports[0].flightRef).toBe(flights[0].id);
    expect(transports[0].unitCost).toBe(0);
    expect(transports[0].pricingModel).toBe('PER_PERSON');
  });

  it('claims the first orphan row instead of appending a duplicate', () => {
    const orphan = flightRow({ unitCost: 300 });
    const { flights, transports } = resolveFlightAdd({
      transports: [orphan, flightRow({ unitCost: 100 })],
      flightData: { origin: 'CMB', destination: 'DXB' },
    });
    expect(transports).toHaveLength(2);
    expect(transports[0].flightRef).toBe(flights[0].id);
    expect(transports[1].flightRef).toBeFalsy();
    expect(countUnlinkedFlightRows(transports)).toBe(1);
  });

  it('replaces an incomplete flight in place, keeping its id', () => {
    const incomplete = completeFlight({ id: 'f-incomplete', origin: '' });
    const { flights } = resolveFlightAdd({
      flights: [incomplete],
      flightData: { origin: 'CMB', destination: 'DXB' },
    });
    expect(flights).toHaveLength(1);
    expect(flights[0].id).toBe('f-incomplete');
    expect(flights[0].origin).toBe('CMB');
  });

  it('replaces the incomplete flight and claims an orphan row', () => {
    const incomplete = completeFlight({ id: 'f-incomplete', origin: '' });
    const orphan = flightRow({ unitCost: 250 });
    const { flights, transports } = resolveFlightAdd({
      flights: [incomplete],
      transports: [orphan],
      flightData: { origin: 'CMB', destination: 'DXB', totalAmount: 0 },
    });
    expect(flights).toHaveLength(1);
    expect(transports).toHaveLength(1);
    expect(transports[0].flightRef).toBe('f-incomplete');
    // no real price yet — manual cost preserved
    expect(transports[0].unitCost).toBe(250);
  });

  it('updates the incomplete flight row and leaves a separate orphan untouched', () => {
    const incomplete = completeFlight({ id: 'f-incomplete', origin: '' });
    const linkedRow = flightRow({ flightRef: 'f-incomplete', unitCost: 80 });
    const orphan = flightRow({ unitCost: 999 });
    const { flights, transports } = resolveFlightAdd({
      flights: [incomplete],
      transports: [linkedRow, orphan],
      flightData: { origin: 'CMB', destination: 'DXB', totalAmount: 450 },
    });
    expect(flights[0].id).toBe('f-incomplete');
    expect(transports[0].flightRef).toBe('f-incomplete');
    expect(transports[0].unitCost).toBe(450);
    expect(transports[1].flightRef).toBeFalsy();
  });

  it('appends a new flight when all existing flights are complete', () => {
    const existing = completeFlight();
    const { flights } = resolveFlightAdd({
      flights: [existing],
      flightData: { origin: 'LHR', destination: 'JFK' },
    });
    expect(flights).toHaveLength(2);
    expect(flights[1].origin).toBe('LHR');
  });

  it('sets the row cost from a real flight price on claim', () => {
    const orphan = flightRow({ unitCost: 300 });
    const { transports } = resolveFlightAdd({
      transports: [orphan],
      flightData: { origin: 'CMB', destination: 'DXB', totalAmount: 450 },
    });
    expect(transports[0].unitCost).toBe(450);
  });

  it('preserves the manual row cost when the flight price is 0', () => {
    const orphan = flightRow({ unitCost: 300 });
    const { transports } = resolveFlightAdd({
      transports: [orphan],
      flightData: { origin: 'CMB', destination: 'DXB', totalAmount: 0 },
    });
    expect(transports[0].unitCost).toBe(300);
  });

  it('keeps manual non-flight rows untouched', () => {
    const car = carRow();
    const { transports } = resolveFlightAdd({
      transports: [car],
      flightData: { origin: 'CMB', destination: 'DXB' },
    });
    expect(transports).toHaveLength(2);
    expect(transports[0]).toEqual(car);
  });

  it('a flight added without a route is incomplete and the next add updates it', () => {
    const first = resolveFlightAdd({ flightData: {} });
    expect(isFlightIncomplete(first.flights[0])).toBe(true);
    const second = resolveFlightAdd({
      flights: first.flights,
      transports: first.transports,
      flightData: { origin: 'CMB', destination: 'DXB' },
    });
    expect(second.flights).toHaveLength(1);
    expect(second.flights[0].id).toBe(first.flights[0].id);
    expect(second.flights[0].origin).toBe('CMB');
  });
});

describe('resolveFlightEdit', () => {
  it('updates the flight in place and keeps its id', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const { flights: next } = resolveFlightEdit({
      flights,
      index: 0,
      patch: { destination: 'AUH' },
    });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('f-1');
    expect(next[0].destination).toBe('AUH');
  });

  it('updates the linked row cost when the flight has a real price', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const transports = [flightRow({ flightRef: 'f-1', unitCost: 100 })];
    const result = resolveFlightEdit({
      flights,
      transports,
      index: 0,
      patch: { totalAmount: 450 },
    });
    expect(result.transports[0].unitCost).toBe(450);
  });

  it('preserves the linked row cost when the edited price is 0', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const transports = [flightRow({ flightRef: 'f-1', unitCost: 100 })];
    const result = resolveFlightEdit({
      flights,
      transports,
      index: 0,
      patch: { destination: 'AUH', totalAmount: 0 },
    });
    expect(result.transports[0].unitCost).toBe(100);
  });

  it('claims an orphan row when the edited flight has no row', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const orphan = flightRow({ unitCost: 200 });
    const result = resolveFlightEdit({
      flights,
      transports: [orphan],
      index: 0,
      patch: { destination: 'AUH' },
    });
    expect(result.transports[0].flightRef).toBe('f-1');
    expect(result.transports[0].unitCost).toBe(200);
  });

  it('appends a row when the edited flight has no row and no orphan exists', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const result = resolveFlightEdit({
      flights,
      index: 0,
      patch: { destination: 'AUH', totalAmount: 0 },
    });
    expect(result.transports).toHaveLength(1);
    expect(result.transports[0].flightRef).toBe('f-1');
    expect(result.transports[0].unitCost).toBe(0);
    expect(result.transports[0].pricingModel).toBe('PER_PERSON');
  });

  it('is a no-op for an out-of-range index', () => {
    const flights = [completeFlight()];
    const transports = [carRow()];
    const result = resolveFlightEdit({ flights, transports, index: 5, patch: {} });
    expect(result.flights).toEqual(flights);
    expect(result.transports).toEqual(transports);
  });
});

describe('resolveFlightRemove', () => {
  it('removes the flight and its linked row', () => {
    const flights = [completeFlight({ id: 'f-1' }), completeFlight({ id: 'f-2' })];
    const transports = [
      flightRow({ flightRef: 'f-1', unitCost: 450 }),
      flightRow({ flightRef: 'f-2', unitCost: 300 }),
      carRow(),
    ];
    const result = resolveFlightRemove({ flights, transports, flightId: 'f-1' });
    expect(result.flights.map(f => f.id)).toEqual(['f-2']);
    expect(result.transports.map(t => t.flightRef)).toEqual(['f-2', undefined]);
  });

  it('removes only the flight when it has no row', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const transports = [carRow()];
    const result = resolveFlightRemove({ flights, transports, flightId: 'f-1' });
    expect(result.flights).toHaveLength(0);
    expect(result.transports).toEqual(transports);
  });

  it('does nothing for an unknown flight id', () => {
    const flights = [completeFlight({ id: 'f-1' })];
    const transports = [carRow()];
    const result = resolveFlightRemove({ flights, transports, flightId: 'nope' });
    expect(result.flights).toEqual(flights);
    expect(result.transports).toEqual(transports);
  });
});

describe('countUnlinkedFlightRows', () => {
  it('counts only FLIGHT rows without flightRef', () => {
    const transports = [
      flightRow({ flightRef: 'f-1' }),
      flightRow(),
      flightRow(),
      carRow(),
    ];
    expect(countUnlinkedFlightRows(transports)).toBe(2);
  });
});

describe('reconcileFlightsForSave', () => {
  it('keeps manual non-flight rows and orphan FLIGHT rows', () => {
    const car = carRow();
    const orphan = flightRow({ unitCost: 100 });
    const result = reconcileFlightsForSave({ flights: [], transports: [car, orphan] });
    expect(result).toEqual([car, orphan]);
  });

  it('uses the real flight price when it exists', () => {
    const flights = [completeFlight({ id: 'f-1', totalAmount: 450 })];
    const transports = [flightRow({ flightRef: 'f-1', unitCost: 300 })];
    const result = reconcileFlightsForSave({ flights, transports });
    expect(result).toHaveLength(1);
    expect(result[0].unitCost).toBe(450);
  });

  it('preserves the manual row cost while the flight price is 0', () => {
    const flights = [completeFlight({ id: 'f-1', totalAmount: 0 })];
    const transports = [flightRow({ flightRef: 'f-1', unitCost: 300 })];
    const result = reconcileFlightsForSave({ flights, transports });
    expect(result).toHaveLength(1);
    expect(result[0].unitCost).toBe(300);
  });

  it('defaults a flight without a row to 0 when the price is 0', () => {
    const flights = [completeFlight({ id: 'f-1', totalAmount: 0 })];
    const result = reconcileFlightsForSave({ flights, transports: [] });
    expect(result).toHaveLength(1);
    expect(result[0].unitCost).toBe(0);
    expect(result[0].pricingModel).toBe('PER_PERSON');
  });

  it('preserves a manually set pricing model on a linked row at save', () => {
    const flights = [completeFlight({ id: 'f-1', totalAmount: 450 })];
    const transports = [flightRow({ flightRef: 'f-1', unitCost: 999, pricingModel: 'PER_VEHICLE' })];
    const result = reconcileFlightsForSave({ flights, transports });
    expect(result).toHaveLength(1);
    expect(result[0].pricingModel).toBe('PER_VEHICLE');
    expect(result[0].unitCost).toBe(450);
  });

  it('combines manual rows, orphans and linked flights', () => {
    const car = carRow();
    const orphan = flightRow({ unitCost: 100 });
    const flights = [completeFlight({ id: 'f-1', totalAmount: 450 })];
    const transports = [car, orphan, flightRow({ flightRef: 'f-1', unitCost: 999 })];
    const result = reconcileFlightsForSave({ flights, transports });
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(car);
    expect(result[1]).toEqual(orphan);
    expect(result[2]).toMatchObject({ transportMode: 'FLIGHT', unitCost: 450 });
  });
});
