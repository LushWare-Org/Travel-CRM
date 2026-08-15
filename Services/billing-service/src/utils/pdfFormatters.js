// Shared money/date formatting for every pdfkit-based document generator
// (quotation, invoice, ...) — kept in one place so the two documents always
// render currency and dates identically.

// Built-in Helvetica (WinAnsi) has no rupee glyph, so INR uses a text prefix.
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: 'INR ', AUD: 'A$', LKR: 'Rs ' };

export const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const value = (Number(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${value}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};
