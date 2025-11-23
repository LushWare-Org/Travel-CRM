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
    console.warn('[Billing PDF] Logo not found at:', LOGO_PATH);
    return null;
  } catch (error) {
    console.warn('[Billing PDF] Error loading logo:', error);
    return null;
  }
};

// Color Scheme matching pdfService.js from Management
// Main palette colors (matching itinerary PDFs)
const PALETTE = {
  background: [249, 250, 251],      // Light gray
  secondaryBackground: [209, 213, 219], // Medium gray
  primaryText: [31, 41, 55],        // Very dark gray/black
  secondaryText: [75, 85, 99],      // Medium gray
  mutedText: [107, 114, 128],       // Light gray
  accent: [234, 88, 12],            // Orange-red (primary accent)
  accentDark: [234, 179, 8],        // Yellow
  badgeBg: [234, 88, 12],           // Orange-red
  badgeText: [255, 255, 255],       // White
  cardBg: [245, 245, 245],          // Very light gray
  cardBorder: [156, 163, 175],      // Gray border
  pillBg: [209, 213, 219],          // Light gray
  timeline: [0, 0, 0],              // Black
};

// Cover palette colors (warm beige tones)
const COVER_PALETTE = {
  background: [243, 229, 207],      // Beige
  deepText: [58, 44, 31],           // Dark brown
  accent: [55, 119, 79],             // Forest green
  softAccent: [215, 178, 118],       // Light tan
  cardBg: [255, 245, 226],           // Very light cream
  bullet: [80, 60, 45],              // Dark brown
  divider: [214, 197, 168],          // Light brown
};

