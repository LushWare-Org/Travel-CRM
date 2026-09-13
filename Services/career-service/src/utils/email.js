import { sendEmail as sendViaNotificationService } from '../services/email.client.js';
import { renderEmailLayout, renderButton, renderInfoTable, escapeHtml } from './emailLayout.js';

const send = ({ to, subject, html, text, meta }) =>
  sendViaNotificationService({ to, subject, html, text, meta: { sourceService: 'career-service', ...meta } });

export function sendApplicantConfirmation({ to, fullName, position }) {
  const html = renderEmailLayout({
    title: `Application Received — ${position}`,
    preheader: `We've received your application for ${position}.`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:20px;">Thanks for applying, ${escapeHtml(fullName)}!</h2>
      <p style="margin:0 0 8px;">We've received your application for <strong>${escapeHtml(position)}</strong> at LushTravel. Our hiring team will review it and get back to you within 5&ndash;7 business days.</p>
      <p style="margin:0;">In the meantime, feel free to browse our other open roles.</p>`,
  });
  const text = `Thanks for applying, ${fullName}!\n\nWe've received your application for ${position} at LushTravel. Our hiring team will review it and get back to you within 5-7 business days.\n\nIn the meantime, feel free to browse our other open roles.\n\n— LushTravel CRM (this is an automated message, please do not reply)`;

  return send({ to, subject: `Application Received — ${position}`, html, text, meta: { kind: 'career-applicant-confirmation' } });
}

export function sendAdminApplicationNotice({ to, fullName, position, email, phone, resumeUrl }) {
  const html = renderEmailLayout({
    title: `New Career Application — ${position}`,
    preheader: `${fullName} applied for ${position}.`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:20px;">New application received</h2>
      ${renderInfoTable([
        { label: 'Applicant', value: fullName },
        { label: 'Position', value: position },
        { label: 'Email', value: email },
        { label: 'Phone', value: phone },
      ])}
      ${resumeUrl ? renderButton({ href: resumeUrl, label: 'View Resume' }) : ''}`,
  });
  const text = [
    'New application received',
    `Applicant: ${fullName}`,
    `Position: ${position}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    resumeUrl ? `Resume: ${resumeUrl}` : null,
    '',
    '— LushTravel CRM (this is an automated message, please do not reply)',
  ].filter(Boolean).join('\n');

  return send({ to, subject: `New Career Application — ${position}`, html, text, meta: { kind: 'career-admin-notice' } });
}

const STATUS_MESSAGES = {
  'under-review': 'Your application is under review.',
  shortlisted: 'Congratulations! Your application has been shortlisted.',
  rejected: 'Thank you for applying. Unfortunately, we cannot proceed with your application at this time.',
  hired: 'Congratulations! We are pleased to offer you the position.',
};

const STATUS_COLORS = {
  'under-review': { bg: '#F8FAFC', border: '#E2E8F0', text: '#334155' },
  shortlisted: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  rejected: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  hired: { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
};

export const getStatusMessage = (status) => STATUS_MESSAGES[status] || 'Your application status has been updated.';

export function sendApplicationStatusUpdate({ to, fullName, position, status, feedback }) {
  const message = getStatusMessage(status);
  const c = STATUS_COLORS[status] || STATUS_COLORS['under-review'];

  const html = renderEmailLayout({
    title: `Update on Your ${position} Application`,
    preheader: message,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:20px;">Update on your ${escapeHtml(position)} application</h2>
      <p style="margin:0 0 12px;">Dear ${escapeHtml(fullName)},</p>
      <p style="margin:0;padding:12px 16px;background:${c.bg};border:1px solid ${c.border};border-radius:8px;color:${c.text};">${escapeHtml(message)}</p>
      ${feedback ? `<div style="margin-top:16px;padding:12px 16px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;"><strong>Feedback:</strong><p style="margin:8px 0 0;">${escapeHtml(feedback)}</p></div>` : ''}`,
  });
  const text = [
    `Dear ${fullName},`,
    message,
    feedback ? `Feedback: ${feedback}` : null,
    '',
    '— LushTravel CRM (this is an automated message, please do not reply)',
  ].filter(Boolean).join('\n\n');

  return send({ to, subject: `Update on Your ${position} Application`, html, text, meta: { kind: 'career-status-update' } });
}

export default { sendApplicantConfirmation, sendAdminApplicationNotice, sendApplicationStatusUpdate, getStatusMessage };
