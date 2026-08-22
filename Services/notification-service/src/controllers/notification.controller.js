import asyncHandler from '../utils/asyncHandler.js';
import { sendEmailSchema } from '../validators/email.validator.js';
import { sendEmail as deliverEmail } from '../utils/email.js';

const maskEmail = (addr) => addr.replace(/^[^@]+/, '***');
const maskRecipients = (to) => (Array.isArray(to) ? to.map(maskEmail) : maskEmail(to));

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
