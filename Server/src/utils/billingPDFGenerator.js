import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import BRANDING, { getBankDetails } from '../config/branding.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Path to logo in Management public folder
const LOGO_PATH = path.join(dirname, '../../../Management/public/website-logo-1.png');

// Payment Details - loaded from branding config (environment variables)
const getPaymentDetails = () => {
  const bank = getBankDetails();
  return {
    accountName: bank.accountName || BRANDING.company.name.toUpperCase(),
    bankName: bank.bankName || 'Your Bank',
    accountNumber: bank.accountNumber || '0000000000',
    ifscCode: bank.ifscCode || 'XXXX0000000',
    accountType: bank.accountType || 'Current Account',
    branch: bank.branch || 'Main Branch',
    upiId: bank.upiId || '',
    phone: bank.phone || BRANDING.contact.phone
  };
};

// Customer Reviews - These should be customized per deployment or made configurable
const DESTINATION_REVIEWS = {
  'Generic': [
    { name: 'Happy Customer', rating: 5, text: 'Amazing experience! The itinerary was perfectly planned and executed. Highly recommended!', time: '1 month ago' },
    { name: 'Satisfied Traveler', rating: 5, text: 'Very professional team. They took care of every small detail. Will definitely book again.', time: '2 months ago' },
    { name: 'Travel Enthusiast', rating: 4, text: 'Good service and support throughout the trip. Had a memorable vacation.', time: '3 months ago' }
  ]
};

// Terms text - uses BRANDING for company name
const getTermsText = () => `Exclusions:
• Air Ticket
• Expenses of personal nature such as drinks, telephone, and laundry bills etc.
• Tips & Porter Charges
• Any boating Charges (Motor Boat / Pedal Boat)
• Any Other Services not specified above
• 5% TCS will be extra on Land Part which is Refundable after Filling ITR

Note on TCS:
(Get 100% credit of the TCS Amount, TCS is collected via ${BRANDING.company.name})
TCS credit would reflect in your Form 26AS on quarterly basis. You may also request TCS certificate from ${BRANDING.company.name}.

Claiming your credit: Charged TCS can be claimed against the tax payable at the time of filing the return. Receiving Credit: In case there is no tax payable, you can claim the refund of TCS amount at the time of filing income tax return.

Example Scenarios:
• Scenario 1: Your trip is between 15 Jan - 19 Jan. The TCS amount will be submitted after completion of your trip, and it will reflect on your Form 26 AS by end of April. (Next quarter end)
• Scenario 2: Your trip is between 25 Mar - 29 Mar. The TCS amount will be submitted after completion of your trip, and it will reflect on your Form 26 AS by end of April. (Next quarter end)
• Scenario 3: Your trip is between 25 Mar - 29 Mar. But you cancel and reschedule at last moment due to some emergency. Your new trip date is 15 May - 19 May. The TCS amount will be submitted after completion of your trip, and it will reflect on your Form 26 AS by end of July. (Next quarter end)

Terms & Conditions for TCS:
• The above is just a quotation and no reservation has been processed at the time of this request. The quote would be revised in case of any change in the package requirements. Rates quoted are subject to verification at the time of definite booking.
• The pictures have been sourced from multiple third-party sources. ${BRANDING.company.name} does not assume any responsibility with respect to discrepancies in look and feel of different hotel properties/sightseeing with respect to actual v/s what is displayed on the images. ${BRANDING.company.name} does not own these images and has included them in the quotation for representation purposes to give clients a better idea of the inclusions of their trip.
• Any changes or cancellation after cancellation dateline will result in cancellation charges.
• It is mandatory that you carefully read, understand and accept all the Service Terms shared with you before making your first payment. Your decision to make the first payment to us implies you have been provided with a copy of our service terms. That you have read and understood these terms, and agree to the same assuming full responsibility.
• In case client wishes to prepone/postpone his or her travel dates, we request you to kindly reach us 30 days prior to journey date via Call/E-mail/WhatsApp. Additional charges will be applicable for postponing & preponing the travel dates.
• In all prepone or postpone scenarios, the services and the costing will be subject to availability of services and season/off season time.
• We do not accept any changes in plan within 30 days of travel date. However, in rare cases like adverse climatic conditions or strikes, package can be postponed which will be intimated to you beforehand.
• Maldivian resorts will never accept duplicate bookings under a client's name. If the client has made a prior booking in the same resort (either directly / through another agent / without client's knowledge - booking placed by another agent), it is the client's responsibility to cancel it. ${BRANDING.company.name} may assist in expediting the cancellation of the proxy booking, but we are unable to process the cancellation ourselves. To maintain transparency, the client should demand written confirmation from the previous agency for all such duplicate booking cancellations. ${BRANDING.company.name} is not responsible for bookings that are rejected due to a prior reservation/duplicate booking. If ${BRANDING.company.name}'s booking is rejected due to a prior/duplicate reservation, the client's booking amount will be considered non-refundable.
• Any dispute arising out of such use of the website or services offered by ${BRANDING.company.name} or any other conflict, whatsoever, is subject to the laws of ${BRANDING.legal.jurisdiction} and to the exclusive jurisdiction of the courts in ${BRANDING.legal.courtLocation || BRANDING.address.city || 'the applicable jurisdiction'}.
• ${BRANDING.company.name} Not Owns any additional expenses incurred due to any flight delay or cancellation, weather conditions, Political closures, technical faults, Health Emergency etc.`;

const getCancellationPolicy = () => `CANCELLATION POLICY:
In the event of cancellation of tour/travel services due to any avoidable/unavoidable reason/s, we must be notified of the same in writing.

Cancellation charges will be effective from the date we receive advice in writing, and cancellation charges will be as follows:

Note: Rooms and flights are subject to availability. If there is any change and the client is not ready to pay as per change will refund the total amount.

• 30 days prior to arrival: 100% of the Tour/service cost.
• The booking Amount is non-refundable 5k per person once the package is booked.

Kindly share your feedback @ ${BRANDING.urls.website.replace('https://', '').replace('http://', '').toUpperCase()} and ${BRANDING.contact.email} feel free at any time to contact us.`;

// Modern Professional Color Palette - Sleek Travel Agency Design
const PALETTE = {
  // Primary Colors
  primary: '#0F766E',        // Deep Teal - Main brand color
  primaryLight: '#14B8A6',   // Lighter teal for accents
  primaryDark: '#134E4A',    // Dark teal for headers

  // Accent Colors
  accent: '#F59E0B',         // Amber/Gold - Highlights, CTAs
  accentLight: '#FEF3C7',    // Light amber for backgrounds
  accentDark: '#D97706',     // Darker amber for text on light bg

  // Neutral Colors
  slate: '#1E293B',          // Dark slate for headers/footers
  slateLight: '#334155',     // Medium slate
  gray: '#64748B',           // Text gray
  grayLight: '#94A3B8',      // Light text
  border: '#E2E8F0',         // Borders
  background: '#F8FAFC',     // Light backgrounds
  white: '#FFFFFF',
  black: '#0F172A',          // Near black for text

  // Legacy mappings for backward compatibility
  orange: '#F59E0B',
  lightOrange: '#FEF3C7',
  darkGray: '#1E293B',
  lightGray: '#E2E8F0',
  blue: '#0EA5E9'
};

const loadLogo = () => {
  try {
    if (fs.existsSync(LOGO_PATH)) {
      return fs.readFileSync(LOGO_PATH);
    }
    return null;
  } catch (error) {
    console.warn('[Billing PDF] Error loading logo:', error);
    return null;
  }
};

const fetchImage = async (url) => {
  if (!url) return null;
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://google.com',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.warn(`[Billing PDF] Error fetching image (${url}):`, error.message);
    return null;
  }
};

