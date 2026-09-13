/**
 * Integer-cent arithmetic so frontend previews and backend persistence always
 * agree. All public totals are rounded to 2 decimals.
 */
export const toCents = (n) => Math.round((Number(n) || 0) * 100);

export const fromCents = (c) => c / 100;

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
