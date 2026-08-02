import { describe, it, expect } from 'vitest';
import {
  calculateBasePrice,
  calculateMealCosts,
  calculateTransportCosts,
  calculateActivityCosts,
  computeMargin,
  DEFAULTS,
} from '../src/index.js';

describe('calculateMealCosts', () => {
  it('returns zeros for empty days', () => {
    const result = calculateMealCosts([]);
    expect(result).toEqual({ total: 0, breakfastCost: 0, lunchCost: 0, dinnerCost: 0 });
  });

  it('computes costs from meal counts using default meal cost', () => {
    const days = [
      { breakfastCount: 2, lunchCount: 1, dinnerCount: 1 },
      { breakfastCount: 1, lunchCount: 0, dinnerCount: 2 },
    ];
    const result = calculateMealCosts(days);
    expect(result.breakfastCost).toBe(3 * DEFAULTS.mealCostPerPerson);
    expect(result.lunchCost).toBe(1 * DEFAULTS.mealCostPerPerson);
    expect(result.dinnerCost).toBe(3 * DEFAULTS.mealCostPerPerson);
    expect(result.total).toBe(7 * DEFAULTS.mealCostPerPerson);
  });

  it('uses custom meal cost from config', () => {
    const days = [{ breakfastCount: 2, lunchCount: 1 }];
    const result = calculateMealCosts(days, { mealCostPerPerson: 25 });
    expect(result.breakfastCost).toBe(50);
    expect(result.lunchCost).toBe(25);
    expect(result.total).toBe(75);
  });

  it('uses mealPriceOverride on specific days', () => {
    const days = [
      { breakfastCount: 1, lunchCount: 0, dinnerCount: 0, mealPriceOverride: 40 },
      { breakfastCount: 1, lunchCount: 0, dinnerCount: 0 },
    ];
    const result = calculateMealCosts(days);
    expect(result.breakfastCost).toBe(40 + DEFAULTS.mealCostPerPerson);
  });

  it('handles missing meal counts as zero', () => {
    const days = [{}];
    const result = calculateMealCosts(days);
    expect(result.total).toBe(0);
  });
});

