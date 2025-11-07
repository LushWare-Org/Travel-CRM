import nodemailer from 'nodemailer';
import emailConfig from '../config/email.js';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.verificationAttempted = false;
  }

  getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
    return this.transporter;
  }

  async verifyConnection() {
    if (this.verificationAttempted) {
      return;
    }
    this.verificationAttempted = true;
    
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error(`Email service verification failed: ${error.message}`);
    }
  }

  async sendEmail(options) {
    try {
      // Validate email configuration
      if (!emailConfig.from || !emailConfig.host || !emailConfig.port) {
        throw new Error('Email configuration is incomplete. Check EMAIL_HOST, EMAIL_PORT, and EMAIL_FROM in .env');
      }

      const transporter = this.getTransporter();
      const mailOptions = {
        from: emailConfig.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments || [],
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully: ${info.messageId} to ${options.to}`);
      return info;
    } catch (error) {
      logger.error(`Error sending email to ${options.to}: ${error.message}`, {
        code: error.code,
        command: error.command,
        response: error.response,
      });
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

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0.00';
    return Number(amount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async sendQuotationEmail({ quotation, recipientEmail, pdfPath }) {
    const customerName = quotation.customer?.name || quotation.lead?.name || 'Customer';
    const quotationNumber = quotation.quotationNumber || quotation._id;
    const subject = quotationNumber
      ? `Trip Sky Way Quotation - ${quotationNumber}`
      : 'Trip Sky Way Quotation';

    const totalsSection = `
      <ul>
        <li><strong>Total Amount:</strong> ${this.formatCurrency(quotation.totalAmount)}</li>
        <li><strong>Valid Until:</strong> ${this.formatDate(quotation.validUntil)}</li>
        <li><strong>Status:</strong> ${quotation.status?.toUpperCase() || 'DRAFT'}</li>
      </ul>
    `;

    const html = `
      <p>Dear ${customerName},</p>
      <p>Thank you for considering Trip Sky Way. Please find your quotation attached.</p>
      <h3>Quotation Summary</h3>
      ${totalsSection}
      <p>If you have any questions or would like to proceed, simply reply to this email.</p>
      <p>Warm regards,<br/>Trip Sky Way Team</p>
    `;

    const text = `Dear ${customerName},\n\nPlease find your quotation attached.\nTotal Amount: ${this.formatCurrency(
      quotation.totalAmount,
    )}\nValid Until: ${this.formatDate(quotation.validUntil)}\n`; 

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      attachments: pdfPath
        ? [
            {
              filename: `quotation-${quotationNumber}.pdf`,
              path: pdfPath,
            },
          ]
        : [],
    });
  }

  async sendInvoiceEmail({ invoice, recipientEmail, pdfPath }) {
    const customerName = invoice.customer?.name || invoice.lead?.name || 'Customer';
    const invoiceNumber = invoice.invoiceNumber || invoice._id;
    const subject = invoiceNumber
      ? `Trip Sky Way Invoice - ${invoiceNumber}`
      : 'Trip Sky Way Invoice';

    const html = `
      <p>Dear ${customerName},</p>
      <p>Thank you for choosing Trip Sky Way. Please find your invoice attached.</p>
      <h3>Invoice Summary</h3>
      <ul>
        <li><strong>Invoice Number:</strong> ${invoiceNumber}</li>
        <li><strong>Issue Date:</strong> ${this.formatDate(invoice.issueDate || invoice.createdAt)}</li>
        <li><strong>Due Date:</strong> ${this.formatDate(invoice.dueDate)}</li>
        <li><strong>Total Amount:</strong> ${this.formatCurrency(invoice.totalAmount)}</li>
        <li><strong>Status:</strong> ${invoice.status?.toUpperCase() || 'DRAFT'}</li>
      </ul>
      <p>Please review the attached invoice and let us know if you have any questions.</p>
      <p>Warm regards,<br/>Trip Sky Way Team</p>
    `;

    const text = `Dear ${customerName},\n\nPlease find your invoice attached.\nInvoice Number: ${invoiceNumber}\nTotal Amount: ${this.formatCurrency(
      invoice.totalAmount,
    )}\nDue Date: ${this.formatDate(invoice.dueDate)}\n`;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      attachments: pdfPath
        ? [
            {
              filename: `invoice-${invoiceNumber}.pdf`,
              path: pdfPath,
            },
          ]
        : [],
    });
  }

  async sendReceiptEmail({ receipt, invoice, recipientEmail, pdfPath }) {
    const customerName = receipt.customer?.name || receipt.lead?.name || 'Customer';
    const receiptNumber = receipt.receiptNumber || receipt._id;
    const subject = receiptNumber
      ? `Trip Sky Way Payment Receipt - ${receiptNumber}`
      : 'Trip Sky Way Payment Receipt';

    const html = `
      <p>Dear ${customerName},</p>
      <p>Thank you for your payment. Please find your receipt attached for your records.</p>
      <h3>Receipt Summary</h3>
      <ul>
        <li><strong>Receipt Number:</strong> ${receiptNumber}</li>
        <li><strong>Payment Date:</strong> ${this.formatDate(receipt.paymentDate)}</li>
        <li><strong>Amount:</strong> ${this.formatCurrency(receipt.amount)}</li>
        ${invoice ? `<li><strong>Invoice:</strong> ${invoice.invoiceNumber}</li>` : ''}
        <li><strong>Status:</strong> ${receipt.receiptStatus?.replace(/-/g, ' ').toUpperCase() || 'PAID'}</li>
      </ul>
      <p>If you have any questions, please reach out to us.</p>
      <p>Warm regards,<br/>Trip Sky Way Team</p>
    `;

    const text = `Dear ${customerName},\n\nThank you for your payment of ${this.formatCurrency(
      receipt.amount,
    )}. Your receipt is attached.\nReceipt Number: ${receiptNumber}\nPayment Date: ${this.formatDate(
      receipt.paymentDate,
    )}\n`;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      html,
      text,
      attachments: pdfPath
        ? [
            {
              filename: `receipt-${receiptNumber}.pdf`,
              path: pdfPath,
            },
          ]
        : [],
    });
  }
}

export default new EmailService();
