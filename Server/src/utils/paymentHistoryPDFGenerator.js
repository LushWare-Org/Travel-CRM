import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BRANDING } from '../config/branding.js';

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

// Modern Color Scheme - Teal/Slate Theme (matching billingPDFGenerator.js)
const PALETTE = {
  background: [248, 250, 252],      // Light background
  secondaryBackground: [226, 232, 240], // Border color
  primaryText: [15, 23, 42],        // Near black
  secondaryText: [100, 116, 139],   // Gray text
  mutedText: [148, 163, 184],       // Light gray
  accent: [15, 118, 110],           // Deep teal (primary)
  accentLight: [20, 184, 166],      // Light teal
  accentDark: [19, 78, 74],         // Dark teal
  gold: [245, 158, 11],             // Amber gold
  badgeBg: [245, 158, 11],          // Amber gold for badges
  badgeText: [255, 255, 255],       // White
  cardBg: [240, 253, 250],          // Light teal bg
  cardBorder: [20, 184, 166],       // Teal border
  pillBg: [226, 232, 240],          // Light gray
  headerBg: [30, 41, 59],           // Dark slate
};

// Convert RGB array to hex for PDFKit
const rgbToHex = (rgb) => {
  const [r, g, b] = rgb;
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

const COLORS = {
  primary: '#0F766E',               // Deep teal
  primaryDark: '#134E4A',           // Dark teal
  primaryLight: '#14B8A6',          // Light teal
  accent: '#F59E0B',                // Amber gold
  accentLight: '#FEF3C7',           // Light amber
  slate: '#1E293B',                 // Dark slate
  white: '#FFFFFF',
  gray100: '#F8FAFC',
  gray200: '#E2E8F0',
  gray600: '#64748B',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Helper function to format currency
function formatCurrency(amount, currency = 'LKR') {
  const locale = (process.env.CURRENCY_CODE === 'INR') ? 'en-IN' : 'en-US';
  return `${currency} ${parseFloat(amount || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

      // ===== MODERN HEADER (Two-tone design) =====
      const headerHeight = 90;
      const headerY = 0;
      const headerWidth = 595;

      // Draw dark slate background
      doc.rect(0, headerY, headerWidth, headerHeight).fill(COLORS.slate);

      // Diagonal teal accent on right
      doc.save();
      doc.moveTo(420, 0)
        .lineTo(595, 0)
        .lineTo(595, headerHeight)
        .lineTo(350, headerHeight)
        .closePath()
        .fill(COLORS.primary);
      doc.restore();

      let cursorX = 40;
      const logoBuffer = loadLogo();

      // Add logo if available
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, cursorX, headerY + 18, { height: 55 });
          cursorX += 80;
        } catch (error) {
          console.warn('[Payment History PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(BRANDING.company.name, cursorX, headerY + 28)
        .fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.gray600)
        .text(BRANDING.company.tagline || 'Premium Travel Experiences', cursorX, headerY + 48);

      // Add PAYMENT HISTORY text on right (in teal section)
      doc
        .fillColor(COLORS.white)
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('PAYMENT', 460, headerY + 25, { width: 100, align: 'center' })
        .text('HISTORY', 460, headerY + 42, { width: 100, align: 'center' });

      // ===== INFO CARDS =====
      let yPos = 140;
      const cardWidth = 495;
      const cardX = 50;

      // Payment History Info Card
      doc.roundedRect(cardX, yPos, cardWidth, 85, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT HISTORY INFO', cardX + 15, yPos + 11);

      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica')
        .text(`Payment History #: ${paymentHistory.paymentHistoryNumber || 'N/A'}`, cardX + 15, yPos + 47);

      if (paymentHistory.receipt?.receiptNumber) {
        doc.text(`Receipt #: ${paymentHistory.receipt.receiptNumber}`, cardX + 15, yPos + 64, { continued: true });
      }

      if (paymentHistory.invoice?.invoiceNumber) {
        const separator = paymentHistory.receipt?.receiptNumber ? '  |  ' : '';
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(9.5)
          .text(separator, { continued: paymentHistory.receipt?.receiptNumber })
          .text(`Invoice #: ${paymentHistory.invoice.invoiceNumber}`);
      }

      yPos += 100;

      // Customer Information Card
      const customer = paymentHistory.customer || paymentHistory.lead;
      if (customer) {
        doc.roundedRect(cardX, yPos, cardWidth, 90, 10).fillAndStroke('#FFFFFF', '#FCD34D');
        doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('BILL TO', cardX + 15, yPos + 11);

        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(customer.name || 'N/A', cardX + 15, yPos + 47)
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .text(customer.email || 'N/A', cardX + 15, yPos + 64)
          .text(customer.phone || 'N/A', cardX + 15, yPos + 79);

        yPos += 105;
      }

      // Payment Details Card
      doc.roundedRect(cardX, yPos, cardWidth, 145, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT DETAILS', cardX + 15, yPos + 11);

      let detailY = yPos + 47;

      // Amount (Large, prominent)
      doc
        .fillColor('#F5A623')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Amount:', cardX + 15, detailY)
        .fontSize(16)
        .text(formatCurrency(paymentHistory.amount, paymentHistory.currency || 'LKR'), cardX + 15, detailY + 18);

      detailY += 50;

      const paymentDate = paymentHistory.paymentDate ? new Date(paymentHistory.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
      const paymentMethod = paymentHistory.paymentMethod ? paymentHistory.paymentMethod.charAt(0).toUpperCase() + paymentHistory.paymentMethod.slice(1).replace(/-/g, ' ') : 'N/A';
      const paymentType = paymentHistory.paymentType ? paymentHistory.paymentType.charAt(0).toUpperCase() + paymentHistory.paymentType.slice(1).replace(/-/g, ' ') : 'N/A';

      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(9.5)
        .font('Helvetica')
        .text(`Payment Date: ${paymentDate}`, cardX + 15, detailY)
        .text(`Payment Method: ${paymentMethod}`, cardX + 15, detailY + 15)
        .text(`Payment Type: ${paymentType}`, cardX + 15, detailY + 30);

      if (paymentHistory.transactionId) {
        doc.text(`Transaction ID: ${paymentHistory.transactionId}`, cardX + 15, detailY + 45);
      }

      yPos += 160;

      // Status Card
      const status = paymentHistory.status ? paymentHistory.status.charAt(0).toUpperCase() + paymentHistory.status.slice(1) : 'Pending';
      const statusColor = paymentHistory.status === 'completed' ? '#10B981' : paymentHistory.status === 'pending' ? '#F59E0B' : '#EF4444';

      doc.roundedRect(cardX, yPos, cardWidth, 60, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('STATUS', cardX + 15, yPos + 11);

      doc
        .fontSize(12)
        .fillColor(statusColor)
        .font('Helvetica-Bold')
        .text(status, cardX + 15, yPos + 45);

      yPos += 75;

      // Notes Card (if exists)
      if (paymentHistory.notes) {
        doc.roundedRect(cardX, yPos, cardWidth, 100, 10).fillAndStroke('#FFFFFF', '#FCD34D');
        doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('NOTES', cardX + 15, yPos + 11);

        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(9)
          .font('Helvetica')
          .text(paymentHistory.notes, cardX + 15, yPos + 47, { width: cardWidth - 30, lineGap: 2 });
      }

      // ===== FOOTER WAVE =====
      const pageHeight = 842;
      const waveY = pageHeight - 80;

      // Draw orange wave at bottom
      doc.moveTo(0, waveY)
        .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
        .lineTo(595, pageHeight)
        .lineTo(0, pageHeight)
        .fill('#F5A623');

      doc
        .fontSize(8)
        .fillColor('#000000')
        .text(`Generated by ${BRANDING.company.name}`, 50, waveY - 30)
        .text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, waveY - 18);

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

      // ===== HEADER WITH WAVE DESIGN =====
      const headerHeight = 100;
      const headerY = 0;
      const headerWidth = 595;

      // Draw black wave background
      doc.rect(0, headerY, headerWidth, headerHeight).fillAndStroke('#000000', '#000000');

      // Draw bottom wave curve using bezier curves
      doc.moveTo(0, headerHeight - 30)
        .bezierCurveTo(150, headerHeight - 10, 350, headerHeight - 50, 595, headerHeight - 30)
        .lineTo(595, 0)
        .lineTo(0, 0)
        .fill('#000000');

      // Draw orange accent curve in top right
      doc.moveTo(400, 0)
        .bezierCurveTo(450, 40, 520, 60, 595, 50)
        .lineTo(595, 0)
        .fill('#F5A623');

      let cursorX = 50;
      const logoBuffer = loadLogo();

      // Add logo if available
      if (logoBuffer) {
        try {
          const logoHeight = 20;
          const logoWidth = 80;
          doc.image(logoBuffer, cursorX, headerY + 25, {
            width: logoWidth,
            height: logoHeight,
            fit: [logoWidth, logoHeight],
          });
          cursorX += logoWidth + 12;
        } catch (error) {
          console.warn('[Payment History List PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(BRANDING.company.name, cursorX, headerY + 25)
        .fontSize(9)
        .font('Helvetica')
        .text(BRANDING.company.tagline, cursorX, headerY + 47);

      // Add REPORT badge
      const badgeX = 490;
      const badgeY = headerY + 40;
      doc.circle(badgeX, badgeY, 28).fillAndStroke(COLORS.white, COLORS.white);

      doc
        .fillColor('#000000')
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('REPORT', badgeX - 20, badgeY - 3, { width: 40, align: 'center' });

      // ===== CONTENT =====
      let yPos = 140;
      const cardX = 50;
      const cardWidth = 495;

      // Title Card
      doc.roundedRect(cardX, yPos, cardWidth, 105, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(cardX, yPos, cardWidth, 32).fillAndStroke('#FEF3C7', '#FEF3C7');

      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT HISTORY REPORT', cardX + 15, yPos + 11);

      yPos += 47;

      // Date Range Info
      if (dateRange.startDate || dateRange.endDate) {
        doc
          .fontSize(10)
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .font('Helvetica');

        let dateRangeText = 'Date Range: ';
        if (dateRange.startDate && dateRange.endDate) {
          dateRangeText += `${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}`;
        } else if (dateRange.startDate) {
          dateRangeText += `From ${new Date(dateRange.startDate).toLocaleDateString()}`;
        } else if (dateRange.endDate) {
          dateRangeText += `Until ${new Date(dateRange.endDate).toLocaleDateString()}`;
        }

        doc.text(dateRangeText, cardX + 15, yPos);
        yPos += 18;
      }

      // Total Records
      doc
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.primaryText))
        .font('Helvetica-Bold')
        .text(`Total Records: ${paymentHistoryList.length}`, cardX + 15, yPos);

      yPos += 60;

      // ===== TABLE =====
      const tableTop = yPos;
      const tableLeft = 50;
      const tableWidth = 495;
      const rowHeight = 35;

      // Define column widths and positions
      const colWidths = {
        number: 30,
        date: 70,
        customer: 110,
        amount: 70,
        method: 75,
        type: 70,
        status: 70,
      };

      // Orange table header
      doc.rect(tableLeft, tableTop, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');

      // Table Header Text
      let colX = tableLeft + 5;
      doc
        .fillColor(COLORS.white)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('#', colX, tableTop + 10)
      colX += colWidths.number;

      doc.text('DATE', colX, tableTop + 10);
      colX += colWidths.date;

      doc.text('CUSTOMER', colX, tableTop + 10);
      colX += colWidths.customer;

      doc.text('AMOUNT', colX, tableTop + 10);
      colX += colWidths.amount;

      doc.text('METHOD', colX, tableTop + 10);
      colX += colWidths.method;

      doc.text('TYPE', colX, tableTop + 10);
      colX += colWidths.type;

      doc.text('STATUS', colX, tableTop + 10);


      let rowY = tableTop + 28;
      const pageHeight = 842;
      const pageMarginBottom = 100;

      // Helper function to add new page with table header
      const addNewPageWithHeader = () => {
        doc.addPage();
        rowY = 50;

        // Re-draw table header
        doc.rect(tableLeft, rowY, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');

        let colX = tableLeft + 5;
        doc
          .fillColor(COLORS.white)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('#', colX, rowY + 10);
        colX += colWidths.number;

        doc.text('DATE', colX, rowY + 10);
        colX += colWidths.date;

        doc.text('CUSTOMER', colX, rowY + 10);
        colX += colWidths.customer;

        doc.text('AMOUNT', colX, rowY + 10);
        colX += colWidths.amount;

        doc.text('METHOD', colX, rowY + 10);
        colX += colWidths.method;

        doc.text('TYPE', colX, rowY + 10);
        colX += colWidths.type;

        doc.text('STATUS', colX, rowY + 10);

        rowY += 28;
      };

      // Table Rows
      paymentHistoryList.forEach((record, index) => {
        // Check if we need a new page
        if (rowY + rowHeight > pageHeight - pageMarginBottom) {
          addNewPageWithHeader();
        }

        const customer = record.customer || record.lead;
        const customerName = customer?.name || 'N/A';
        const paymentDate = record.paymentDate
          ? new Date(record.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'N/A';
        const amount = formatCurrency(record.amount, record.currency || 'LKR');
        const method = record.paymentMethod
          ? record.paymentMethod.charAt(0).toUpperCase() + record.paymentMethod.slice(1).replace(/-/g, ' ')
          : 'N/A';
        const type = record.paymentType
          ? record.paymentType.charAt(0).toUpperCase() + record.paymentType.slice(1).replace(/-/g, ' ')
          : 'N/A';
        const status = record.status
          ? record.status.charAt(0).toUpperCase() + record.status.slice(1)
          : 'Pending';

        // Row background - White
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .fillColor('#FFFFFF')
          .fill();

        // Row Border
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .strokeColor('#E5E7EB')
          .lineWidth(0.5)
          .stroke();

        // Row text
        let colX = tableLeft + 5;
        doc
          .fontSize(8)
          .fillColor(rgbToHex(PALETTE.primaryText))
          .font('Helvetica');

        doc.text(`${index + 1}`, colX, rowY + 12);
        colX += colWidths.number;

        doc.text(paymentDate, colX, rowY + 12, { width: colWidths.date - 5 });
        colX += colWidths.date;

        // Truncate customer name if too long
        const customerText = customerName.length > 18 ? customerName.substring(0, 15) + '...' : customerName;
        doc.text(customerText, colX, rowY + 12, { width: colWidths.customer - 5 });
        colX += colWidths.customer;

        doc
          .fillColor('#F5A623')
          .font('Helvetica-Bold')
          .text(amount, colX, rowY + 12, { width: colWidths.amount - 5 })
          .fillColor(rgbToHex(PALETTE.primaryText))
          .font('Helvetica');
        colX += colWidths.amount;

        doc.text(method, colX, rowY + 12, { width: colWidths.method - 5 });
        colX += colWidths.method;

        doc.text(type, colX, rowY + 12, { width: colWidths.type - 5 });
        colX += colWidths.type;

        // Status with color
        const statusColor = status === 'Completed' ? '#10B981' : status === 'Pending' ? '#F59E0B' : '#EF4444';
        doc
          .fillColor(statusColor)
          .font('Helvetica-Bold')
          .text(status, colX, rowY + 12, { width: colWidths.status - 5 });

        rowY += rowHeight;
      });

      // ===== FOOTER WAVE =====
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        const waveY = pageHeight - 80;

        // Draw orange wave at bottom
        doc.moveTo(0, waveY)
          .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
          .lineTo(595, pageHeight)
          .lineTo(0, pageHeight)
          .fill('#F5A623');

        doc
          .fontSize(8)
          .fillColor('#000000')
          .text(`Generated by ${BRANDING.company.name}`, 50, waveY - 30)
          .text(`Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, waveY - 18)
          .text(`Page ${i + 1} of ${pages.count}`, tableLeft + tableWidth - 60, waveY - 30);
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

