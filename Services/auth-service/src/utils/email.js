import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

const createTransport = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
});

const FROM = () => process.env.EMAIL_FROM || `"LushTravel" <${process.env.EMAIL_USER}>`;

const wrap = (content) => `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
${content}
<hr style="margin-top:30px"/>
<p style="color:#888;font-size:12px;">LushTravel CRM — Do not reply to this email.</p>
</body></html>`;

const send = async ({ to, subject, html }) => {
  const transport = createTransport();
  await transport.sendMail({ from: FROM(), to, subject, html });
};

export const sendWelcomeEmail = (user) =>
  send({
    to: user.email,
    subject: 'Welcome to LushTravel!',
    html: wrap(`<h2>Welcome, ${user.name}!</h2><p>Your account has been created successfully.</p>`),
  }).catch((err) => logger.error({ err, email: user.email }, 'Failed to send welcome email'));

export const sendEmailVerification = (user, token) => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;
  return send({
    to: user.email,
    subject: 'Verify your email address',
    html: wrap(`<h2>Verify Your Email</h2>
      <p>Hi ${user.name}, click the link below to verify your email address:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:#fff;text-decoration:none;border-radius:4px;">Verify Email</a>
      <p>Link expires in 24 hours.</p>`),
  }).catch((err) => logger.error({ err, email: user.email }, 'Failed to send email verification'));
};

export const sendPasswordReset = (user, token) => {
  const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;
  return send({
    to: user.email,
    subject: 'Password Reset Request',
    html: wrap(`<h2>Reset Your Password</h2>
      <p>Hi ${user.name}, you requested a password reset. Click below:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#0070f3;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a>
      <p>Link expires in 1 hour. If you didn't request this, ignore this email.</p>`),
  }).catch((err) => logger.error({ err, email: user.email }, 'Failed to send password reset email'));
};

export const sendPasswordChanged = (user) =>
  send({
    to: user.email,
    subject: 'Your password has been changed',
    html: wrap(`<h2>Password Changed</h2>
      <p>Hi ${user.name}, your password was just changed. If you didn't do this, contact support immediately.</p>`),
  }).catch((err) => logger.error({ err, email: user.email }, 'Failed to send password-changed notification'));

export const sendOTPEmail = (user, otp) =>
  send({
    to: user.email,
    subject: 'Your Login OTP',
    html: wrap(`<h2>Login Verification Code</h2>
      <p>Hi ${user.name}, use the code below to complete your login:</p>
      <h1 style="letter-spacing:8px;font-size:36px;text-align:center;color:#0070f3;">${otp}</h1>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>`),
  });

export const sendLoginNotification = (user) =>
  send({
    to: user.email,
    subject: 'New login to your account',
    html: wrap(`<h2>New Login Detected</h2>
      <p>Hi ${user.name}, a new login was just detected on your account.</p>
      <p>If this wasn't you, please change your password immediately.</p>`),
  }).catch((err) => logger.error({ err, email: user.email }, 'Failed to send login notification'));

export const sendLeadAssignmentEmail = ({ salesRep, lead, assignedBy, assignmentMode }) =>
  send({
    to: salesRep.email,
    subject: `New Lead Assigned — ${lead.name || lead.email}`,
    html: wrap(`<h2>New Lead Assigned to You</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td><strong>Name:</strong></td><td>${lead.name || '—'}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${lead.email || '—'}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${lead.phone || '—'}</td></tr>
        <tr><td><strong>Destination:</strong></td><td>${lead.destination || '—'}</td></tr>
        <tr><td><strong>Status:</strong></td><td>${lead.status}</td></tr>
        <tr><td><strong>Assignment:</strong></td><td>${assignmentMode === 'auto' ? 'Auto-assigned' : `By ${assignedBy?.name || 'admin'}`}</td></tr>
      </table>`),
  }).catch((err) => logger.error({ err, email: salesRep.email }, 'Failed to send lead-assignment email'));

export default {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordChanged,
  sendOTPEmail,
  sendLoginNotification,
  sendLeadAssignmentEmail,
};
