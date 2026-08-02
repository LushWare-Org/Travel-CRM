/**
 * Shared travel-CRM constants — single source of truth.
 *
 * The Prisma schema (package-service) mirrors these values; a consistency test
 * in this package asserts they never drift. Consumers:
 *   - Management frontend (@travel-crm/constants file dependency)
 *   - package-service validators (relative import)
 *   - pricing-engine (relative import for PRICING_MODEL)
 */

// ─── Enums ────────────────────────────────────────────────────

export const ROUTE_TYPE = {
  DAILY_ROUTING: 'DAILY_ROUTING',
  POINT_TO_POINT: 'POINT_TO_POINT',
};

export const TRANSPORT_MODE = {
  FLIGHT: 'FLIGHT',
  CAR: 'CAR',
  TRAIN: 'TRAIN',
  BOAT: 'BOAT',
  VAN: 'VAN',
  BUS: 'BUS',
};

export const PRICING_MODEL = {
  PER_KM: 'PER_KM',
  PER_PERSON: 'PER_PERSON',
  PER_VEHICLE: 'PER_VEHICLE',
};

// ─── Labels ───────────────────────────────────────────────────

export const TRANSPORT_MODE_LABELS = {
  CAR: 'Car',
  VAN: 'Van',
  FLIGHT: 'Flight',
  TRAIN: 'Train',
  BUS: 'Bus',
  BOAT: 'Boat',
};

export const PRICING_MODEL_LABELS = {
  PER_VEHICLE: 'Per vehicle',
  PER_PERSON: 'Per person',
  PER_KM: 'Per km',
};

// ─── Per-mode pricing defaults ────────────────────────────────

export const TRANSPORT_PRICING_DEFAULTS = {
  CAR: 'PER_KM',
  VAN: 'PER_KM',
  FLIGHT: 'PER_PERSON',
  TRAIN: 'PER_PERSON',
  BUS: 'PER_PERSON',
  BOAT: 'PER_PERSON',
};

export const getDefaultPricingModel = (mode) =>
  TRANSPORT_PRICING_DEFAULTS[mode] || 'PER_VEHICLE';

export const createDefaultTransportRow = () => ({
  routeType: 'DAILY_ROUTING',
  transportMode: 'CAR',
  pricingModel: getDefaultPricingModel('CAR'),
  unitCost: 0,
  distanceKm: null,
});

/**
 * Switching a row's mode: apply the mode's default pricing model, keep the
 * unit cost, and clear distance when the new pricing isn't PER_KM. Same-mode
 * changes are a no-op.
 */
export const applyTransportModeDefault = (row, mode) => {
  if (!row || row.transportMode === mode) return row;
  const nextPricing = getDefaultPricingModel(mode);
  return {
    ...row,
    transportMode: mode,
    pricingModel: nextPricing,
    distanceKm: nextPricing === 'PER_KM' ? row.distanceKm : null,
  };
};

/**
 * Manually changing the pricing model: keep the unit cost, clear distance when
 * leaving PER_KM.
 */
export const applyPricingModelChange = (row, pricingModel) => {
  if (!row || row.pricingModel === pricingModel) return row;
  return {
    ...row,
    pricingModel,
    distanceKm: pricingModel === 'PER_KM' ? row.distanceKm : null,
  };
};
