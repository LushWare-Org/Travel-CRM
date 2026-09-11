const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || 'USD';
const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL;
const CURRENCY_LOCALE =
  import.meta.env.VITE_CURRENCY_LOCALE || (CURRENCY_CODE === 'INR' ? 'en-IN' : 'en-US');

const FORMATTER = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number | string | null | undefined): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return CURRENCY_SYMBOL ? `${CURRENCY_SYMBOL} 0` : FORMATTER.format(0);
  }

  if (CURRENCY_SYMBOL) {
    return `${CURRENCY_SYMBOL} ${numeric.toLocaleString(CURRENCY_LOCALE, { maximumFractionDigits: 0 })}`;
  }

  return FORMATTER.format(numeric);
};

export const getCurrencySymbol = (): string => {
  if (CURRENCY_SYMBOL) return CURRENCY_SYMBOL;
  try {
    const part = FORMATTER.formatToParts(0).find((p) => p.type === 'currency');
    return part ? part.value : '$';
  } catch {
    return '$';
  }
};

/**
 * Budget-filter buckets. Numeric bounds only — labels render through
 * `formatCurrency` so they always read in the configured currency. Bounds are
 * USD-scaled: the catalog sells in the high hundreds to low thousands, so the
 * old 50k/1L/2L (lakh) thresholds put every package in a single bucket.
 */
const PRICE_BUCKETS: Array<{ min: number; max: number }> = [
  { min: 0, max: 1000 },
  { min: 1000, max: 2000 },
  { min: 2000, max: 3000 },
  { min: 3000, max: 5000 },
  { min: 5000, max: Infinity },
];

export const getPriceRangeOptions = (): Array<{ label: string; min: number; max: number }> =>
  PRICE_BUCKETS.map((bucket, index) => ({
    label:
      index === 0
        ? `Below ${formatCurrency(bucket.max)}`
        : bucket.max === Infinity
          ? `Above ${formatCurrency(bucket.min)}`
          : `${formatCurrency(bucket.min)} – ${formatCurrency(bucket.max)}`,
    min: bucket.min,
    max: bucket.max,
  }));
