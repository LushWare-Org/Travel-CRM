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
      ${role === 'vendor' && user.businessName ? `<p><strong>Business:</strong> ${user.businessName}</p>` : ''}
      ${role === 'vendor' && user.serviceType ? `<p><strong>Service Type:</strong> ${user.serviceType}</p>` : ''}
      <h2>Your Login Credentials:</h2>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Temporary Password:</strong> ${tempPassword}</li>
      </ul>
      <p><strong>Important:</strong> You must change this temporary password on your first login for security reasons.</p>
      <a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Login Now</a>
      <br><br>
      ${role === 'vendor' ? '<p><strong>Note:</strong> Your account is currently under verification. You will be notified once your account is verified and you can start offering your services.</p>' : ''}
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

  async sendVoucherEmail({ to, voucherNumber, customerName, packageName, pdfBuffer, fileName }) {
    const subject = voucherNumber
      ? `Trip Sky Way Travel Voucher - ${voucherNumber}`
      : 'Trip Sky Way Travel Voucher';

    const html = `
      <p>Dear ${customerName},</p>
      <p>Thank you for choosing Trip Sky Way! We're excited to be part of your travel journey.</p>
      <p>Please find your travel voucher attached. This voucher contains all the important details about your trip.</p>
      <h3>Voucher Summary</h3>
      <ul>
        <li><strong>Voucher Number:</strong> ${voucherNumber}</li>
        <li><strong>Package:</strong> ${packageName}</li>
        <li><strong>Status:</strong> CONFIRMED</li>
      </ul>
      <p>Please review the attached voucher carefully. It contains your travel dates, accommodation details, meal plans, and itinerary.</p>
      <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
      <p>We wish you a wonderful and memorable journey!</p>
      <p>Warm regards,<br/>Trip Sky Way Team</p>
    `;

    const text = `Dear ${customerName},\n\nThank you for choosing Trip Sky Way! Your travel voucher is attached.\nVoucher Number: ${voucherNumber}\nPackage: ${packageName}\n\nPlease review the attached voucher for all travel details.\n\nWarm regards,\nTrip Sky Way Team`;

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
    const html = `
      <h1>Vendor Account Status Update</h1>
      <p>Dear ${vendor.name},</p>
      ${vendor.businessName ? `<p><strong>Business:</strong> ${vendor.businessName}</p>` : ''}
      <p>${message}</p>
      <p><strong>New Status:</strong> ${status.replace('_', ' ').toUpperCase()}</p>
      <p>${actionRequired}</p>
      ${status === 'verified' ? `<a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">Access Your Dashboard</a>` : ''}
      <br><br>
      <p>If you have any questions, please contact our support team.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    return this.sendEmail({
      to: vendor.email,
      subject,
      html,
    });
  }

  async sendLeadAssignmentEmail({ salesRep, lead, assignedBy, assignmentMode }) {
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
              ${lead.remarks.slice(-3).map(remark => `<li>${remark.text || remark} - ${this.formatDate(remark.date || new Date())}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;

    const html = `
      <h1 style="color: #333;">New Lead Assigned to You</h1>
      <p>Dear ${salesRep.name},</p>
      <p>A new lead has been ${assignmentType}${assignedByText}.</p>
      ${leadDetails}
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review the lead details above</li>
        <li>Contact the lead as soon as possible</li>
        <li>Update the lead status in your dashboard</li>
      </ul>
      <a href="${leadUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Lead in Dashboard</a>
      <br><br>
      <p>If you have any questions or need assistance, please contact the administrator.</p>
      <br>
      <p>Best regards,</p>
      <p>The Trip Sky Way Team</p>
    `;

    const text = `Dear ${salesRep.name},\n\nA new lead has been ${assignmentType}${assignedByText}.\n\nLead Details:\n${lead.name ? `Name: ${lead.name}\n` : ''}${lead.email ? `Email: ${lead.email}\n` : ''}${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.destination ? `Destination: ${lead.destination}\n` : ''}${lead.travelDate ? `Travel Date: ${this.formatDate(lead.travelDate)}\n` : ''}${lead.status ? `Status: ${lead.status.toUpperCase()}\n` : ''}\nView lead in dashboard: ${leadUrl}\n\nBest regards,\nThe Trip Sky Way Team`;

    return this.sendEmail({
      to: salesRep.email,
      subject,
      html,
      text,
    });
  }

  // @desc Send OTP code for login verification
  async sendOtpCode(user, otpCode) {
    const subject = 'Your Login Verification Code - Trip Sky Way';
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Trip Sky Way</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Secure Login Verification</p>
          </div>

          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Your Verification Code</h2>

          <p style="color: #666; line-height: 1.6;">Dear ${user.name},</p>

          <p style="color: #666; line-height: 1.6;">
            You recently tried to log in to your Trip Sky Way admin account. To complete your login, 
            please use the verification code below:
          </p>

          <div style="background-color: #f0f0f0; padding: 20px; border-radius: 6px; text-align: center; margin: 30px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
            <p style="margin: 15px 0; font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 4px; font-family: 'Courier New', monospace;">
              ${otpCode}
            </p>
            <p style="margin: 10px 0; font-size: 12px; color: #999;">This code expires in 10 minutes</p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Tip:</strong> Never share this code with anyone. We will never ask for this code via email or phone.
            </p>
          </div>

          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            <strong>Having trouble?</strong>
          </p>
          <ul style="color: #666; line-height: 1.8; margin: 10px 0;">
            <li>Make sure you entered the code within 10 minutes of receiving this email</li>
            <li>Check your email for the most recent verification code</li>
            <li>Try requesting a new code if this one has expired</li>
          </ul>

          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            If you did not attempt to log in, please ignore this email. Your account is secure.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0;">
            Trip Sky Way Admin Portal<br>
            © ${new Date().getFullYear()} Trip Sky Way. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const text = `Dear ${user.name},\n\nYour verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not attempt to log in, please ignore this email.\n\nBest regards,\nThe Trip Sky Way Team`;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }

  // @desc Send OTP verification success email
  async sendOtpVerificationSuccess(user) {
    const subject = 'Login Verified - Trip Sky Way';
    const html = `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Trip Sky Way</h1>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">Login Successful</p>
          </div>

          <h2 style="color: #28a745; text-align: center; margin-bottom: 20px;">✓ Login Verified</h2>

          <p style="color: #666; line-height: 1.6;">Dear ${user.name},</p>

          <p style="color: #666; line-height: 1.6;">
            Your login has been verified successfully. You are now accessing your Trip Sky Way admin account.
          </p>

          <div style="background-color: #d4edda; border: 1px solid #28a745; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
              <strong>Login Details:</strong><br>
              Account: ${user.email}<br>
              Time: ${new Date().toLocaleString()}<br>
              Role: ${user.role}
            </p>
          </div>

          <p style="color: #666; line-height: 1.6; margin-top: 20px;">
            <strong>Notice something unusual?</strong>
          </p>
          <p style="color: #666; line-height: 1.6;">
            If this login was not made by you, please secure your account immediately by changing your password and contacting our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0;">
            Trip Sky Way Admin Portal<br>
            © ${new Date().getFullYear()} Trip Sky Way. All rights reserved.
          </p>
        </div>
      </div>
    `;

    const text = `Dear ${user.name},\n\nYour login has been verified successfully.\n\nAccount: ${user.email}\nTime: ${new Date().toLocaleString()}\n\nIf this was not you, please change your password immediately.\n\nBest regards,\nThe Trip Sky Way Team`;

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  }
}

export default new EmailService();
