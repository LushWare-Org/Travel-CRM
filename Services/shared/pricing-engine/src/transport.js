import { DEFAULTS } from './config.js';

/**
 * @param {Array<{pricingModel: string, unitCost: number, distanceKm?: number|null}>} transports
 * @param {{ groupSize?: number }} config
 * @returns {{ total: number, rows: Array<{pricingModel: string, unitCost: number, distanceKm: number|null, cost: number}> }}
 */
export function calculateTransportCosts(transports, config = {}) {
  const groupSize = config.groupSize ?? DEFAULTS.defaultGroupSize;

  const rows = transports.map((t) => {
    let cost = 0;
    switch (t.pricingModel) {
      case 'PER_KM':
        cost = t.unitCost * (t.distanceKm || 0);
        break;
      case 'PER_PERSON':
        cost = t.unitCost * groupSize;
        break;
      case 'PER_VEHICLE':
        cost = t.unitCost;
        break;
    }
    return {
      pricingModel: t.pricingModel,
      unitCost: t.unitCost,
      distanceKm: t.distanceKm ?? null,
      cost,
    };
  });

  return {
    total: rows.reduce((sum, r) => sum + r.cost, 0),
    rows,
  };
}
