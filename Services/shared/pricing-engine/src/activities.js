import { DEFAULTS } from './config.js';

/**
 * @param {Array<{defaultCost: number, costOverride?: number|null}>} activities
 * @param {{ groupSize?: number }} config
 * @returns {{ total: number, rows: Array<{cost: number, isOverride: boolean}> }}
 */
export function calculateActivityCosts(activities, config = {}) {
  const groupSize = config.groupSize ?? DEFAULTS.defaultGroupSize;

  const rows = activities.map((a) => {
    const cost = (a.costOverride ?? a.defaultCost ?? 0) * groupSize;
    return {
      cost,
      isOverride: a.costOverride != null,
    };
  });

  return {
    total: rows.reduce((sum, r) => sum + r.cost, 0),
    rows,
  };
}
