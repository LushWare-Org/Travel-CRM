import twilio from 'twilio';
import { getOrgSettings, toBrandingShape } from '../config/orgSettings.js';
import logger from '../config/logger.js';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toFixed(2)}`;
};

/**
 * Stand-in for the real Twilio client while WhatsApp Business isn't actually
 * connected — same `.messages.create()` surface the three send functions
 * below call, so nothing else in this file needs to know which one it got.
 * Logs the would-be send and resolves with a fake sid instead of making a
 * network call.
 */
function buildMockClient() {
  return {
    messages: {
      create: async ({ to, body }) => {
        logger.info({ to, body: String(body).slice(0, 120) }, 'DUMMY WhatsApp send (Twilio not connected)');
        return { sid: `MOCK_SID_${Date.now()}`, status: 'queued' };
      },
    },
  };
}

/**
 * Twilio client from env — mocked by default via `buildMockClient()` since
 * WhatsApp Business isn't actually connected yet.
 *
 * One-line swap back to the real integration once Twilio is provisioned:
 * set `TWILIO_MOCK_MODE=false` (plus TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/
 * TWILIO_WHATSAPP_FROM) — no code change needed.
 */
function buildClient() {
  const useMock = process.env.TWILIO_MOCK_MODE !== 'false';
  if (useMock) return buildMockClient();

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export const isWhatsappConfigured = () => buildClient() !== null;

/** The `whatsapp:+<digits>` sender address Twilio requires, falling back to
 * a placeholder in mock mode where no real TWILIO_WHATSAPP_FROM is set. */
function resolveFromAddress() {
  const raw = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+10000000000';
  return raw.startsWith('whatsapp:') ? raw : `whatsapp:${raw}`;
}

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

  const branding = toBrandingShape(await getOrgSettings());

  const body =
    `Hi ${quotation.customerName || 'there'}, your ${branding.company.name} quotation ` +
    `${quotation.quotationNumber || ''} is ready.\n` +
    `Total: ${formatMoney(quotation.totalAmount, quotation.currency)}\n` +
    (quotation.validUntil ? `Valid until: ${new Date(quotation.validUntil).toLocaleDateString('en-US')}\n` : '');

  return client.messages.create({
    from: resolveFromAddress(),
    to,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

/**
 * Send an invoice over WhatsApp with the PDF attached as media.
 * Requires Twilio WhatsApp Business credentials and a publicly reachable
 * `mediaUrl` (the Cloudinary-hosted PDF).
 * @throws {Error} when WhatsApp is not configured or the phone is invalid
 */
export async function sendInvoiceWhatsapp({ invoice, phone, mediaUrl }) {
  const client = buildClient();
  if (!client) {
    throw new Error('WhatsApp is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
  }
  const to = toWhatsappAddress(phone);
  if (!to) throw new Error('No valid WhatsApp phone number provided');

  const branding = toBrandingShape(await getOrgSettings());

  const body =
    `Hi ${invoice.customerName || 'there'}, your ${branding.company.name} invoice ` +
    `${invoice.invoiceNumber || ''} is ready.\n` +
    `Total: ${formatMoney(invoice.totalAmount, invoice.currency)}\n` +
    (invoice.dueDate ? `Due date: ${new Date(invoice.dueDate).toLocaleDateString('en-US')}\n` : '');

  return client.messages.create({
    from: resolveFromAddress(),
    to,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

/**
 * Send a payment receipt over WhatsApp with the PDF attached as media.
 * Requires Twilio WhatsApp Business credentials and a publicly reachable
 * `mediaUrl` (the Cloudinary-hosted PDF).
 * @throws {Error} when WhatsApp is not configured or the phone is invalid
 */
export async function sendReceiptWhatsapp({ receipt, phone, mediaUrl }) {
  const client = buildClient();
  if (!client) {
    throw new Error('WhatsApp is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
  }
  const to = toWhatsappAddress(phone);
  if (!to) throw new Error('No valid WhatsApp phone number provided');

  const branding = toBrandingShape(await getOrgSettings());

  const body =
    `Hi ${receipt.customerName || 'there'}, your ${branding.company.name} payment receipt ` +
    `${receipt.receiptNumber || ''} is ready.\n` +
    `Amount received: ${formatMoney(receipt.amount, receipt.currency)}\n` +
    (receipt.invoice?.invoiceNumber ? `Against invoice: ${receipt.invoice.invoiceNumber}\n` : '');

  return client.messages.create({
    from: resolveFromAddress(),
    to,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

/**
 * Send a travel voucher over WhatsApp with the PDF attached as media.
 * Requires Twilio WhatsApp Business credentials and a publicly reachable
 * `mediaUrl` (the Cloudinary-hosted PDF).
 * @throws {Error} when WhatsApp is not configured or the phone is invalid
 */
export async function sendVoucherWhatsapp({ voucher, phone, mediaUrl }) {
  const client = buildClient();
  if (!client) {
    throw new Error('WhatsApp is not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)');
  }
  const to = toWhatsappAddress(phone);
  if (!to) throw new Error('No valid WhatsApp phone number provided');

  const branding = toBrandingShape(await getOrgSettings());

  const body =
    `Hi ${voucher.customerName || 'there'}, your ${branding.company.name} travel voucher ` +
    `${voucher.voucherNumber || ''} is ready.\n` +
    (voucher.travelStartDate
      ? `Travel dates: ${new Date(voucher.travelStartDate).toLocaleDateString('en-US')} – ${voucher.travelEndDate ? new Date(voucher.travelEndDate).toLocaleDateString('en-US') : ''}\n`
      : '');

  return client.messages.create({
    from: resolveFromAddress(),
    to,
    body,
    ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
  });
}

export default { isWhatsappConfigured, sendQuotationWhatsapp, sendInvoiceWhatsapp, sendReceiptWhatsapp, sendVoucherWhatsapp };
