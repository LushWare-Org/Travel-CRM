import { sendEmail as sendViaNotificationService } from '../services/email.client.js';
import { renderEmailLayout, renderInfoTable, escapeHtml } from './emailLayout.js';

export async function sendLeadAssignmentEmail({ salesRep, lead, assignmentMode, assignedBy }) {
  const subject = `New Lead Assigned: ${lead.name || lead.email}`;

  const html = renderEmailLayout({
    title: subject,
    preheader: `New lead assigned to you: ${lead.name || lead.email}`,
    bodyHtml: `
      <h2 style="margin:0 0 12px;font-size:20px;">New lead assigned to you</h2>
      <p style="margin:0 0 8px;">Hi ${escapeHtml(salesRep.name || 'there')}, a new lead has been assigned to you${assignmentMode === 'auto' ? ' automatically' : ''}.</p>
      ${renderInfoTable([
        { label: 'Name', value: lead.name },
        { label: 'Email', value: lead.email },
        { label: 'Phone', value: lead.phone },
        { label: 'Destination', value: lead.destination },
        { label: 'Lead ID', value: lead.id },
        { label: 'Assignment', value: assignmentMode === 'auto' ? 'Auto-assigned' : `By ${assignedBy?.name || 'admin'}` },
      ])}
      <p style="margin:16px 0 0;">Please log in to the CRM to view the full details.</p>`,
  });

  const text = [
    'New lead assigned to you',
    `Hi ${salesRep.name || 'there'}, a new lead has been assigned to you${assignmentMode === 'auto' ? ' automatically' : ''}.`,
    '',
    `Name: ${lead.name || 'N/A'}`,
    `Email: ${lead.email || 'N/A'}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.destination ? `Destination: ${lead.destination}` : null,
    `Lead ID: ${lead.id}`,
    '',
    'Please log in to the CRM to view the full details.',
    '',
    '— LushTravel CRM (this is an automated message, please do not reply)',
  ].filter(Boolean).join('\n');

  return sendViaNotificationService({
    to: salesRep.email,
    subject,
    html,
    text,
    meta: { sourceService: 'booking-service', kind: 'lead-assignment' },
  });
}
