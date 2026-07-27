import { describe, it, expect } from 'vitest';
import {
  calculateTotalEstimatedCost,
  calculateQuotedSellingPrice,
  calculateBalanceDue,
  calculateTotalActualCost,
  calculateFinalRealizedProfit,
  computeFinancials,
} from '../pricing.service.js';

describe('calculateTotalEstimatedCost', () => {
  it('sums all estimated costs (Rule 1)', () => {
    expect(calculateTotalEstimatedCost({
      packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300,
    })).toBe(1800);
  });

  it('returns 0 for empty input', () => {
    expect(calculateTotalEstimatedCost()).toBe(0);
    expect(calculateTotalEstimatedCost({})).toBe(0);
  });

  it('treats missing fields as 0', () => {
    expect(calculateTotalEstimatedCost({ packageBaseCost: 500 })).toBe(500);
  });
});

describe('calculateQuotedSellingPrice', () => {
  it('applies PERCENTAGE markup (Rule 2)', () => {
    expect(calculateQuotedSellingPrice(1000, 'PERCENTAGE', 10)).toBe(1100);
  });

  it('applies FLAT_FEE markup (Rule 2)', () => {
    expect(calculateQuotedSellingPrice(1000, 'FLAT_FEE', 200)).toBe(1200);
  });

  it('defaults to FLAT_FEE when strategy is missing', () => {
    expect(calculateQuotedSellingPrice(1000, undefined, 200)).toBe(1200);
  });

  it('returns base price when markupValue is 0', () => {
    expect(calculateQuotedSellingPrice(1000, 'PERCENTAGE', 0)).toBe(1000);
  });

  it('handles 100% markup', () => {
    expect(calculateQuotedSellingPrice(500, 'PERCENTAGE', 100)).toBe(1000);
  });
});

describe('calculateBalanceDue', () => {
  it('computes balance due (Rule 3)', () => {
    expect(calculateBalanceDue(1100, 300)).toBe(800);
  });

  it('returns 0 when fully paid', () => {
    expect(calculateBalanceDue(500, 500)).toBe(0);
  });

  it('returns 0 when overpaid', () => {
    expect(calculateBalanceDue(500, 600)).toBe(0);
  });

  it('returns quotedSellingPrice when no deposit', () => {
    expect(calculateBalanceDue(1000, 0)).toBe(1000);
    expect(calculateBalanceDue(1000)).toBe(1000);
  });
});

describe('calculateTotalActualCost', () => {
  it('sums actual costs with package base (Rule 4)', () => {
    expect(calculateTotalActualCost(
      { packageBaseCost: 1000 },
      { actualFlightCost: 600, actualHotelCost: 400 },
    )).toBe(2000);
  });

  it('defaults missing actual costs to 0', () => {
    expect(calculateTotalActualCost(
      { packageBaseCost: 1000 },
      { actualFlightCost: 600 },
    )).toBe(1600);
  });

  it('returns packageBaseCost when no actuals', () => {
    expect(calculateTotalActualCost({ packageBaseCost: 1000 }, {})).toBe(1000);
  });
});

describe('calculateFinalRealizedProfit', () => {
  it('computes profit (Rule 5)', () => {
    expect(calculateFinalRealizedProfit(1500, 1200)).toBe(300);
  });

  it('computes loss', () => {
    expect(calculateFinalRealizedProfit(1000, 1200)).toBe(-200);
  });

  it('returns 0 for break-even', () => {
    expect(calculateFinalRealizedProfit(1000, 1000)).toBe(0);
  });
});

describe('computeFinancials', () => {
  it('full integration: all fields computed correctly', () => {
    const result = computeFinancials({
      estimated: { packageBaseCost: 1000, estimatedFlightCost: 500, estimatedHotelCost: 300 },
      clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 10, depositPaid: 300 },
      actual: { actualFlightCost: 600, actualHotelCost: 400 },
    });

    expect(result.estimated.totalEstimatedCost).toBe(1800);
    expect(result.clientPricing.quotedSellingPrice).toBeCloseTo(1980, 4);
    expect(result.clientPricing.balanceDue).toBeCloseTo(1680, 4);
    expect(result.actual.totalActualCost).toBe(2000);
    expect(result.actual.finalRealizedProfit).toBeCloseTo(-20, 4);
  });

  it('handles empty input without crashing', () => {
    const result = computeFinancials({});
    expect(result.estimated.totalEstimatedCost).toBe(0);
    expect(result.clientPricing.quotedSellingPrice).toBe(0);
    expect(result.clientPricing.balanceDue).toBe(0);
    expect(result.actual.totalActualCost).toBe(0);
    expect(result.actual.finalRealizedProfit).toBe(0);
  });

  it('handles null input', () => {
    const result = computeFinancials(null);
    expect(result.estimated.totalEstimatedCost).toBe(0);
  });

  it('preserves fractional values', () => {
    const result = computeFinancials({
      estimated: { packageBaseCost: 100.50, estimatedFlightCost: 50.25 },
      clientPricing: { markupStrategy: 'PERCENTAGE', markupValue: 15.5 },
    });
    expect(result.estimated.totalEstimatedCost).toBe(150.75);
    expect(result.clientPricing.quotedSellingPrice).toBeCloseTo(174.11625, 4);
  });

  it('sets null for actualFlightCost and actualHotelCost in output when not provided', () => {
    const result = computeFinancials({});
    expect(result.actual.actualFlightCost).toBeNull();
    expect(result.actual.actualHotelCost).toBeNull();
  });
});
