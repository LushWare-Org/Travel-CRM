import twilio from 'twilio';
import BRANDING from '../config/branding.js';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toFixed(2)}`;
};

/** Twilio client from env. Returns null when creds are absent. */
function buildClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export const isWhatsappConfigured = () => buildClient() !== null;

/** Normalise a phone number to Twilio's `whatsapp:+<digits>` address. */
function toWhatsappAddress(phone) {
  const trimmed = String(phone || '').trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, '');
  const withPlus = digits.startsWith('+') ? digits : `+${digits}`;
  return `whatsapp:${withPlus}`;
}

/**
 * Send a quotation over WhatsApp with the PDF attached as media.
 * Requires Twilio WhatsApp Business credentials and a publicly reachable
 * `mediaUrl` (the Cloudinary-hosted PDF).
 * @throws {Error} when WhatsApp is not configured or the phone is invalid
 */
export async function sendQuotationWhatsapp({ quotation, phone, mediaUrl }) {
  const client = buildClient();
  if (!client) {
    throw new Error('WhatsApp is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
  }
  const to = toWhatsappAddress(phone);
  if (!to) throw new Error('No valid WhatsApp phone number provided');

  const body =
    `Hi ${quotation.customerName || 'there'}, your ${BRANDING.company.name} quotation ` +
    `${quotation.quotationNumber || ''} is ready.\n` +
    `Total: ${formatMoney(quotation.totalAmount, quotation.currency)}\n` +
    (quotation.validUntil ? `Valid until: ${new Date(quotation.validUntil).toLocaleDateString('en-US')}\n` : '');

  return client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_FROM
      : `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    to,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

export default { isWhatsappConfigured, sendQuotationWhatsapp };
