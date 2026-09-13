export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || 'USD';
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL;

export const LOCALE = CURRENCY_CODE === 'INR' ? 'en-IN' : 'en-US';

const FORMATTER = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
});

export const formatCurrency = (value, options = {}) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return CURRENCY_SYMBOL
            ? `${CURRENCY_SYMBOL} 0`
            : FORMATTER.format(0);
    }

    const fractionDigits = options.minimumFractionDigits !== undefined ? options.minimumFractionDigits : 0;

    if (CURRENCY_SYMBOL) {
        return `${CURRENCY_SYMBOL} ${numeric.toLocaleString(LOCALE, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;
    }

    return new Intl.NumberFormat(LOCALE, {
        style: 'currency',
        currency: CURRENCY_CODE,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(numeric);
};

export const formatCompact = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';

    // If INR, use Lakh/Crore logic if desired, or standard compact notation
    if (CURRENCY_CODE === 'INR') {
        if (numeric >= 10000000) { // 1 Crore
            return `${(numeric / 10000000).toFixed(2)} Cr`;
        }
        if (numeric >= 100000) { // 1 Lakh
            return `${(numeric / 100000).toFixed(2)} L`;
        }
    }

    // Standard compact notation for other currencies (K, M, B)
    return new Intl.NumberFormat(LOCALE, {
        notation: "compact",
        compactDisplay: "short",
        maximumFractionDigits: 1
    }).format(numeric);
};

export const getCurrencySymbol = () => {
    if (CURRENCY_SYMBOL) return CURRENCY_SYMBOL;
    try {
        return FORMATTER.formatToParts(0).find(part => part.type === 'currency').value;
    } catch (e) {
        return '$';
    }
};