const formatDate = (date) => {
  if (!date) return 'TBA';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function formatCurrency(amount) {
  const symbol = process.env.CURRENCY_SYMBOL;
  const code = process.env.CURRENCY_CODE || 'INR';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  const numeric = parseFloat(amount || 0);

  if (symbol) {
    return `${symbol} ${numeric.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `${code} ${numeric.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const calculateDuration = (start, end) => {
  if (!start || !end) return 'TBA';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Nights ${diffDays + 1} Days`;
};

// Draw Modern Geometric Header
const drawModernHeader = (doc, title) => {
  const headerHeight = 90;

  // Main dark slate header background
  doc.rect(0, 0, 595, headerHeight).fill(PALETTE.slate);

  // Diagonal accent stripe (teal)
  doc.save();
  doc.moveTo(450, 0)
    .lineTo(595, 0)
    .lineTo(595, headerHeight)
    .lineTo(380, headerHeight)
    .closePath()
    .fill(PALETTE.primary);
  doc.restore();

  // Small accent triangle
  doc.save();
  doc.moveTo(360, headerHeight)
    .lineTo(400, headerHeight)
    .lineTo(380, headerHeight - 20)
    .closePath()
    .fill(PALETTE.primaryLight);
  doc.restore();

  // Logo
  const logo = loadLogo();
  if (logo) {
    try {
      doc.image(logo, 40, 18, { height: 55 });
    } catch (e) { console.warn('Logo error:', e.message); }
  }

  // Company name and tagline
  doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(18)
    .text(BRANDING.company.name, 110, 28);
  doc.font('Helvetica').fontSize(9).fillColor(PALETTE.grayLight)
    .text(BRANDING.company.tagline || 'Premium Travel Experiences', 110, 50);

  // Document type badge (right side)
  if (title) {
    doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11)
      .text(title.toUpperCase(), 460, 35, { width: 100, align: 'center' });
  }
};

// Draw Modern Footer
const drawModernFooter = (doc, pageNum, totalPages) => {
  const pageHeight = 842;
  const footerHeight = 50;
  const footerY = pageHeight - footerHeight;

  // Footer background with gradient effect (dark to teal)
  doc.rect(0, footerY, 400, footerHeight).fill(PALETTE.slate);
  doc.rect(400, footerY, 195, footerHeight).fill(PALETTE.primary);

  // Company info in footer
  doc.fillColor(PALETTE.grayLight).font('Helvetica').fontSize(8)
    .text(`${BRANDING.contact.email} | ${BRANDING.contact.phone}`, 30, footerY + 18);
  doc.text(BRANDING.urls.website.replace('https://', '').replace('http://', ''), 30, footerY + 30);

  // Page number on the right (teal section)
  if (pageNum && totalPages) {
    doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(10)
      .text(`${pageNum} / ${totalPages}`, 450, footerY + 20, { width: 80, align: 'center' });
  }
};

// Legacy aliases for backward compatibility
const drawWaveHeader = drawModernHeader;
const drawFooterWave = () => { }; // Deprecated, use drawModernFooter instead

export async function generateQuotationPDF(quotation, lead) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4', bufferPages: true });
      const fileName = `quotation-${quotation.quotationNumber || quotation._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      console.log('🔍 [PDF] Generating PDF for Quotation Type:', quotation.type);
      console.log('🔍 [PDF] Lead Manual Itinerary:', lead?.manualItinerary ? 'Present' : 'Missing');
      console.log('🔍 [PDF] Lead Customized Package:', lead?.customizedPackage ? 'Present' : 'Missing');

      // Extract package data - prioritize based on quotation type
      let mainPackage = null;
      let itineraryDays = [];

      // 1. Check for manual itinerary (PRIORITY if quotation type is 'custom')
      if (quotation.type === 'custom') {
        if (lead?.manualItinerary) {
          itineraryDays = lead.manualItinerary.days || [];
        } else {
          itineraryDays = [];
        }
        // For manual, try to get package info from lead.customizedPackage (priority) or lead.package (base) or quotation.package
        mainPackage = lead.customizedPackage || lead.package || quotation.package || {};
        console.log('[PDF] Using manual itinerary (by type) with', itineraryDays.length, 'days');
        console.log('[PDF] Base package for manual:', mainPackage.name || 'No package');
      }
      // 2. Check for customized package
      else if (lead?.customizedPackage) {
        mainPackage = lead.customizedPackage;
        // Check direct days first, then linked itinerary days
        if (lead.customizedPackage.days && lead.customizedPackage.days.length > 0) {
          itineraryDays = lead.customizedPackage.days;
        } else if (lead.customizedPackage.itinerary && lead.customizedPackage.itinerary.days) {
          itineraryDays = lead.customizedPackage.itinerary.days;
        }
        console.log('[PDF] Using customized package:', mainPackage.name);
        console.log('[PDF] Customized package days:', itineraryDays.length);
      }
      // 3. Check for manual itinerary (Fallback if custom type not set but data exists)
      else if (lead?.manualItinerary) {
        itineraryDays = lead.manualItinerary.days || [];
        // For manual itinerary, try to get package info from lead.customizedPackage or lead.package for images/inclusions
        mainPackage = lead.customizedPackage || lead.package || quotation.package || {};
        console.log('[PDF] Using manual itinerary (fallback) with', itineraryDays.length, 'days');
      }
      // 4. Fallback to regular package
      else {
        mainPackage = lead?.package || quotation.package || {};
        console.log('[PDF] Using regular package:', mainPackage.name);
      }


      let packageName = mainPackage.name || lead?.packageName || 'Custom Tour Package';
      // Append "(Manual Itinerary)" if using manual itinerary with a base package
      if (quotation.type === 'custom' && mainPackage.name) {
        packageName = `${packageName} (Manual Itinerary)`;
      }
      const packageHighlights = mainPackage.highlights || [];

      // Prioritize Quotation-specific inclusions/exclusions (Manual Itinerary support)
      const packageInclusions = (quotation.includedServices && quotation.includedServices.length > 0)
        ? quotation.includedServices
        : (mainPackage.inclusions || []);

      const packageExclusions = (quotation.excludedServices && quotation.excludedServices.length > 0)
        ? quotation.excludedServices
        : (mainPackage.exclusions || []);

      // Collect all available images for use in itinerary
      const availableImages = [];

      // Priority 1: Quotation images (for manual itineraries)
      if (quotation.images && quotation.images.length > 0) {
        // Sort so cover image is first
        const sortedImages = [...quotation.images].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));
        sortedImages.forEach(img => availableImages.push(img.url));
        console.log('[PDF] Using', quotation.images.length, 'images from quotation');
      }
      // Priority 2: Legacy coverImage field
      else if (quotation.coverImage) {
        availableImages.push(quotation.coverImage);
        console.log('[PDF] Using legacy coverImage from quotation');
      }
      // Priority 3: Package images
      else if (mainPackage.images && mainPackage.images.length > 0) {
        mainPackage.images.forEach(img => availableImages.push(img.url));
        console.log('[PDF] Using', mainPackage.images.length, 'images from package');
      }
      // Priority 4: Original package images
      else if (mainPackage.originalPackage && mainPackage.originalPackage.images) {
        mainPackage.originalPackage.images.forEach(img => availableImages.push(img.url));
        console.log('[PDF] Using images from original package');
      }
      // Priority 5: Lead package images
      else if (lead && lead.package && lead.package.images) {
        lead.package.images.forEach(img => availableImages.push(img.url));
        console.log('[PDF] Using images from lead package');
      }

      // Cover image is the first available image
      const coverImageUrl = availableImages[0] || null;

      console.log('[PDF] Cover image URL:', coverImageUrl);
      console.log('[PDF] Total available images:', availableImages.length);
      console.log('[PDF] Package highlights:', packageHighlights.length);
      console.log('[PDF] Package inclusions:', packageInclusions.length);
      console.log('[PDF] Package exclusions:', packageExclusions.length);


      // --- PAGE 1: COVER & TOUR DETAILS ---
      let coverImageBuffer = null;
      if (coverImageUrl) {
        coverImageBuffer = await fetchImage(coverImageUrl);
      }

      // Cover Image with gradient overlay
      if (coverImageBuffer) {
        try {
          doc.image(coverImageBuffer, 0, 0, { width: 595, height: 380, cover: [595, 380] });
        } catch (e) {
          console.warn('[PDF] Cover image error:', e.message);
          // Fallback: gradient background
          doc.rect(0, 0, 595, 380).fill(PALETTE.slate);
        }
      } else {
        // Sleek gradient fallback
        doc.rect(0, 0, 595, 380).fill(PALETTE.slate);
      }

      // Modern gradient overlay (teal to transparent)
      doc.save();
      doc.rect(0, 280, 595, 100).fill(PALETTE.primaryDark);
      doc.fillOpacity(0.9);
      doc.restore();

      // Package name with accent bar
      const nameY = 300;
      doc.rect(40, nameY - 5, 5, 45).fill(PALETTE.accent); // Accent bar
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(24)
        .text(packageName.toUpperCase(), 55, nameY, { width: 500 });

      // Quotation badge
      doc.roundedRect(480, 10, 100, 30, 5).fill(PALETTE.accent);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(10)
        .text('QUOTATION', 485, 18, { width: 90, align: 'center' });

      // Tour Details Card
      let yPos = 410;
      const cardX = 40;
      const cardWidth = 515;
      const cardHeight = 120;

      // Card background with subtle border
      doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 8).fill(PALETTE.white);
      doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 8).stroke(PALETTE.border);

      // Card header bar
      doc.roundedRect(cardX, yPos, cardWidth, 35, 8).fill(PALETTE.primary);
      doc.rect(cardX, yPos + 27, cardWidth, 8).fill(PALETTE.primary); // Cover bottom corners

      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(13)
        .text('TOUR DETAILS', cardX + 20, yPos + 10);

      yPos += 50;

      let startDate = lead?.travelDate;
      let endDate = lead?.endDate;
      let durationDays = 0;

      // Attempt to get duration from package or itinerary if dates are missing
      if (mainPackage?.duration) {
        durationDays = mainPackage.duration;
      } else if (itineraryDays && itineraryDays.length > 0) {
        durationDays = itineraryDays.length;
      }

      // Calculate End Date if missing but Start Date and Duration exist
      if (startDate && !endDate && durationDays > 0) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + (durationDays - 1));
        endDate = end;
      }

      const pax = lead?.numberOfTravelers || lead?.adults || 1;

      // Calculate display string
      let durationStr = 'TBA';
      if (startDate && endDate) {
        durationStr = calculateDuration(startDate, endDate);
      } else if (durationDays > 0) {
        durationStr = `${Math.max(0, durationDays - 1)} Nights ${durationDays} Days`;
      }

      // Details in two columns for modern look
      const col1X = cardX + 20;
      const col2X = cardX + 270;

      // Row 1
      doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9).text('Travel Dates', col1X, yPos);
      doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(11)
        .text(startDate ? `${formatDate(startDate)} - ${endDate ? formatDate(endDate) : 'TBA'}` : 'TBA', col1X, yPos + 12);

      doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9).text('Duration', col2X, yPos);
      doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(11)
        .text(durationStr, col2X, yPos + 12);

      // Row 2
      yPos += 38;
      doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9).text('Travelers', col1X, yPos);
      doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(11)
        .text(`${pax} Person(s)`, col1X, yPos + 12);

      // Total amount preview (if desired)
      if (quotation.totalAmount) {
        doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9).text('Estimated Total', col2X, yPos);
        doc.fillColor(PALETTE.primary).font('Helvetica-Bold').fontSize(14)
          .text(formatCurrency(quotation.totalAmount), col2X, yPos + 10);
      }

      yPos += 60;

      // --- PAGE 2: HIGHLIGHTS & ITINERARY ---
      doc.addPage();

      // Modern page header
      drawModernHeader(doc, 'Itinerary');

      yPos = 110;

      // Package Highlights Section (from database)
      if (packageHighlights && packageHighlights.length > 0) {
        // Section header with accent bar
        doc.rect(40, yPos, 4, 20).fill(PALETTE.accent);
        doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text('PACKAGE HIGHLIGHTS', 50, yPos + 2);
        yPos += 35;

        // Highlights in a subtle card
        doc.roundedRect(40, yPos - 5, 515, Math.min(packageHighlights.length * 20 + 15, 150), 6)
          .fill(PALETTE.accentLight);

        packageHighlights.slice(0, 6).forEach(highlight => {
          doc.fillColor(PALETTE.black).font('Helvetica').fontSize(10)
            .text(`✓  ${highlight}`, 55, yPos, { width: 485 });
          yPos += 18;
        });

        yPos += 25;
      }

      // Itinerary Section
      if (yPos > 650) { doc.addPage(); drawModernHeader(doc, 'Itinerary'); yPos = 110; }

      // Section header with accent bar
      doc.rect(40, yPos, 4, 20).fill(PALETTE.primary);
      doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text('TRAVEL ITINERARY', 50, yPos + 2);
      yPos += 40;

      // Use actual itinerary days from database instead of parsing quotation items
      console.log('[PDF] Rendering itinerary with', itineraryDays.length, 'days');

      if (itineraryDays && itineraryDays.length > 0) {
        // availableImages is already populated from earlier in the code

        // --- ENHANCED ITINERARY DESIGN ---
        // Single column with left timeline design for better readability

        for (let i = 0; i < itineraryDays.length; i++) {
          const day = itineraryDays[i];

          // Check for page break (giving generous space for day block)
          if (yPos > 650) {
            doc.addPage();
            drawModernHeader(doc, 'Itinerary');
            yPos = 110;
            // Re-draw header if new page
            if (i > 0) {
              doc.rect(40, yPos, 4, 20).fill(PALETTE.primary);
              doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text('TRAVEL ITINERARY (Continued)', 50, yPos + 2);
              yPos += 45;
            }
          }

          const dayBlockY = yPos;

          // 1. Day Circle & Line - Modern teal design
          const timelineX = 60;
          doc.circle(timelineX, dayBlockY + 12, 14).fill(PALETTE.primary);
          doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11)
            .text(`${day.dayNumber || i + 1}`, timelineX - 6, dayBlockY + 7, { width: 12, align: 'center' });

          // 2. Day Content Box (Right of timeline)
          const contentX = 90;
          const contentW = 465;

          // Day Title with subtle background
          doc.roundedRect(contentX - 5, dayBlockY - 2, contentW, 22, 3).fill(PALETTE.background);
          doc.fillColor(PALETTE.primaryDark).font('Helvetica-Bold').fontSize(12)
            .text(`Day ${day.dayNumber || i + 1}: ${day.title || 'Day ' + (i + 1)}`, contentX, dayBlockY + 3);

          let contentY = dayBlockY + 25;

          // Optional Image for this Day (if available)
          // Smart distribution: use ALL available images throughout the itinerary
          let dayImageBuffer = null;
          if (availableImages.length > 0) {
            // For manual itineraries with multiple images, we want to show them all
            // Skip the cover image (first one) as it's already on page 1
            const itineraryImages = availableImages.length > 1 ? availableImages.slice(1) : availableImages;

            if (itineraryImages.length > 0) {
              // Calculate how often to show images based on number of days and images
              const totalDays = itineraryDays.length;
              const totalImages = itineraryImages.length;

              // If we have more images than days, show one per day
              // If we have fewer images, distribute them evenly
              let shouldShowImage = false;
              let imageIndex = 0;

              if (totalImages >= totalDays) {
                // More images than days - show one per day, cycling through
                shouldShowImage = true;
                imageIndex = i % totalImages;
              } else {
                // Fewer images than days - distribute evenly
                // Calculate interval: show image every N days
                const interval = Math.max(1, Math.floor(totalDays / totalImages));
                shouldShowImage = (i % interval === 0) && (Math.floor(i / interval) < totalImages);
                imageIndex = Math.floor(i / interval) % totalImages;
              }

              if (shouldShowImage) {
                const imgUrl = itineraryImages[imageIndex];
                try {
                  dayImageBuffer = await fetchImage(imgUrl);
                  console.log(`[PDF] Day ${i + 1}: Using image ${imageIndex + 1}/${totalImages}`);
                } catch (e) {
                  console.warn('Failed to fetch day image', e);
                }
              }
            }
          }

          if (dayImageBuffer) {
            try {
              // Place image
              doc.image(dayImageBuffer, contentX, contentY, { width: 150, height: 100, fit: [150, 100], align: 'center' });
              // Wrap text around it? No, simpler to put text next to it or below. 
              // Let's put text to the right of image if description is short, or below if long.
              // For consistency, let's put image on flow.
              // Actually, a nice layout is Image Left, Text Right

              // Description Text Block (Right of Image)
              const descX = contentX + 160;
              const descW = contentW - 160;
              let descY = contentY;

              if (day.description) {
                doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9)
                  .text(day.description, descX, descY, { width: descW, align: 'justify' });
                // Approximate height calculation
                const h = doc.heightOfString(day.description, { width: descW });
                descY += Math.max(h, 100); // Ensure at least image height
              } else {
                descY += 100;
              }

              contentY = descY + 10;
            } catch (e) {
              // Fallback if image draw fails
              if (day.description) {
                doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9)
                  .text(day.description, contentX, contentY, { width: contentW, align: 'justify' });
                contentY += doc.heightOfString(day.description, { width: contentW }) + 10;
              }
            }
          } else {
            // No image, just text
            if (day.description) {
              doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9)
                .text(day.description, contentX, contentY, { width: contentW, align: 'justify' });
              contentY += doc.heightOfString(day.description, { width: contentW }) + 10;
            }
          }

          // Highlights / Details (Locations, Meals)
          const metaY = contentY;
          let metaText = [];

          if (day.locations && day.locations.length > 0) metaText.push(`Locations: ${day.locations.join(', ')}`);
          if (day.accommodation && day.accommodation.name) metaText.push(`Stay: ${day.accommodation.name}`);

          if (day.meals) {
            const mealsList = [];
            if (day.meals.breakfast) mealsList.push('Breakfast');
            if (day.meals.lunch) mealsList.push('Lunch');
            if (day.meals.dinner) mealsList.push('Dinner');
            if (mealsList.length > 0) metaText.push(`Meals: ${mealsList.join(', ')}`);
          }

          if (metaText.length > 0) {
            doc.fillColor(PALETTE.slateLight).font('Helvetica-Bold').fontSize(9);
            metaText.forEach(txt => {
              doc.text(`- ${txt}`, contentX, contentY);
              contentY += 12;
            });
            contentY += 5;
          }

          // Draw Connecting Line (except for last item) - Modern dashed style
          if (i < itineraryDays.length - 1) {
            const endY = contentY + 10;
            doc.moveTo(timelineX, dayBlockY + 28)
              .lineTo(timelineX, endY)
              .strokeColor(PALETTE.border)
              .lineWidth(2)
              .stroke();
          }

          yPos = contentY + 20; // Bottom spacing
        } // end loop

      } else {
        // Fallback: No itinerary days, show message
        doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(10)
          .text('Detailed itinerary will be provided upon confirmation.', 50, yPos);
        yPos += 30;
      }

      // Safety gap
      yPos += 10;

      // --- INCLUSIONS & EXCLUSIONS ---
      yPos += 15;
      if (yPos > 550) { doc.addPage(); drawModernHeader(doc, 'Details'); yPos = 110; }

      const inclusions = (packageInclusions && packageInclusions.length > 0)
        ? packageInclusions
        : (quotation.includedServices || []);

      const exclusions = (packageExclusions && packageExclusions.length > 0)
        ? packageExclusions
        : (quotation.excludedServices || []);

      // Calculate card heights
      const incHeight = Math.max(inclusions.length * 16 + 50, 120);
      const excHeight = Math.max(exclusions.length * 16 + 50, 120);
      const incExcCardHeight = Math.max(incHeight, excHeight);

      // Two-column card layout
      const incExcColWidth = 250;
      const incColX = 40;
      const excColX = 305;

      // INCLUSIONS Card
      doc.roundedRect(incColX, yPos, incExcColWidth, incExcCardHeight, 8).fill(PALETTE.white);
      doc.roundedRect(incColX, yPos, incExcColWidth, incExcCardHeight, 8).stroke(PALETTE.border);

      // Card header
      doc.roundedRect(incColX, yPos, incExcColWidth, 32, 8).fill(PALETTE.primary);
      doc.rect(incColX, yPos + 24, incExcColWidth, 8).fill(PALETTE.primary);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11)
        .text('✓  INCLUSIONS', incColX + 15, yPos + 10);

      let iy = yPos + 45;
      doc.font('Helvetica').fontSize(9).fillColor(PALETTE.black);
      if (inclusions.length === 0) {
        doc.text('• As per package details', incColX + 15, iy);
      } else {
        inclusions.forEach(inc => {
          doc.text(`• ${inc}`, incColX + 15, iy, { width: incExcColWidth - 30 });
          iy += doc.heightOfString(`• ${inc}`, { width: incExcColWidth - 30 }) + 3;
        });
      }

      // EXCLUSIONS Card
      doc.roundedRect(excColX, yPos, incExcColWidth, incExcCardHeight, 8).fill(PALETTE.white);
      doc.roundedRect(excColX, yPos, incExcColWidth, incExcCardHeight, 8).stroke(PALETTE.border);

      // Card header (gray for exclusions)
      doc.roundedRect(excColX, yPos, incExcColWidth, 32, 8).fill(PALETTE.slateLight);
      doc.rect(excColX, yPos + 24, incExcColWidth, 8).fill(PALETTE.slateLight);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11)
        .text('✗  EXCLUSIONS', excColX + 15, yPos + 10);

      let ey = yPos + 45;
      doc.font('Helvetica').fontSize(9).fillColor(PALETTE.black);
      if (exclusions.length === 0) {
        doc.text('• As per package details', excColX + 15, ey);
      } else {
        exclusions.forEach(exc => {
          doc.text(`• ${exc}`, excColX + 15, ey, { width: incExcColWidth - 30 });
          ey += doc.heightOfString(`• ${exc}`, { width: incExcColWidth - 30 }) + 3;
        });
      }

      yPos += incExcCardHeight + 25;

      /* 
      // --- PAGE 3+: REVIEWS (Dynamic Google Style Cards) - COMMENTED OUT AS PER USER REQUEST ---
      // Replaced by the new Google Reviews section at the end of the document
      
      doc.addPage();
      if (logo) {
        try {
          doc.image(logo, 50, 40, { width: 80 });
        } catch (e) { console.warn('Logo error:', e.message); }
      }

      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('REVIEWS', 50, 90);

      // Fetch Google Logo
      const googleLogoUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/120px-Google_%22G%22_logo.svg.png';
      let googleLogoBuffer = null;
      try {
        googleLogoBuffer = await fetchImage(googleLogoUrl);
      } catch (e) {
        console.warn('Failed to load Google Logo', e);
      }

      // Google Summary Header (Matches User Image)
      const summaryY = 120;
      if (googleLogoBuffer) {
        try {
          doc.image(googleLogoBuffer, 50, summaryY, { width: 20 });
        } catch (e) { }
      } else {
        doc.fillColor('#4285F4').font('Helvetica-Bold').fontSize(20).text('G', 50, summaryY);
      }

      doc.fillColor(PALETTE.black).fontSize(14).font('Helvetica-Bold').text(BRANDING.company.name, 80, summaryY + 5);
      doc.fillColor(PALETTE.orange).fontSize(12).text('5.0 ★★★★★', 80, summaryY + 22);
      doc.fillColor(PALETTE.gray).fontSize(10).font('Helvetica').text('Based on 2,000+ reviews powered by Google', 80, summaryY + 40);

      yPos = summaryY + 70;

      // Determine Destination for Review Matching
      const dest = (lead?.destination || quotation.package?.destination || quotation.package?.name || '').toLowerCase();
      let selectedReviews = DESTINATION_REVIEWS['Generic'];
      if (dest.includes('maldives')) selectedReviews = DESTINATION_REVIEWS['Maldives'];
      else if (dest.includes('dubai') || dest.includes('uae')) selectedReviews = DESTINATION_REVIEWS['Dubai'];
      else if (dest.includes('europe') || dest.includes('swiss') || selectedReviews.includes('paris')) selectedReviews = DESTINATION_REVIEWS['Europe'];

      // Render Reviews as Grid or Cards
      // We will stack them vertically to be safe on PDF
      for (const [idx, review] of selectedReviews.slice(0, 3).entries()) {
        if (yPos > 700) { doc.addPage(); yPos = 50; }

        // Google Review Card Style
        const cardH = 100;

        // Shadow (Gray Box Behind)
        doc.roundedRect(53, yPos + 3, 495, cardH, 5).fill('#f1f3f4');
        // Main Box (White)
        doc.roundedRect(50, yPos, 495, cardH, 5).fill(PALETTE.white).stroke('#e0e0e0');

        // Header: Icon + Name + Date + G Logo
        const avatarColor = ['#ef5350', '#7e57c2', '#26a69a', '#ffa726'][idx % 4];
        doc.circle(70, yPos + 25, 12).fill(avatarColor);
        doc.fillColor(PALETTE.white).fontSize(11).font('Helvetica-Bold').text(review.name.charAt(0), 66, yPos + 21);

        doc.fillColor(PALETTE.black).fontSize(10).font('Helvetica-Bold').text(review.name, 95, yPos + 15);
        doc.fillColor(PALETTE.gray).fontSize(9).font('Helvetica').text(review.time, 95, yPos + 28);

        // G Logo (Top Right)
        if (googleLogoBuffer) {
          try {
            doc.image(googleLogoBuffer, 510, yPos + 15, { width: 14 });
          } catch (e) { }
        }

        // Stars
        doc.fillColor(PALETTE.orange).fontSize(12).text('★★★★★', 95, yPos + 42);

        // Text
        doc.fillColor(PALETTE.darkGray).fontSize(9).font('Helvetica')
          .text(review.text, 65, yPos + 60, { width: 465, height: 35, ellipsis: true });

        yPos += cardH + 20;
      }
      */

      // --- PRICING & PAYMENT ---
      // Force new page if close to bottom
      if (yPos > 450) {
        doc.addPage();
        drawModernHeader(doc, 'Payment');
        yPos = 110;
      } else {
        yPos += 30;
      }

      // Section header
      doc.rect(40, yPos, 4, 20).fill(PALETTE.accent);
      doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text('PAYMENT & PRICING', 50, yPos + 2);
      yPos += 40;

      // Total Amount Card (prominent display)
      const totalCardY = yPos;
      doc.roundedRect(40, totalCardY, 515, 70, 10).fill(PALETTE.primaryDark);
      doc.fillColor(PALETTE.grayLight).font('Helvetica').fontSize(11).text('TOTAL PACKAGE COST', 60, totalCardY + 15);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(28).text(formatCurrency(quotation.totalAmount), 60, totalCardY + 32);

      // Valid until badge
      if (quotation.validUntil) {
        doc.roundedRect(400, totalCardY + 15, 140, 40, 6).fill(PALETTE.accent);
        doc.fillColor(PALETTE.white).font('Helvetica').fontSize(9).text('Valid Until', 420, totalCardY + 22);
        doc.font('Helvetica-Bold').fontSize(12).text(formatDate(quotation.validUntil), 420, totalCardY + 35);
      }

      yPos = totalCardY + 90;

      // Payment Details Card
      const payBoxH = 190;
      if (yPos + payBoxH + 50 > 750) {
        doc.addPage();
        drawModernHeader(doc, 'Payment');
        yPos = 110;
      }

      const payBoxY = yPos;

      // Payment card with two sections
      doc.roundedRect(40, payBoxY, 515, payBoxH, 10).fill(PALETTE.white);
      doc.roundedRect(40, payBoxY, 515, payBoxH, 10).stroke(PALETTE.border);

      // Left side - Bank Details
      doc.roundedRect(40, payBoxY, 280, 35, 10).fill(PALETTE.primary);
      doc.rect(40, payBoxY + 25, 280, 10).fill(PALETTE.primary);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11).text('BANK TRANSFER', 60, payBoxY + 11);

      let by = payBoxY + 50;
      const pd = getPaymentDetails();
      const bankInfo = [
        ['Bank:', pd.bankName],
        ['Account Name:', pd.accountName],
        ['Account No:', pd.accountNumber],
        ['IFSC Code:', pd.ifscCode],
        ['Branch:', pd.branch]
      ];
      bankInfo.forEach(([l, v]) => {
        doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9).text(l, 55, by);
        doc.fillColor(PALETTE.black).font('Helvetica-Bold').text(v, 145, by);
        by += 18;
      });

      // Right side - QR Code
      const qrX = 340;
      doc.roundedRect(320, payBoxY, 235, 35, 10).fill(PALETTE.slateLight);
      doc.rect(320, payBoxY + 25, 235, 10).fill(PALETTE.slateLight);
      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(11).text('SCAN TO PAY (UPI)', qrX, payBoxY + 11);

      // Add actual QR code image
      try {
        const qrCodePath = path.join(dirname, '../assets/payment-qr.jpeg');
        if (fs.existsSync(qrCodePath)) {
          doc.image(qrCodePath, qrX + 30, payBoxY + 50, { width: 90, height: 90 });
        } else {
          doc.roundedRect(qrX + 30, payBoxY + 50, 90, 90, 8).stroke(PALETTE.border);
          doc.fillColor(PALETTE.gray).fontSize(9).text('QR Code', qrX + 55, payBoxY + 90);
        }
      } catch (error) {
        console.warn('[PDF] QR code image error:', error.message);
        doc.roundedRect(qrX + 30, payBoxY + 50, 90, 90, 8).stroke(PALETTE.border);
      }

      doc.fillColor(PALETTE.gray).fontSize(8).text(`UPI: ${pd.upiId}`, qrX + 20, payBoxY + 150);
      doc.text(`Mobile: ${pd.phone}`, qrX + 20, payBoxY + 162);

      yPos = payBoxY + payBoxH + 20;

      // Logos
      // Payment Method Badges - Using text badges instead of images to avoid 404 errors
      const logoY = yPos;

      // Create text-based payment badges
      // Create logo list with reliable URLs and color fallback
      const paymentLogos = [
        {
          name: 'Razorpay',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Razorpay_logo.svg/1200px-Razorpay_logo.svg.png',
          width: 70,
          fallbackColor: '#3395FF'
        },
        {
          name: 'Mastercard',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/MasterCard_Logo.svg/1200px-MasterCard_Logo.svg.png',
          width: 40,
          fallbackColor: '#EB001B'
        },
        {
          name: 'Visa',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/1200px-Visa_Inc._logo.svg.png',
          width: 50,
          fallbackColor: '#1a1f71'
        },
        {
          name: 'Paytm',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/1200px-Paytm_Logo_%28standalone%29.svg.png',
          width: 50,
          fallbackColor: '#00BAF2'
        },
        {
          name: 'GPay',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Google_Pay_Logo_%282020%29.svg/1200px-Google_Pay_Logo_%282020%29.svg.png',
          width: 50,
          fallbackColor: '#4285F4'
        },
        {
          name: 'PhonePe',
          url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/PhonePe_Logo.svg/1200px-PhonePe_Logo.svg.png',
          width: 70,
          fallbackColor: '#5F259F'
        }
      ];

      let lx = 50;
      // Using a for...of loop to handle async/await correctly
      for (const logo of paymentLogos) {
        let loaded = false;
        try {
          if (logo.url) {
            const imgBuffer = await fetchImage(logo.url);
            if (imgBuffer) {
              // Draw Image
              // Calculate aspects to center vertically in a 28px height box
              const aspect = 28 / 28; // height constrained
              // PDFKit scales by width automatically if height not provided, but we want to fit
              doc.image(imgBuffer, lx, logoY, { width: logo.width, height: 28, fit: [logo.width, 28], align: 'center', valign: 'center' });
              loaded = true;
            }
          }
        } catch (e) {
          console.warn(`[Billing PDF] Failed to load logo for ${logo.name}, using fallback.`);
        }

        if (!loaded) {
          // Fallback: Text Badge
          doc.roundedRect(lx, logoY, logo.width, 28, 4).fillAndStroke(logo.fallbackColor, logo.fallbackColor);
          doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
            .text(logo.name, lx, logoY + 9, { width: logo.width, align: 'center' });
        }

        lx += logo.width + 15;
      }
      yPos += 45;

      // --- LAST PAGE: TERMS, CANCELLATION, CONTACT ---
      doc.addPage();
      drawModernHeader(doc, 'Terms & Info');
      yPos = 110;

      // Terms - Parse and render with bold subtopics
      doc.fillColor(PALETTE.primaryDark).font('Helvetica-Bold').fontSize(14).text('TERMS & CONDITIONS', 50, yPos);
      yPos += 25;

      // Split terms into lines and render with formatting
      const termsLines = getTermsText().split('\n');
      for (const line of termsLines) {
        // Check if we need a new page (leave room for footer)
        if (yPos > 720) {
          doc.addPage();
          yPos = 50;
        }

        const trimmedLine = line.trim();
        if (!trimmedLine) {
          yPos += 8; // Empty line spacing
          continue;
        }

        // Check if line is a subtopic (ends with colon or is all caps)
        const isSubtopic = trimmedLine.endsWith(':') ||
          (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.startsWith('•'));

        if (isSubtopic) {
          doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(10);
          doc.text(trimmedLine, 50, yPos, { width: 495, align: 'left' });
          yPos += doc.heightOfString(trimmedLine, { width: 495 }) + 5;
        } else {
          doc.fillColor(PALETTE.darkGray).font('Helvetica').fontSize(9);
          const textHeight = doc.heightOfString(trimmedLine, { width: 495, lineGap: 2 });

          // Check if text will fit on current page
          if (yPos + textHeight > 720) {
            doc.addPage();
            yPos = 50;
          }

          doc.text(trimmedLine, 50, yPos, { width: 495, align: 'justify', lineGap: 2 });
          yPos += textHeight + 4;
        }
      }

      yPos += 25;

      // Cancellation Policy - Parse and render with bold subtopics
      if (yPos > 720) { doc.addPage(); yPos = 50; }

      doc.fillColor(PALETTE.primaryDark).font('Helvetica-Bold').fontSize(14).text('CANCELLATION POLICY', 50, yPos);
      yPos += 25;

      const cancellationLines = getCancellationPolicy().split('\n');
      for (const line of cancellationLines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) {
          yPos += 8;
          continue;
        }

        const isSubtopic = trimmedLine.endsWith(':') ||
          (trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 5 && !trimmedLine.startsWith('•'));

        if (isSubtopic) {
          if (yPos > 720) {
            doc.addPage();
            yPos = 50;
          }
          doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(10);
          doc.text(trimmedLine, 50, yPos, { width: 495, align: 'left' });
          yPos += doc.heightOfString(trimmedLine, { width: 495 }) + 5;
        } else {
          doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9);
          const textHeight = doc.heightOfString(trimmedLine, { width: 495, lineGap: 2 });

          // Check if text will fit on current page
          if (yPos + textHeight > 720) {
            doc.addPage();
            yPos = 50;
          }

          doc.text(trimmedLine, 50, yPos, { width: 495, align: 'justify', lineGap: 2 });
          yPos += textHeight + 4;
        }
      }

      // Add footer wave to all pages EXCEPT the last ones (reviews and contact)
      const pagesBeforeReviews = doc.bufferedPageRange();
      for (let i = 0; i < pagesBeforeReviews.count; i++) {
        doc.switchToPage(i);
        drawFooterWave(doc);
      }

      // Helper to draw a star
      const drawStar = (doc, x, y, size) => {
        doc.save();
        doc.translate(x, y);
        doc.scale(size);
        doc.path('M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z');
        doc.fill('#FBBF24');
        doc.restore();
      };

      // --- GOOGLE REVIEWS SECTION ---
      doc.addPage();
      yPos = 50;
      const margin = 50;
      const contentWidth = 495;

      // Reviews Header - Mimic Google Style
      doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(22).text('Google Reviews', margin, yPos);

      // "Excellent" Badge
      yPos += 30;
      doc.roundedRect(margin, yPos, 90, 26, 13).fill('#FFF7ED'); // Light orange pill
      doc.fillColor('#F97316').fontSize(14).text('Excellent', margin, yPos + 7, { width: 90, align: 'center' });

      // Star Rating Summary
      // Draw 5 stars
      let sx = margin + 105;
      const sy = yPos + 5;
      for (let i = 0; i < 5; i++) {
        drawStar(doc, sx + (i * 18), sy, 0.7); // 0.7 scale ~16px
      }

      doc.fillColor('#6B7280').fontSize(11).font('Helvetica').text('4.9/5 Based on 250+ reviews', margin + 200, yPos + 8);

      yPos += 50;

      // --- SECTION 1: COMPANY REVIEWS ---
      doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text(BRANDING.company.name, margin, yPos);
      doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text(`Travel Agency in ${BRANDING.address.city || 'Your City'}`, margin + 100, yPos + 2);
      yPos += 25;

      const companyReviews = [
        { initial: 'P', color: '#EF4444', name: 'Priya Sharma', date: '2 weeks ago', text: `Excellent service! ${BRANDING.company.name} made our honeymoon absolutely perfect. The team was responsive, professional, and handled every detail with care. Highly recommend!` },
        { initial: 'R', color: '#3B82F6', name: 'Rajesh Kumar', date: '1 month ago', text: 'Best travel agency! They customized our trip exactly as we wanted. The itinerary was perfect and the support throughout was exceptional. Will definitely book again!' },
        { initial: 'A', color: '#10B981', name: 'Anita Desai', date: '3 weeks ago', text: 'Amazing experience from start to finish. The itinerary was well-planned, hotels were fantastic, and the support team was available 24/7. Exceeded all expectations!' }
      ];

      companyReviews.forEach((review) => {
        // Check page break
        if (yPos > 700) { doc.addPage(); yPos = 50; }

        // Avatar Circle
        doc.circle(margin + 20, yPos + 20, 20).fill(review.color);
        doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(review.initial, margin + 14, yPos + 14);

        // Name & Date
        doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(review.name, margin + 50, yPos + 5);
        doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text(review.date, margin + 50, yPos + 18);

        // Google Logo & Stars
        // Simple Google Logo Text (G Blue, o Red, o Yellow, g Blue, l Green, e Red)
        let gX = 500;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.fillColor('#4285F4').text('G', gX, yPos + 5);
        doc.fillColor('#EA4335').text('o', gX + 8, yPos + 5);
        doc.fillColor('#FBBC05').text('o', gX + 14, yPos + 5);
        doc.fillColor('#4285F4').text('g', gX + 20, yPos + 5);
        doc.fillColor('#34A853').text('l', gX + 26, yPos + 5);
        doc.fillColor('#EA4335').text('e', gX + 29, yPos + 5);

        // Stars below name using vector path
        let rsx = margin + 50;
        let rsy = yPos + 30;
        for (let i = 0; i < 5; i++) {
          drawStar(doc, rsx + (i * 12), rsy, 0.45); // Smaller stars
        }

        // Review Text
        doc.fillColor('#374151').fontSize(10).font('Helvetica')
          .text(review.text, margin + 50, yPos + 45, { width: 445, align: 'left', lineGap: 2 });

        // Divider
        yPos += 90;
        if (review.text.length > 150) yPos += 20; // Adjust for long text
        doc.moveTo(margin, yPos).lineTo(margin + contentWidth, yPos).strokeColor('#F3F4F6').stroke();
        yPos += 15;
      });

      // --- SECTION 2: PACKAGE SPECIFIC REVIEWS ---
      if (mainPackage && mainPackage.name) {
        if (yPos > 650) { doc.addPage(); yPos = 50; }

        yPos += 10;
        doc.fillColor(PALETTE.slate).font('Helvetica-Bold').fontSize(14).text(`${mainPackage.name} Reviews`, margin, yPos);
        yPos += 25;

        // Package Summary Card
        doc.roundedRect(margin, yPos, contentWidth, 50, 8).fill('#F3F4F6');
        doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text('4.8', margin + 20, yPos + 15);

        // Stars for package summary
        let psx = margin + 60;
        let psy = yPos + 10;
        for (let i = 0; i < 5; i++) {
          drawStar(doc, psx + (i * 15), psy, 0.6);
        }

        doc.fillColor('#6B7280').fontSize(10).font('Helvetica').text('Based on 45 verified reviews', margin + 60, yPos + 28);
        yPos += 70;

        const packageReviews = [
          { initial: 'A', color: '#F97316', name: 'Arjun Kapoor', date: '1 week ago', text: 'This package exceeded all our expectations! Every detail was perfectly planned and executed. The hotels were luxurious, activities were thrilling, and the entire experience was unforgettable. Highly recommend!' },
          { initial: 'M', color: '#EC4899', name: 'Meera Nair', date: '2 weeks ago', text: 'Wonderful experience! The hotels were amazing, locations were breathtaking, and the itinerary was well-balanced between relaxation and adventure. Great value for money. Will book again!' }
        ];

        packageReviews.forEach((review) => {
          if (yPos > 700) { doc.addPage(); yPos = 50; }

          // Avatar
          doc.circle(margin + 20, yPos + 20, 20).fill(review.color);
          doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text(review.initial, margin + 14, yPos + 14);

          // Name & Date
          doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text(review.name, margin + 50, yPos + 5);
          doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica').text(review.date, margin + 50, yPos + 18);

          // Google Logo & Stars
          let gX = 500;
          doc.font('Helvetica-Bold').fontSize(10);
          doc.fillColor('#4285F4').text('G', gX, yPos + 5);
          doc.fillColor('#EA4335').text('o', gX + 8, yPos + 5);
          doc.fillColor('#FBBC05').text('o', gX + 14, yPos + 5);
          doc.fillColor('#4285F4').text('g', gX + 20, yPos + 5);
          doc.fillColor('#34A853').text('l', gX + 26, yPos + 5);
          doc.fillColor('#EA4335').text('e', gX + 29, yPos + 5);

          // Stars using path
          let rsx = margin + 50;
          let rsy = yPos + 30;
          for (let i = 0; i < 5; i++) {
            drawStar(doc, rsx + (i * 12), rsy, 0.45);
          }

          // Text
          doc.fillColor('#374151').fontSize(10).font('Helvetica')
            .text(review.text, margin + 50, yPos + 45, { width: 445, align: 'left', lineGap: 2 });

          yPos += 90;
          if (review.text.length > 150) yPos += 20;
          doc.moveTo(margin, yPos).lineTo(margin + contentWidth, yPos).strokeColor('#F3F4F6').stroke();
          yPos += 15;
        });
      }

      // Google Footer Badge - ensure it's at the end of reviews but before Contact Us
      if (yPos > 720) { doc.addPage(); yPos = 50; }
      yPos += 10;
      doc.font('Helvetica').fontSize(9).fillColor('#6B7280')
        .text('Reviews verified by Google', margin, yPos, { align: 'center', width: contentWidth });

      doc.addPage();
      yPos = 300; // Start lower on the page for centered appearance

      // Contact Us content
      doc.fillColor(PALETTE.primaryDark).font('Helvetica-Bold').fontSize(20).text('CONTACT US', 0, yPos, { align: 'center' });
      yPos += 35;
      doc.fillColor(PALETTE.slateLight).font('Helvetica').fontSize(11)
        .text('Our team is always there to serve you and suggest you what can suit your travel', 0, yPos, { align: 'center' });
      yPos += 18;
      doc.text('needs the best. In case of any doubt regarding the shared trip or any other', 0, yPos, { align: 'center' });
      yPos += 18;
      doc.text('services offered by us, you can contact our team at:', 0, yPos, { align: 'center' });
      yPos += 35;
      doc.fillColor(PALETTE.accent).font('Helvetica-Bold').fontSize(16)
        .text(BRANDING.contact.phone, 0, yPos, { align: 'center' });
      yPos += 30;
      doc.fillColor(PALETTE.slateLight).fontSize(12).font('Helvetica')
        .text(`${BRANDING.contact.email}  |  ${BRANDING.urls.website.replace('https://', '').replace('http://', '').toUpperCase()}`, 0, yPos, { align: 'center' });

      // Add Contact Us page footer (black bar at bottom)
      const contactPageIndex = doc.bufferedPageRange().count - 1;
      doc.switchToPage(contactPageIndex);
      doc.rect(0, 750, 595, 92).fill(PALETTE.slate);

      // Update all page numbers now that we know the total (ONLY ONCE)
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        doc.fillColor(PALETTE.white).fontSize(10).text(`Page ${i + 1} of ${totalPages}`, 0, 822, { align: 'center', width: 595 });
      }

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (e) => reject(e));
    } catch (err) { reject(err); }
  });
}

