import { computeLine } from './lines.js';
import { toCents, fromCents } from './money.js';

const sumCents = (lines, key) =>
  lines.reduce((sum, l) => sum + (l[key] != null ? toCents(l[key]) : 0), 0);

/**
 * Compute the full sell-side quote from cost lines.
 *
 * @param {Object} params
 * @param {Array} params.lines — cost line descriptors (see computeLine)
 * @param {number} params.travelers — PER_PERSON lines use this as quantity
 * @param {string} [params.currency] — metadata only; never converted
 * @param {string} [params.marginType] — lead-level default (PERCENTAGE|FIXED)
 * @param {number} [params.marginValue] — lead-level default margin
 * @param {number} [params.taxRate] — global exclusive tax rate in percent
 * @param {'none'|'percentage'|'fixed'} [params.discountType]
 * @param {number} [params.discountValue]
 * @param {number} [params.serviceChargeRate] — percent of sellSubtotal
 */
export function computeQuote({
  lines = [],
  travelers = 1,
  currency = 'USD',
  marginType = null,
  marginValue = 0,
  taxRate = 0,
  discountType = 'none',
  discountValue = 0,
  serviceChargeRate = 0,
} = {}) {
  const resolved = lines.map((line) =>
    computeLine(
      {
        ...line,
        marginType: line.marginType ?? marginType ?? null,
        marginValue: line.marginValue ?? marginValue,
      },
      { travelers },
    ),
  );

  const sellSubtotalCents = sumCents(resolved, 'sellTotal');
  const estimatedTotalCents = sumCents(resolved, 'estimatedTotal');

  const hasAnyActual = resolved.some((l) => l.actualTotal != null);
  const actualTotalCents = hasAnyActual ? sumCents(resolved, 'actualTotal') : null;

  const discountCents =
    discountType === 'percentage'
      ? Math.round((sellSubtotalCents * (Number(discountValue) || 0)) / 100)
      : discountType === 'fixed'
        ? toCents(discountValue)
        : 0;
  const taxableCents = Math.max(0, sellSubtotalCents - discountCents);
  const taxCents = Math.round((taxableCents * (Number(taxRate) || 0)) / 100);
  const serviceCents = Math.round((sellSubtotalCents * (Number(serviceChargeRate) || 0)) / 100);
  const totalCents = Math.max(0, sellSubtotalCents - discountCents + taxCents + serviceCents);

  return {
    currency,
    lines: resolved,
    travelers,
    estimatedTotal: fromCents(estimatedTotalCents),
    actualTotal: actualTotalCents != null ? fromCents(actualTotalCents) : null,
    sellSubtotal: fromCents(sellSubtotalCents),
    discountAmount: fromCents(discountCents),
    taxableSubtotal: fromCents(taxableCents),
    taxAmount: fromCents(taxCents),
    serviceChargeAmount: fromCents(serviceCents),
    totalAmount: fromCents(totalCents),
    profit: actualTotalCents != null ? fromCents(sellSubtotalCents - actualTotalCents) : null,
  };
}
