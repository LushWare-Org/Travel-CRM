/**
 * Pure flight ↔ transport reconciliation helpers.
 *
 * Each flight links to its FLIGHT transport row through the editor-only
 * `flightRef`. These helpers keep flights[] and transports[] in sync without
 * side effects so the behavior can be exhaustively unit-tested. They are used
 * by ItineraryEditor (add/edit/remove) and by the save payload builder.
 */

import { getDefaultPricingModel } from './transportDefaults.js';

export const isFlightIncomplete = (flight) => {
  if (!flight) return true;
  return !flight.origin || !flight.destination;
};

const createFlightId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `flight-${Date.now()}`;

const normalizeFlight = (flightData = {}) => ({
  origin: flightData.origin || '',
  destination: flightData.destination || '',
  cabinClass: flightData.cabinClass || 'Economy',
  departureTime: flightData.departureTime || '',
  airlinePreference: flightData.airlinePreference || '',
  totalAmount: Number(flightData.totalAmount ?? flightData.fareTotal ?? 0) || 0,
  id: flightData.id || createFlightId(),
});

/**
 * Real price only: totalAmount > 0. Until the flight component returns real
 * prices (totalAmount is 0), manual costs typed in Costs & Pricing are the
 * working numbers and must be preserved.
 */
const flightPrice = (flight) => {
  const price = Number(flight?.totalAmount) || 0;
  return price > 0 ? price : null;
};

/**
 * Update the FLIGHT row for a flight: update its linked row's cost when a real
 * price exists; otherwise claim the first unlinked FLIGHT row (setting the
 * flightRef and the price when real); otherwise append a new linked row.
 */
const syncRowForFlight = (transports, flight) => {
  const price = flightPrice(flight);
  const linkedIndex = transports.findIndex(
    (row) => row.transportMode === 'FLIGHT' && row.flightRef === flight.id
  );

  if (linkedIndex >= 0) {
    if (price == null) return transports;
    return transports.map((row, i) =>
      i === linkedIndex ? { ...row, unitCost: price } : row
    );
  }

  const orphanIndex = transports.findIndex(
    (row) => row.transportMode === 'FLIGHT' && !row.flightRef
  );
  if (orphanIndex >= 0) {
    return transports.map((row, i) =>
      i === orphanIndex
        ? { ...row, flightRef: flight.id, ...(price == null ? {} : { unitCost: price }) }
        : row
    );
  }

  return [...transports, {
    routeType: 'DAILY_ROUTING',
    transportMode: 'FLIGHT',
    pricingModel: getDefaultPricingModel('FLIGHT'),
    unitCost: price ?? 0,
    distanceKm: null,
    flightRef: flight.id,
  }];
};

/**
 * Adding a flight: if an incomplete flight (missing origin/destination) exists,
 * replace it in place (keeping its id so any linked row stays attached);
 * otherwise append. The FLIGHT transport row is then synced (claim orphan or
 * append). Returns { flights, transports }.
 */
export const resolveFlightAdd = ({ flights = [], transports = [], flightData = {} }) => {
  const flight = normalizeFlight(flightData);
  const incompleteIndex = flights.findIndex(isFlightIncomplete);

  let nextFlights;
  let targetFlight;
  if (incompleteIndex >= 0) {
    targetFlight = { ...flight, id: flights[incompleteIndex].id };
    nextFlights = flights.map((f, i) => (i === incompleteIndex ? targetFlight : f));
  } else {
    targetFlight = flight;
    nextFlights = [...flights, flight];
  }

  return {
    flights: nextFlights,
    transports: syncRowForFlight(transports, targetFlight),
  };
};

/**
 * Editing a flight: replace the flight at index in place (id unchanged) and
 * re-sync its row. Unknown/out-of-range index is a no-op.
 */
export const resolveFlightEdit = ({ flights = [], transports = [], index, patch = {} }) => {
  if (index == null || index < 0 || index >= flights.length) {
    return { flights, transports };
  }
  const flight = { ...flights[index], ...patch, id: flights[index].id };
  return {
    flights: flights.map((f, i) => (i === index ? flight : f)),
    transports: syncRowForFlight(transports, flight),
  };
};

/**
 * Removing a flight removes the flight and every transport row linked to it.
 */
export const resolveFlightRemove = ({ flights = [], transports = [], flightId }) => {
  if (!flightId) return { flights, transports };
  return {
    flights: flights.filter((f) => f.id !== flightId),
    transports: transports.filter((row) => !(row.flightRef && row.flightRef === flightId)),
  };
};

/**
 * Number of FLIGHT rows with no linked flight — powers the "add flight
 * details" callout in Costs & Pricing.
 */
export const countUnlinkedFlightRows = (transports = []) =>
  transports.filter((row) => row.transportMode === 'FLIGHT' && !row.flightRef).length;

/**
 * Save-time reconciliation ("flight price wins on save", preserving manual
 * costs until a real price exists): manual non-flight rows and orphan FLIGHT
 * rows are kept untouched; each linked flight contributes one FLIGHT row with
 * unitCost = real price when > 0, else the row's existing manual cost, else 0.
 */
export const reconcileFlightsForSave = ({ flights = [], transports = [] }) => {
  const linkedFlightRefs = new Set(flights.map((f) => f.id));
  const manualTransports = transports.filter(
    (row) => row.transportMode !== 'FLIGHT' || !(row.flightRef && linkedFlightRefs.has(row.flightRef))
  );

  const flightTransports = flights.map((flight) => {
    const price = flightPrice(flight);
    const linkedRow = transports.find(
      (row) => row.transportMode === 'FLIGHT' && row.flightRef && row.flightRef === flight.id
    );
    return {
      routeType: 'DAILY_ROUTING',
      transportMode: 'FLIGHT',
      pricingModel: linkedRow?.pricingModel || getDefaultPricingModel('FLIGHT'),
      unitCost: price != null ? price : (linkedRow ? (Number(linkedRow.unitCost) || 0) : 0),
      distanceKm: null,
    };
  });

  return [...manualTransports, ...flightTransports];
};
