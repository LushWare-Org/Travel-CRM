import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper function to convert RGB array to hex
const rgbToHex = (rgb) => {
  const [r, g, b] = rgb;
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

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
    console.warn('[Voucher PDF] Logo not found at:', LOGO_PATH);
    return null;
  } catch (error) {
    console.warn('[Voucher PDF] Error loading logo:', error);
    return null;
  }
};

// Color Scheme matching billingPDFGenerator
const PALETTE = {
  background: [249, 250, 251],
  secondaryBackground: [209, 213, 219],
  primaryText: [31, 41, 55],
  secondaryText: [75, 85, 99],
  mutedText: [107, 114, 128],
  accent: [234, 88, 12],
  accentDark: [234, 179, 8],
  badgeBg: [234, 88, 12],
  badgeText: [255, 255, 255],
  cardBg: [245, 245, 245],
  cardBorder: [156, 163, 175],
  pillBg: [209, 213, 219],
  timeline: [0, 0, 0],
};

const COLORS = {
  primary: rgbToHex(PALETTE.accent),
  primaryDark: rgbToHex([180, 60, 8]),
  primaryLight: rgbToHex([251, 146, 60]),
  accent: rgbToHex(PALETTE.accentDark),
  white: '#FFFFFF',
  gray100: '#F9FAFB',
  gray200: '#E5E7EB',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  success: '#10B981',
  warning: rgbToHex(PALETTE.accentDark),
  error: '#EF4444',
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'INR 0.00';
  return `INR ${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generate voucher PDF
 */
export function generateVoucherPDF(voucher, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 0,
        size: 'A4',
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

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
          console.warn('[Voucher PDF] Failed to add logo:', error);
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

      // Add VOUCHER badge
      const badgeX = 490;
      const badgeY = headerY + 40;
      doc.circle(badgeX, badgeY, 28).fillAndStroke(COLORS.white, COLORS.white);
      
      doc
        .fillColor('#000000')
        .fontSize(6)
        .font('Helvetica-Bold')
        .text('VOUCHER', badgeX - 20, badgeY - 3, { width: 40, align: 'center' });

      // ===== INFO CARDS =====
      let yPos = 125;
      
      doc.roundedRect(50, yPos, 235, 108, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 235, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('CUSTOMER', 65, yPos + 11);

      const customerName = voucher.customer?.name || lead?.name || '-';
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(customerName, 65, yPos + 47, { width: 205 })
        .font('Helvetica')
        .fontSize(9)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(voucher.customer?.email || lead?.email || '-', 65, yPos + 66, { width: 205 })
        .text(voucher.customer?.phone || lead?.phone || '-', 65, yPos + 82, { width: 205 });

      doc.roundedRect(300, yPos, 245, 108, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(300, yPos, 245, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('VOUCHER DETAILS', 315, yPos + 11);
      
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica')
        .text(`Voucher #: ${voucher.voucherNumber || 'N/A'}`, 315, yPos + 47)
        .text(`Date: ${formatDate(voucher.createdAt)}`, 315, yPos + 64);
      
      const statusColor = voucher.status === 'confirmed' ? '#F5A623' : '#FCD34D';
      doc.roundedRect(315, yPos + 84, 72, 16, 5).fillAndStroke(statusColor, statusColor);
      
      doc
        .fillColor(COLORS.white)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(voucher.status?.toUpperCase() || 'DRAFT', 315, yPos + 88, { 
          width: 72, 
          align: 'center' 
        });

      // ===== PACKAGE DETAILS =====
      yPos = 255;
      const packageDetails = voucher.packageDetails || {};
      
      doc.roundedRect(50, yPos, 495, 110, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 495, 32).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PACKAGE DETAILS', 65, yPos + 11);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`${packageDetails.name || 'N/A'}`, 65, yPos + 47, { width: 465 })
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Destination: ${packageDetails.destination || 'N/A'}`, 65, yPos + 66)
        .text(`Duration: ${packageDetails.duration || 'N/A'} days`, 270, yPos + 66)
        .text(`Category: ${packageDetails.category || 'N/A'}`, 65, yPos + 84);

      // ===== TRAVEL DATES =====
      yPos = 385;
      
      doc.roundedRect(50, yPos, 235, 80, 10).fillAndStroke('#FFFFFF', '#FCD34D');
      doc.rect(50, yPos, 235, 30).fillAndStroke('#FEF3C7', '#FEF3C7');
      
      doc
        .fillColor('#D97706')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('TRAVEL DATES', 65, yPos + 9);
        
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(9.5)
        .font('Helvetica')
        .text(`Departure: ${voucher.travelStartDate ? formatDate(voucher.travelStartDate) : '-'}`, 65, yPos + 44)
        .text(`Return: ${voucher.travelEndDate ? formatDate(voucher.travelEndDate) : '-'}`, 65, yPos + 61);

      // ===== LOCATION DATES =====
      let locationY = 485; // Initialize locationY
      if (voucher.locationDates && voucher.locationDates.length > 0) {
        yPos = 485;
        
        doc.roundedRect(50, yPos, 495, 30, 8).fillAndStroke('#FEF3C7', '#FEF3C7');
        
        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Location & Accommodation Dates', 65, yPos + 9);

        locationY = yPos + 45;
        voucher.locationDates.forEach((locationDate, index) => {
          if (locationY > 700) {
            doc.addPage();
            locationY = 50;
          }
          
          doc.roundedRect(50, locationY, 495, 55, 8).fillAndStroke('#FFFFFF', '#FCD34D');
          
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(rgbToHex(PALETTE.primaryText))
            .text(`${index + 1}. ${locationDate.location || '-'}`, 65, locationY + 10)
            .font('Helvetica')
            .fontSize(9)
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .text(`✓ Check-in: ${locationDate.checkIn ? formatDate(locationDate.checkIn) : '-'}`, 80, locationY + 28)
            .text(`✓ Check-out: ${locationDate.checkOut ? formatDate(locationDate.checkOut) : '-'}`, 280, locationY + 28);
          locationY += 65;
        });
      } else {
        // If no location dates, set locationY to the position after travel dates
        locationY = 485; // Position after travel dates section
      }

      // ===== MEAL PLANS =====
      // Initialize mealY - will be set if meal plans exist
      let mealY = (voucher.locationDates && voucher.locationDates.length > 0) ? locationY + 30 : 485 + 30;
      
      if (voucher.mealPlans && voucher.mealPlans.length > 0) {
        // Calculate yPos based on whether location dates were shown
        yPos = (voucher.locationDates && voucher.locationDates.length > 0) ? locationY + 30 : 485 + 30;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        
        doc.roundedRect(50, yPos, 495, 30, 8).fillAndStroke('#FEF3C7', '#FEF3C7');
        
        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Meal Plans (Day-wise)', 65, yPos + 9);

        mealY = yPos + 45;
        voucher.mealPlans.forEach((mealPlan) => {
          if (mealY > 700) {
            doc.addPage();
            mealY = 50;
          }
          const meals = [];
          if (mealPlan.breakfast) meals.push('Breakfast');
          if (mealPlan.lunch) meals.push('Lunch');
          if (mealPlan.dinner) meals.push('Dinner');
          
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(rgbToHex(PALETTE.primaryText))
            .text(`Day ${mealPlan.dayNumber}: ${mealPlan.dayTitle || ''}`, 65, mealY)
            .font('Helvetica')
            .fontSize(9)
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .text(meals.join('  •  '), 80, mealY + 16);
          mealY += 35;
        });
      }

      // ===== ITINERARY SUMMARY =====
      // Initialize itineraryY - will be set if itinerary exists
      let itineraryY = mealY;
      
      if (voucher.itinerarySummary && voucher.itinerarySummary.length > 0) {
        // Calculate yPos based on whether meal plans were shown
        yPos = (voucher.mealPlans && voucher.mealPlans.length > 0) ? mealY + 30 : mealY;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        
        doc.roundedRect(50, yPos, 495, 30, 8).fillAndStroke('#FEF3C7', '#FEF3C7');
        
        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Itinerary Summary', 65, yPos + 9);

        itineraryY = yPos + 45;
        voucher.itinerarySummary.forEach((day) => {
          if (itineraryY > 700) {
            doc.addPage();
            itineraryY = 50;
          }
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(rgbToHex(PALETTE.primaryText))
            .text(`Day ${day.dayNumber}: ${day.title}`, 65, itineraryY);
          if (day.locations && day.locations.length > 0) {
            doc
              .font('Helvetica')
              .fontSize(9)
              .fillColor(rgbToHex(PALETTE.secondaryText))
              .text(`${day.locations.join(', ')}`, 80, itineraryY + 16);
            itineraryY += 15;
          }
          if (day.activities && day.activities.length > 0) {
            doc.text(`   Activities: ${day.activities.slice(0, 3).join(', ')}${day.activities.length > 3 ? '...' : ''}`, 60, itineraryY + 15);
            itineraryY += 15;
          }
          if (day.accommodation?.name) {
            doc.text(`   Accommodation: ${day.accommodation.name}`, 60, itineraryY + 15);
            itineraryY += 15;
          }
          itineraryY += 25;
        });
      }

      // ===== INCLUSIONS =====
      // Initialize inclusionY - will be set if inclusions exist
      let inclusionY = itineraryY;
      
      if (packageDetails.inclusions && packageDetails.inclusions.length > 0) {
        // Calculate yPos based on whether itinerary was shown
        yPos = (voucher.itinerarySummary && voucher.itinerarySummary.length > 0) ? itineraryY + 30 : itineraryY;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Package Inclusions', 50, yPos)
          .font('Helvetica')
          .fontSize(10)
          .fillColor(rgbToHex(PALETTE.secondaryText));

        inclusionY = yPos + 25;
        packageDetails.inclusions.forEach((inclusion) => {
          if (inclusionY > 700) {
            doc.addPage();
            inclusionY = 50;
          }
          doc.text(`• ${inclusion}`, 60, inclusionY);
          inclusionY += 15;
        });
      }

      // ===== SPECIAL INSTRUCTIONS =====
      if (voucher.specialInstructions) {
        // Calculate yPos based on whether inclusions were shown
        yPos = (packageDetails.inclusions && packageDetails.inclusions.length > 0) ? inclusionY + 30 : inclusionY;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc
          .fillColor('#D97706')
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Special Instructions', 50, yPos)
          .font('Helvetica')
          .fontSize(10)
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .text(voucher.specialInstructions, 50, yPos + 25, { width: 495 });
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
    } catch (error) {
      reject(error);
    }
  });
}