// Number to words converter (Indian Numbering System Support)
const numberToWords = (n) => {
  if (n < 0) return false;

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const double = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToString = n.toString();

  if (n === 0) return 'Zero';

  let words = [];

  // Function to convert 2 digit numbers
  const convertTwoDigits = (num) => {
    if (num < 10) return single[num];
    if (num < 20) return double[num - 10];
    const ten = Math.floor(num / 10);
    const rem = num % 10;
    return tens[ten] + (rem ? ' ' + single[rem] : '');
  };

  // Split integer and decimal
  const parts = n.toString().split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parts[1] ? parseInt(parts[1].substring(0, 2), 10) : 0;

  if (integerPart === 0) words.push('Zero');
  else {
    // Indian Numbering System: Crore, Lakh, Thousand, Hundred
    const crore = Math.floor(integerPart / 10000000);
    integerPart %= 10000000;

    const lakh = Math.floor(integerPart / 100000);
    integerPart %= 100000;

    const thousand = Math.floor(integerPart / 1000);
    integerPart %= 1000;

    const hundred = Math.floor(integerPart / 100);
    integerPart %= 100;

    if (crore > 0) {
      words.push(convertTwoDigits(crore) + ' Crore');
    }
    if (lakh > 0) {
      words.push(convertTwoDigits(lakh) + ' Lakh');
    }
    if (thousand > 0) {
      words.push(convertTwoDigits(thousand) + ' Thousand');
    }
    if (hundred > 0) {
      words.push(convertTwoDigits(hundred) + ' Hundred');
    }
    if (integerPart > 0) {
      words.push(convertTwoDigits(integerPart));
    }
  }

  let result = words.join(' ');
  // Add decimal part
  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  } else {
    result += ' Only';
  }
  return result;
};

