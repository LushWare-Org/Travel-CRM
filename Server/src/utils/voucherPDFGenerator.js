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
          console.warn('[Voucher PDF] Failed to add logo:', error);
        }
      }

      doc
        .fillColor(COLORS.white)
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Trip Sky Way', cursorX, headerY + 14)
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('rgb(210, 210, 210)')
        .text('Curating inspired journeys', cursorX, headerY + 30);

      const voucherTextX = headerX + headerWidth - 80;
      doc
        .fillColor(COLORS.white)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('TRAVEL VOUCHER', voucherTextX, headerY + 22);

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

      // ===== VOUCHER INFO =====
      yPos = 120;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Voucher Details', 380, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Voucher #: ${voucher.voucherNumber || 'N/A'}`, 380, yPos + 20)
        .text(`Date: ${formatDate(voucher.createdAt)}`, 380, yPos + 35)
        .text(`Status: ${voucher.status?.toUpperCase() || 'DRAFT'}`, 380, yPos + 50);

      // ===== CUSTOMER INFO =====
      yPos = 220;
      const customerName = voucher.customer?.name || lead?.name || '-';
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Customer Information', 50, yPos)
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(rgbToHex(PALETTE.primaryText))
        .text(`Name: ${customerName}`, 50, yPos + 20)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Email: ${voucher.customer?.email || lead?.email || '-'}`, 50, yPos + 40)
        .text(`Phone: ${voucher.customer?.phone || lead?.phone || '-'}`, 50, yPos + 55);
      if (voucher.customer?.address || lead?.address) {
        doc.text(`Address: ${voucher.customer?.address || lead?.address || ''}`, 50, yPos + 70);
      }

      // ===== PACKAGE DETAILS =====
      yPos = 320;
      const packageDetails = voucher.packageDetails || {};
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Package Details', 50, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Package: ${packageDetails.name || 'N/A'}`, 50, yPos + 20)
        .text(`Destination: ${packageDetails.destination || 'N/A'}`, 50, yPos + 35)
        .text(`Duration: ${packageDetails.duration || 'N/A'} days`, 50, yPos + 50)
        .text(`Category: ${packageDetails.category || 'N/A'}`, 50, yPos + 65);

      // ===== TRAVEL DATES =====
      yPos = 450;
      doc
        .fillColor(rgbToHex(PALETTE.primaryText))
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Travel Dates', 50, yPos)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(rgbToHex(PALETTE.secondaryText))
        .text(`Start Date: ${voucher.travelStartDate ? formatDate(voucher.travelStartDate) : '-'}`, 50, yPos + 20)
        .text(`End Date: ${voucher.travelEndDate ? formatDate(voucher.travelEndDate) : '-'}`, 50, yPos + 35);

      // ===== LOCATION DATES =====
      let locationY = 520; // Initialize locationY
      if (voucher.locationDates && voucher.locationDates.length > 0) {
        yPos = 520;
        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Location & Accommodation Dates', 50, yPos);

        locationY = yPos + 25;
        voucher.locationDates.forEach((locationDate, index) => {
          if (locationY > 700) {
            doc.addPage();
            locationY = 50;
          }
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .text(`${index + 1}. ${locationDate.location || '-'}`, 50, locationY)
            .text(`   Check-in: ${locationDate.checkIn ? formatDate(locationDate.checkIn) : '-'}`, 60, locationY + 15)
            .text(`   Check-out: ${locationDate.checkOut ? formatDate(locationDate.checkOut) : '-'}`, 60, locationY + 30);
          locationY += 50;
        });
      } else {
        // If no location dates, set locationY to the position after travel dates
        locationY = 520; // Position after travel dates section
      }

      // ===== MEAL PLANS =====
      // Initialize mealY - will be set if meal plans exist
      let mealY = (voucher.locationDates && voucher.locationDates.length > 0) ? locationY + 30 : 520 + 30;
      
      if (voucher.mealPlans && voucher.mealPlans.length > 0) {
        // Calculate yPos based on whether location dates were shown
        yPos = (voucher.locationDates && voucher.locationDates.length > 0) ? locationY + 30 : 520 + 30;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Meal Plans (Day-wise)', 50, yPos);

        mealY = yPos + 25;
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
            .font('Helvetica')
            .fontSize(10)
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .text(`Day ${mealPlan.dayNumber}: ${mealPlan.dayTitle || ''}`, 50, mealY)
            .text(`   Meals: ${meals.length > 0 ? meals.join(', ') : 'Not included'}`, 60, mealY + 15);
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
        doc
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Itinerary Summary', 50, yPos);

        itineraryY = yPos + 25;
        voucher.itinerarySummary.forEach((day) => {
          if (itineraryY > 700) {
            doc.addPage();
            itineraryY = 50;
          }
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(rgbToHex(PALETTE.secondaryText))
            .text(`Day ${day.dayNumber}: ${day.title}`, 50, itineraryY, { bold: true });
          if (day.locations && day.locations.length > 0) {
            doc.text(`   Locations: ${day.locations.join(', ')}`, 60, itineraryY + 15);
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
          .fillColor(rgbToHex(PALETTE.primaryText))
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
          .fillColor(rgbToHex(PALETTE.primaryText))
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('Special Instructions', 50, yPos)
          .font('Helvetica')
          .fontSize(10)
          .fillColor(rgbToHex(PALETTE.secondaryText))
          .text(voucher.specialInstructions, 50, yPos + 25, { width: 495 });
      }

      // ===== FOOTER =====
      const pageHeight = doc.page.height;
      doc
        .fillColor(rgbToHex(PALETTE.mutedText))
        .fontSize(8)
        .font('Helvetica')
        .text('Thank you for choosing Trip Sky Way!', 50, pageHeight - 40, { align: 'center' })
        .text('For any queries, please contact us at info@tripskyway.com', 50, pageHeight - 25, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