describe('calculateTransportCosts', () => {
  it('returns zeros for empty transports', () => {
    const result = calculateTransportCosts([]);
    expect(result.total).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it('computes PER_KM cost from unitCost × distanceKm', () => {
    const transports = [
      { pricingModel: 'PER_KM', unitCost: 2.5, distanceKm: 100 },
    ];
    const result = calculateTransportCosts(transports);
    expect(result.rows[0].cost).toBe(250);
    expect(result.total).toBe(250);
  });

  it('computes PER_PERSON cost from unitCost × groupSize', () => {
    const transports = [
      { pricingModel: 'PER_PERSON', unitCost: 50 },
    ];
    const result = calculateTransportCosts(transports, { groupSize: 4 });
    expect(result.rows[0].cost).toBe(200);
    expect(result.total).toBe(200);
  });

  it('uses default group size for PER_PERSON when not provided', () => {
    const transports = [{ pricingModel: 'PER_PERSON', unitCost: 50 }];
    const result = calculateTransportCosts(transports);
    expect(result.rows[0].cost).toBe(50 * DEFAULTS.defaultGroupSize);
  });

  it('computes PER_VEHICLE cost as flat unitCost', () => {
    const transports = [
      { pricingModel: 'PER_VEHICLE', unitCost: 300 },
    ];
    const result = calculateTransportCosts(transports);
    expect(result.rows[0].cost).toBe(300);
    expect(result.total).toBe(300);
  });

  it('handles null distanceKm for PER_KM as zero', () => {
    const transports = [
      { pricingModel: 'PER_KM', unitCost: 2, distanceKm: null },
    ];
    const result = calculateTransportCosts(transports);
    expect(result.rows[0].cost).toBe(0);
  });

  it('aggregates multiple transport rows', () => {
    const transports = [
      { pricingModel: 'PER_VEHICLE', unitCost: 300 },
      { pricingModel: 'PER_PERSON', unitCost: 50 },
    ];
    const result = calculateTransportCosts(transports, { groupSize: 2 });
    expect(result.total).toBe(400);
  });
});

describe('calculateActivityCosts', () => {
  it('returns zeros for empty activities', () => {
    const result = calculateActivityCosts([]);
    expect(result.total).toBe(0);
  });

  it('multiplies defaultCost by groupSize', () => {
    const activities = [{ defaultCost: 75, costOverride: null }];
    const result = calculateActivityCosts(activities, { groupSize: 3 });
    expect(result.rows[0].cost).toBe(225);
    expect(result.rows[0].isOverride).toBe(false);
    expect(result.total).toBe(225);
  });

  it('uses costOverride when present', () => {
    const activities = [{ defaultCost: 75, costOverride: 60 }];
    const result = calculateActivityCosts(activities, { groupSize: 2 });
    expect(result.rows[0].cost).toBe(120);
    expect(result.rows[0].isOverride).toBe(true);
  });

  it('handles undefined defaultCost as zero', () => {
    const activities = [{}];
    const result = calculateActivityCosts(activities);
    expect(result.rows[0].cost).toBe(0);
  });

  it('uses default group size', () => {
    const activities = [{ defaultCost: 50 }];
    const result = calculateActivityCosts(activities);
    expect(result.rows[0].cost).toBe(50 * DEFAULTS.defaultGroupSize);
  });
});

describe('computeMargin', () => {
  it('computes PERCENTAGE margin', () => {
    const result = computeMargin(1000, 'PERCENTAGE', 20);
    expect(result.basePrice).toBe(1000);
    expect(result.marginAmount).toBe(200);
    expect(result.sellPrice).toBe(1200);
  });

  it('computes FIXED margin', () => {
    const result = computeMargin(1000, 'FIXED', 150);
    expect(result.marginAmount).toBe(150);
    expect(result.sellPrice).toBe(1150);
  });

  it('rounds to 2 decimal places', () => {
    const result = computeMargin(333.333, 'PERCENTAGE', 15);
    expect(result.marginAmount).toBe(50);
    expect(result.sellPrice).toBe(383.33);
  });

  it('handles zero margin', () => {
    const result = computeMargin(500, 'PERCENTAGE', 0);
    expect(result.marginAmount).toBe(0);
    expect(result.sellPrice).toBe(500);
  });
});

describe('calculateBasePrice', () => {
  it('returns zero base price for empty inputs', () => {
    const result = calculateBasePrice();
    expect(result.basePrice).toBe(0);
    expect(result.breakdown.margin).toBeUndefined();
  });

  it('aggregates meals + activities + transports', () => {
    const result = calculateBasePrice({
      days: [
        { breakfastCount: 2, lunchCount: 1, dinnerCount: 1 },
      ],
      activities: [{ defaultCost: 100 }],
      transports: [{ pricingModel: 'PER_VEHICLE', unitCost: 300 }],
      groupSize: 2,
      mealCostPerPerson: 15,
    });
    const expected = (4 * 15) + (100 * 2) + 300; // 60 + 200 + 300 = 560
    expect(result.basePrice).toBe(expected);
  });

  it('computes margin when marginType and marginValue provided', () => {
    const result = calculateBasePrice({
      days: [{ breakfastCount: 1 }],
      groupSize: 1,
      mealCostPerPerson: 10,
      marginType: 'PERCENTAGE',
      marginValue: 50,
    });
    expect(result.basePrice).toBe(10);
    expect(result.breakdown.margin).toBeDefined();
    expect(result.breakdown.margin.sellPrice).toBe(15);
  });

  it('does not compute margin when omitted', () => {
    const result = calculateBasePrice({
      days: [{ breakfastCount: 1 }],
      groupSize: 1,
    });
    expect(result.breakdown.margin).toBeUndefined();
  });

  it('rounds basePrice to 2 decimals', () => {
    const result = calculateBasePrice({
      days: [{ breakfastCount: 1, lunchCount: 1 }],
      activities: [{ defaultCost: 33.333 }],
      groupSize: 1,
      mealCostPerPerson: 15.555,
    });
    expect(result.basePrice).toBe(Math.round((15.555 + 15.555 + 33.333) * 100) / 100);
  });
});
