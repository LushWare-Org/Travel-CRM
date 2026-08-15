// Shared money/date formatting for every pdfkit-based document generator
// (quotation, invoice, ...) — kept in one place so the two documents always
// render currency and dates identically.

// Built-in Helvetica (WinAnsi) has no rupee glyph, so INR uses a text prefix.
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: 'INR ', AUD: 'A$', LKR: 'Rs ' };

/** Indian numbering: last 3 digits as one group, remaining digits in pairs (1,43,000 / 12,34,567). */
const groupIndian = (digits) => {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const pairs = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${pairs},${last3}`;
};

const groupWestern = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const [intPart, decPart] = (Number(amount) || 0).toFixed(2).split('.');
  const grouped = currency === 'INR' ? groupIndian(intPart) : groupWestern(intPart);
  return `${symbol}${grouped}.${decPart}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};