// Convert RGB array to hex for PDFKit
const rgbToHex = (rgb) => {
  const [r, g, b] = rgb;
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

// Legacy color constants for compatibility (using new palette)
const COLORS = {
  primary: rgbToHex(PALETTE.accent),      // Orange-red (was blue)
  primaryDark: rgbToHex([180, 60, 8]),    // Darker orange
  primaryLight: rgbToHex([251, 146, 60]), // Lighter orange
  accent: rgbToHex(PALETTE.accentDark),   // Yellow
  white: '#FFFFFF',
  gray100: '#F9FAFB',   // rgb(249, 250, 251)
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',   // rgb(55, 65, 81) - close to secondaryText
  gray800: '#1F2937',   // rgb(31, 41, 55) - primaryText
  gray900: '#111827',
  success: '#10B981',
  warning: rgbToHex(PALETTE.accentDark),  // Yellow
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
      const headerHeight = 48;
      const headerY = 8;
      const headerX = 50; // Left margin for content
      const headerWidth = 495; // Content width
      
      // Header background - black rounded rectangle (matching itinerary PDF style)
      doc
        .roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6)
        .fillColor('#0C0C0C') // rgb(12, 12, 12) - matching itinerary PDF
        .fill();

      let cursorX = headerX + 14;
      const logoBuffer = loadLogo();
      
      // Add logo if available
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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      // "Trip Sky Way" text in white (matching itinerary PDF) - properly aligned
      doc
        .fillColor(COLORS.white)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 14);

      // Subtitle
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('rgb(210, 210, 210)')
        .text('Curating inspired journeys', cursorX, headerY + 30);

      // Document Type as white text in header (positioned from left edge)
      const quotationTextX = headerX + headerWidth - 80; // X position - decrease this value to move left, increase to move right
      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('QUOTATION', quotationTextX, headerY + 22);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== QUOTATION INFO =====
      yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Quotation Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Quotation #: ${quotation.quotationNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35)
        .text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 50)
        .text(`Mode: ${quotation.mode === 'detailed' ? 'Detailed' : 'Non Detailed'}`, 380, yPos + 65);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText)) // Black
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .font('Helvetica')
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .text(quotation.customer?.name || lead?.name || 'N/A', 50, yPos + 20)
        .text(quotation.customer?.email || lead?.email || '', 50, yPos + 35)
        .text(quotation.customer?.phone || lead?.phone || '', 50, yPos + 50)
        .text(quotation.customer?.address || '', 50, yPos + 65);

      // ===== ITEMS TABLE =====
      yPos = 330;
      const tableTop = yPos;
      const tableLeft = 50; // Table left edge position
      const tableWidth = 495; // Table width
      const descriptionLeft = tableLeft + 10; // Description column left edge (60)
      const priceLeft = 470; // Price column left edge
      const descriptionWidth = 380; // Description column width
      const priceWidth = 75; // Price column width
      
      const isDetailedMode = quotation.mode === 'detailed';
      
      // Table Header Background (black)
      doc
        .rect(tableLeft, tableTop, tableWidth, 25)
        .fillColor('#000000') // Black
        .fill();

      // Table Header Text
      doc
        .fillColor(COLORS.white)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', descriptionLeft, tableTop + 8);
      
      if (isDetailedMode) {
        // In detailed mode, show price column
        doc.text('Price', priceLeft - 15, tableTop + 8);
      } else {
        // In summary mode, show "Included" or no price column for non-package items
        doc.text('Price', priceLeft - 15, tableTop + 8);
      }

      // Table Rows - White background with black borders
      let rowY = tableTop + 25;
      
      // Filter items based on mode
      const itemsToDisplay = isDetailedMode 
        ? quotation.items?.filter(item => item.category !== 'package') || []
        : quotation.items || [];
      
      // In summary mode, add package item at the end if it exists
      if (!isDetailedMode) {
        const packageItem = quotation.items?.find(item => item.category === 'package');
        if (packageItem) {
          itemsToDisplay.push(packageItem);
        }
      }
      
      itemsToDisplay.forEach((item, index) => {
        const rowHeight = 30;
        const isPackageItem = item.category === 'package';

        // Row Background - White
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .fillColor(COLORS.white)
          .fill();

        // Row Border - Black
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .strokeColor('#000000') // Black border
          .lineWidth(0.5)
          .stroke();

        // Row Content
        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(9)
          .font('Helvetica')
          .text(item.description || '', descriptionLeft, rowY + 8, { width: descriptionWidth });
        
        // In detailed mode, show all prices
        // In summary mode, show price only for package item, show "Included" for others
        if (isDetailedMode) {
          doc.text(`${formatCurrency(item.totalPrice || 0)}`, priceLeft - 45, rowY + 8, { width: priceWidth, align: 'right' });
        } else {
          if (isPackageItem) {
            // Show price for package item
            doc.text(`${formatCurrency(item.totalPrice || 0)}`, priceLeft - 45, rowY + 8, { width: priceWidth, align: 'right' });
          } else {
            // Show "Included" for itinerary items in summary mode
            doc
              .fillColor(rgbToHex(PALETTE.secondaryText))
              .fontSize(8)
              .text('Included', priceLeft - 45, rowY + 8, { width: priceWidth, align: 'right' });
          }
        }

        rowY += rowHeight;
      });
      
      // Table outer border - Black
      doc
        .rect(tableLeft, tableTop, tableWidth, rowY - tableTop)
        .strokeColor('#000000')
        .lineWidth(1)
        .stroke();

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
        .fillColor(rgbToHex(PALETTE.secondaryText))
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
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .text(`Service Charge (${quotation.serviceChargeRate}%):`, 320, calcY)
          .text(formatCurrency(quotation.serviceChargeAmount), 420, calcY, { width: 110, align: 'right' });
      }

      if (quotation.taxAmount > 0) {
        calcY += 20;
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
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
        .fillColor(rgbToHex(PALETTE.accent))
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount:', 320, calcY)
        .text(formatCurrency(quotation.totalAmount || 0), 420, calcY, { width: 110, align: 'right' });

      // ===== NOTES & TERMS =====
      let notesY = totalsY + 160;
      let contentBottom = totalsY + 140; // Default to totals bottom
      
      if (quotation.notes || quotation.paymentTerms) {
        doc
          .fillColor(rgbToHex(PALETTE.accent))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Additional Information', 50, notesY);

        notesY += 20;
        
        if (quotation.paymentTerms) {
          // Estimate height for payment terms (roughly 15px per line)
          const paymentTermsLines = Math.ceil(quotation.paymentTerms.length / 80); // Approximate chars per line
          const paymentTermsHeight = paymentTermsLines * 15;
          doc
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Terms:', 50, notesY)
            .font('Helvetica')
            .text(quotation.paymentTerms, 50, notesY + 15, { width: 495 });
          notesY += 15 + paymentTermsHeight + 10;
        }

        if (quotation.notes) {
          // Estimate height for notes
          const notesLines = Math.ceil(quotation.notes.length / 80);
          const notesHeight = notesLines * 12;
          doc
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .fontSize(9)
            .font('Helvetica')
            .text(quotation.notes, 50, notesY, { width: 495 });
          notesY += notesHeight;
        }
        
        contentBottom = notesY;
      }

      // ===== FOOTER =====
      // Calculate footer position dynamically to avoid overlap
      // Ensure minimum 60px gap between content and footer
      const pageHeight = 842; // A4 height in points (297mm)
      const minFooterY = contentBottom + 60; // Minimum spacing from content
      const maxFooterY = pageHeight - 60; // Leave 60px from bottom of page
      
      // If content is too long and footer would be too close to bottom, add new page
      let footerY;
      if (minFooterY > maxFooterY) {
        // Content extends too far down, add new page for footer
        doc.addPage();
        footerY = 50; // Start footer at top of new page
      } else {
        // Normal case: position footer with proper spacing
        footerY = Math.max(minFooterY, 700); // At least 700px from top, or content + 60px
        footerY = Math.min(footerY, maxFooterY); // But not too close to bottom
      }
      
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
      const headerHeight = 48;
      const headerY = 8;
      const headerX = 50; // Left margin for content
      const headerWidth = 495; // Content width
      
      // Header background - black rounded rectangle (matching itinerary PDF style)
      doc
        .roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6)
        .fillColor('#0C0C0C') // rgb(12, 12, 12) - matching itinerary PDF
        .fill();

      let cursorX = headerX + 14;
      const logoBuffer = loadLogo();
      
      // Add logo if available
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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      // "Trip Sky Way" text in white (matching itinerary PDF) - properly aligned
      doc
        .fillColor(COLORS.white)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 14);

      // Subtitle
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('rgb(210, 210, 210)')
        .text('Curating inspired journeys', cursorX, headerY + 30);

      // Document Type as white text in header (positioned from left edge)
      const invoiceTextX = headerX + headerWidth - 80; // X position - decrease this value to move left, increase to move right
      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('INVOICE', invoiceTextX, headerY + 22);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== INVOICE INFO =====
      yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Invoice Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Issue Date: ${new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35)
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 50);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText)) // Black
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Bill To:', 50, yPos)
        .font('Helvetica')
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .text(invoice.customer?.name || lead?.name || 'N/A', 50, yPos + 20)
        .text(invoice.customer?.email || lead?.email || '', 50, yPos + 35)
        .text(invoice.customer?.phone || lead?.phone || '', 50, yPos + 50)
        .text(invoice.customer?.address || '', 50, yPos + 65);

      // ===== ITEMS TABLE =====
      yPos = 330;
      const tableTop = yPos;
      const tableLeft = 50; // Table left edge position
      const tableWidth = 495; // Table width
      const descriptionLeft = tableLeft + 10; // Description column left edge (60)
      const priceLeft = 470; // Price column left edge
      const descriptionWidth = 380; // Description column width
      const priceWidth = 75; // Price column width
      
      // Table Header Background (black)
      doc
        .rect(tableLeft, tableTop, tableWidth, 25)
        .fillColor('#000000') // Black
        .fill();

      // Table Header Text
      doc
        .fillColor(COLORS.white)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', descriptionLeft, tableTop + 8)
        .text('Price', priceLeft, tableTop + 8);

      // Table Rows - White background with black borders
      let rowY = tableTop + 25;
      invoice.items?.forEach((item, index) => {
        const rowHeight = 30;

        // Row Background - White
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .fillColor(COLORS.white)
          .fill();

        // Row Border - Black
        doc
          .rect(tableLeft, rowY, tableWidth, rowHeight)
          .strokeColor('#000000') // Black border
          .lineWidth(0.5)
          .stroke();

        // Row Content
        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(9)
          .font('Helvetica')
          .text(item.description || '', descriptionLeft, rowY + 8, { width: descriptionWidth })
          .text(`${formatCurrency(item.totalPrice || 0)}`, priceLeft - 25, rowY + 8, { width: priceWidth, align: 'right' });

        rowY += rowHeight;
      });
      
      // Table outer border - Black
      doc
        .rect(tableLeft, tableTop, tableWidth, rowY - tableTop)
        .strokeColor('#000000')
        .lineWidth(1)
        .stroke();

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
        .fillColor(rgbToHex(PALETTE.secondaryText))
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
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .text(`Service Charge (${invoice.serviceChargeRate}%):`, 320, calcY)
          .text(formatCurrency(invoice.serviceChargeAmount), 420, calcY, { width: 110, align: 'right' });
      }

      if (invoice.taxAmount > 0) {
        calcY += 20;
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
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
        .fillColor(rgbToHex(PALETTE.accent))
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total Amount:', 320, calcY)
        .text(formatCurrency(invoice.totalAmount || 0), 420, calcY, { width: 110, align: 'right' });

      // Payment Info
      calcY += 30;
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
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
      let contentBottom = totalsY + 180; // Default to totals section bottom
      
      if (invoice.paymentTerms || invoice.paymentInstructions || invoice.notes) {
        doc
          .fillColor(rgbToHex(PALETTE.accent))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Payment Information', 50, notesY);

        notesY += 20;
        
        if (invoice.paymentTerms) {
          // Estimate height for payment terms
          const paymentTermsLines = Math.ceil((invoice.paymentTerms.length / 80) || 1);
          const paymentTermsHeight = paymentTermsLines * 12;
          doc
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Terms:', 50, notesY)
            .font('Helvetica')
            .text(invoice.paymentTerms, 50, notesY + 15, { width: 495 });
          notesY += 15 + paymentTermsHeight + 10;
        }

        if (invoice.paymentInstructions) {
          // Estimate height for payment instructions
          const instructionsLines = Math.ceil((invoice.paymentInstructions.length / 80) || 1);
          const instructionsHeight = instructionsLines * 12;
          doc
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Payment Instructions:', 50, notesY)
            .font('Helvetica')
            .text(invoice.paymentInstructions, 50, notesY + 15, { width: 495 });
          notesY += 15 + instructionsHeight + 10;
        }

        if (invoice.notes) {
          // Estimate height for notes
          const notesLines = Math.ceil((invoice.notes.length / 80) || 1);
          const notesHeight = notesLines * 12;
          doc
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .fontSize(9)
            .font('Helvetica')
            .text(invoice.notes, 50, notesY, { width: 495 });
          notesY += notesHeight;
        }
        
        contentBottom = notesY;
      }

      // ===== FOOTER =====
      // Calculate footer position dynamically to avoid overlap
      // Ensure minimum 60px gap between content and footer
      const pageHeight = 842; // A4 height in points (297mm)
      const minFooterY = contentBottom + 60; // Minimum spacing from content
      const maxFooterY = pageHeight - 60; // Leave 60px from bottom of page
      
      // If content is too long and footer would be too close to bottom, add new page
      let footerY;
      if (minFooterY > maxFooterY) {
        // Content extends too far down, add new page for footer
        doc.addPage();
        footerY = 50; // Start footer at top of new page
      } else {
        // Normal case: position footer with proper spacing
        footerY = Math.max(minFooterY, 700); // At least 700px from top, or content + 60px
        footerY = Math.min(footerY, maxFooterY); // But not too close to bottom
      }
      
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
      const headerHeight = 48;
      const headerY = 8;
      const headerX = 50; // Left margin for content
      const headerWidth = 495; // Content width
      
      // Header background - black rounded rectangle (matching itinerary PDF style)
      doc
        .roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6)
        .fillColor('#0C0C0C') // rgb(12, 12, 12) - matching itinerary PDF
        .fill();

      let cursorX = headerX + 14;
      const logoBuffer = loadLogo();
      
      // Add logo if available
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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      // "Trip Sky Way" text in white (matching itinerary PDF) - properly aligned
      doc
        .fillColor(COLORS.white)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 14);

      // Subtitle
      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('rgb(210, 210, 210)')
        .text('Curating inspired journeys', cursorX, headerY + 30);

      // Document Type as white text in header (positioned from left edge)
      const receiptTextX = headerX + headerWidth - 80; // X position - decrease this value to move left, increase to move right
      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('RECEIPT', receiptTextX, headerY + 22);

      // ===== COMPANY INFO =====
      let yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 50, yPos)
        .text('123 Business Street, City', 50, yPos + 15)
        .text('Phone: +94 11 234 5678', 50, yPos + 30)
        .text('Email: info@tripskyway.com', 50, yPos + 45);

      // ===== RECEIPT INFO =====
      yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Receipt Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Receipt #: ${receipt.receiptNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Date: ${new Date(receipt.paymentDate || receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, yPos + 35);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      doc
        .fillColor(rgbToHex(PALETTE.accent)) // Orange accent
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Received From:', 50, yPos)
        .font('Helvetica')
        .fillColor(rgbToHex(PALETTE.primaryText))
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
        .fillColor(rgbToHex(PALETTE.accent)) // Orange accent
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
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Method:', 70, detailY)
        .font('Helvetica')
        .fillColor(rgbToHex(PALETTE.primaryText))
        .text((receipt.paymentMethod || '').toUpperCase().replace(/-/g, ' '), 200, detailY);

      detailY += 20;
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Payment Type:', 70, detailY)
        .font('Helvetica')
        .fillColor(rgbToHex(PALETTE.primaryText))
        .text((receipt.paymentType || '').toUpperCase().replace(/-/g, ' '), 200, detailY);

      detailY += 20;
      if (receipt.currency) {
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Currency:', 70, detailY)
          .font('Helvetica')
          .fillColor(rgbToHex(PALETTE.primaryText))
          .text(receipt.currency, 200, detailY);
      }

      detailY += 20;
      if (receipt.transactionId) {
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Transaction ID:', 70, detailY)
          .font('Helvetica')
          .fillColor(rgbToHex(PALETTE.primaryText))
          .text(receipt.transactionId, 200, detailY, { width: 320 });
      }

      // Payment Method Specific Details
      if (receipt.paymentDetails) {
        const details = receipt.paymentDetails;
        if (details.bankName || details.accountNumber || details.transactionReference) {
          detailY += 30;
          doc
            .fillColor(rgbToHex(PALETTE.accent)) // Orange accent
            .fontSize(10)
            .font('Helvetica-Bold')
            .text('Bank Transfer Details:', 70, detailY);
          
          detailY += 15;
          if (details.bankName) {
            doc
              .fillColor(rgbToHex(PALETTE.secondaryText))
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
          .fillColor(rgbToHex(PALETTE.accent)) // Orange accent
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Invoice Reference', 50, invoiceY)
          .font('Helvetica')
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(10)
          .text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, 50, invoiceY + 20)
          .text(`Total Invoice Amount: ${formatCurrency(invoice.totalAmount || 0)}`, 50, invoiceY + 35)
          .text(`Previous Outstanding: ${formatCurrency(receipt.previousBalance || invoice.outstandingAmount || 0)}`, 50, invoiceY + 50)
          .fillColor(invoice.outstandingAmount > 0 ? COLORS.error : COLORS.success)
          .text(`Remaining Balance: ${formatCurrency(receipt.outstandingBalance || 0)}`, 50, invoiceY + 65);
      }

      // ===== NOTES =====
      let notesY = invoice ? yPos + 300 : yPos + 210;
      let contentBottom = invoice ? yPos + 280 : yPos + 190; // Default content bottom
      
      if (receipt.notes) {
        // Estimate height for notes
        const notesLines = Math.ceil((receipt.notes.length / 80) || 1);
        const notesHeight = notesLines * 12;
        doc
          .fillColor(rgbToHex(PALETTE.accent)) // Orange accent
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Notes', 50, notesY)
          .font('Helvetica')
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(9)
          .text(receipt.notes, 50, notesY + 20, { width: 495 });
        contentBottom = notesY + 20 + notesHeight;
      }

      // ===== FOOTER =====
      // Calculate footer position dynamically to avoid overlap
      // Ensure minimum 60px gap between content and footer
      const pageHeight = 842; // A4 height in points (297mm)
      const minFooterY = contentBottom + 60; // Minimum spacing from content
      const maxFooterY = pageHeight - 60; // Leave 60px from bottom of page
      
      // If content is too long and footer would be too close to bottom, add new page
      let footerY;
      if (minFooterY > maxFooterY) {
        // Content extends too far down, add new page for footer
        doc.addPage();
        footerY = 50; // Start footer at top of new page
      } else {
        // Normal case: position footer with proper spacing
        footerY = Math.max(minFooterY, 700); // At least 700px from top, or content + 60px
        footerY = Math.min(footerY, maxFooterY); // But not too close to bottom
      }
      
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

