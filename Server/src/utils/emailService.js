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
        <li><strong>Booking ID:</strong> ${booking._id}</li>
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
