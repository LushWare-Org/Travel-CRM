import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Modern Blue & White Color Scheme
const COLORS = {
  primary: '#2563EB',      // Modern Blue
  primaryDark: '#1E40AF',   // Darker Blue
  primaryLight: '#3B82F6',  // Light Blue
  accent: '#60A5FA',        // Accent Blue
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

/**
 * Generate modern quotation PDF
 */
export function generateQuotationPDF(quotation, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
      });

      const fileName = `quotation-${quotation.quotationNumber || quotation._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== HEADER =====
      doc
        .rect(0, 0, 595, 100)
        .fillColor(COLORS.primary)
        .fill();

      doc
        .fillColor(COLORS.white)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('TRIP SKY WAY', 50, 30)
        .fontSize(12)
        .font('Helvetica')
        .text('Premium Travel & Tours', 50, 60);

      // Document Type Badge
      doc
        .rect(420, 35, 125, 35)
        .fillColor(COLORS.white)
        .fill()
        .fillColor(COLORS.primary)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('QUOTATION', 435, 42);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== QUOTATION INFO =====
      yPos = 120;
      doc
        .fillColor(COLORS.gray800)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Quotation Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Quotation #: ${quotation.quotationNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35)
        .text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 50);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(COLORS.primary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .font('Helvetica')
        .fillColor(COLORS.gray800)
        .fontSize(10)
        .text(quotation.customer?.name || lead?.name || 'N/A', 50, yPos + 20)
        .text(quotation.customer?.email || lead?.email || '', 50, yPos + 35)
        .text(quotation.customer?.phone || lead?.phone || '', 50, yPos + 50)
        .text(quotation.customer?.address || '', 50, yPos + 65);

      // ===== ITEMS TABLE =====
      yPos = 330;
      const tableTop = yPos;
      
      // Table Header Background
      doc
        .rect(50, tableTop, 495, 25)
        .fillColor(COLORS.primary)
        .fill();

      // Table Header Text
      doc
        .fillColor(COLORS.white)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 60, tableTop + 8)
        .text('Price', 460, tableTop + 8);

      // Table Rows
      let rowY = tableTop + 25;
      quotation.items?.forEach((item, index) => {
        const rowHeight = 30;
        const bgColor = index % 2 === 0 ? COLORS.white : COLORS.gray100;

        // Row Background
        doc
          .rect(50, rowY, 495, rowHeight)
          .fillColor(bgColor)
          .fill();

        // Row Content
        doc
          .fillColor(COLORS.gray800)
          .fontSize(9)
          .font('Helvetica')
          .text(item.description || '', 60, rowY + 8, { width: 380 })
          .text(`${formatCurrency(item.totalPrice || 0)}`, 460, rowY + 8, { width: 75, align: 'right' });

        rowY += rowHeight;
      });

      // ===== TOTALS SECTION =====
      const totalsY = rowY + 20;
      
      // Totals Box
      doc
        .rect(300, totalsY, 245, 140)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      let calcY = totalsY + 15;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 320, calcY)
        .text(formatCurrency(quotation.subtotal || 0), 420, calcY, { width: 110, align: 'right' });

      if (quotation.discountAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.success)
          .text(`Discount (${quotation.discountType === 'percentage' ? `${quotation.discountValue}%` : 'Fixed'}):`, 320, calcY)
          .text(`-${formatCurrency(quotation.discountAmount)}`, 420, calcY, { width: 110, align: 'right' });
      }

      if (quotation.serviceChargeAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.gray700)
          .text(`Service Charge (${quotation.serviceChargeRate}%):`, 320, calcY)
          .text(formatCurrency(quotation.serviceChargeAmount), 420, calcY, { width: 110, align: 'right' });
      }

      if (quotation.taxAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.gray700)
          .text(`Tax (${quotation.taxRate}%):`, 320, calcY)
          .text(formatCurrency(quotation.taxAmount), 420, calcY, { width: 110, align: 'right' });
      }

      // Total
      calcY += 25;
      doc
        .moveTo(320, calcY)
        .lineTo(535, calcY)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      calcY += 15;
      doc
        .fillColor(COLORS.primary)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount:', 320, calcY)
        .text(formatCurrency(quotation.totalAmount || 0), 420, calcY, { width: 110, align: 'right' });

      // ===== NOTES & TERMS =====
      let notesY = totalsY + 160;
      if (quotation.notes || quotation.paymentTerms) {
        doc
          .fillColor(COLORS.primary)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Additional Information', 50, notesY);

        notesY += 20;
        if (quotation.paymentTerms) {
          doc
            .fillColor(COLORS.gray700)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Terms:', 50, notesY)
            .font('Helvetica')
            .text(quotation.paymentTerms, 50, notesY + 15, { width: 495 });
          notesY += 40;
        }

        if (quotation.notes) {
          doc
            .fillColor(COLORS.gray700)
            .fontSize(9)
            .font('Helvetica')
            .text(quotation.notes, 50, notesY, { width: 495 });
        }
      }

      // ===== FOOTER =====
      const footerY = 750;
      doc
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(COLORS.gray600)
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for choosing Trip Sky Way. This quotation is valid until the date specified above.', 50, footerY + 10, { align: 'center', width: 495 })
        .text('For any queries, please contact us at info@tripskyway.com or +94 11 234 5678', 50, footerY + 25, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate modern invoice PDF
 */
export function generateInvoicePDF(invoice, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
      });

      const fileName = `invoice-${invoice.invoiceNumber || invoice._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== HEADER =====
      doc
        .rect(0, 0, 595, 100)
        .fillColor(COLORS.primary)
        .fill();

      doc
        .fillColor(COLORS.white)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('TRIP SKY WAY', 50, 30)
        .fontSize(12)
        .font('Helvetica')
        .text('Premium Travel & Tours', 50, 60);

      // Document Type Badge
      doc
        .rect(420, 35, 125, 35)
        .fillColor(COLORS.white)
        .fill()
        .fillColor(COLORS.primary)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('INVOICE', 435, 42);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== INVOICE INFO =====
      yPos = 120;
      doc
        .fillColor(COLORS.gray800)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Invoice Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Issue Date: ${new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35)
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 50)
        .fillColor(invoice.status === 'paid' ? COLORS.success : invoice.status === 'overdue' ? COLORS.error : COLORS.warning)
        .text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, 380, yPos + 65);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(COLORS.primary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .font('Helvetica')
        .fillColor(COLORS.gray800)
        .fontSize(10)
        .text(invoice.customer?.name || lead?.name || 'N/A', 50, yPos + 20)
        .text(invoice.customer?.email || lead?.email || '', 50, yPos + 35)
        .text(invoice.customer?.phone || lead?.phone || '', 50, yPos + 50)
        .text(invoice.customer?.address || '', 50, yPos + 65);

      // ===== ITEMS TABLE =====
      yPos = 330;
      const tableTop = yPos;
      
      // Table Header Background
      doc
        .rect(50, tableTop, 495, 25)
        .fillColor(COLORS.primary)
        .fill();

      // Table Header Text
      doc
        .fillColor(COLORS.white)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 60, tableTop + 8)
        .text('Price', 460, tableTop + 8);

      // Table Rows
      let rowY = tableTop + 25;
      invoice.items?.forEach((item, index) => {
        const rowHeight = 30;
        const bgColor = index % 2 === 0 ? COLORS.white : COLORS.gray100;

        // Row Background
        doc
          .rect(50, rowY, 495, rowHeight)
          .fillColor(bgColor)
          .fill();

        // Row Content
        doc
          .fillColor(COLORS.gray800)
          .fontSize(9)
          .font('Helvetica')
          .text(item.description || '', 60, rowY + 8, { width: 380 })
          .text(`${formatCurrency(item.totalPrice || 0)}`, 460, rowY + 8, { width: 75, align: 'right' });

        rowY += rowHeight;
      });

      // ===== TOTALS & PAYMENT SECTION =====
      const totalsY = rowY + 20;
      
      // Totals Box
      doc
        .rect(300, totalsY, 245, 180)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      let calcY = totalsY + 15;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 320, calcY)
        .text(formatCurrency(invoice.subtotal || 0), 420, calcY, { width: 110, align: 'right' });

      if (invoice.discountAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.success)
          .text(`Discount (${invoice.discountType === 'percentage' ? `${invoice.discountValue}%` : 'Fixed'}):`, 320, calcY)
          .text(`-${formatCurrency(invoice.discountAmount)}`, 420, calcY, { width: 110, align: 'right' });
      }

      if (invoice.serviceChargeAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.gray700)
          .text(`Service Charge (${invoice.serviceChargeRate}%):`, 320, calcY)
          .text(formatCurrency(invoice.serviceChargeAmount), 420, calcY, { width: 110, align: 'right' });
      }

      if (invoice.taxAmount > 0) {
        calcY += 20;
        doc
          .fillColor(COLORS.gray700)
          .text(`Tax (${invoice.taxRate}%):`, 320, calcY)
          .text(formatCurrency(invoice.taxAmount), 420, calcY, { width: 110, align: 'right' });
      }

      // Total
      calcY += 25;
      doc
        .moveTo(320, calcY)
        .lineTo(535, calcY)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      calcY += 15;
      doc
        .fillColor(COLORS.primary)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount:', 320, calcY)
        .text(formatCurrency(invoice.totalAmount || 0), 420, calcY, { width: 110, align: 'right' });

      // Payment Info
      calcY += 30;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Paid Amount:', 320, calcY)
        .text(formatCurrency(invoice.paidAmount || 0), 420, calcY, { width: 110, align: 'right' });

      calcY += 20;
      doc
        .fillColor(invoice.outstandingAmount > 0 ? COLORS.error : COLORS.success)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Outstanding:', 320, calcY)
        .text(formatCurrency(invoice.outstandingAmount || invoice.totalAmount || 0), 420, calcY, { width: 110, align: 'right' });

      // ===== PAYMENT TERMS & NOTES =====
      let notesY = totalsY + 210;
      if (invoice.paymentTerms || invoice.paymentInstructions || invoice.notes) {
        doc
          .fillColor(COLORS.primary)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Payment Information', 50, notesY);

        notesY += 20;
        if (invoice.paymentTerms) {
          doc
            .fillColor(COLORS.gray700)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Terms:', 50, notesY)
            .font('Helvetica')
            .text(invoice.paymentTerms, 50, notesY + 15, { width: 495 });
          notesY += 35;
        }

        if (invoice.paymentInstructions) {
          doc
            .fillColor(COLORS.gray700)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Instructions:', 50, notesY)
            .font('Helvetica')
            .text(invoice.paymentInstructions, 50, notesY + 15, { width: 495 });
          notesY += 35;
        }

        if (invoice.notes) {
          doc
            .fillColor(COLORS.gray700)
            .fontSize(9)
            .font('Helvetica')
            .text(invoice.notes, 50, notesY, { width: 495 });
        }
      }

      // ===== FOOTER =====
      const footerY = 750;
      doc
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(COLORS.gray600)
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for your business. Please make payment by the due date to avoid late fees.', 50, footerY + 10, { align: 'center', width: 495 })
        .text('For payment queries, contact us at info@tripskyway.com or +94 11 234 5678', 50, footerY + 25, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate modern receipt PDF
 */
export function generateReceiptPDF(receipt, invoice, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
      });

      const fileName = `receipt-${receipt.receiptNumber || receipt._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== HEADER =====
      doc
        .rect(0, 0, 595, 100)
        .fillColor(COLORS.primary)
        .fill();

      doc
        .fillColor(COLORS.white)
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('TRIP SKY WAY', 50, 30)
        .fontSize(12)
        .font('Helvetica')
        .text('Premium Travel & Tours', 50, 60);

      // Document Type Badge
      doc
        .rect(420, 35, 125, 35)
        .fillColor(COLORS.white)
        .fill()
        .fillColor(COLORS.primary)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('RECEIPT', 435, 42);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== RECEIPT INFO =====
      yPos = 120;
      doc
        .fillColor(COLORS.gray800)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Receipt Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Receipt #: ${receipt.receiptNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Date: ${new Date(receipt.paymentDate || receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35)
        .fillColor(receipt.receiptStatus === 'paid-in-full' ? COLORS.success : COLORS.warning)
        .text(`Status: ${(receipt.receiptStatus || 'partial-payment').toUpperCase().replace(/-/g, ' ')}`, 380, yPos + 50);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(COLORS.primary)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Received From:', 50, yPos)
        .font('Helvetica')
        .fillColor(COLORS.gray800)
        .fontSize(10)
        .text(receipt.customer?.name || lead?.name || 'N/A', 50, yPos + 20)
        .text(receipt.customer?.email || lead?.email || '', 50, yPos + 35)
        .text(receipt.customer?.phone || lead?.phone || '', 50, yPos + 50);

      // ===== PAYMENT DETAILS BOX =====
      yPos = 310;
      doc
        .rect(50, yPos, 495, 180)
        .fillColor(COLORS.gray100)
        .fill()
        .rect(50, yPos, 495, 180)
        .strokeColor(COLORS.gray200)
        .lineWidth(2)
        .stroke();

      // Payment Amount (Large)
      doc
        .fillColor(COLORS.primary)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Payment Amount', 70, yPos + 20)
        .fillColor(COLORS.gray900)
        .fontSize(32)
        .font('Helvetica-Bold')
        .text(formatCurrency(receipt.amount || 0), 70, yPos + 45);

      // Payment Details
      let detailY = yPos + 100;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Method:', 70, detailY)
        .font('Helvetica')
        .fillColor(COLORS.gray800)
        .text((receipt.paymentMethod || '').toUpperCase().replace(/-/g, ' '), 200, detailY);

      detailY += 20;
      doc
        .fillColor(COLORS.gray700)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Type:', 70, detailY)
        .font('Helvetica')
        .fillColor(COLORS.gray800)
        .text((receipt.paymentType || '').toUpperCase().replace(/-/g, ' '), 200, detailY);

      detailY += 20;
      if (receipt.currency) {
        doc
          .fillColor(COLORS.gray700)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Currency:', 70, detailY)
          .font('Helvetica')
          .fillColor(COLORS.gray800)
          .text(receipt.currency, 200, detailY);
      }

      detailY += 20;
      if (receipt.transactionId) {
        doc
          .fillColor(COLORS.gray700)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Transaction ID:', 70, detailY)
          .font('Helvetica')
          .fillColor(COLORS.gray800)
          .text(receipt.transactionId, 200, detailY, { width: 320 });
      }

      // Payment Method Specific Details
      if (receipt.paymentDetails) {
        const details = receipt.paymentDetails;
        if (details.bankName || details.accountNumber || details.transactionReference) {
          detailY += 30;
          doc
            .fillColor(COLORS.primary)
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Bank Transfer Details:', 70, detailY);
          
          detailY += 15;
          if (details.bankName) {
            doc
              .fillColor(COLORS.gray700)
              .fontSize(9)
              .font('Helvetica')
              .text(`Bank: ${details.bankName}`, 70, detailY);
            detailY += 12;
          }
          if (details.accountNumber) {
            doc
              .text(`Account: ${details.accountNumber}`, 70, detailY);
            detailY += 12;
          }
          if (details.transactionReference) {
            doc
              .text(`Reference: ${details.transactionReference}`, 70, detailY);
          }
        }
      }

      // ===== INVOICE REFERENCE =====
      if (invoice) {
        let invoiceY = yPos + 200;
        doc
          .fillColor(COLORS.primary)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Invoice Reference', 50, invoiceY)
          .font('Helvetica')
          .fillColor(COLORS.gray700)
          .fontSize(10)
          .text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, 50, invoiceY + 20)
          .text(`Total Invoice Amount: ${formatCurrency(invoice.totalAmount || 0)}`, 50, invoiceY + 35)
          .text(`Previous Outstanding: ${formatCurrency(receipt.previousBalance || invoice.outstandingAmount || 0)}`, 50, invoiceY + 50)
          .fillColor(invoice.outstandingAmount > 0 ? COLORS.error : COLORS.success)
          .text(`Remaining Balance: ${formatCurrency(receipt.outstandingBalance || 0)}`, 50, invoiceY + 65);
      }

      // ===== NOTES =====
      let notesY = invoice ? yPos + 300 : yPos + 210;
      if (receipt.notes) {
        doc
          .fillColor(COLORS.primary)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Notes', 50, notesY)
          .font('Helvetica')
          .fillColor(COLORS.gray700)
          .fontSize(9)
          .text(receipt.notes, 50, notesY + 20, { width: 495 });
      }

      // ===== FOOTER =====
      const footerY = 750;
      doc
        .moveTo(50, footerY)
        .lineTo(545, footerY)
        .strokeColor(COLORS.gray200)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(COLORS.gray600)
        .fontSize(8)
        .font('Helvetica')
        .text('This is an official receipt for the payment received. Please keep this receipt for your records.', 50, footerY + 10, { align: 'center', width: 495 })
        .text('For any queries, contact us at info@tripskyway.com or +94 11 234 5678', 50, footerY + 25, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Format currency with proper symbols
 */
function formatCurrency(amount) {
  return `INR ${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

