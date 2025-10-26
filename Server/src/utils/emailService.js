import nodemailer from 'nodemailer';
import emailConfig from '../config/email.js';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async sendEmail(options) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Trip Sky Way!';
    const html = `
      <h1>Welcome to Trip Sky Way, ${user.name}!</h1>
      <p>Thank you for registering with us. We're excited to help you plan your next adventure.</p>
      <p>Start exploring our packages and book your dream vacation today!</p>
      <p>If you have any questions, feel free to contact our support team.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendBookingConfirmation(booking, user) {
    const subject = `Booking Confirmation - ${booking.package.name}`;
    const html = `
      <h1>Booking Confirmation</h1>
      <p>Dear ${user.name},</p>
      <p>Your booking has been confirmed!</p>
      <h2>Booking Details:</h2>
      <ul>
        <li><strong>Booking ID:</strong> ${booking.id}</li>
        <li><strong>Package:</strong> ${booking.package.name}</li>
        <li><strong>Date:</strong> ${booking.travelDate}</li>
        <li><strong>Travelers:</strong> ${booking.numberOfTravelers}</li>
        <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
      </ul>
      <p>We'll send you more details soon. Safe travels!</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset</h1>
      <p>Dear ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>This link will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendStaffCredentials(user, tempPassword, role) {
    const loginUrl = `${process.env.CLIENT_URL}/login`;
    let roleDisplay;
    if (role === 'salesRep') {
      roleDisplay = 'Sales Representative';
    } else if (role === 'vendor') {
      roleDisplay = 'Vendor';
    } else {
      roleDisplay = role;
    }
    const subject = `Welcome to Trip Sky Way - Your ${roleDisplay} Account`;
    const html = `
      <h1>Welcome to Trip Sky Way!</h1>
      <p>Dear ${user.name},</p>
      <p>An account has been created for you as a <strong>${roleDisplay}</strong>.</p>
      <h2>Your Login Credentials:</h2>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      </ul>
      <p><strong>Important:</strong> You must change this temporary password on your first login for security reasons.</p>
      <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login Now</a>
      <br><br>
      <p>If you have any questions, please contact the administrator.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendPasswordChanged(user) {
    const subject = 'Password Changed Successfully';
    const html = `
      <h1>Password Changed</h1>
      <p>Dear ${user.name},</p>
      <p>Your password has been changed successfully.</p>
      <p>If you did not make this change, please contact our support team immediately.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <h1>Email Verification</h1>
      <p>Dear ${user.name},</p>
      <p>Thank you for registering with Trip Sky Way. Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendInvoice(user, invoice) {
    const subject = `Invoice #${invoice.invoiceNumber}`;
    const html = `
      <h1>Invoice</h1>
      <p>Dear ${user.name},</p>
      <p>Please find your invoice attached.</p>
      <h2>Invoice Details:</h2>
      <ul>
        <li><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</li>
        <li><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</li>
        <li><strong>Total Amount:</strong> $${invoice.totalAmount}</li>
        <li><strong>Status:</strong> ${invoice.status}</li>
      </ul>
      <p>Thank you for your business!</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }
}

export default new EmailService();
