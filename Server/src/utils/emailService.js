import nodemailer from 'nodemailer';
import emailConfig from '../config/email.js';
import logger from '../config/logger.js';
import BRANDING, { getCopyrightText } from '../config/branding.js';

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
    const subject = `Welcome to ${BRANDING.company.name}!`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Welcome to ${BRANDING.company.name}, ${user.name}! 🎉</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Thank you for registering with us. We're excited to help you plan your next adventure!</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Start exploring our packages and book your dream vacation today!</p>
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">💡 <strong style="color: #FF8C00;">Pro Tip:</strong> Check out our featured destinations to get inspired for your next trip!</p>
      </div>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">If you have any questions, feel free to contact our support team.</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendBookingConfirmation(booking, user) {
    const subject = `Booking Confirmation - ${booking.package.name}`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Booking Confirmation ✅</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Great news! Your booking has been confirmed!</p>
      <div style="background-color: #000000; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #FF8C00; font-size: 20px; margin: 0 0 15px 0;">Booking Details</h2>
        <table style="width: 100%; color: #ffffff; font-size: 15px;">
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #333;"><strong style="color: #FF8C00;">Booking ID:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #333;">${booking.id}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #333;"><strong style="color: #FF8C00;">Package:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #333;">${booking.package.name}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #333;"><strong style="color: #FF8C00;">Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #333;">${booking.travelDate}</td></tr>
          <tr><td style="padding: 8px 0; border-bottom: 1px solid #333;"><strong style="color: #FF8C00;">Travelers:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #333;">${booking.numberOfTravelers}</td></tr>
          <tr><td style="padding: 8px 0;"><strong style="color: #FF8C00;">Total Amount:</strong></td><td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #FF8C00;">$${booking.totalAmount}</td></tr>
        </table>
      </div>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">We'll send you more details soon. Safe travels! 🌍✈️</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Password Reset 🔒</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">You requested a password reset. Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        ${this.getButton('Reset Password', resetUrl)}
      </div>
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">⏰ <strong style="color: #FF8C00;">Important:</strong> This link will expire in 10 minutes.</p>
      </div>
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendStaffCredentials(user, tempPassword, role) {
    // Use MANAGEMENT_URL for staff/admin accounts, CLIENT_URL for customers
    const loginUrl = `${process.env.MANAGEMENT_URL || process.env.CLIENT_URL}/login`;
    let roleDisplay;
    if (role === 'salesRep') {
      roleDisplay = 'Sales Representative';
    } else if (role === 'vendor') {
      roleDisplay = 'Vendor';
    } else if (role === 'admin') {
      roleDisplay = 'Administrator';
    } else {
      roleDisplay = role;
    }
    const subject = `Welcome to ${BRANDING.company.name} - Your ${roleDisplay} Account`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Welcome to ${BRANDING.company.name}! 🎉</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">An account has been created for you as a <strong style="color: #FF8C00;">${roleDisplay}</strong>.</p>
      ${role === 'vendor' && user.businessName ? `<p style="color: #333333; font-size: 16px; margin: 0 0 10px 0;"><strong>Business:</strong> ${user.businessName}</p>` : ''}
      ${role === 'vendor' && user.serviceType ? `<p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;"><strong>Service Type:</strong> ${user.serviceType}</p>` : ''}
      <div style="background-color: #000000; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #FF8C00; font-size: 20px; margin: 0 0 15px 0;">Your Login Credentials</h2>
        <table style="width: 100%; color: #ffffff; font-size: 15px;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #333;"><strong style="color: #FF8C00;">Email:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #333;">${user.email}</td></tr>
          <tr><td style="padding: 10px 0;"><strong style="color: #FF8C00;">Temporary Password:</strong></td><td style="padding: 10px 0; font-family: monospace; color: #FF8C00; font-weight: bold;">${tempPassword}</td></tr>
        </table>
      </div>
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">🔒 <strong style="color: #FF8C00;">Security Notice:</strong> You must change this temporary password on your first login.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        ${this.getButton('Login Now', loginUrl)}
      </div>
      ${role === 'vendor' ? '<div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;"><p style="color: #333333; font-size: 14px; margin: 0;">📋 <strong style="color: #FF8C00;">Note:</strong> Your account is currently under verification. You will be notified once verified.</p></div>' : ''}
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">If you have any questions, please contact the administrator.</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendPasswordChanged(user) {
    const subject = 'Password Changed Successfully';
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Password Changed ✅</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Your password has been changed successfully.</p>
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">⚠️ <strong style="color: #FF8C00;">Security Alert:</strong> If you did not make this change, please contact our support team immediately.</p>
      </div>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  async sendEmailVerification(user, verificationToken) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Email Verification 📧</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Thank you for registering with ${BRANDING.company.name}. Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        ${this.getButton('Verify Email', verificationUrl)}
      </div>
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">⏰ <strong style="color: #FF8C00;">Note:</strong> This link will expire in 24 hours.</p>
      </div>
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">If you didn't create an account, please ignore this email.</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: user.email,
      subject,
      html,
    });
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0.00';
    const currencyCode = process.env.CURRENCY_CODE || 'INR';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return Number(amount).toLocaleString(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDate(date) {
    if (!date) return 'N/A';
    const currencyCode = process.env.CURRENCY_CODE || 'INR';
    const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
    return new Date(date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getEmailTemplate(content) {
    const companyName = BRANDING.company.name;
    const { tagline } = BRANDING.company;
    const { website } = BRANDING.urls;
    const { phone } = BRANDING.contact;

    // Modern Teal/Slate Color Scheme
    const colors = {
      primary: '#0F766E', // Deep Teal
      primaryLight: '#14B8A6', // Light teal
      primaryDark: '#134E4A', // Dark teal
      accent: '#F59E0B', // Amber gold
      accentLight: '#FEF3C7', // Light amber
      slate: '#1E293B', // Dark slate
      slateLight: '#334155', // Medium slate
      gray: '#64748B', // Gray text
      grayLight: '#94A3B8', // Light text
      background: '#F8FAFC', // Light background
      white: '#FFFFFF',
      black: '#0F172A',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${colors.background};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.background}; padding: 20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${colors.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header with Two-Tone Design -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${colors.slate} 0%, ${colors.slateLight} 100%); padding: 40px 32px; position: relative;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 70%;">
                          <div style="margin-bottom: 8px;">
                            <span style="color: ${colors.white}; font-size: 28px; font-weight: 800; letter-spacing: 1px;">${companyName}</span>
                          </div>
                          <div style="color: ${colors.primaryLight}; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">✈ ${tagline}</div>
                        </td>
                        <td style="width: 30%; text-align: right; vertical-align: middle;">
                          <div style="background: ${colors.primary}; padding: 12px 20px; border-radius: 8px; display: inline-block;">
                            <span style="color: ${colors.white}; font-size: 11px; font-weight: 600; letter-spacing: 1px;">TRAVEL EXPERTS</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Accent Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, ${colors.primary}, ${colors.primaryLight}, ${colors.accent});"></td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 32px;">
                    ${content}
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background: linear-gradient(135deg, ${colors.slate} 0%, ${colors.slateLight} 100%); padding: 32px; text-align: center; color: ${colors.white};">
                    <h3 style="color: ${colors.primaryLight}; font-size: 20px; margin-top: 0; margin-bottom: 8px;">${companyName}</h3>
                    <p style="color: ${colors.grayLight}; font-size: 14px; margin-bottom: 16px; font-style: italic;">${tagline}</p>
                    <div style="margin-bottom: 16px;">
                      <a href="${website}" style="color: ${colors.primaryLight}; text-decoration: none; font-size: 14px;">${website.replace('https://', '').replace('http://', '')}</a>
                    </div>
                    <div style="margin-bottom: 16px;">
                      <a href="tel:${phone.replace(/[^+\d]/g, '')}" style="color: ${colors.grayLight}; text-decoration: none; font-size: 14px;">📞 ${phone}</a>
                    </div>
                    <div style="height: 1px; background-color: rgba(255, 255, 255, 0.1); margin: 20px auto; max-width: 200px;"></div>
                    <p style="color: ${colors.gray}; font-size: 12px; margin-bottom: 0;">${getCopyrightText()}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  getButton(text, url) {
    // Modern teal button with subtle shadow
    return `<a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 500; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);">${text}</a>`;
  }

  async sendQuotationEmail({ quotation, recipientEmail, pdfPath }) {
    const customerName = quotation.customer?.name || quotation.lead?.name || 'Customer';
    const quotationNumber = quotation.quotationNumber || quotation._id;
    const subject = quotationNumber
      ? `${BRANDING.company.name} Quotation - ${quotationNumber}`
      : `${BRANDING.company.name} Quotation`;

    const content = `
      <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Your Quotation 📋</h1>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Dear ${customerName},</p>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Thank you for considering ${BRANDING.company.name}. We're excited to help you plan your journey! Please find your quotation details below.</p>

      <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; border: 2px solid #0F766E;">
        <h2 style="color: #14B8A6; font-size: 20px; margin-top: 0; margin-bottom: 24px; letter-spacing: 0.5px;">Quotation Summary</h2>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #14B8A6; font-size: 14px; margin-bottom: 4px;">Total Amount</div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 600;">${this.formatCurrency(quotation.totalAmount)}</div>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Valid Until: </span>
          <span style="color: #ffffff; font-size: 16px;">${this.formatDate(quotation.validUntil)}</span>
        </div>

        <div>
          <span style="color: #14B8A6; font-size: 14px;">Status: </span>
          <span style="color: #ffffff; font-size: 16px; background-color: rgba(16, 185, 129, 0.2); padding: 4px 12px; border-radius: 6px; display: inline-block;">${quotation.status?.toUpperCase() || 'DRAFT'}</span>
        </div>
      </div>

      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">If you have any questions or would like to proceed with the booking, simply reply to this email. Our team is here to help you every step of the way.</p>
    `;
    const html = this.getEmailTemplate(content);

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
      ? `${BRANDING.company.name} Invoice - ${invoiceNumber}`
      : `${BRANDING.company.name} Invoice`;

    const content = `
      <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Your Invoice 💼</h1>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Dear ${customerName},</p>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Thank you for choosing ${BRANDING.company.name}. Please find your invoice attached.</p>

      <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; border: 2px solid #0F766E;">
        <h2 style="color: #14B8A6; font-size: 20px; margin-top: 0; margin-bottom: 24px; letter-spacing: 0.5px;">Invoice Summary</h2>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #14B8A6; font-size: 14px; margin-bottom: 4px;">Invoice Number</div>
          <div style="color: #ffffff; font-size: 18px; font-weight: 600;">${invoiceNumber}</div>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Issue Date: </span>
          <span style="color: #ffffff; font-size: 16px;">${this.formatDate(invoice.issueDate || invoice.createdAt)}</span>
        </div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Due Date: </span>
          <span style="color: #ffffff; font-size: 16px;">${this.formatDate(invoice.dueDate)}</span>
        </div>

        <div style="margin-bottom: 12px;">
          <div style="color: #14B8A6; font-size: 14px; margin-bottom: 4px;">Total Amount</div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 600;">${this.formatCurrency(invoice.totalAmount)}</div>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div>
          <span style="color: #14B8A6; font-size: 14px;">Status: </span>
          <span style="color: #ffffff; font-size: 16px; background-color: rgba(16, 185, 129, 0.2); padding: 4px 12px; border-radius: 6px; display: inline-block;">${invoice.status?.toUpperCase() || 'DRAFT'}</span>
        </div>
      </div>

      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Please review the attached invoice and let us know if you have any questions.</p>
    `;
    const html = this.getEmailTemplate(content);

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

  async sendReceiptEmail({
    receipt, invoice, recipientEmail, pdfPath,
  }) {
    const customerName = receipt.customer?.name || receipt.lead?.name || 'Customer';
    const receiptNumber = receipt.receiptNumber || receipt._id;
    const subject = receiptNumber
      ? `${BRANDING.company.name} Payment Receipt - ${receiptNumber}`
      : `${BRANDING.company.name} Payment Receipt`;

    const content = `
      <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Payment Receipt ✅</h1>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Dear ${customerName},</p>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Thank you for your payment. Please find your receipt attached for your records.</p>

      <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; border: 2px solid #0F766E;">
        <h2 style="color: #14B8A6; font-size: 20px; margin-top: 0; margin-bottom: 24px; letter-spacing: 0.5px;">Receipt Summary</h2>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #14B8A6; font-size: 14px; margin-bottom: 4px;">Amount</div>
          <div style="color: #ffffff; font-size: 32px; font-weight: 600;">${this.formatCurrency(receipt.amount)}</div>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Receipt Number: </span>
          <span style="color: #ffffff; font-size: 16px;">${receiptNumber}</span>
        </div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Payment Date: </span>
          <span style="color: #ffffff; font-size: 16px;">${this.formatDate(receipt.paymentDate)}</span>
        </div>

        ${invoice ? `<div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Invoice: </span>
          <span style="color: #ffffff; font-size: 16px;">${invoice.invoiceNumber}</span>
        </div>` : ''}

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div>
          <span style="color: #14B8A6; font-size: 14px;">Status: </span>
          <span style="color: #ffffff; font-size: 16px; background-color: rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 6px; display: inline-block;">${receipt.receiptStatus?.replace(/-/g, ' ').toUpperCase() || 'PAID'}</span>
        </div>
      </div>

      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">If you have any questions, please reach out to us.</p>
    `;
    const html = this.getEmailTemplate(content);

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

  async sendVoucherEmail({
    to, voucherNumber, customerName, packageName, pdfBuffer, fileName,
  }) {
    const subject = voucherNumber
      ? `${BRANDING.company.name} Travel Voucher - ${voucherNumber}`
      : `${BRANDING.company.name} Travel Voucher`;

    const content = `
      <h1 style="color: #0F172A; font-size: 28px; margin: 0 0 8px 0;">Your Travel Voucher 🎫</h1>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 24px 0;">Dear ${customerName},</p>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 15px 0;">Thank you for choosing ${BRANDING.company.name}! We're excited to be part of your travel journey. ✈️🌍</p>
      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Please find your travel voucher attached. This voucher contains all the important details about your trip.</p>

      <div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 12px; padding: 32px; margin-bottom: 32px; border: 2px solid #0F766E;">
        <h2 style="color: #14B8A6; font-size: 20px; margin-top: 0; margin-bottom: 24px; letter-spacing: 0.5px;">Voucher Summary</h2>
        
        <div style="margin-bottom: 16px;">
          <div style="color: #14B8A6; font-size: 14px; margin-bottom: 4px;">Voucher Number</div>
          <div style="color: #ffffff; font-size: 18px; font-weight: 600;">${voucherNumber}</div>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div style="margin-bottom: 12px;">
          <span style="color: #14B8A6; font-size: 14px;">Package: </span>
          <span style="color: #ffffff; font-size: 16px;">${packageName}</span>
        </div>

        <div style="height: 1px; background-color: rgba(20, 184, 166, 0.2); margin: 20px 0;"></div>

        <div>
          <span style="color: #14B8A6; font-size: 14px;">Status: </span>
          <span style="color: #ffffff; font-size: 16px; background-color: rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 6px; display: inline-block; font-weight: 600;">CONFIRMED</span>
        </div>
      </div>

      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">Please review the attached voucher carefully. It contains your travel dates, accommodation details, meal plans, and itinerary.</p>

      <p style="color: #64748B; line-height: 1.6; margin: 0 0 32px 0;">If you have any questions or need assistance, please don't hesitate to contact us.</p>

      <p style="color: #0F766E; font-size: 18px; font-weight: bold; margin: 20px 0; text-align: center;">We wish you a wonderful and memorable journey! 🎉</p>
    `;
    const html = this.getEmailTemplate(content);

    const text = `Dear ${customerName},\n\nThank you for choosing ${BRANDING.company.name}! Your travel voucher is attached.\nVoucher Number: ${voucherNumber}\nPackage: ${packageName}\n\nPlease review the attached voucher for all travel details.\n\nWarm regards,\n${BRANDING.company.name} Team`;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      attachments: pdfBuffer
        ? [
          {
            filename: fileName || `voucher-${voucherNumber}.pdf`,
            content: pdfBuffer,
          },
        ]
        : [],
    });
  }

  async sendVendorStatusUpdate(vendor, status) {
    let subject = '';
    let message = '';
    let actionRequired = '';

    switch (status) {
      case 'verified':
        subject = 'Your Vendor Account Has Been Verified!';
        message = 'Congratulations! Your vendor account has been verified and approved.';
        actionRequired = 'You can now start offering your services on our platform. Log in to your dashboard to manage your offerings.';
        break;
      case 'suspended':
        subject = 'Your Vendor Account Has Been Suspended';
        message = 'Your vendor account has been temporarily suspended.';
        actionRequired = 'Please contact the administrator for more details and to resolve any issues.';
        break;
      case 'rejected':
        subject = 'Vendor Account Application Status';
        message = 'Unfortunately, your vendor account application has been rejected.';
        actionRequired = 'If you believe this is an error, please contact our support team for clarification.';
        break;
      default:
        subject = 'Vendor Account Status Update';
        message = `Your vendor account status has been updated to: ${status}`;
        actionRequired = 'Please check your dashboard for more details.';
    }

    const loginUrl = `${process.env.CLIENT_URL}/login`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">Vendor Account Status Update 📢</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${vendor.name},</p>
      ${vendor.businessName ? `<p style="color: #333333; font-size: 16px; margin: 0 0 15px 0;"><strong>Business:</strong> ${vendor.businessName}</p>` : ''}
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${message}</p>
      <div style="background-color: #000000; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #ffffff; font-size: 16px; margin: 0;"><strong style="color: #FF8C00;">New Status:</strong> <span style="font-weight: bold; color: ${status === 'verified' ? '#00ff00' : '#FFD700'};">${status.replace('_', ' ').toUpperCase()}</span></p>
      </div>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">${actionRequired}</p>
      ${status === 'verified' ? `<div style="text-align: center; margin: 30px 0;">${this.getButton('Access Your Dashboard', loginUrl)}</div>` : ''}
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">If you have any questions, please contact our support team.</p>
    `;
    const html = this.getEmailTemplate(content);

    return this.sendEmail({
      to: vendor.email,
      subject,
      html,
    });
  }

  async sendLeadAssignmentEmail({
    salesRep, lead, assignedBy, assignmentMode,
  }) {
    // Validate email configuration before attempting to send
    if (!emailConfig.from || !emailConfig.host || !emailConfig.port) {
      const error = new Error('Email configuration is incomplete. Cannot send lead assignment email.');
      logger.error(`❌ ${error.message}`, {
        hasFrom: !!emailConfig.from,
        hasHost: !!emailConfig.host,
        hasPort: !!emailConfig.port,
        salesRepEmail: salesRep?.email,
        leadId: lead?._id || lead?.id,
      });
      throw error;
    }

    if (!salesRep || !salesRep.email) {
      const error = new Error('Sales rep email is missing. Cannot send lead assignment email.');
      logger.error(`❌ ${error.message}`, { salesRep, leadId: lead?._id || lead?.id });
      throw error;
    }

    const managementUrl = `${process.env.MANAGEMENT_URL || process.env.CLIENT_URL || 'http://localhost:3001'}`;
    const leadUrl = `${managementUrl}/leads/${lead._id || lead.id}`;
    const subject = `New Lead Assigned: ${lead.name || 'Lead'}`;

    const assignmentType = assignmentMode === 'auto' ? 'automatically assigned' : 'manually assigned';
    const assignedByText = assignedBy ? ` by ${assignedBy.name || 'an administrator'}` : '';

    logger.info(`Preparing lead assignment email for ${salesRep.email}`, {
      leadId: lead._id || lead.id,
      leadName: lead.name,
      assignmentMode,
    });

    const leadDetails = `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Lead Details</h3>
        <ul style="list-style: none; padding: 0;">
          ${lead.name ? `<li style="margin: 8px 0;"><strong>Name:</strong> ${lead.name}</li>` : ''}
          ${lead.email ? `<li style="margin: 8px 0;"><strong>Email:</strong> ${lead.email}</li>` : ''}
          ${lead.phone ? `<li style="margin: 8px 0;"><strong>Phone:</strong> ${lead.phone}</li>` : ''}
          ${lead.destination ? `<li style="margin: 8px 0;"><strong>Destination:</strong> ${lead.destination}</li>` : ''}
          ${lead.travelDate ? `<li style="margin: 8px 0;"><strong>Travel Date:</strong> ${this.formatDate(lead.travelDate)}</li>` : ''}
          ${lead.endDate ? `<li style="margin: 8px 0;"><strong>End Date:</strong> ${this.formatDate(lead.endDate)}</li>` : ''}
          ${lead.numberOfTravelers ? `<li style="margin: 8px 0;"><strong>Number of Travelers:</strong> ${lead.numberOfTravelers}</li>` : ''}
          ${lead.status ? `<li style="margin: 8px 0;"><strong>Status:</strong> ${lead.status.toUpperCase()}</li>` : ''}
          ${lead.priority ? `<li style="margin: 8px 0;"><strong>Priority:</strong> ${lead.priority.toUpperCase()}</li>` : ''}
          ${lead.source ? `<li style="margin: 8px 0;"><strong>Source:</strong> ${lead.source}</li>` : ''}
        </ul>
        ${lead.message ? `<p style="margin-top: 15px;"><strong>Message:</strong><br/>${lead.message}</p>` : ''}
        ${lead.remarks && lead.remarks.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong>Remarks:</strong>
            <ul style="margin: 8px 0; padding-left: 20px;">
              ${lead.remarks.slice(-3).map((remark) => `<li>${remark.text || remark} - ${this.formatDate(remark.date || new Date())}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">New Lead Assigned to You 🎯</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${salesRep.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">A new lead has been ${assignmentType}${assignedByText}.</p>
      ${leadDetails}
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 16px; margin: 0 0 10px 0;"><strong style="color: #FF8C00;">Next Steps:</strong></p>
        <ul style="color: #333333; font-size: 14px; margin: 0; padding-left: 20px;">
          <li style="margin: 5px 0;">Review the lead details above</li>
          <li style="margin: 5px 0;">Contact the lead as soon as possible</li>
          <li style="margin: 5px 0;">Update the lead status in your dashboard</li>
        </ul>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        ${this.getButton('View Lead in Dashboard', leadUrl)}
      </div>
      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">If you have any questions or need assistance, please contact the administrator.</p>
    `;
    const html = this.getEmailTemplate(content);

    const text = `Dear ${salesRep.name},\n\nA new lead has been ${assignmentType}${assignedByText}.\n\nLead Details:\n${lead.name ? `Name: ${lead.name}\n` : ''}${lead.email ? `Email: ${lead.email}\n` : ''}${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.destination ? `Destination: ${lead.destination}\n` : ''}${lead.travelDate ? `Travel Date: ${this.formatDate(lead.travelDate)}\n` : ''}${lead.status ? `Status: ${lead.status.toUpperCase()}\n` : ''}\nView lead in dashboard: ${leadUrl}\n\nBest regards,\nThe ${BRANDING.company.name} Team`;

    return this.sendEmail({
      to: salesRep.email,
      subject,
      html,
      text,
    });
  }

  // ==========================================
  // OTP Authentication Email Methods
  // ==========================================

  async sendOTPEmail(user, otp) {
    const subject = `Your ${BRANDING.company.name} Login OTP Code`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 10px 0; text-align: center;">Security Verification 🔐</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">Your one-time password (OTP) for logging into your ${BRANDING.company.name} account is:</p>
      
      <div style="background-color: #ffffff; padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px; border: 2px dashed #FF8C00;">
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px; font-weight: bold;">Your OTP Code</p>
        <div style="background: linear-gradient(135deg, #FF8C00 0%, #FF6B00 100%); color: white; font-size: 48px; font-weight: bold; letter-spacing: 12px; font-family: 'Courier New', monospace; padding: 20px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 6px rgba(255, 140, 0, 0.3);">${otp}</div>
        <p style="color: #666; font-size: 14px; margin: 15px 0 0 0;">⏱️ Valid for 10 minutes</p>
      </div>

      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;"><strong style="color: #FF8C00;">⚠️ Important Security Notice:</strong></p>
        <ul style="color: #333333; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Never share this OTP with anyone</li>
          <li>Never reply to this email with sensitive information</li>
          <li>This code expires in 10 minutes</li>
          <li>If you didn't request this OTP, ignore this email</li>
        </ul>
      </div>

      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">If you continue to have trouble logging in, please <a href="mailto:${BRANDING.contact.supportEmail}" style="color: #FF8C00; text-decoration: none; font-weight: bold;">contact our support team</a>.</p>
    `;
    const html = this.getEmailTemplate(content);

    const text = `Dear ${user.name},\n\nYour one-time password (OTP) for logging in is:\n\n${otp}\n\nThis code is valid for 10 minutes.\n\nIMPORTANT: Never share this OTP with anyone. If you didn't request this code, please ignore this email.\n\nBest regards,\nThe ${BRANDING.company.name} Team`;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }

  async sendLoginNotification(user) {
    const subject = `New Login Detected - ${BRANDING.company.name}`;
    const content = `
      <h1 style="color: #000000; font-size: 28px; margin: 0 0 20px 0;">New Login Detected 🔔</h1>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">Dear ${user.name},</p>
      <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">We detected a new login to your ${BRANDING.company.name} account.</p>
      
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #FF9800; font-size: 18px; margin: 0 0 15px 0;">Login Details</h3>
        <table style="width: 100%; color: #ffffff; font-size: 15px;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #333;"><strong style="color: #FF9800;">Timestamp:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #333;">${new Date().toLocaleString(process.env.CURRENCY_CODE === 'INR' ? 'en-IN' : 'en-US')}</td></tr>
          <tr><td style="padding: 10px 0;"><strong style="color: #FF9800;">Account:</strong></td><td style="padding: 10px 0;">${user.email}</td></tr>
        </table>
      </div>
      
      <div style="background-color: #FFF5E6; border-left: 4px solid #FF8C00; padding: 15px; margin: 20px 0;">
        <p style="color: #333333; font-size: 14px; margin: 0;">⚠️ <strong style="color: #FF8C00;">Security Alert:</strong> If you didn't authorize this login, please change your password immediately and contact our support team.</p>
      </div>
    `;
    const html = this.getEmailTemplate(content);

    const text = `Dear ${user.name},\n\nWe detected a new login to your ${BRANDING.company.name} account at ${new Date().toLocaleString()}.\n\nIf you didn't authorize this login, please contact support immediately.\n\nBest regards,\nThe ${BRANDING.company.name} Team`;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }
}

export default new EmailService();
