import { DEFAULTS } from './config.js';

/**
 * @param {Array<{breakfastCount?: number, lunchCount?: number, dinnerCount?: number, mealPriceOverride?: number|null}>} days
 * @param {{ mealCostPerPerson?: number, groupSize?: number }} config
 * @returns {{ total: number, breakfastCost: number, lunchCost: number, dinnerCost: number }}
 */
export function calculateMealCosts(days, config = {}) {
  const mealCost = config.mealCostPerPerson ?? DEFAULTS.mealCostPerPerson;

  let breakfastCost = 0;
  let lunchCost = 0;
  let dinnerCost = 0;

  for (const day of days) {
    const costPerMeal = day.mealPriceOverride ?? mealCost;
    breakfastCost += (day.breakfastCount || 0) * costPerMeal;
    lunchCost += (day.lunchCount || 0) * costPerMeal;
    dinnerCost += (day.dinnerCount || 0) * costPerMeal;
  }

  return {
    total: breakfastCost + lunchCost + dinnerCost,
    breakfastCost,
    lunchCost,
    dinnerCost,
  };
}
