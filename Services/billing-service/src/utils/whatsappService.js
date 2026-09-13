import { getOrgSettings, toBrandingShape } from '../config/orgSettings.js';
import { sendWhatsappTemplate } from '../services/whatsapp.client.js';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toFixed(2)}`;
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-US') : 'N/A');

const LANGUAGE_CODE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';

// Template names are approved and named in Meta Business Manager, not
// secrets — overridable via env only if the user names theirs differently.
// Each template must accept exactly this many positional {{n}} body
// parameters (Meta rejects a mismatched count), so callers below always
// supply a value, falling back to 'N/A' for an absent optional date/field.
const TEMPLATES = {
  quotation: process.env.WHATSAPP_TEMPLATE_QUOTATION || 'quotation_ready',
  invoice: process.env.WHATSAPP_TEMPLATE_INVOICE || 'invoice_ready',
  receipt: process.env.WHATSAPP_TEMPLATE_RECEIPT || 'payment_receipt_ready',
  voucher: process.env.WHATSAPP_TEMPLATE_VOUCHER || 'travel_voucher_ready',
};

export const isWhatsappConfigured = () =>
  Boolean(process.env.NOTIFICATION_SERVICE_URL && process.env.INTERNAL_EVENTS_TOKEN);

/**
 * Send a quotation over WhatsApp: a pre-approved template with the PDF as
 * its Document header (Cloudinary-hosted `mediaUrl`) and the quotation's
 * key facts as body parameters. Business-initiated, so this only works
 * outside a live session via an approved template — never free text.
 */
export async function sendQuotationWhatsapp({ quotation, phone, mediaUrl }) {
  const branding = toBrandingShape(await getOrgSettings());

  return sendWhatsappTemplate({
    to: phone,
    templateName: TEMPLATES.quotation,
    languageCode: LANGUAGE_CODE,
    headerDocumentUrl: mediaUrl,
    headerDocumentFilename: `quotation-${quotation.quotationNumber}.pdf`,
    bodyParams: [
      quotation.customerName || 'there',
      branding.company.name,
      quotation.quotationNumber || '',
      formatMoney(quotation.totalAmount, quotation.currency),
      formatDate(quotation.validUntil),
    ],
  });
}

/** Send an invoice over WhatsApp — same shape as {@link sendQuotationWhatsapp}. */
export async function sendInvoiceWhatsapp({ invoice, phone, mediaUrl }) {
  const branding = toBrandingShape(await getOrgSettings());

  return sendWhatsappTemplate({
    to: phone,
    templateName: TEMPLATES.invoice,
    languageCode: LANGUAGE_CODE,
    headerDocumentUrl: mediaUrl,
    headerDocumentFilename: `invoice-${invoice.invoiceNumber}.pdf`,
    bodyParams: [
      invoice.customerName || 'there',
      branding.company.name,
      invoice.invoiceNumber || '',
      formatMoney(invoice.totalAmount, invoice.currency),
      formatDate(invoice.dueDate),
    ],
  });
}

/** Send a payment receipt over WhatsApp — same shape as {@link sendQuotationWhatsapp}. */
export async function sendReceiptWhatsapp({ receipt, phone, mediaUrl }) {
  const branding = toBrandingShape(await getOrgSettings());

  return sendWhatsappTemplate({
    to: phone,
    templateName: TEMPLATES.receipt,
    languageCode: LANGUAGE_CODE,
    headerDocumentUrl: mediaUrl,
    headerDocumentFilename: `receipt-${receipt.receiptNumber}.pdf`,
    bodyParams: [
      receipt.customerName || 'there',
      branding.company.name,
      receipt.receiptNumber || '',
      formatMoney(receipt.amount, receipt.currency),
      receipt.invoice?.invoiceNumber || 'N/A',
    ],
  });
}

/** Send a travel voucher over WhatsApp — same shape as {@link sendQuotationWhatsapp}. */
export async function sendVoucherWhatsapp({ voucher, phone, mediaUrl }) {
  const branding = toBrandingShape(await getOrgSettings());

  const travelDates = voucher.travelStartDate
    ? `${formatDate(voucher.travelStartDate)} - ${voucher.travelEndDate ? formatDate(voucher.travelEndDate) : ''}`
    : 'N/A';

  return sendWhatsappTemplate({
    to: phone,
    templateName: TEMPLATES.voucher,
    languageCode: LANGUAGE_CODE,
    headerDocumentUrl: mediaUrl,
    headerDocumentFilename: `voucher-${voucher.voucherNumber}.pdf`,
    bodyParams: [
      voucher.customerName || 'there',
      branding.company.name,
      voucher.voucherNumber || '',
      travelDates,
    ],
  });
}

export default { isWhatsappConfigured, sendQuotationWhatsapp, sendInvoiceWhatsapp, sendReceiptWhatsapp, sendVoucherWhatsapp };
