import nodemailer from 'nodemailer';

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

export async function sendLeadAssignmentEmail({ salesRep, lead, assignmentMode }) {
  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: salesRep.email,
    subject: `New Lead Assigned: ${lead.name || lead.email}`,
    html: `
      <h2>New Lead Assigned to You</h2>
      <p>Hi ${salesRep.name || 'Sales Rep'},</p>
      <p>A new lead has been assigned to you${assignmentMode === 'auto' ? ' automatically' : ''}.</p>
      <ul>
        <li><strong>Lead Name:</strong> ${lead.name || 'N/A'}</li>
        <li><strong>Email:</strong> ${lead.email || 'N/A'}</li>
        <li><strong>Lead ID:</strong> ${lead.id}</li>
      </ul>
      <p>Please log in to the CRM to view the full details.</p>
    `,
  });
}
