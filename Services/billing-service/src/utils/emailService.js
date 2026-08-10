import nodemailer from 'nodemailer';
import BRANDING, { getEmailFrom } from '../config/branding.js';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${(Number(amount) || 0).toFixed(2)}`;
};

const formatDate = (date) => (date ? new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Nodemailer transport built from env. Returns null when SMTP is not configured. */
function buildTransport() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) return null;
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
}

export const isEmailConfigured = () => buildTransport() !== null;

function quotationEmailHtml(quotation) {
  const customerName = quotation.customerName || 'Customer';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#0F172A;">
    <div style="background:linear-gradient(135deg,#0F766E,#14B8A6);padding:28px 32px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${BRANDING.company.name}</h1>
      <p style="color:#E0F2F1;margin:6px 0 0;font-size:13px;">${BRANDING.company.tagline}</p>
    </div>
    <div style="border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
      <h2 style="font-size:20px;margin:0 0 8px;">Your Quotation 📋</h2>
      <p style="color:#64748B;line-height:1.6;">Dear ${customerName},</p>
      <p style="color:#64748B;line-height:1.6;">Thank you for considering ${BRANDING.company.name}. Please find your quotation
        <strong>${quotation.quotationNumber || ''}</strong> attached as a PDF. A summary is below.</p>
      <div style="background:#F1F5F9;border-radius:10px;padding:20px;margin:20px 0;">
        <div style="color:#0F766E;font-size:13px;">Total Amount</div>
        <div style="font-size:28px;font-weight:700;">${formatMoney(quotation.totalAmount, quotation.currency)}</div>
        <div style="color:#64748B;font-size:13px;margin-top:10px;">Valid until: ${formatDate(quotation.validUntil)}</div>
      </div>
      <p style="color:#64748B;line-height:1.6;">If you have any questions or would like to proceed, simply reply to this email.</p>
      <p style="color:#94A3B8;font-size:12px;margin-top:24px;">${BRANDING.company.name} · ${BRANDING.contact.email} · ${BRANDING.contact.phone}</p>
    </div>
  </div>`;
}

/**
 * Send a quotation email with the PDF attached.
 * @param {object} params
 * @param {object} params.quotation - the quotation snapshot
 * @param {string} params.recipientEmail
 * @param {Buffer} params.pdfBuffer
 * @throws {Error} when SMTP is not configured
 */
export async function sendQuotationEmail({ quotation, recipientEmail, pdfBuffer }) {
  const transporter = buildTransport();
  if (!transporter) {
    throw new Error('Email is not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)');
  }
  if (!recipientEmail) throw new Error('No recipient email provided');

  const subject = quotation.quotationNumber
    ? `${BRANDING.company.name} Quotation - ${quotation.quotationNumber}`
    : `${BRANDING.company.name} Quotation`;

  return transporter.sendMail({
    from: getEmailFrom(),
    to: recipientEmail,
    subject,
    html: quotationEmailHtml(quotation),
    text: `Dear ${quotation.customerName || 'Customer'},\n\nPlease find your quotation attached.\nTotal: ${formatMoney(quotation.totalAmount, quotation.currency)}\nValid until: ${formatDate(quotation.validUntil)}\n`,
    attachments: pdfBuffer
      ? [{ filename: `quotation-${quotation.quotationNumber || quotation.id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [],
  });
}

export default { isEmailConfigured, sendQuotationEmail };
