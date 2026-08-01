/**
 * Rule 1: TotalEstimatedCost = PackageBaseCost + EstimatedFlightCost + EstimatedHotelCost
 */
export function calculateTotalEstimatedCost(estimated = {}) {
  return (estimated.packageBaseCost || 0) +
    (estimated.estimatedFlightCost || 0) +
    (estimated.estimatedHotelCost || 0);
}

/**
 * Rule 2: Quoted Selling Price
 *   PERCENTAGE: TotalEstimatedCost * (1 + MarkupValue / 100)
 *   FLAT_FEE:   TotalEstimatedCost + MarkupValue
 */
export function calculateQuotedSellingPrice(totalEstimated, markupStrategy, markupValue) {
  const val = markupValue || 0;
  if (markupStrategy === 'PERCENTAGE') {
    return totalEstimated * (1 + val / 100);
  }
  return totalEstimated + val; // FLAT_FEE default
}

/**
 * Rule 3: BalanceDue = max(0, QuotedSellingPrice - DepositPaid)
 */
export function calculateBalanceDue(quotedSellingPrice, depositPaid = 0) {
  return Math.max(0, (quotedSellingPrice || 0) - depositPaid);
}

/**
 * Rule 4: TotalActualCost = PackageBaseCost + ActualFlightCost + ActualHotelCost
 */
export function calculateTotalActualCost(estimated = {}, actual = {}) {
  return (estimated.packageBaseCost || 0) +
    (actual.actualFlightCost || 0) +
    (actual.actualHotelCost || 0);
}

/**
 * Rule 5: FinalRealizedProfit = QuotedSellingPrice - TotalActualCost
 */
export function calculateFinalRealizedProfit(quotedSellingPrice, totalActualCost) {
  return (quotedSellingPrice || 0) - (totalActualCost || 0);
}

/**
 * Compute all pricing fields. This is the main entry point.
 * @param {Object} financials - { estimated, clientPricing, actual }
 * @returns {Object} Complete financials with all computed fields
 */
export function computeFinancials(financials = {}) {
  const f = financials || {};
  const estimated = f.estimated || {};
  const clientPricing = f.clientPricing || {};
  const actual = f.actual || {};

  // Rule 1
  const totalEstimatedCost = calculateTotalEstimatedCost(estimated);

  // Rule 2
  const quotedSellingPrice = calculateQuotedSellingPrice(
    totalEstimatedCost,
    clientPricing.markupStrategy,
    clientPricing.markupValue,
  );

  // Rule 3
  const balanceDue = calculateBalanceDue(quotedSellingPrice, clientPricing.depositPaid);

  // Rule 4
  const totalActualCost = calculateTotalActualCost(estimated, actual);

  // Rule 5
  const finalRealizedProfit = calculateFinalRealizedProfit(quotedSellingPrice, totalActualCost);

  return {
    estimated: {
      packageBaseCost: estimated.packageBaseCost || 0,
      estimatedFlightCost: estimated.estimatedFlightCost || 0,
      estimatedHotelCost: estimated.estimatedHotelCost || 0,
      totalEstimatedCost,
    },
    clientPricing: {
      markupStrategy: clientPricing.markupStrategy || 'FLAT_FEE',
      markupValue: clientPricing.markupValue || 0,
      quotedSellingPrice,
      depositPaid: clientPricing.depositPaid || 0,
      balanceDue,
    },
    actual: {
      actualFlightCost: actual.actualFlightCost ?? null,
      actualHotelCost: actual.actualHotelCost ?? null,
      totalActualCost,
      finalRealizedProfit,
    },
  };
}
