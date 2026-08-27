const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || 'INR';
const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL;
const CURRENCY_LOCALE = import.meta.env.VITE_CURRENCY_LOCALE || 'en-IN';

const FORMATTER = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  maximumFractionDigits: 0,
});

export const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return CURRENCY_SYMBOL
      ? `${CURRENCY_SYMBOL} 0`
      : FORMATTER.format(0);
  }

  if (CURRENCY_SYMBOL) {
    return `${CURRENCY_SYMBOL} ${numeric.toLocaleString(CURRENCY_LOCALE, { maximumFractionDigits: 0 })}`;
  }

  // Some browsers might not format custom symbols correctly with Intl,
  // so we might need to manually replace if it falls back to code.
  // However, en-IN usually formats INR as ₹.
  // If we change currency to USD, en-IN might format as US$.
  // Let's rely on Intl for now, but if the user wants strict symbol replacement:

  return FORMATTER.format(numeric);
};

export const getCurrencySymbol = () => {
  if (CURRENCY_SYMBOL) return CURRENCY_SYMBOL;
  try {
    return FORMATTER.formatToParts(0).find(part => part.type === 'currency').value;
  } catch (e) {
    return '₹';
  }
};









