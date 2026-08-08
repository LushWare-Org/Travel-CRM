/**
 * Package switch pricing rule: margin is a rep-set expectation independent of
 * which package it's applied to, so it carries over. Discount was negotiated
 * against the old package's price, so it no longer applies and resets.
 */
export function carryPricingSettingsAcrossPackageSwitch(settings) {
  return {
    ...settings,
    discountType: 'none',
    discountValue: 0,
  };
}
