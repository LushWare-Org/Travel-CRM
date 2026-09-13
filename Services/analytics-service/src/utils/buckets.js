// Buckets a numeric amount into a fixed set of human-readable price ranges.
const PRICE_RANGES = [
  { label: 'Under $2K', max: 2000 },
  { label: '$2K–$5K', max: 5000 },
  { label: '$5K–$10K', max: 10000 },
  { label: '$10K–$20K', max: 20000 },
  { label: '$20K+', max: Infinity },
];

export function priceRangeLabel(amount) {
  const found = PRICE_RANGES.find((range) => amount < range.max);
  return (found || PRICE_RANGES[PRICE_RANGES.length - 1]).label;
}

// Lead.budget is free-text (e.g. "5000", "$5,000-$8,000", "around 10k") —
// best-effort: pull the first number out of the string and bucket that.
// Unparseable/empty values fall into "Unknown" rather than throwing.
export function parseBudgetToRange(budget) {
  if (!budget) return 'Unknown';
  const match = String(budget).match(/[\d,]+(\.\d+)?/);
  if (!match) return 'Unknown';
  const amount = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(amount) || amount <= 0) return 'Unknown';
  return priceRangeLabel(amount);
}

const DURATION_RANGES = [
  { label: '1-3 days', max: 3 },
  { label: '4-7 days', max: 7 },
  { label: '8-14 days', max: 14 },
  { label: '15+ days', max: Infinity },
];

export function durationRangeLabel(days) {
  const found = DURATION_RANGES.find((range) => days <= range.max);
  return (found || DURATION_RANGES[DURATION_RANGES.length - 1]).label;
}
