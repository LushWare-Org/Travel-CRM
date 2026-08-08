import { describe, it, expect } from 'vitest';
import { carryPricingSettingsAcrossPackageSwitch } from '../pricingSettings.js';

describe('carryPricingSettingsAcrossPackageSwitch', () => {
  it('keeps marginType and marginValue unchanged', () => {
    const result = carryPricingSettingsAcrossPackageSwitch({
      marginType: 'PERCENTAGE',
      marginValue: 15,
      discountType: 'percentage',
      discountValue: 10,
    });
    expect(result.marginType).toBe('PERCENTAGE');
    expect(result.marginValue).toBe(15);
  });

  it('resets discountType to none and discountValue to 0', () => {
    const result = carryPricingSettingsAcrossPackageSwitch({
      marginType: 'FIXED',
      marginValue: 200,
      discountType: 'fixed',
      discountValue: 50,
    });
    expect(result.discountType).toBe('none');
    expect(result.discountValue).toBe(0);
  });

  it('keeps deposit and service charge settings unchanged', () => {
    const result = carryPricingSettingsAcrossPackageSwitch({
      depositType: 'PERCENTAGE',
      depositValue: 30,
      serviceChargeRate: 5,
      discountType: 'percentage',
      discountValue: 10,
    });
    expect(result.depositType).toBe('PERCENTAGE');
    expect(result.depositValue).toBe(30);
    expect(result.serviceChargeRate).toBe(5);
  });

  it('resets discount even when there was none set (no-op idempotence)', () => {
    const result = carryPricingSettingsAcrossPackageSwitch({
      marginType: null,
      marginValue: 0,
      discountType: 'none',
      discountValue: 0,
    });
    expect(result.discountType).toBe('none');
    expect(result.discountValue).toBe(0);
  });

  it('does not mutate the input object', () => {
    const original = { marginType: 'PERCENTAGE', marginValue: 10, discountType: 'percentage', discountValue: 5 };
    const originalCopy = { ...original };
    carryPricingSettingsAcrossPackageSwitch(original);
    expect(original).toEqual(originalCopy);
  });
});