/**
 * Generate Professional Invoice PDF (Fixed Visibility & Enhanced UI)
 */
export function generateInvoicePDF(invoice, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });

      // Setup Stream
      const fileName = `invoice-${invoice.invoiceNumber || invoice._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');

      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- COLORS (Modern Teal/Slate Theme) ---
      const colors = {
        primary: PALETTE.primary,        // Deep Teal
        primaryDark: PALETTE.primaryDark, // Dark Teal Header
        primaryLight: PALETTE.primaryLight, // Light Teal accents
        accent: PALETTE.accent,          // Amber Gold
        slate: PALETTE.slate,            // Dark Slate
        gray: PALETTE.gray,              // Text Gray
        bgLight: '#F3F4F6',              // Light gray background
        white: PALETTE.white,
        black: PALETTE.black,
        border: PALETTE.border
      };

      // --- HEADER DESIGN (Unique Split Layout) ---
      const headerHeight = 180;
      const rightPanelX = 360;

      // Right Panel Background
      doc.rect(rightPanelX, 0, 595 - rightPanelX, headerHeight).fill(colors.primaryDark);

      // 1. Logo (Top Left)
      const logoBuffer = loadLogo();
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 40, { height: 50 });
      } else {
        doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.primary).text(BRANDING.company.name.toUpperCase(), 40, 40);
      }

      // 2. Bill From (Left, below Logo)
      let y = 110;
      doc.fillColor(colors.gray).fontSize(8).font('Helvetica-Bold').text('BILLED BY', 40, y);
      y += 12;
      doc.fillColor(colors.black).fontSize(12).font('Helvetica-Bold').text(BRANDING.company.legalName || BRANDING.company.name, 40, y);
      y += 18;
      doc.fillColor(colors.gray).fontSize(9).font('Helvetica')
        .text(BRANDING.address.full || `${BRANDING.address.street || ''}, ${BRANDING.address.city || ''}`, 40, y, { width: 300 })
        .text(`Phone: ${BRANDING.contact.phone}`, 40, y + 24)
        .text(`Email: ${BRANDING.contact.email}`, 40, y + 36);
      if (BRANDING.legal.gstNumber) {
        doc.text(`GST No: ${BRANDING.legal.gstNumber}`, 40, y + 48);
      }

      // 3. Invoice Title & Details (Right Panel, Dark Background)
      const title = invoice.type === 'proforma' ? 'PROFORMA' : 'INVOICE';
      const rightPanelW = 595 - rightPanelX;

      // Title Centered
      doc.fillColor(colors.white).fontSize(28).font('Helvetica-Bold')
        .text(title, rightPanelX, 35, { width: rightPanelW, align: 'center' });

      // Accent line Centered
      const lineWidth = 40;
      doc.rect(rightPanelX + (rightPanelW - lineWidth) / 2, 68, lineWidth, 3).fill(colors.accent);

      let dy = 75;

      const drawHeaderDetail = (label, value) => {
        doc.fillColor(colors.primaryLight).fontSize(8).font('Helvetica')
          .text(label, rightPanelX, dy, { width: rightPanelW, align: 'center' });
        doc.fillColor(colors.white).fontSize(11).font('Helvetica-Bold')
          .text(value, rightPanelX, dy + 12, { width: rightPanelW, align: 'center' });
        dy += 35;
      };

      drawHeaderDetail('INVOICE NO', invoice.invoiceNumber || 'PROFORMA');
      drawHeaderDetail('DATE', invoice.issueDate ? formatDate(invoice.issueDate) : formatDate(new Date()));
      drawHeaderDetail('DUE DATE', invoice.dueDate ? formatDate(invoice.dueDate) : '-');

      // --- BILL TO SECTION (Distinct Card) ---
      y = 210;

      // Card Background
      doc.rect(40, y, 515, 85).fill(colors.white).stroke(colors.border);
      // Left colored accent border
      doc.rect(40, y, 4, 85).fill(colors.accent);

      const customerName = invoice.customer?.name || lead?.name || 'Guest';

      // "Bill To" Label
      doc.fillColor(colors.primary).fontSize(9).font('Helvetica-Bold').text('BILL TO', 60, y + 15);

      // Customer Name
      doc.fillColor(colors.black).fontSize(14).font('Helvetica-Bold').text(customerName, 60, y + 32);

      // Customer Address
      doc.fillColor(colors.gray).fontSize(10).font('Helvetica')
        .text(invoice.customer?.address || lead?.city || 'Address Not Provided', 60, y + 50, { width: 220 });

      // Contact Info (Right side of card)
      doc.fillColor(colors.gray).fontSize(9).font('Helvetica-Bold').text('CONTACT INFO', 320, y + 15);
      doc.fillColor(colors.black).fontSize(10).font('Helvetica')
        .text(invoice.customer?.phone || lead?.phone || '-', 320, y + 32)
        .text(invoice.customer?.email || lead?.email || '-', 320, y + 46);

      // Place of Supply
      if (invoice.placeOfSupply || lead?.destination) {
        doc.fillColor(colors.gray).fontSize(9).font('Helvetica-Bold').text('PLACE OF SUPPLY', 420, y + 15);
        doc.fillColor(colors.black).fontSize(10).font('Helvetica')
          .text(invoice.placeOfSupply || lead?.destination, 420, y + 32);
      }

      y += 110;

      // --- ITEMS TABLE ---
      // Header Row (Teal Background)
      const tableHeaders = [
        { label: 'S.No', w: 40, align: 'center' },
        { label: 'Service Description', w: 325, align: 'left' },
        { label: `Amount (${process.env.CURRENCY_CODE || 'INR'})`, w: 150, align: 'right' }
      ];

      doc.rect(40, y, 515, 30).fill(colors.primaryDark);

      let tx = 40;
      tableHeaders.forEach(h => {
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10)
          .text(h.label, tx + 5, y + 10, { width: h.w - 10, align: h.align });
        tx += h.w;
      });

      y += 30;

      // Prepare Description Logic (Reused from existing)
      const paxCount = (lead?.adults || 0) + (lead?.children || 0);
      const paxStr = paxCount > 0 ? `(${lead.adults} Adults${lead.children ? `, ${lead.children} Children` : ''})` : '';
      const packageItem = invoice.items?.find(i => i.category === 'package') || invoice.items?.[0];

      let packageName = 'Travel Services';
      let packageTypeLabel = '';

      if (lead?.package?.name) {
        packageName = lead.package.name;
        if (lead.customizedPackage || invoice.type === 'customized' || lead.manualItinerary) {
          packageTypeLabel = '(Customized Package)';
        } else {
          packageTypeLabel = '(Standard Package)';
        }
      } else if (invoice.package?.name) {
        packageName = invoice.package.name;
        packageTypeLabel = '(Standard Package)';
      } else if (lead?.customizedPackage?.name) {
        if (!lead.customizedPackage.name.trim().startsWith('Day')) {
          packageName = lead.customizedPackage.name;
        }
        packageTypeLabel = '(Customized Package)';
      }

      if (packageItem?.description && packageItem.description !== 'Package Total') {
        const desc = packageItem.description.trim();
        if (desc.length < 60 && !desc.startsWith('Day') && !desc.toLowerCase().startsWith('day 1')) {
          packageName = desc;
        }
      }

      const fullDescription = `${packageName} ${packageTypeLabel}\nDestination: ${lead?.destination || 'N/A'} ${paxStr}`;
      const amountStr = formatCurrency(invoice.totalAmount);

      // content height
      const descH = doc.heightOfString(fullDescription, { width: 305 }) + 20;
      const rowH = Math.max(descH, 40);

      // Item Row
      // Background (White) - add bottom border
      doc.rect(40, y, 515, rowH).fill(colors.white).stroke(colors.border);

      // S.No
      doc.fillColor(colors.black).font('Helvetica').fontSize(10)
        .text('1', 40, y + 12, { width: 40, align: 'center' });

      // Description
      doc.fillColor(colors.black).font('Helvetica').fontSize(10)
        .text(fullDescription, 85, y + 12, { width: 305, align: 'left' });

      // Amount
      doc.fillColor(colors.black).font('Helvetica-Bold').fontSize(10)
        .text(amountStr, 410, y + 12, { width: 140, align: 'right' });

      y += rowH + 20;


      // --- TOTALS SECTION ---
      // Right Aligned Box
      const totalBoxW = 250;
      const totalBoxX = 555 - totalBoxW;

      const drawTotalRow = (label, value, isTotal = false) => {
        // Label
        doc.fillColor(colors.gray).font('Helvetica').fontSize(10)
          .text(label, totalBoxX, y, { width: 100, align: 'right' });

        // Value
        doc.fillColor(isTotal ? colors.primaryDark : colors.black)
          .font(isTotal ? 'Helvetica-Bold' : 'Helvetica-Bold')
          .fontSize(isTotal ? 14 : 10)
          .text(value, totalBoxX + 110, y - (isTotal ? 2 : 0), { width: 130, align: 'right' });

        y += isTotal ? 25 : 20;
      };

      drawTotalRow('Sub Total', amountStr);
      // Tax styling if needed... 
      // Divider line
      doc.moveTo(totalBoxX, y).lineTo(555, y).stroke(colors.border);
      y += 10;
      drawTotalRow('Total Amount', amountStr, true);

      // Amount in words
      y += 10; // Extra spacing
      const words = numberToWords(Math.round(invoice.totalAmount || 0));
      doc.rect(40, y, 300, 25).fill(colors.bgLight);
      doc.fillColor(colors.gray).font('Helvetica-Bold').fontSize(9)
        .text(`${words} Only`, 45, y + 8, { width: 290 });


      y += 50;

      // --- BANK DETAILS & FOOTER ---
      if (y > 650) { doc.addPage(); y = 50; }

      const footerY = y;

      // Bank Box
      doc.fillColor(colors.primaryDark).font('Helvetica-Bold').fontSize(12).text('BANK DETAILS', 40, footerY);
      doc.rect(40, footerY + 15, 40, 3).fill(colors.accent);

      const pd = getPaymentDetails();
      let by = footerY + 30;

      const drawBankDetail = (label, value) => {
        doc.fillColor(colors.gray).font('Helvetica').fontSize(9).text(label, 40, by);
        doc.fillColor(colors.black).font('Helvetica-Bold').fontSize(9).text(value, 120, by);
        by += 15;
      };

      drawBankDetail('Account Name', pd.accountName);
      drawBankDetail('Bank Name', pd.bankName);
      drawBankDetail('Account No', pd.accountNumber);
      drawBankDetail('IFSC Code', pd.ifscCode);
      drawBankDetail('Branch', pd.branch);

      // Terms / Signature Area
      const signX = 400;
      const signY = footerY + 40;

      doc.fontSize(8).fillColor(colors.gray)
        .text('This is a computer generated invoice and does not require a physical signature.', 40, by + 30, { width: 300 });

      doc.moveTo(signX, signY + 40).lineTo(signX + 130, signY + 40).stroke(colors.border);
      doc.fontSize(10).fillColor(colors.black).font('Helvetica-Bold')
        .text('Authorised Signatory', signX, signY + 45, { width: 130, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(colors.gray)
        .text(BRANDING.company.name, signX, signY + 60, { width: 130, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      console.error('[Invoice PDF] Generation error:', error);
      reject(error);
    }
  });
}

// RECEIPT GENERATOR - Modern Design
export function generateReceiptPDF(receipt, invoice, lead) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const fileName = `receipt-${receipt.receiptNumber || receipt._id}-${Date.now()}.pdf`;
      const uploadsDir = path.join(dirname, '../../uploads/billing');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- COLORS (Modern Teal/Slate Theme) ---
      const colors = {
        primary: PALETTE.primary,
        primaryDark: PALETTE.primaryDark,
        primaryLight: PALETTE.primaryLight,
        accent: PALETTE.accent,
        slate: PALETTE.slate,
        gray: PALETTE.gray,
        bgLight: '#F3F4F6',
        white: PALETTE.white,
        black: PALETTE.black,
        border: PALETTE.border,
        success: '#10B981'
      };

      // --- HEADER DESIGN ---
      const headerHeight = 180;
      const rightPanelX = 360;
      const rightPanelW = 595 - rightPanelX;

      // Right Panel Background
      doc.rect(rightPanelX, 0, rightPanelW, headerHeight).fill(colors.primaryDark);

      // 1. Logo (Top Left)
      const logoBuffer = loadLogo();
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 40, { height: 50 });
      } else {
        doc.fontSize(20).font('Helvetica-Bold').fillColor(colors.primary).text(BRANDING.company.name.toUpperCase(), 40, 40);
      }

      // 2. Received By (Left)
      let y = 110;
      doc.fillColor(colors.gray).fontSize(8).font('Helvetica-Bold').text('RECEIVED BY', 40, y);
      y += 12;
      doc.fillColor(colors.black).fontSize(12).font('Helvetica-Bold').text(BRANDING.company.legalName || BRANDING.company.name, 40, y);
      y += 18;
      doc.fillColor(colors.gray).fontSize(9).font('Helvetica')
        .text(BRANDING.address.full || `${BRANDING.address.street || ''}, ${BRANDING.address.city || ''}`, 40, y, { width: 300 })
        .text(`Phone: ${BRANDING.contact.phone}`, 40, y + 24)
        .text(`Email: ${BRANDING.contact.email}`, 40, y + 36);

      // 3. Receipt Title & Details (Right Panel)
      // Title Centered
      doc.fillColor(colors.white).fontSize(28).font('Helvetica-Bold')
        .text('RECEIPT', rightPanelX, 35, { width: rightPanelW, align: 'center' });

      // Accent line Centered
      const lineWidth = 40;
      doc.rect(rightPanelX + (rightPanelW - lineWidth) / 2, 68, lineWidth, 3).fill(colors.accent);

      let dy = 75;
      const drawHeaderDetail = (label, value) => {
        doc.fillColor(colors.primaryLight).fontSize(8).font('Helvetica')
          .text(label, rightPanelX, dy, { width: rightPanelW, align: 'center' });
        doc.fillColor(colors.white).fontSize(11).font('Helvetica-Bold')
          .text(value, rightPanelX, dy + 12, { width: rightPanelW, align: 'center' });
        dy += 35;
      };

      drawHeaderDetail('RECEIPT NO', receipt.receiptNumber || 'N/A');
      drawHeaderDetail('DATE', receipt.paymentDate ? formatDate(receipt.paymentDate) : formatDate(new Date()));
      drawHeaderDetail('PAYMENT MODE', (receipt.paymentMethod || 'Cash').toUpperCase());

      // --- RECEIVED FROM SECTION (Card) ---
      y = 210;

      // Card Background
      doc.rect(40, y, 515, 85).fill(colors.white).stroke(colors.border);
      // Left colored accent border
      doc.rect(40, y, 4, 85).fill(colors.accent);

      const customerName = invoice?.customer?.name || lead?.name || 'Guest';

      // Label
      doc.fillColor(colors.primary).fontSize(9).font('Helvetica-Bold').text('RECEIVED FROM', 60, y + 15);

      // Customer Name
      doc.fillColor(colors.black).fontSize(14).font('Helvetica-Bold').text(customerName, 60, y + 32);

      // Details
      doc.fillColor(colors.gray).fontSize(10).font('Helvetica')
        .text(invoice?.customer?.address || lead?.city || 'Address Not Provided', 60, y + 50, { width: 220 });

      // Contact Info
      doc.fillColor(colors.gray).fontSize(9).font('Helvetica-Bold').text('CONTACT INFO', 320, y + 15);
      doc.fillColor(colors.black).fontSize(10).font('Helvetica')
        .text(invoice?.customer?.phone || lead?.phone || '-', 320, y + 32)
        .text(invoice?.customer?.email || lead?.email || '-', 320, y + 46);

      y += 110;

      // --- PAYMENT DETAILS TABLE ---
      // Header
      const tableHeaders = [
        { label: 'Description', w: 235, align: 'left' },
        { label: 'Reference / Transaction ID', w: 160, align: 'left' },
        { label: 'Amount Received', w: 120, align: 'right' }
      ];

      doc.rect(40, y, 515, 30).fill(colors.primaryDark);

      let tx = 40;
      tableHeaders.forEach(h => {
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10)
          .text(h.label, tx + 10, y + 10, { width: h.w - 20, align: h.align });
        tx += h.w;
      });

      y += 30;

      // Data Row
      const methodMeta = receipt.paymentDetails || {};
      let refId = receipt.transactionId || '-';
      if (receipt.paymentMethod === 'card') refId = `Card ending ${methodMeta.cardLastFour || 'xxxx'}`;
      if (receipt.paymentMethod === 'cheque') refId = `Cheque #${methodMeta.chequeNumber || '-'}`;
      if (receipt.paymentMethod === 'upi') refId = `UPI: ${methodMeta.upiTransactionId || methodMeta.upiId || '-'}`;

      const desc = `Payment towards Invoice #${invoice?.invoiceNumber || invoice?._id || 'N/A'}`;
      const amountStr = formatCurrency(receipt.amount);

      // Row styling
      const rowH = 40;
      doc.rect(40, y, 515, rowH).fill(colors.white).stroke(colors.border);

      // Description
      doc.fillColor(colors.black).font('Helvetica-Bold').fontSize(10)
        .text(desc, 50, y + 14, { width: 215 });

      // Reference
      doc.fillColor(colors.black).font('Helvetica').fontSize(10)
        .text(refId, 285, y + 14, { width: 140 });

      // Amount (Green Highlight)
      doc.rect(435, y, 120, rowH).fill('#ecfdf5').stroke(colors.success); // Highlight cell
      doc.fillColor(colors.success).font('Helvetica-Bold').fontSize(11)
        .text(amountStr, 435, y + 14, { width: 110, align: 'right' });

      y += rowH + 30;

      // --- ACCOUNT SUMMARY ---
      if (invoice) {
        const totalAmt = invoice.totalAmount || 0;
        const paidAmt = invoice.paidAmount || 0;
        // Logic check: does paidAmt include this receipt? Usually yes in DB.
        const balance = Math.max(0, totalAmt - paidAmt);

        const summaryX = 355;
        const summaryW = 200;

        doc.fillColor(colors.gray).fontSize(10).font('Helvetica-Bold').text('ACCOUNT SUMMARY', summaryX, y);
        y += 15;

        const drawSummaryRow = (label, val, isBold = false) => {
          doc.fillColor(colors.gray).font('Helvetica').text(label, summaryX, y);
          doc.fillColor(isBold ? (balance > 0 ? '#dc2626' : colors.success) : colors.black)
            .font('Helvetica-Bold').text(val, summaryX + 110, y, { width: 90, align: 'right' });
          y += 20;
        };

        drawSummaryRow('Invoice Total', formatCurrency(totalAmt));
        drawSummaryRow('Total Paid', formatCurrency(paidAmt));
        doc.moveTo(summaryX, y - 5).lineTo(summaryX + 200, y - 5).stroke(colors.border);
        drawSummaryRow('Balance Due', formatCurrency(balance), true);
      }

      y += 20;

      // Amount in words
      const words = numberToWords(Math.round(receipt.amount || 0));
      doc.rect(40, y, 300, 25).fill(colors.bgLight);
      doc.fillColor(colors.gray).font('Helvetica-Bold').fontSize(9)
        .text(`${words} Only`, 45, y + 8, { width: 290 });

      y += 60;

      // --- FOOTER ---
      if (y > 700) { doc.addPage(); y = 50; }

      const sigY = y;

      doc.fontSize(8).fillColor(colors.gray)
        .text('This is a computer generated receipt.', 40, sigY + 30);

      doc.moveTo(400, sigY).lineTo(530, sigY).stroke(colors.border);
      doc.fontSize(10).fillColor(colors.black).font('Helvetica-Bold')
        .text('Authorized Signatory', 400, sigY + 10, { width: 130, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(colors.gray)
        .text(BRANDING.company.name, 400, sigY + 25, { width: 130, align: 'center' });

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (e) => reject(e));
    } catch (err) { reject(err); }
  });
}
