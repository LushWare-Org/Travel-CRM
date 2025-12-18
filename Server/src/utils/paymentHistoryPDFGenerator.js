import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Path to logo in Management public folder
const LOGO_PATH = path.join(dirname, '../../../Management/public/website-logo-1.png');

// Helper function to load logo image
const loadLogo = () => {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      return fs.readFileSync(LOGO_PATH);
    }
    console.warn('[Payment History PDF] Logo not found at:', LOGO_PATH);
    return null;
  } catch (error) {
    console.warn('[Payment History PDF] Error loading logo:', error);
    return null;
  }
};

const COLORS = {
  primary: '#EA580C',      // Orange-red
  primaryDark: '#B43C08',   // Darker orange
  white: '#FFFFFF',
  gray100: '#F9FAFB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

/**
 * Generate payment history PDF
 */
export function generatePaymentHistoryPDF(paymentHistory) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
      });

      const fileName = `payment-history-${paymentHistory.paymentHistoryNumber || paymentHistory._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== HEADER =====
      const headerHeight = 48;
      const headerY = 8;
      const headerX = 50;
      const headerWidth = 495;
      
      doc
        .roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6)
        .fillColor('#0C0C0C')
        .fill();

      let cursorX = headerX + 14;
      const logoBuffer = loadLogo();
      
      if (logoBuffer) {
        try {
          const logoHeight = 14;
          const logoWidth = 56;
          doc.image(logoBuffer, cursorX, headerY + (headerHeight - logoHeight) / 2, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
          });
          cursorX += logoWidth + 14;
        } catch (error) {
          console.warn('[Payment History PDF] Failed to add logo:', error);
        }
      }

      doc
        .fontSize(14)
        .fillColor(COLORS.white)
        .text('Trip Sky Way', cursorX, headerY + 12, { lineGap: 0 })
        .fontSize(8)
        .fillColor('#D1D5DB')
        .text('Payment History Record', cursorX, headerY + 28, { lineGap: 0 });

      // ===== CONTENT =====
      let yPos = headerY + headerHeight + 30;

      // Title
      doc
        .fontSize(24)
        .fillColor(COLORS.gray900)
        .text('Payment History', headerX, yPos);
      yPos += 35;

      // Payment History Number
      doc
        .fontSize(12)
        .fillColor(COLORS.gray700)
        .text(`Payment History #: ${paymentHistory.paymentHistoryNumber || 'N/A'}`, headerX, yPos);
      yPos += 20;

      // Receipt Number
      if (paymentHistory.receipt?.receiptNumber) {
        doc
          .fontSize(12)
          .fillColor(COLORS.gray700)
          .text(`Receipt #: ${paymentHistory.receipt.receiptNumber}`, headerX, yPos);
        yPos += 20;
      }

      // Invoice Number
      if (paymentHistory.invoice?.invoiceNumber) {
        doc
          .fontSize(12)
          .fillColor(COLORS.gray700)
          .text(`Invoice #: ${paymentHistory.invoice.invoiceNumber}`, headerX, yPos);
        yPos += 20;
      }

      yPos += 10;

      // Divider
      doc
        .moveTo(headerX, yPos)
        .lineTo(headerX + headerWidth, yPos)
        .strokeColor(COLORS.gray600)
        .lineWidth(1)
        .stroke();
      yPos += 20;

      // Customer Information
      doc
        .fontSize(14)
        .fillColor(COLORS.gray900)
        .text('Customer Information', headerX, yPos);
      yPos += 20;

      const customer = paymentHistory.customer || paymentHistory.lead;
      if (customer) {
        doc
          .fontSize(10)
          .fillColor(COLORS.gray700)
          .text(`Name: ${customer.name || 'N/A'}`, headerX, yPos);
        yPos += 15;
        doc.text(`Email: ${customer.email || 'N/A'}`, headerX, yPos);
        yPos += 15;
        doc.text(`Phone: ${customer.phone || 'N/A'}`, headerX, yPos);
        yPos += 20;
      }

      // Payment Details
      doc
        .fontSize(14)
        .fillColor(COLORS.gray900)
        .text('Payment Details', headerX, yPos);
      yPos += 20;

      doc
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Amount: ${paymentHistory.currency || 'LKR'} ${paymentHistory.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`, headerX, yPos);
      yPos += 15;

      const paymentDate = paymentHistory.paymentDate ? new Date(paymentHistory.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
      doc.text(`Payment Date: ${paymentDate}`, headerX, yPos);
      yPos += 15;

      const paymentMethod = paymentHistory.paymentMethod ? paymentHistory.paymentMethod.charAt(0).toUpperCase() + paymentHistory.paymentMethod.slice(1).replace(/-/g, ' ') : 'N/A';
      doc.text(`Payment Method: ${paymentMethod}`, headerX, yPos);
      yPos += 15;

      if (paymentHistory.transactionId) {
        doc.text(`Transaction ID: ${paymentHistory.transactionId}`, headerX, yPos);
        yPos += 15;
      }

      const paymentType = paymentHistory.paymentType ? paymentHistory.paymentType.charAt(0).toUpperCase() + paymentHistory.paymentType.slice(1).replace(/-/g, ' ') : 'N/A';
      doc.text(`Payment Type: ${paymentType}`, headerX, yPos);
      yPos += 20;

      // Status
      doc
        .fontSize(14)
        .fillColor(COLORS.gray900)
        .text('Status', headerX, yPos);
      yPos += 20;

      const status = paymentHistory.status ? paymentHistory.status.charAt(0).toUpperCase() + paymentHistory.status.slice(1) : 'Pending';
      doc
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Status: ${status}`, headerX, yPos);
      yPos += 20;

      // Notes
      if (paymentHistory.notes) {
        doc
          .fontSize(14)
          .fillColor(COLORS.gray900)
          .text('Notes', headerX, yPos);
        yPos += 20;
        doc
          .fontSize(10)
          .fillColor(COLORS.gray700)
          .text(paymentHistory.notes, headerX, yPos, { width: headerWidth });
        yPos += 30;
      }

      // Footer
      const footerY = 750;
      doc
        .fontSize(8)
        .fillColor(COLORS.gray600)
        .text('Generated by Trip Sky Way', headerX, footerY)
        .text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, headerX, footerY + 12);

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate payment history list PDF with all filtered records
 */
