import { LOCALE } from './currency.js';

// Numbers read the same way prices do: one locale, defined once in ./currency.js.
// formatCurrency stays the only place a currency symbol is applied.

function toFiniteNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * A number for display at a fixed precision.
 *
 * Missing or unusable input renders as '0' rather than 'NaN': a metric tile with no
 * data should read as zero, not as a broken value.
 */
export function formatNumber(value, decimals = 0) {
  const numeric = toFiniteNumber(value);

  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numeric === null ? 0 : numeric);
}

/**
 * A rating or average: one decimal.
 *
 * That is already this app's convention for ratings and percentages — it was
 * written out as `.toFixed(1)` at a dozen call sites before it had a name.
 */
export function formatRating(value) {
  return formatNumber(value, 1);
}

/** A percentage, sign included, for call sites that build the string themselves. */
export function formatPercent(value, decimals = 1) {
  return `${formatNumber(value, decimals)}%`;
}
