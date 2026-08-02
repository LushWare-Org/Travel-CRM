import { describe, it, expect } from 'vitest';
import { computePricing, toLineDescriptor } from '../pricing.service.js';

const baseLines = [
  { basis: 'PER_PERSON', estimatedUnit: 100, actualUnit: 90, category: 'activity', description: 'Activity', source: 'AUTO' },
  { basis: 'PER_VEHICLE', estimatedUnit: 300, quantity: 1, actualUnit: 320, category: 'transportation', description: 'Van', source: 'AUTO' },
  { basis: 'PER_PERSON', estimatedUnit: 50, category: 'transportation', description: 'Flight', source: 'MANUAL' },
];

describe('computePricing', () => {
  it('computes the full sell-side breakdown with deposit and balance', () => {
    const result = computePricing({
      lines: baseLines,
      travelers: 4,
      currency: 'USD',
      marginType: 'PERCENTAGE',
      marginValue: 10,
      depositType: 'PERCENTAGE',
      depositValue: 30,
      discountType: 'percentage',
      discountValue: 10,
      serviceChargeRate: 5,
      verifiedPaymentTotal: 330.26,
    });

    expect(result.estimatedTotal).toBe(900);
    expect(result.actualTotal).toBe(680);
    expect(result.sellSubtotal).toBe(990);
    expect(result.taxAmount).toBe(160.38);
    expect(result.totalAmount).toBe(1100.88);
    expect(result.depositAmount).toBe(330.26);
    expect(result.paidAmount).toBe(330.26);
    expect(result.balanceDue).toBe(770.62);
    expect(result.profit).toBe(310);
  });

  it('computes a FIXED deposit amount from the total', () => {
    const result = computePricing({
      lines: [{ basis: 'FIXED', estimatedUnit: 1000, quantity: 1, description: 'Package' }],
      travelers: 1,
      taxRate: 0,
      depositType: 'FIXED',
      depositValue: 250,
      verifiedPaymentTotal: 250,
    });
    expect(result.depositAmount).toBe(250);
    expect(result.balanceDue).toBe(750);
  });

  it('returns zero balance when fully paid', () => {
    const result = computePricing({
      lines: [{ basis: 'FIXED', estimatedUnit: 1000, quantity: 1, description: 'Package' }],
      travelers: 1,
      taxRate: 0,
      verifiedPaymentTotal: 1000,
    });
    expect(result.paidAmount).toBe(1000);
    expect(result.balanceDue).toBe(0);
  });

  it('never produces a negative balance for overpayment', () => {
    const result = computePricing({
      lines: [{ basis: 'FIXED', estimatedUnit: 500, quantity: 1, description: 'Package' }],
      travelers: 1,
      verifiedPaymentTotal: 700,
    });
    expect(result.balanceDue).toBe(0);
  });

  it('defaults to the global tax constant and USD', () => {
    const result = computePricing({
      lines: [{ basis: 'FIXED', estimatedUnit: 100, quantity: 1, description: 'X' }],
      travelers: 1,
    });
    expect(result.currency).toBe('USD');
    expect(result.taxAmount).toBe(18);
    expect(result.totalAmount).toBe(118);
  });

  it('handles empty input without crashing', () => {
    const result = computePricing({});
    expect(result.sellSubtotal).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.depositAmount).toBe(0);
    expect(result.balanceDue).toBe(0);
    expect(result.profit).toBeNull();
  });
});

describe('toLineDescriptor', () => {
  it('converts Prisma Decimal strings into engine numbers', () => {
    const row = {
      category: 'food',
      description: 'Meals',
      basis: 'PER_PERSON',
      quantity: 4,
      estimatedUnitPrice: '60.00',
      actualUnitPrice: null,
      marginType: null,
      marginValue: null,
      source: 'AUTO',
    };
    expect(toLineDescriptor(row)).toEqual({
      category: 'food',
      description: 'Meals',
      basis: 'PER_PERSON',
      quantity: 4,
      estimatedUnit: 60,
      actualUnit: null,
      marginType: null,
      marginValue: null,
      source: 'AUTO',
    });
  });

  it('preserves margin override values', () => {
    const row = {
      category: 'activity',
      description: 'Tour',
      basis: 'PER_PERSON',
      quantity: 2,
      estimatedUnitPrice: '50.00',
      actualUnitPrice: '45.50',
      marginType: 'FIXED',
      marginValue: '10.00',
      source: 'MANUAL',
    };
    const desc = toLineDescriptor(row);
    expect(desc.actualUnit).toBe(45.5);
    expect(desc.marginType).toBe('FIXED');
    expect(desc.marginValue).toBe(10);
  });
});
