// Amount-in-words for invoice/receipt PDFs. Indian numbering (Crore/Lakh/
// Thousand) for INR — ported from Server/src/utils/billingPDFGenerator.js's
// numberToWords() — and standard international grouping (Thousand/Million/
// Billion) for every other currency.

const SINGLE = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const DOUBLE = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertTwoDigits = (num) => {
  if (num < 10) return SINGLE[num];
  if (num < 20) return DOUBLE[num - 10];
  const ten = Math.floor(num / 10);
  const rem = num % 10;
  return TENS[ten] + (rem ? ' ' + SINGLE[rem] : '');
};

const convertThreeDigits = (num) => {
  const hundred = Math.floor(num / 100);
  const rem = num % 100;
  const parts = [];
  if (hundred > 0) parts.push(`${SINGLE[hundred]} Hundred`);
  if (rem > 0) parts.push(convertTwoDigits(rem));
  return parts.join(' ');
};

const integerToWordsIndian = (n) => {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore > 0) parts.push(`${convertTwoDigits(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(convertThreeDigits(hundred));
  return parts.join(' ');
};

const integerToWordsInternational = (n) => {
  if (n === 0) return 'Zero';
  const billion = Math.floor(n / 1000000000); n %= 1000000000;
  const million = Math.floor(n / 1000000); n %= 1000000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;

  const parts = [];
  if (billion > 0) parts.push(`${convertThreeDigits(billion)} Billion`);
  if (million > 0) parts.push(`${convertThreeDigits(million)} Million`);
  if (thousand > 0) parts.push(`${convertThreeDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(convertThreeDigits(hundred));
  return parts.join(' ');
};

/**
 * @param {number} amount
 * @param {string} [currency='USD'] - Indian numbering (Crore/Lakh) is used
 *   for 'INR', standard international grouping (Million/Billion) otherwise.
 * @returns {string} e.g. "One Lakh Forty Three Thousand Only" / "One Hundred Only"
 */
export function numberToWords(amount, currency = 'USD') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) return 'Zero Only';

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);
  const toWords = currency === 'INR' ? integerToWordsIndian : integerToWordsInternational;
  const subUnit = currency === 'INR' ? 'Paise' : 'Cents';

  const words = toWords(integerPart);
  if (decimalPart > 0) return `${words} and ${convertTwoDigits(decimalPart)} ${subUnit}`;
  return `${words} Only`;
}

export default numberToWords;
