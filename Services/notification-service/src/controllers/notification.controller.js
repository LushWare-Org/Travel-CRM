import asyncHandler from '../utils/asyncHandler.js';
import { sendEmailSchema } from '../validators/email.validator.js';
import { sendWhatsappSchema } from '../validators/whatsapp.validator.js';
import { sendEmail as deliverEmail } from '../utils/email.js';
import { sendWhatsappTemplateMessage, sendWhatsappTextMessage } from '../utils/whatsapp.js';

const maskEmail = (addr) => addr.replace(/^[^@]+/, '***');
const maskRecipients = (to) => (Array.isArray(to) ? to.map(maskEmail) : maskEmail(to));
const maskPhone = (phone) => String(phone || '').replace(/\d(?=\d{2})/g, '*');

export const getNotifications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: [], message: 'In-app notifications coming soon' });
});

export const markAsRead = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Marked as read' });
});

export const sendEmail = asyncHandler(async (req, res) => {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid email payload', errors: parsed.error.flatten() });
  }

  const { to, subject, html, text, from, attachments, meta } = parsed.data;

  try {
    const result = await deliverEmail({ to, subject, html, text, from, attachments });
    req.log.info({ to: maskRecipients(to), subject, meta }, 'Email sent');
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    req.log.error({ err, to: maskRecipients(to), subject, meta }, 'Failed to send email');
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, message: 'Email is not configured' });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(502).json({ success: false, message: 'Failed to send email' });
  }
});

export const sendWhatsapp = asyncHandler(async (req, res) => {
  const parsed = sendWhatsappSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid WhatsApp payload', errors: parsed.error.flatten() });
  }

  const { to, meta, ...rest } = parsed.data;

  try {
    const result =
      rest.type === 'template'
        ? await sendWhatsappTemplateMessage({ to, ...rest })
        : await sendWhatsappTextMessage({ to, ...rest });
    req.log.info({ to: maskPhone(to), type: rest.type, meta }, 'WhatsApp message sent');
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    req.log.error({ err, to: maskPhone(to), type: rest.type, meta }, 'Failed to send WhatsApp message');
    if (err.statusCode === 503) {
      return res.status(503).json({ success: false, message: 'WhatsApp is not configured' });
    }
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(502).json({ success: false, message: 'Failed to send WhatsApp message' });
  }
});