export function generatePaymentHistoryListPDF(paymentHistoryList, dateRange = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
        bufferPages: true,
      });

      const fileName = `payment-history-list-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // ===== HEADER =====
      const headerHeight = 48;
      const headerY = 8;
      const headerX = 50;
      const headerWidth = 495;
      
      doc
        .roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6)
        .fillColor('#0C0C0C')
        .fill();

      let cursorX = headerX + 14;
      const logoBuffer = loadLogo();
      
      if (logoBuffer) {
        try {
          const logoHeight = 14;
          const logoWidth = 56;
          doc.image(logoBuffer, cursorX, headerY + (headerHeight - logoHeight) / 2, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
          });
          cursorX += logoWidth + 14;
        } catch (error) {
          console.warn('[Payment History List PDF] Failed to add logo:', error);
        }
      }

      doc
        .fontSize(14)
        .fillColor(COLORS.white)
        .text('Trip Sky Way', cursorX, headerY + 12, { lineGap: 0 })
        .fontSize(8)
        .fillColor('#D1D5DB')
        .text('Payment History Report', cursorX, headerY + 28, { lineGap: 0 });

      // ===== CONTENT =====
      let yPos = headerY + headerHeight + 30;

      // Title
      doc
        .fontSize(24)
        .fillColor(COLORS.gray900)
        .text('Payment History Report', headerX, yPos);
      yPos += 25;

      // Date Range Info
      if (dateRange.startDate || dateRange.endDate) {
        doc
          .fontSize(10)
          .fillColor(COLORS.gray700);
        
        let dateRangeText = 'Date Range: ';
        if (dateRange.startDate && dateRange.endDate) {
          dateRangeText += `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`;
        } else if (dateRange.startDate) {
          dateRangeText += `From ${new Date(dateRange.startDate).toLocaleDateString()}`;
        } else if (dateRange.endDate) {
          dateRangeText += `Until ${new Date(dateRange.endDate).toLocaleDateString()}`;
        }
        
        doc.text(dateRangeText, headerX, yPos);
        yPos += 20;
      }

      // Total Records
      doc
        .fontSize(10)
        .fillColor(COLORS.gray700)
        .text(`Total Records: ${paymentHistoryList.length}`, headerX, yPos);
      yPos += 25;

      // Divider
      doc
        .moveTo(headerX, yPos)
        .lineTo(headerX + headerWidth, yPos)
        .strokeColor(COLORS.gray600)
        .lineWidth(1)
        .stroke();
      yPos += 20;

      // Table Header
      const tableStartY = yPos;
      const rowHeight = 20;
      const colWidths = {
        number: 50,
        date: 80,
        customer: 120,
        amount: 80,
        method: 80,
        invoice: 70,
        receipt: 70,
        status: 60,
      };
      
      let colX = headerX;
      
      // Header Background
      doc
        .roundedRect(headerX, yPos, headerWidth, rowHeight, 4, 4)
        .fillColor(COLORS.gray100)
        .fill();

      // Header Text
      doc
        .fontSize(9)
        .fillColor(COLORS.gray900)
        .font('Helvetica-Bold');
      
      colX = headerX + 5;
      doc.text('#', colX, yPos + 6);
      colX += colWidths.number;
      
      doc.text('Date', colX, yPos + 6);
      colX += colWidths.date;
      
      doc.text('Customer', colX, yPos + 6);
      colX += colWidths.customer;
      
      doc.text('Amount', colX, yPos + 6);
      colX += colWidths.amount;
      
      doc.text('Method', colX, yPos + 6);
      colX += colWidths.method;
      
      doc.text('Invoice', colX, yPos + 6);
      colX += colWidths.invoice;
      
      doc.text('Receipt', colX, yPos + 6);
      colX += colWidths.receipt;
      
      doc.text('Status', colX, yPos + 6);
      
      yPos += rowHeight + 5;
      doc.font('Helvetica'); // Reset to normal font

      // Table Rows
      paymentHistoryList.forEach((record, index) => {
        // Check if we need a new page
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const customer = record.customer || record.lead;
        const customerName = customer?.name || 'N/A';
        const paymentDate = record.paymentDate 
          ? new Date(record.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'N/A';
        const amount = `${record.currency || 'LKR'} ${record.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`;
        const method = record.paymentMethod 
          ? record.paymentMethod.charAt(0).toUpperCase() + record.paymentMethod.slice(1).replace(/-/g, ' ')
          : 'N/A';
        const invoiceNum = record.invoice?.invoiceNumber || 'N/A';
        const receiptNum = record.receipt?.receiptNumber || 'N/A';
        const status = record.status 
          ? record.status.charAt(0).toUpperCase() + record.status.slice(1)
          : 'Pending';

        // Row background (alternating)
        if (index % 2 === 0) {
          doc
            .rect(headerX, yPos - 2, headerWidth, rowHeight)
            .fillColor(COLORS.gray100)
            .fill();
        }

        // Row text
        doc
          .fontSize(8)
          .fillColor(COLORS.gray700);

        colX = headerX + 5;
        doc.text(`${index + 1}`, colX, yPos + 4);
        colX += colWidths.number;
        
        doc.text(paymentDate, colX, yPos + 4);
        colX += colWidths.date;
        
        // Truncate customer name if too long
        const maxCustomerWidth = colWidths.customer - 5;
        const customerText = customerName.length > 20 ? customerName.substring(0, 17) + '...' : customerName;
        doc.text(customerText, colX, yPos + 4, { width: maxCustomerWidth });
        colX += colWidths.customer;
        
        doc.text(amount, colX, yPos + 4);
        colX += colWidths.amount;
        
        doc.text(method, colX, yPos + 4, { width: colWidths.method - 5 });
        colX += colWidths.method;
        
        doc.text(invoiceNum, colX, yPos + 4, { width: colWidths.invoice - 5 });
        colX += colWidths.invoice;
        
        doc.text(receiptNum, colX, yPos + 4, { width: colWidths.receipt - 5 });
        colX += colWidths.receipt;
        
        doc.text(status, colX, yPos + 4, { width: colWidths.status - 5 });

        yPos += rowHeight + 2;
      });

      // Footer
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        const footerY = 750;
        doc
          .fontSize(8)
          .fillColor(COLORS.gray600)
          .text('Generated by Trip Sky Way', headerX, footerY)
          .text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, headerX, footerY + 12)
          .text(`Page ${i + 1} of ${pages.count}`, headerX + headerWidth - 50, footerY);
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

