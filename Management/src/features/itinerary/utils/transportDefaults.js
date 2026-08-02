/**
 * Per-mode pricing-model defaults for transport rows.
 *
 * CAR/VAN are distance-based by default (PER_KM); passenger modes default to
 * PER_PERSON; anything unknown falls back to PER_VEHICLE. Mode changes reset
 * the pricing model to the mode's default, unit cost is preserved, and a
 * distance value is cleared whenever the pricing model leaves PER_KM.
 */

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
