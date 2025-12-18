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
      console.log('[Quotation PDF] Starting generation for:', quotation.quotationNumber);
      console.log('[Quotation PDF] Items count:', quotation.items?.length || 0);
      console.log('[Quotation PDF] Mode:', quotation.mode);
      
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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 25)
        .fontSize(9)
        .font('Helvetica')
        .text('Curating inspired journeys', cursorX, headerY + 47);

      // Add QUOTATION badge
      const badgeX = 490;
      const badgeY = headerY + 40;
      doc.circle(badgeX, badgeY, 28).fillAndStroke(COLORS.white, COLORS.white);
      
      doc
        .fillColor('#000000')
        .fontSize(6)
        .font('Helvetica-Bold')
        .text('QUOTATION', badgeX - 20, badgeY - 3, { width: 40, align: 'center' });

      // ===== INFO CARDS =====
      let yPos = 125;
      
      doc.roundedRect(50, yPos, 235, 115, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 235, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO', 65, yPos + 11);

      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(quotation.customer?.name || lead?.name || 'N/A', 65, yPos + 50, { width: 205 })
        .font('Helvetica')
        .fontSize(9)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(quotation.customer?.email || lead?.email || '', 65, yPos + 70, { width: 205 })
        .text(quotation.customer?.phone || lead?.phone || '', 65, yPos + 87, { width: 205 });

      doc.roundedRect(300, yPos, 245, 115, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(300, yPos, 245, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('QUOTATION DETAILS', 315, yPos + 11);
      
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica')
        .text(`Quote #: ${quotation.quotationNumber || 'N/A'}`, 315, yPos + 50)
        .text(`Date: ${new Date(quotation.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}`, 315, yPos + 68)
        .text(`Valid: ${new Date(quotation.validUntil).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}`, 315, yPos + 86);
      
      const modeColor = quotation.mode === 'detailed' ? '#F5A623' : '#FCD34D';
      doc.roundedRect(315, yPos + 100, 75, 14, 4).fillAndStroke(modeColor, modeColor);
      
      doc
        .fillColor(COLORS.white)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text(quotation.mode === 'detailed' ? 'DETAILED' : 'SUMMARY', 315, yPos + 104, { 
          width: 75, 
          align: 'center' 
        });

      // ===== ITEMS TABLE =====
      yPos = 260;
      const tableTop = yPos;
      const tableLeft = 50;
      const tableWidth = 495;
      const dayCol = tableLeft + 12;
      const dayColWidth = 70;
      const descCol = tableLeft + dayColWidth + 12;
      const priceLeft = tableLeft + 380;
      const descriptionWidth = 280;
      
      const isDetailedMode = quotation.mode === 'detailed';
      const pageHeight = 842;
      const pageMarginBottom = 200;
      
      // Orange table header
      doc.rect(tableLeft, tableTop, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');

      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DAYS', dayCol, tableTop + 10)
        .text('DESCRIPTION', descCol, tableTop + 10)
        .text('PRICE', priceLeft, tableTop + 10);

      let rowY = tableTop + 28;
      
      // Filter items based on mode
      let itemsToDisplay = isDetailedMode 
        ? quotation.items?.filter(item => item.category !== 'package') || []
        : quotation.items || [];
      
      // In summary mode, add package item at the end if it exists
      if (!isDetailedMode && quotation.items) {
        const packageItem = quotation.items.find(item => item.category === 'package');
        if (packageItem) {
          itemsToDisplay.push(packageItem);
        }
      }
      
      // Ensure itemsToDisplay is an array
      if (!Array.isArray(itemsToDisplay)) {
        itemsToDisplay = [];
      }
      
      // If no items, draw empty table and skip to totals
      if (itemsToDisplay.length === 0) {
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(10)
          .font('Helvetica')
          .text('No items to display', descCol, rowY + 20, { width: descriptionWidth, align: 'center' });
        rowY += 60;
      } else {
        // Sort items by day if day information exists
        const sortedItems = itemsToDisplay.sort((a, b) => {
          const dayA = a.dayNumber || a.day || 999;
          const dayB = b.dayNumber || b.day || 999;
          return dayA - dayB;
        });
        
        // Group items by day
        const itemsByDay = {};
        sortedItems.forEach(item => {
          let itemDay = item.dayNumber || item.day;
          
          // If not found, try to extract from description
          if (!itemDay && item.description) {
            const dayMatch = item.description.match(/^day\s*(\d+)\s*:/i);
            if (dayMatch) {
              itemDay = parseInt(dayMatch[1], 10);
            }
          }
          
          // Default to 'Other' if no day found
          itemDay = itemDay || 'Other';
          
          if (!itemsByDay[itemDay]) {
            itemsByDay[itemDay] = [];
          }
          itemsByDay[itemDay].push(item);
        });
        
        // Sort day keys properly (numeric days first, then "Other")
        const sortedDays = Object.keys(itemsByDay).sort((a, b) => {
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return Number(a) - Number(b);
        });
        
        // Helper function to add new page with table header
        const addNewPageWithHeader = () => {
          doc.addPage();
          rowY = 50;
          
          // Re-draw table header
          doc.rect(tableLeft, rowY, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');
          doc
            .fillColor(COLORS.white)
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('DAYS', dayCol, rowY + 10)
            .text('DESCRIPTION', descCol, rowY + 10)
            .text('PRICE', priceLeft, rowY + 10);
          
          rowY += 28;
        };
        
        // Render items grouped by day
        sortedDays.forEach(day => {
          const dayItems = itemsByDay[day];
          const itemRowHeight = 40;
          
          // Calculate total height for this day group
          const dayGroupHeight = dayItems.length * itemRowHeight;
          const dayStartY = rowY;
          
          // Check if entire day group fits on current page
          if (rowY + dayGroupHeight > pageHeight - pageMarginBottom) {
            addNewPageWithHeader();
          }
          
          // Draw day cell background (spans all items in this day)
          doc
            .rect(tableLeft, rowY, dayColWidth, dayGroupHeight)
            .fillColor('#FFFFFF')
            .fill();
          
          // Draw day cell border
          doc
            .rect(tableLeft, rowY, dayColWidth, dayGroupHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .stroke();
          
          // Draw day label at the top of the day cell
          const dayLabel = day === 'Other' ? 'Other' : `Day ${day}`;
          const dayLabelY = rowY + 16;
          doc
            .fillColor('#F5A623')
            .fontSize(10)
            .font('Helvetica-Bold')
            .text(dayLabel, dayCol, dayLabelY, { width: dayColWidth - 24, align: 'center' });
          
          // Render items for this day
          dayItems.forEach((item, itemIndex) => {
            const quantity = item.quantity || 1;
            const isPackageItem = item.category === 'package';

            // Row Background - White (only for activity columns)
            doc
              .rect(tableLeft + dayColWidth, rowY, tableWidth - dayColWidth, itemRowHeight)
              .fillColor('#FFFFFF')
              .fill();

            // Row Border - Light gray
            doc
              .rect(tableLeft + dayColWidth, rowY, tableWidth - dayColWidth, itemRowHeight)
              .strokeColor('#E5E7EB')
              .lineWidth(0.5)
              .stroke();
            
            // Draw vertical line between DAY and DESCRIPTION columns for this row only
            doc
              .moveTo(tableLeft + dayColWidth, rowY)
              .lineTo(tableLeft + dayColWidth, rowY + itemRowHeight)
              .strokeColor('#E5E7EB')
              .lineWidth(0.5)
              .stroke();
            
            // Draw vertical line for PRICE column
            doc
              .moveTo(priceLeft - 10, rowY)
              .lineTo(priceLeft - 10, rowY + itemRowHeight)
              .strokeColor('#E5E7EB')
              .lineWidth(0.5)
              .stroke();
            
            // Description column - remove "day X:" prefix if present
            let cleanDescription = item.description || '';
            cleanDescription = cleanDescription.replace(/^day\s*\d+\s*:\s*/i, '');
            
            doc
              .fillColor('#1F2937')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(cleanDescription, descCol, rowY + 12, { width: descriptionWidth, lineGap: 2, ellipsis: true, height: 25 });
            
            // In detailed mode, show all prices
            // In summary mode, show price only for package item, show "Included" for others
            if (isDetailedMode) {
              doc
                .fillColor('#1F2937')
                .text(`${formatCurrency(item.totalPrice || 0)}`, priceLeft, rowY + 14);
            } else {
              if (isPackageItem) {
                // Show price for package item
                doc
                  .fillColor('#1F2937')
                  .text(`${formatCurrency(item.totalPrice || 0)}`, priceLeft, rowY + 14);
              } else {
                // Show "Included" for itinerary items in summary mode
                doc
                  .fillColor(rgbToHex(PALETTE.secondaryText))
                  .fontSize(8)
                  .text('Included', priceLeft, rowY + 14);
              }
            }

            rowY += itemRowHeight;
          });
        });
      }
      
      // ===== TOTALS SECTION =====
      const totalsY = rowY + 20;
      
      // Calculate total card height based on items present
      const summaryHeaderHeight = 35;
      const summaryRowHeight = 28;
      let totalCardRows = 1; // Subtotal always present
      if (quotation.discountAmount > 0) totalCardRows++;
      if (quotation.taxAmount > 0) totalCardRows++;
      const totalRowHeight = 50; // Total amount row
      const summaryCardHeight = summaryHeaderHeight + (totalCardRows * summaryRowHeight) + totalRowHeight;
      
      // Modern card styling for totals
      doc.roundedRect(300, totalsY, 245, summaryCardHeight, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      
      // Header with yellow background
      doc.rect(300, totalsY, 245, summaryHeaderHeight).fillAndStroke('#FEF3C7', '#FEF3C7');
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('SUMMARY', 315, totalsY + 12);
      
      let calcY = totalsY + summaryHeaderHeight;
      
      // Subtotal row with light yellow background
      doc.rect(300, calcY, 245, summaryRowHeight).fillAndStroke('#FEF9E5', '#FEF9E5');
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 315, calcY + 9)
        .fillColor(rgbToHex(PALETTE.primaryText))
        .font('Helvetica-Bold')
        .text(formatCurrency(quotation.subtotal || 0), 420, calcY + 9, { width: 110, align: 'right' });

      calcY += summaryRowHeight;

      if (quotation.discountAmount > 0) {
        // Discount row with green tint
        doc.rect(300, calcY, 245, summaryRowHeight).fillAndStroke('#ECFDF5', '#ECFDF5');
        doc
          .fillColor('#10B981')
          .fontSize(10)
          .font('Helvetica')
          .text(`Discount (${quotation.discountType === 'percentage' ? `${quotation.discountValue}%` : 'Fixed'}):`, 315, calcY + 9)
          .font('Helvetica-Bold')
          .text(`-${formatCurrency(quotation.discountAmount)}`, 420, calcY + 9, { width: 110, align: 'right' });
        
        calcY += summaryRowHeight;
      }

      if (quotation.taxAmount > 0) {
        // Tax row with light yellow background
        doc.rect(300, calcY, 245, summaryRowHeight).fillAndStroke('#FEF9E5', '#FEF9E5');
        doc
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .fontSize(10)
          .font('Helvetica')
          .text(`Tax (${quotation.taxRate}%):`, 315, calcY + 9)
          .fillColor(rgbToHex(PALETTE.primaryText))
          .font('Helvetica-Bold')
          .text(formatCurrency(quotation.taxAmount), 420, calcY + 9, { width: 110, align: 'right' });
        
        calcY += summaryRowHeight;
      }

      // Total with orange highlight
      doc.rect(300, calcY, 245, totalRowHeight).fillAndStroke('#F5A623', '#F5A623');
      
      doc
        .fillColor(COLORS.white)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Total Amount:', 315, calcY + 10)
        .fontSize(16)
        .text(formatCurrency(quotation.totalAmount || 0), 420, calcY + 10, { width: 110, align: 'right' });

      // ===== NOTES & TERMS =====
      let notesY = totalsY + 160;
      let contentBottom = totalsY + 140; // Default to totals bottom
      
      if (quotation.notes || quotation.paymentTerms) {
        doc
          .fillColor('#D97706')
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
      
      // ===== FOOTER WAVE =====
      const waveY = pageHeight - 80;
      
      // Draw orange wave at bottom
      doc.moveTo(0, waveY)
         .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
         .lineTo(595, pageHeight)
         .lineTo(0, pageHeight)
         .fill('#F5A623');

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      console.error('[Quotation PDF] Generation error:', error);
      console.error('[Quotation PDF] Stack:', error.stack);
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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 25)
        .fontSize(9)
        .font('Helvetica')
        .text('Curating inspired journeys', cursorX, headerY + 47);

      // Add INVOICE badge
      const badgeX = 490;
      const badgeY = headerY + 40;
      doc.circle(badgeX, badgeY, 28).fillAndStroke(COLORS.white, COLORS.white);
      
      doc
        .fillColor('#000000')
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('INVOICE', badgeX - 20, badgeY - 3, { width: 40, align: 'center' });

      // ===== INFO CARDS =====
      let yPos = 140;
      
      doc.roundedRect(50, yPos, 235, 105, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 235, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('COMPANY', 65, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(9.5)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 65, yPos + 47)
        .text('123 Business Street, City', 65, yPos + 62)
        .text('Phone: +94 11 234 5678', 65, yPos + 77);

      doc.roundedRect(300, yPos, 245, 105, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(300, yPos, 245, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('INVOICE INFO', 315, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica')
        .text(`Invoice #: ${invoice.invoiceNumber || 'N/A'}`, 315, yPos + 47)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(9.5)
        .text(`Issue Date: ${new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 315, yPos + 64)
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 315, yPos + 81);

      // ===== CUSTOMER INFO =====
      yPos = 265;
      
      doc.roundedRect(50, yPos, 495, 90, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 495, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO', 65, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(invoice.customer?.name || lead?.name || 'N/A', 65, yPos + 47)
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(invoice.customer?.email || lead?.email || '', 65, yPos + 64)
        .text(`${invoice.customer?.phone || lead?.phone || ''}  ${invoice.customer?.address || ''}`, 65, yPos + 79, { width: 465 });

      // ===== ITEMS TABLE =====
      yPos = yPos + 35;
      const tableTop = yPos;
      const tableLeft = 50;
      const tableWidth = 495;
      const dayCol = tableLeft + 12;
      const dayColWidth = 70;
      const descCol = tableLeft + dayColWidth + 12;
      const priceCol = tableLeft + 320;
      const amountCol = tableLeft + 395;
      
      // Orange table header
      doc.rect(tableLeft, tableTop, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');

      // Table Header Text
      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DAYS', dayCol, tableTop + 10)
        .text('ACTIVITIES', descCol, tableTop + 10)
        .text('PRICE', priceCol, tableTop + 10)
        .text('AMOUNT', amountCol - 10, tableTop + 10);

      // Table Rows - Grouped by day, organized by day
      let rowY = tableTop + 28;
      const pageHeight = 842;
      const pageMarginBottom = 100; // Space to leave at bottom for totals
      
      // Sort items by day if day information exists
      const sortedItems = invoice.items?.sort((a, b) => {
        const dayA = a.dayNumber || a.day || 999;
        const dayB = b.dayNumber || b.day || 999;
        return dayA - dayB;
      }) || [];
      
      console.log('[Invoice PDF] Total items:', sortedItems.length);
      
      // Group items by day
      const itemsByDay = {};
      sortedItems.forEach(item => {
        // Try to extract day number from multiple sources
        let itemDay = item.dayNumber || item.day;
        
        // If not found, try to extract from description
        if (!itemDay && item.description) {
          const dayMatch = item.description.match(/^day\s*(\d+)\s*:/i);
          if (dayMatch) {
            itemDay = parseInt(dayMatch[1], 10);
          }
        }
        
        // Default to 'Other' if no day found
        itemDay = itemDay || 'Other';
        
        console.log('[Invoice PDF] Item:', item.description, 'Day:', itemDay, 'Raw dayNumber:', item.dayNumber, 'Raw day:', item.day);
        if (!itemsByDay[itemDay]) {
          itemsByDay[itemDay] = [];
        }
        itemsByDay[itemDay].push(item);
      });
      
      console.log('[Invoice PDF] Days found:', Object.keys(itemsByDay));
      
      // Sort day keys properly (numeric days first, then "Other")
      const sortedDays = Object.keys(itemsByDay).sort((a, b) => {
        if (a === 'Other') return 1;
        if (b === 'Other') return -1;
        return Number(a) - Number(b);
      });
      
      // Helper function to add new page with table header
      const addNewPageWithHeader = () => {
        doc.addPage();
        rowY = 50; // Start near top of new page
        
        // Re-draw table header
        doc.rect(tableLeft, rowY, tableWidth, 28).fillAndStroke('#F5A623', '#F5A623');
        doc
          .fillColor(COLORS.white)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('DAYS', dayCol, rowY + 10)
          .text('ACTIVITIES', descCol, rowY + 10)
          .text('PRICE', priceCol, rowY + 10)
          .text('AMOUNT', amountCol - 10, rowY + 10);
        
        rowY += 28;
      };
      
      // Render items grouped by day
      sortedDays.forEach(day => {
        const dayItems = itemsByDay[day];
        const itemRowHeight = 45;
        
        console.log('[Invoice PDF] Rendering day:', day, 'with', dayItems.length, 'items');
        
        // Calculate total height for this day group
        const dayGroupHeight = dayItems.length * itemRowHeight;
        const dayStartY = rowY;
        
        // Draw day cell background (spans all items in this day)
        doc
          .rect(tableLeft, dayStartY, dayColWidth, dayGroupHeight)
          .fillColor('#FFFFFF')
          .fill();
        
        // Draw day cell border
        doc
          .rect(tableLeft, dayStartY, dayColWidth, dayGroupHeight)
          .strokeColor('#E5E7EB')
          .lineWidth(0.5)
          .stroke();
        
        // Draw day label at the top of the day cell
        const dayLabel = day === 'Other' ? 'Other' : `Day ${day}`;
        const dayLabelY = dayStartY + 16;
        doc
          .fillColor('#F5A623')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(dayLabel, dayCol, dayLabelY, { width: dayColWidth - 24, align: 'center' });
        
        // Render items for this day
        dayItems.forEach((item, itemIndex) => {
          const quantity = item.quantity || 1;
          const unitPrice = (item.totalPrice || 0) / quantity;

          // Check if item fits on current page
          if (rowY + itemRowHeight > pageHeight - pageMarginBottom) {
            addNewPageWithHeader();
          }

          // Row Background - White (only for activity columns)
          doc
            .rect(tableLeft + dayColWidth, rowY, tableWidth - dayColWidth, itemRowHeight)
            .fillColor('#FFFFFF')
            .fill();

          // Row Border - Light gray
          doc
            .rect(tableLeft + dayColWidth, rowY, tableWidth - dayColWidth, itemRowHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .stroke();
          
          // Draw vertical line between DAY and ACTIVITIES columns for this row only
          doc
            .moveTo(tableLeft + dayColWidth, rowY)
            .lineTo(tableLeft + dayColWidth, rowY + itemRowHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .stroke();
          
          // Draw vertical lines for this row
          doc
            .moveTo(priceCol - 5, rowY)
            .lineTo(priceCol - 5, rowY + itemRowHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .stroke();
          
          doc
            .moveTo(amountCol - 15, rowY)
            .lineTo(amountCol - 15, rowY + itemRowHeight)
            .strokeColor('#E5E7EB')
            .lineWidth(0.5)
            .stroke();
          
          // Description column - remove "day X:" prefix if present
          let cleanDescription = item.description || '';
          cleanDescription = cleanDescription.replace(/^day\s*\d+\s*:\s*/i, '');
          
          doc
            .fillColor('#1F2937')
            .fontSize(8)
            .font('Helvetica-Bold')
            .text(cleanDescription, descCol, rowY + 12, { width: 180, lineGap: 2, ellipsis: true, height: 30 });
          
          // Additional details if any
          if (item.category) {
            doc
              .fillColor('#6B7280')
              .fontSize(7)
              .font('Helvetica')
              .text(`• ${item.category}`, descCol, rowY + 32, { width: 180 });
          }
          
          // Price
          doc
            .fillColor('#1F2937')
            .fontSize(9)
            .font('Helvetica')
            .text(`${formatCurrency(unitPrice)}`, priceCol, rowY + 16);
          
          // Amount
          doc.text(formatCurrency(item.totalPrice || 0), amountCol - 10, rowY + 16);

          rowY += itemRowHeight;
        });
      });

      // ===== PAYMENT SUMMARY SECTION =====
      const summaryBoxWidth = 245;
      const summaryBoxLeft = tableLeft + tableWidth - summaryBoxWidth;
      const summaryBoxTop = rowY + 20;
      
      // Calculate heights
      const summaryHeaderHeight = 35;
      const summaryRowHeight = 32;
      const totalRows = (invoice.paidAmount > 0 || invoice.outstandingAmount > 0) ? 3 : 1;
      const summaryBoxHeight = summaryHeaderHeight + (summaryRowHeight * totalRows);
      
      // Check if summary section fits on current page
      if (summaryBoxTop + summaryBoxHeight > pageHeight - 100) {
        doc.addPage();
        rowY = 50;
        const newSummaryTop = rowY + 100;
        
        // Draw payment summary card
        doc.roundedRect(summaryBoxLeft, newSummaryTop, summaryBoxWidth, summaryBoxHeight, 10)
           .fillAndStroke('#FFFFFF', '#FCD34D');
        
        // Header
        doc.rect(summaryBoxLeft, newSummaryTop, summaryBoxWidth, summaryHeaderHeight)
           .fillAndStroke('#FEF3C7', '#FEF3C7');
        
        doc.fillColor('#D97706')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('PAYMENT SUMMARY', summaryBoxLeft + 15, newSummaryTop + 12);
        
        let currentY = newSummaryTop + summaryHeaderHeight;
        
        // Grand Total Row
        doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
           .fillAndStroke('#F5A623', '#F5A623');
        
        doc.fillColor(COLORS.white)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Grand Total', summaryBoxLeft + 15, currentY + 8)
           .fontSize(16)
           .text(formatCurrency(invoice.totalAmount || 0), summaryBoxLeft + 15, currentY + 8, { 
             width: summaryBoxWidth - 30, 
             align: 'right' 
           });
        
        currentY += summaryRowHeight;
        
        // Paid Amount Row (if exists)
        if (invoice.paidAmount > 0 || invoice.outstandingAmount > 0) {
          doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
             .fillAndStroke('#ECFDF5', '#ECFDF5');
          
          doc.fillColor('#D97706')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Paid Amount', summaryBoxLeft + 15, currentY + 10)
             .fontSize(13)
             .text(formatCurrency(invoice.paidAmount || 0), summaryBoxLeft + 15, currentY + 10, { 
               width: summaryBoxWidth - 30, 
               align: 'right' 
             });
          
          currentY += summaryRowHeight;
          
          // Outstanding Amount Row
          const outstandingColor = invoice.outstandingAmount > 0 ? '#FEF2F2' : '#FEF3C7';
          const outstandingBorder = invoice.outstandingAmount > 0 ? '#FEE2E2' : '#FEF3C7';
          const textColor = invoice.outstandingAmount > 0 ? '#EF4444' : '#10B981';
          
          doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
             .fillAndStroke(outstandingColor, outstandingBorder);
          
          doc.fillColor('#D97706')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Balance Due', summaryBoxLeft + 15, currentY + 10)
             .fontSize(13)
             .text(formatCurrency(invoice.outstandingAmount || 0), summaryBoxLeft + 15, currentY + 10, { 
               width: summaryBoxWidth - 30, 
               align: 'right' 
             });
        }
        
        rowY = currentY;
      } else {
        // Draw payment summary card on current page
        doc.roundedRect(summaryBoxLeft, summaryBoxTop, summaryBoxWidth, summaryBoxHeight, 10)
           .fillAndStroke('#FFFFFF', '#FCD34D');
        
        // Header
        doc.rect(summaryBoxLeft, summaryBoxTop, summaryBoxWidth, summaryHeaderHeight)
           .fillAndStroke('#FEF3C7', '#FEF3C7');
        
        doc.fillColor('#D97706')
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('PAYMENT SUMMARY', summaryBoxLeft + 15, summaryBoxTop + 12);
        
        let currentY = summaryBoxTop + summaryHeaderHeight;
        
        // Grand Total Row
        doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
           .fillAndStroke('#F5A623', '#F5A623');
        
        doc.fillColor(COLORS.white)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Grand Total', summaryBoxLeft + 15, currentY + 8)
           .fontSize(16)
           .text(formatCurrency(invoice.totalAmount || 0), summaryBoxLeft + 15, currentY + 8, { 
             width: summaryBoxWidth - 30, 
             align: 'right' 
           });
        
        currentY += summaryRowHeight;
        
        // Paid Amount Row (if exists)
        if (invoice.paidAmount > 0 || invoice.outstandingAmount > 0) {
          doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
             .fillAndStroke('#ECFDF5', '#ECFDF5');
          
          doc.fillColor('#D97706')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Paid Amount', summaryBoxLeft + 15, currentY + 10)
             .fontSize(13)
             .text(formatCurrency(invoice.paidAmount || 0), summaryBoxLeft + 15, currentY + 10, { 
               width: summaryBoxWidth - 30, 
               align: 'right' 
             });
          
          currentY += summaryRowHeight;
          
          // Outstanding Amount Row
          const outstandingColor = invoice.outstandingAmount > 0 ? '#FEF2F2' : '#FEF3C7';
          const outstandingBorder = invoice.outstandingAmount > 0 ? '#FEE2E2' : '#FEF3C7';
          const textColor = invoice.outstandingAmount > 0 ? '#EF4444' : '#10B981';
          
          doc.rect(summaryBoxLeft, currentY, summaryBoxWidth, summaryRowHeight)
             .fillAndStroke(outstandingColor, outstandingBorder);
          
          doc.fillColor('#D97706')
             .fontSize(10)
             .font('Helvetica-Bold')
             .text('Balance Due', summaryBoxLeft + 15, currentY + 10)
             .fontSize(13)
             .text(formatCurrency(invoice.outstandingAmount || 0), summaryBoxLeft + 15, currentY + 10, { 
               width: summaryBoxWidth - 30, 
               align: 'right' 
             });
        }
        
        rowY = currentY;
      }
      
      let paymentY = rowY + 30;

      // ===== TERMS & ISSUED TO SECTION =====
      let footerY = paymentY + 50;
      
      // Check if we need a new page for terms section
      if (footerY > pageHeight - 180) {
        doc.addPage();
        footerY = 50;
      }
      
      // Terms & Conditions (Left)
      doc
        .fillColor('#374151')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('TERMS & CONDITIONS', 50, footerY);
      
      const termsText = invoice.paymentTerms || 'Payment terms are usually stated on the invoice. These may specify that the buyer has a maximum number of days in which to pay and is sometimes offered a discount if paid before the due date.';
      
      doc
        .fillColor('#6B7280')
        .fontSize(8)
        .font('Helvetica')
        .text(termsText, 50, footerY + 18, { width: 280, lineGap: 2 });
      
      // Issued To (Right)
      doc
        .fillColor('#374151')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Issued To:', 350, footerY);
      
      doc
        .fillColor('#1F2937')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(invoice.customer?.name || lead?.name || 'N/A', 350, footerY + 20);
      
      if (invoice.customer?.accountName || invoice.customer?.accountNumber) {
        doc
          .fillColor('#6B7280')
          .fontSize(8)
          .font('Helvetica')
          .text(`ACCT. NAME: ${invoice.customer?.accountName || 'N/A'}`, 350, footerY + 38)
          .text(`ACCT. NO.: ${invoice.customer?.accountNumber || 'N/A'}`, 350, footerY + 52);
      }
      
      // ===== FOOTER WAVE =====
      const waveY = pageHeight - 80;
      
      // Draw orange wave at bottom
      doc.moveTo(0, waveY)
         .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
         .lineTo(595, pageHeight)
         .lineTo(0, pageHeight)
         .fill('#F5A623');

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
          console.warn('[Billing PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 25)
        .fontSize(9)
        .font('Helvetica')
        .text('Curating inspired journeys', cursorX, headerY + 47);

      // Add RECEIPT badge
      const badgeX = 490;
      const badgeY = headerY + 40;
      doc.circle(badgeX, badgeY, 28).fillAndStroke(COLORS.white, COLORS.white);
      
      doc
        .fillColor('#000000')
        .fontSize(6)
        .font('Helvetica-Bold')
        .text('RECEIPT', badgeX - 20, badgeY - 3, { width: 40, align: 'center' });

      // ===== INFO CARDS =====
      let yPos = 125;
      
      doc.roundedRect(50, yPos, 235, 90, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 235, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('COMPANY', 65, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(9.5)
        .font('Helvetica')
        .text('Trip Sky Way Travel & Tours', 65, yPos + 47)
        .text('123 Business Street, City', 65, yPos + 62)
        .text('+94 11 234 5678', 65, yPos + 77);

      doc.roundedRect(300, yPos, 245, 90, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(300, yPos, 245, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('RECEIPT INFO', 315, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica')
        .text(`Receipt #: ${receipt.receiptNumber || 'N/A'}`, 315, yPos + 47)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .fontSize(9.5)
        .text(`Date: ${new Date(receipt.paymentDate || receipt.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 315, yPos + 64);

      // ===== CUSTOMER INFO =====
      yPos = 215;
      
      doc.roundedRect(50, yPos, 495, 75, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 495, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('RECEIVED FROM', 65, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(receipt.customer?.name || lead?.name || 'N/A', 65, yPos + 47)
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`${receipt.customer?.email || lead?.email || ''}  |  ${receipt.customer?.phone || lead?.phone || ''}`, 65, yPos + 64, { width: 465 });

      // ===== PAYMENT DETAILS BOX =====
      yPos = 310;
      
      doc.roundedRect(50, yPos, 495, 180, 10).fillAndStroke('#FEF3C7', '#FCD34D');
      
      // Payment Amount (Large)
      doc
        .fillColor('#D97706')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Payment Amount', 70, yPos + 20)
        .fillColor('#0C0C0C')
        .fontSize(32)
        .font('Helvetica-Bold')
        .text(formatCurrency(receipt.amount || 0), 70, yPos + 48);

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
          .text(`Previous Outstanding: ${formatCurrency(receipt.previousBalance || invoice?.outstandingAmount || 0)}`, 50, invoiceY + 50)
          .fillColor((receipt.outstandingBalance || invoice?.outstandingAmount || 0) > 0 ? COLORS.error : COLORS.success)
          .text(`Remaining Balance: ${formatCurrency(receipt.outstandingBalance || invoice?.outstandingAmount || 0)}`, 50, invoiceY + 65);
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

      // ===== FOOTER WAVE =====
      const pageHeight = 842;
      const waveY = pageHeight - 80;
      
      // Draw orange wave at bottom
      doc.moveTo(0, waveY)
         .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
         .lineTo(595, pageHeight)
         .lineTo(0, pageHeight)
         .fill('#F5A623');

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

