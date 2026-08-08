import { DEFAULTS } from '../../pricing-engine/src/config.js';
import { toCents, fromCents } from './money.js';

/**
 * Resolve the effective quantity of a line:
 *  - PER_PERSON lines scale with travelers;
 *  - PER_KM uses the distance as quantity;
 *  - PER_VEHICLE / PER_ROOM / FIXED use their own quantity (default 1).
 */
export function resolveQuantity(line, travelers) {
  if (line.basis === 'PER_PERSON') {
    return Math.max(1, Number(travelers) || 1);
  }
  return Number(line.quantity) || 1;
}

/**
 * Compute a single cost line. Margin is applied to the unit price:
 *  - PERCENTAGE: estimatedUnit * (1 + value/100)
 *  - FIXED:      estimatedUnit + value
 * A line without marginType is priced at cost.
 */
export function computeLine(line, { travelers = 1 } = {}) {
  const quantity = resolveQuantity(line, travelers);
  const estimatedUnitCents = toCents(line.estimatedUnit);
  const marginType = line.marginType || null;
  const marginValue = Number(line.marginValue) || 0;

  let quotedUnitCents = estimatedUnitCents;
  if (marginType === 'PERCENTAGE') {
    quotedUnitCents = Math.round((estimatedUnitCents * (100 + marginValue)) / 100);
  } else if (marginType === 'FIXED') {
    quotedUnitCents = estimatedUnitCents + toCents(marginValue);
  }

  const actualTotal =
    line.actualUnit != null
      ? fromCents(toCents(line.actualUnit) * quantity)
      : null;

  return {
    ...line,
    quantity,
    estimatedUnitPrice: fromCents(estimatedUnitCents),
    quotedUnitPrice: fromCents(quotedUnitCents),
    estimatedTotal: fromCents(estimatedUnitCents * quantity),
    actualTotal,
    sellTotal: fromCents(quotedUnitCents * quantity),
    margin: marginType ? { type: marginType, value: marginValue } : null,
  };
}

/**
 * Map a copied package itinerary (days/activities/transports/accommodation)
 * into AUTO cost lines with per-person units. Trip-level transport keeps its
 * own basis and quantity; accommodation is treated as PER_PERSON (twin-share).
 */
export function buildItineraryCostLines({
  days = [],
  activities = [],
  transports = [],
  mealCostPerPerson,
} = {}) {
  const mealCost = mealCostPerPerson ?? DEFAULTS.mealCostPerPerson;
  const lines = [];

  const mealCount = days.reduce(
    (sum, d) => sum + (d.breakfastCount || 0) + (d.lunchCount || 0) + (d.dinnerCount || 0),
    0,
  );
  if (mealCount > 0) {
    lines.push({
      category: 'food',
      description: 'Meals',
      basis: 'PER_PERSON',
      estimatedUnit: mealCount * mealCost,
      source: 'AUTO',
    });
  }

  (activities || []).forEach((a, i) => {
    lines.push({
      category: 'activity',
      description: a.name || `Activity ${i + 1}`,
      basis: 'PER_PERSON',
      estimatedUnit: a.costOverride ?? a.defaultCost ?? 0,
      source: 'AUTO',
    });
  });

  (transports || []).forEach((t, i) => {
    const isPerPerson = t.pricingModel === 'PER_PERSON';
    const isPerKm = t.pricingModel === 'PER_KM';
    lines.push({
      category: 'transportation',
      description: `Transport ${i + 1}`,
      basis: isPerPerson ? 'PER_PERSON' : isPerKm ? 'PER_KM' : 'PER_VEHICLE',
      estimatedUnit: Number(t.unitCost) || 0,
      quantity: isPerKm ? Number(t.distanceKm) || 0 : isPerPerson ? undefined : 1,
      source: 'AUTO',
    });
  });

  (days || []).forEach((d, i) => {
    const amount = Number(d.accommodation?.totalAmount || 0);
    if (amount > 0) {
      lines.push({
        category: 'accommodation',
        description: `Accommodation day ${i + 1}`,
        basis: 'PER_PERSON',
        estimatedUnit: amount,
        source: 'AUTO',
      });
    }
  });

  return lines;
}
