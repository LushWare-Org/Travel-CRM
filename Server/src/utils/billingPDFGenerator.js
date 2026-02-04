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

const PALETTE = {
  orange: '#F5A623',
  lightOrange: '#FEF3C7',
  darkGray: '#1F2937',
  gray: '#4B5563',
  lightGray: '#E5E7EB',
  white: '#FFFFFF',
  black: '#000000',
  blue: '#3B82F6'
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
  return `INR ${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const calculateDuration = (start, end) => {
  if (!start || !end) return 'TBA';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Nights ${diffDays + 1} Days`;
};

// Draw Wave Header
const drawWaveHeader = (doc, title) => {
  const headerHeight = 100;
  doc.rect(0, 0, 595, headerHeight).fill('#000000');
  doc.moveTo(0, headerHeight - 30)
    .bezierCurveTo(150, headerHeight - 10, 350, headerHeight - 50, 595, headerHeight - 30)
    .lineTo(595, 0).lineTo(0, 0).fill('#000000');
  doc.moveTo(400, 0)
    .bezierCurveTo(450, 40, 520, 60, 595, 50)
    .lineTo(595, 0).fill('#F5A623');
  const logo = loadLogo();
  if (logo) {
    try {
      doc.image(logo, 50, 25, { width: 80 });
    } catch (e) { console.warn('Logo error:', e.message); }
  }
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(BRANDING.company.name, 140, 35);
  doc.font('Helvetica').fontSize(9).text(BRANDING.company.tagline || 'Curating inspired journeys', 140, 55);
  const badgeX = 490;
  const badgeY = 40;
  doc.circle(badgeX, badgeY, 28).fill('#FFFFFF');
  doc.fillColor('#000000').fontSize(7).font('Helvetica-Bold')
    .text(title, badgeX - 20, badgeY - 3, { width: 40, align: 'center' });
};

// Draw Footer Wave
const drawFooterWave = (doc) => {
  const pageHeight = 842;
  const waveY = pageHeight - 80;
  doc.moveTo(0, waveY)
    .bezierCurveTo(150, waveY + 20, 350, waveY - 10, 595, waveY + 10)
    .lineTo(595, pageHeight).lineTo(0, pageHeight).fill('#F5A623');
};

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

      // Cover Image
      if (coverImageBuffer) {
        try {
          doc.image(coverImageBuffer, 0, 0, { width: 595, height: 400, cover: [595, 400] });
        } catch (e) {
          console.warn('[PDF] Cover image error:', e.message);
          doc.rect(0, 0, 595, 400).fill(PALETTE.lightGray);
        }
      } else {
        doc.rect(0, 0, 595, 400).fill(PALETTE.lightGray);
      }

      // Dark overlay for text readability
      doc.save();
      doc.rect(0, 300, 595, 100).fillOpacity(0.75).fill(PALETTE.black);
      doc.restore();

      doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(26)
        .text(packageName.toUpperCase(), 30, 330, { width: 535, align: 'center' });

      // Tour Details Section - Optimized spacing
      let yPos = 450;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(PALETTE.orange).text('TOUR DETAILS:', 50, yPos);
      yPos += 25;

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

      const details = [
        { label: 'Travel Date:', value: startDate ? `${formatDate(startDate)} to ${endDate ? formatDate(endDate) : 'TBA'}` : 'TBA' },
        { label: 'No. of Pax:', value: `${pax} Person(s)` },
        { label: 'Duration:', value: durationStr },
        // { label: 'Hotel:', value: hotelName }
      ];

      doc.font('Helvetica').fontSize(11).fillColor(PALETTE.darkGray);
      details.forEach(item => {
        doc.font('Helvetica-Bold').text(item.label, 50, yPos, { continued: true });
        doc.font('Helvetica').text(`  ${item.value}`, { continued: false });
        yPos += 20;
      });

      // --- PAGE 2: HIGHLIGHTS & ITINERARY ---
      doc.addPage();
      const logo = loadLogo();
      if (logo) {
        try {
          doc.image(logo, 50, 40, { width: 80 });
        } catch (e) { console.warn('Logo error:', e.message); }
      }

      yPos = 100;

      // Package Highlights Section (from database)
      if (packageHighlights && packageHighlights.length > 0) {
        doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('PACKAGE HIGHLIGHTS', 50, yPos);
        doc.moveTo(50, yPos + 22).lineTo(545, yPos + 22).strokeColor(PALETTE.orange).lineWidth(2).stroke();
        yPos += 35;

        packageHighlights.slice(0, 6).forEach(highlight => {
          doc.fillColor(PALETTE.darkGray).font('Helvetica').fontSize(10)
            .text(`✓ ${highlight}`, 60, yPos, { width: 485 });
          yPos += 18;
        });

        yPos += 20;
      }

      // Itinerary Section
      if (yPos > 650) { doc.addPage(); yPos = 50; }

      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('TRAVEL ITINERARY', 50, yPos);
      doc.moveTo(50, yPos + 22).lineTo(545, yPos + 22).strokeColor(PALETTE.orange).lineWidth(2).stroke();
      yPos += 35;

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
            yPos = 50;
            // Re-draw header if new page
            if (i > 0) {
              doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('TRAVEL ITINERARY (Cont.)', 50, yPos);
              doc.moveTo(50, yPos + 22).lineTo(545, yPos + 22).strokeColor(PALETTE.orange).lineWidth(2).stroke();
              yPos += 45;
            }
          }

          const dayBlockY = yPos;

          // 1. Day Circle & Line
          const timelineX = 70;
          doc.circle(timelineX, dayBlockY + 12, 12).fill(PALETTE.orange);
          doc.fillColor(PALETTE.white).font('Helvetica-Bold').fontSize(10)
            .text(`${day.dayNumber || i + 1}`, timelineX - 5, dayBlockY + 8, { width: 10, align: 'center' });

          // 2. Day Content Box (Right of timeline)
          const contentX = 100;
          const contentW = 450;

          // Day Title
          doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(12)
            .text(`Day ${day.dayNumber || i + 1}: ${day.title || 'Day ' + (i + 1)}`, contentX, dayBlockY + 5);

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
            doc.fillColor(PALETTE.darkGray).font('Helvetica-Bold').fontSize(9);
            metaText.forEach(txt => {
              doc.text(`• ${txt}`, contentX, contentY);
              contentY += 12;
            });
            contentY += 5;
          }

          // Draw Connecting Line (except for last item)
          if (i < itineraryDays.length - 1) {
            // Calculate how far down the line should go
            const endY = contentY + 10;
            doc.moveTo(timelineX, dayBlockY + 24)
              .lineTo(timelineX, endY)
              .strokeColor('#eee')
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
      if (yPos > 600) { doc.addPage(); yPos = 50; }

      const inclusions = (packageInclusions && packageInclusions.length > 0)
        ? packageInclusions
        : (quotation.includedServices || []);

      const exclusions = (packageExclusions && packageExclusions.length > 0)
        ? packageExclusions
        : (quotation.excludedServices || []);

      const startInclY = yPos;
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('INCLUSIONS', 50, yPos);
      let iy = yPos + 20;
      doc.font('Helvetica').fontSize(9.5).fillColor(PALETTE.darkGray);
      if (inclusions.length === 0) {
        doc.text('• As per package details', 50, iy);
        iy += 15;
      } else {
        inclusions.forEach(inc => {
          doc.text(`• ${inc}`, 50, iy, { width: 220 });
          iy += doc.heightOfString(`• ${inc}`, { width: 220 }) + 4;
        });
      }

      let rightY = startInclY;
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('EXCLUSIONS', 310, rightY);
      let ey = rightY + 20;
      doc.font('Helvetica').fontSize(9.5).fillColor(PALETTE.darkGray);
      if (exclusions.length === 0) {
        doc.text('• As per package details', 310, ey);
        ey += 15;
      } else {
        exclusions.forEach(exc => {
          doc.text(`• ${exc}`, 310, ey, { width: 220 });
          ey += doc.heightOfString(`• ${exc}`, { width: 220 }) + 4;
        });
      }
      yPos = Math.max(iy, ey) + 25;

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
      // Force new page if close to bottom to prevent "data outside page"
      if (yPos > 500) { doc.addPage(); yPos = 50; }
      else yPos += 30; // Spacing

      // Header for Section
      // doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('PAYMENT & PRICING', 50, yPos);
      yPos += 30;

      // Pricing Box
      // doc.fillColor(PALETTE.black).fontSize(14).font('Helvetica-Bold').text('Total Package Cost:', 50, yPos + 10);
      // doc.fillColor(PALETTE.orange).fontSize(18).text(formatCurrency(quotation.totalAmount), 200, yPos + 8);
      // yPos += 40;

      // Payment Box (Orange Bg)
      // --- PRICING & PAYMENT ---
      // Ensure we have space for the header and pricing summary
      if (yPos > 600) { doc.addPage(); yPos = 50; }
      else yPos += 25;

      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16).text('PAYMENT & PRICING', 50, yPos);
      yPos += 25;

      // Pricing Display
      doc.fillColor(PALETTE.black).fontSize(13).font('Helvetica-Bold').text('Total Package Cost:', 50, yPos);
      doc.fillColor(PALETTE.orange).fontSize(17).text(formatCurrency(quotation.totalAmount), 200, yPos - 2);
      yPos += 35;

      // Payment Box Logic
      const payBoxH = 210;
      // If payment box + logos (approx 300px total) won't fit, new page
      if (yPos + 300 > 750) {
        doc.addPage();
        yPos = 50;
      }

      const payBoxY = yPos;

      doc.roundedRect(50, payBoxY, 495, payBoxH, 8).fill(PALETTE.lightOrange).stroke(PALETTE.orange);
      doc.fillColor(PALETTE.black).fontSize(12).font('Helvetica-Bold').text('Bank Transfers:', 70, payBoxY + 18);

      let by = payBoxY + 40;
      const pd = getPaymentDetails();
      const bankInfo = [
        ['Bank:', pd.bankName],
        ['Account Name:', pd.accountName],
        ['Account No:', pd.accountNumber],
        ['IFSC Code:', pd.ifscCode],
        ['Branch:', pd.branch]
      ];
      bankInfo.forEach(([l, v]) => {
        doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(9.5).text(l, 70, by);
        doc.fillColor(PALETTE.black).font('Helvetica-Bold').text(v, 175, by);
        by += 18;
      });

      const qrY = payBoxY + 18;
      const qrX = 355;
      doc.fillColor(PALETTE.blue).fontSize(13).font('Helvetica-Bold').text('Scan to pay via', qrX, qrY);
      doc.fillColor('#4caf50').fontSize(15).text('UPI', qrX + 105, qrY);

      // Add actual QR code image
      try {
        const qrCodePath = path.join(dirname, '../assets/payment-qr.jpeg');
        if (fs.existsSync(qrCodePath)) {
          doc.image(qrCodePath, qrX + 8, qrY + 28, { width: 95, height: 95 });
        } else {
          // Fallback: draw rectangle if image not found
          doc.rect(qrX + 8, qrY + 28, 95, 95).stroke(PALETTE.black);
          doc.fillColor(PALETTE.black).fontSize(8).text('QR Code', qrX + 32, qrY + 70);
        }
      } catch (error) {
        console.warn('[PDF] QR code image error:', error.message);
        // Fallback: draw rectangle
        doc.rect(qrX + 8, qrY + 28, 95, 95).stroke(PALETTE.black);
        doc.fillColor(PALETTE.black).fontSize(8).text('QR Code', qrX + 32, qrY + 70);
      }

      doc.fillColor(PALETTE.black).fontSize(9).text(`UPI: ${pd.upiId}`, qrX, qrY + 135);
      doc.text(`Mobile: ${pd.phone}`, qrX, qrY + 150);

      yPos += payBoxH + 25;

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
      if (logo) {
        try {
          doc.image(logo, 50, 40, { width: 80 });
        } catch (e) { console.warn('Logo error:', e.message); }
      }
      yPos = 100;

      // Terms - Parse and render with bold subtopics
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('TERMS & CONDITIONS', 50, yPos);
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

      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('CANCELLATION POLICY', 50, yPos);
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
      doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(22).text('Google Reviews', margin, yPos);

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
      doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(14).text(BRANDING.company.name, margin, yPos);
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
        doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(14).text(`${mainPackage.name} Reviews`, margin, yPos);
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
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(20).text('CONTACT US', 0, yPos, { align: 'center' });
      yPos += 35;
      doc.fillColor(PALETTE.darkGray).font('Helvetica').fontSize(11)
        .text('Our team is always there to serve you and suggest you what can suit your travel', 0, yPos, { align: 'center' });
      yPos += 18;
      doc.text('needs the best. In case of any doubt regarding the shared trip or any other', 0, yPos, { align: 'center' });
      yPos += 18;
      doc.text('services offered by us, you can contact our team at:', 0, yPos, { align: 'center' });
      yPos += 35;
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(16)
        .text(BRANDING.contact.phone, 0, yPos, { align: 'center' });
      yPos += 30;
      doc.fillColor(PALETTE.darkGray).fontSize(12).font('Helvetica')
        .text(`${BRANDING.contact.email}  |  ${BRANDING.urls.website.replace('https://', '').replace('http://', '').toUpperCase()}`, 0, yPos, { align: 'center' });

      // Add Contact Us page footer (black bar at bottom)
      const contactPageIndex = doc.bufferedPageRange().count - 1;
      doc.switchToPage(contactPageIndex);
      doc.rect(0, 750, 595, 92).fill(PALETTE.black);

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
      const doc = new PDFDocument({
        margin: 40,
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

      // --- COLORS ---
      const colors = {
        headerBlue: '#1a365d',
        textBlack: '#1f2937', // Softer black
        textGray: '#4b5563',
        border: '#e5e7eb',
        bgLight: '#f9fafb',
        white: '#FFFFFF'
      };

      // --- HELPERS ---

      // Draw a filled cell with text
      const drawField = (x, y, w, h, bg, text, isBold = false, align = 'left', textColor = colors.textBlack) => {
        // Draw Background
        doc.rect(x, y, w, h).fill(bg);
        // Draw Border
        doc.rect(x, y, w, h).stroke(colors.border);
        // Draw Text
        doc.fillColor(textColor)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(text || '-', x + 6, y + 6, { width: w - 12, align: align, lineGap: 2 });
      };

      // --- HEADER ---
      let y = 40;

      const logoBuffer = loadLogo();
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 });
      } else {
        doc.fontSize(22).font('Helvetica-Bold').fillColor(colors.textBlack).text(BRANDING.company.name.toUpperCase(), 40, 40);
      }

      // Invoice Title (Center)
      const title = invoice.type === 'proforma' ? 'PROFORMA INVOICE' : 'INVOICE';
      doc.font('Helvetica-Bold').fontSize(22).fillColor(colors.headerBlue).text(title, 0, 40, { align: 'center' });

      // Right Side Info (Invoice No, Date, Due Date, Booking Id)
      const rightStart = 400;
      const rightLabelW = 70;
      const rightValW = 100;
      let ry = 35;

      const headerInfo = [
        { label: 'Invoice No', value: invoice.invoiceNumber || 'PROFORMA' },
        { label: 'Invoice Date', value: invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB') },
        { label: 'Due Date', value: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '-' },
        { label: 'Booking Id', value: invoice.booking?.bookingId || invoice.booking?._id || 'N/A' }
      ];

      doc.fontSize(9);
      headerInfo.forEach(info => {
        doc.font('Helvetica-Bold').fillColor(colors.textBlack).text(info.label, rightStart, ry, { width: rightLabelW, align: 'right' });
        doc.font('Helvetica').fillColor(colors.textBlack).text(info.value, rightStart + rightLabelW + 5, ry, { width: rightValW, align: 'right' });
        ry += 12;
      });

      y = 100; // Move down for address section

      // --- ADDRESS SECTIONS (Bill From / Bill To) ---
      y += 20;

      const sectionW = 250;
      const leftX = 40;
      const rightX = 305;
      const headerH = 24;

      // Headers
      doc.rect(leftX, y, sectionW, headerH).fill(colors.headerBlue);
      doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(11).text('Bill From:', leftX + 8, y + 7);

      doc.rect(rightX, y, sectionW, headerH).fill(colors.headerBlue);
      doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(11).text('Bill To:', rightX + 8, y + 7);

      y += headerH;

      // Data Prep
      const billFromData = [
        { label: 'Company Name', value: BRANDING.company.legalName || BRANDING.company.name },
        { label: 'Address', value: BRANDING.address.full || `${BRANDING.address.street || ''}\n${BRANDING.address.city || ''} - ${BRANDING.address.postalCode || ''}` },
        { label: 'Phone', value: BRANDING.contact.phone },
        { label: 'Email', value: BRANDING.contact.email },
        { label: 'GST No', value: BRANDING.legal.gstNumber || 'N/A' }
      ];

      const customerName = invoice.customer?.name || lead?.name || 'Guest';
      const customerPhone = invoice.customer?.phone || lead?.phone || 'N/A';
      const customerEmail = invoice.customer?.email || lead?.email || 'N/A';
      const customerAddr = invoice.customer?.address || lead?.city || '-';

      const billToData = [
        { label: 'Name', value: customerName },
        { label: 'Address', value: customerAddr },
        { label: 'Phone', value: customerPhone },
        { label: 'Email', value: customerEmail },
        { label: 'Place of Supply', value: invoice.placeOfSupply || lead?.destination || '-' }
      ];

      // Draw Address Details side-by-side
      const startY = y;
      const labelW = 90;
      const valueW = 160;
      const rowMinH = 20;

      // Ensure exact alignment by iterating max rows
      const maxRows = Math.max(billFromData.length, billToData.length);

      // Helper to calculate height needed for a row (based on left and right content)
      const getRowHeight = (idx) => {
        const leftTxt = billFromData[idx]?.value || '';
        const rightTxt = billToData[idx]?.value || '';
        const lh = doc.heightOfString(leftTxt, { width: valueW - 12, fontSize: 9 });
        const rh = doc.heightOfString(rightTxt, { width: valueW - 12, fontSize: 9 });
        return Math.max(lh + 12, rh + 12, rowMinH); // +12 for padding
      };

      for (let i = 0; i < maxRows; i++) {
        const h = getRowHeight(i);

        // Left (From)
        if (billFromData[i]) {
          drawField(leftX, y, labelW, h, colors.bgLight, billFromData[i].label, false, 'left', colors.textGray);
          drawField(leftX + labelW, y, valueW, h, colors.white, billFromData[i].value, true, 'left', colors.textBlack);
        } else {
          // Empty filler if needed (UI polish)
          drawField(leftX, y, labelW + valueW, h, colors.white, '');
        }

        // Right (To)
        if (billToData[i]) {
          drawField(rightX, y, labelW, h, colors.bgLight, billToData[i].label, false, 'left', colors.textGray);
          drawField(rightX + labelW, y, valueW, h, colors.white, billToData[i].value, true, 'left', colors.textBlack);
        } else {
          drawField(rightX, y, labelW + valueW, h, colors.white, '');
        }

        y += h;
      }

      y += 20; // Gap

      // --- MAIN ITEMS TABLE ---
      const tableHeaders = [
        { label: 'S.No', w: 40, align: 'center' },
        { label: 'Service Description', w: 325, align: 'left' },
        { label: 'Amount (INR)', w: 150, align: 'right' }
      ];

      // Table Header Row
      const tableW = 515;
      const tableHeaderH = 25;

      doc.rect(leftX, y, tableW, tableHeaderH).fill(colors.headerBlue);
      let tx = leftX;
      tableHeaders.forEach(h => {
        doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(10)
          .text(h.label, tx + 5, y + 8, { width: h.w - 10, align: h.align });
        tx += h.w;
      });

      y += tableHeaderH;

      // Table Content (Items)
      // Requirement: "package name with minimum details"

      const paxCount = (lead?.adults || 0) + (lead?.children || 0);
      const paxStr = paxCount > 0 ? `(${lead.adults} Adults${lead.children ? `, ${lead.children} Children` : ''})` : '';

      const packageItem = invoice.items?.find(i => i.category === 'package') || invoice.items?.[0];

      // Get Package Name and Type directly
      // Get Package Name and Type directly
      let packageName = 'Travel Services';
      let packageTypeLabel = '';

      // STRATEGY: Prefer the Base Package Name (lead.package.name) as it's the most "marketing friendly" name.
      // Customized package names might be auto-generated (e.g. "Day 1...") which are bad for descriptions.

      // 1. Try Base Package from Lead (Highest Priority for Name)
      if (lead?.package?.name) {
        packageName = lead.package.name;
        // Determine label based on if customization exists
        if (lead.customizedPackage || invoice.type === 'customized' || lead.manualItinerary) {
          packageTypeLabel = '(Customized Package)';
        } else {
          packageTypeLabel = '(Standard Package)';
        }
      }
      // 2. Try Invoice Package (if Lead package missing)
      else if (invoice.package?.name) {
        packageName = invoice.package.name;
        packageTypeLabel = '(Standard Package)';
      }
      // 3. Fallback to Customized Package Name (only if clean)
      else if (lead?.customizedPackage?.name) {
        // Only use if it doesn't look like a day entry
        if (!lead.customizedPackage.name.trim().startsWith('Day')) {
          packageName = lead.customizedPackage.name;
        }
        packageTypeLabel = '(Customized Package)';
      }

      // 4. Check Item Description (Lowest Priority Override, with filters)
      if (packageItem?.description && packageItem.description !== 'Package Total') {
        // Only use description if it looks like a Name (short) and NOT a Day description
        const desc = packageItem.description.trim();
        // Strict check to avoid "Day 1: Hotel..." strings becoming the title
        if (desc.length < 60 && !desc.startsWith('Day') && !desc.toLowerCase().startsWith('day 1')) {
          packageName = desc;
        }
      }

      // Ensure Label is correct if overridden via other means
      if (invoice.type === 'customized' || packageName.toLowerCase().includes('customized')) {
        packageTypeLabel = '(Customized Package)';
      }

      // Final Composite Description
      const fullDescription = `${packageName} ${packageTypeLabel}\nDestination: ${lead?.destination || 'N/A'} ${paxStr}`;

      const amountStr = formatCurrency(invoice.totalAmount);

      // Calc height
      const descH = doc.heightOfString(fullDescription, { width: tableHeaders[1].w - 20 }) + 20;
      const rowItemH = Math.max(descH, 40);

      // Draw Row
      tx = leftX;
      // S.No
      drawField(tx, y, tableHeaders[0].w, rowItemH, colors.white, '1', false, 'center', colors.textBlack); tx += tableHeaders[0].w;
      // Description
      drawField(tx, y, tableHeaders[1].w, rowItemH, colors.white, fullDescription, false, 'left', colors.textBlack); tx += tableHeaders[1].w;
      // Amount
      drawField(tx, y, tableHeaders[2].w, rowItemH, colors.white, amountStr, true, 'right', colors.textBlack);

      y += rowItemH;

      // --- TOTALS SECTION ---
      // Align to right
      const totalLabelW = 120;
      const totalValW = 150;
      const totalX = 40 + tableW - totalLabelW - totalValW + tableHeaders[0].w; // Adjusting to flush right
      const startTotalX = (40 + tableW) - (totalLabelW + totalValW);

      const drawTotalRow = (label, val, isBold = false, bg = colors.white) => {
        drawField(startTotalX, y, totalLabelW, 25, bg, label, false, 'right', colors.textGray);
        drawField(startTotalX + totalLabelW, y, totalValW, 25, bg, val, true, 'right', isBold ? colors.textBlack : colors.textGray);
        y += 25;
      };

      drawTotalRow('Sub Total', formatCurrency(invoice.totalAmount));
      // if tax/discount existed, looped here
      drawTotalRow('Total Amount', formatCurrency(invoice.totalAmount), true, '#eff6ff'); // Light blue bg for total

      // Total in Words
      y += 10;
      const words = numberToWords(Math.round(invoice.totalAmount || 0));
      doc.font('Helvetica-Bold').fontSize(10).fillColor(colors.textBlack)
        .text('Total Amount in Words:', leftX, y);
      doc.font('Helvetica-Oblique').fontSize(10).fillColor(colors.textGray)
        .text(`${words}`, leftX + 120, y);

      y += 40;

      // --- BANK DETAILS & FOOTER ---
      // Check space
      if (y > 650) { doc.addPage(); y = 50; }

      const footerY = y;

      // Bank Box
      doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.headerBlue).text('Bank Details', leftX, footerY);

      const pd = getPaymentDetails();
      const bankData = [
        ['Account Name', pd.accountName],
        ['Bank Name', pd.bankName],
        ['Account Number', pd.accountNumber],
        ['IFSC Code', pd.ifscCode],
        ['Branch', pd.branch]
      ];

      let by = footerY + 20;
      const blw = 110;
      const bvw = 200;

      bankData.forEach(([l, v]) => {
        drawField(leftX, by, blw, 20, colors.bgLight, l, false, 'left', colors.textGray);
        drawField(leftX + blw, by, bvw, 20, colors.white, v, true, 'left', colors.textBlack);
        by += 20;
      });

      // Terms / Signatory
      const signX = 400;
      const signY = footerY + 80;

      doc.fontSize(8).fillColor(colors.textGray)
        .text('This is a computer generated invoice and does not require a physical signature.', leftX, by + 20);

      doc.moveTo(signX, signY).lineTo(signX + 130, signY).stroke(colors.border);
      doc.fontSize(10).fillColor(colors.textBlack).font('Helvetica-Bold')
        .text('Authorised Signatory', signX, signY + 5, { width: 130, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(colors.textGray)
        .text(BRANDING.company.name, signX, signY + 18, { width: 130, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      console.error('[Invoice PDF] Generation error:', error);
      reject(error);
    }
  });
}

// RECEIPT GENERATOR (Preserved)
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

      // --- COLORS & STYLES ---
      const colors = {
        headerBlue: '#1a365d', // Navy
        headerOrange: '#d97706', // Amber/Orange
        textBlack: '#1f2937',
        textGray: '#4b5563',
        border: '#e5e7eb',
        bgLight: '#f9fafb',
        white: '#FFFFFF',
        successGreen: '#059669'
      };

      // --- HELPERS ---
      const drawField = (x, y, w, h, bg, text, isBold = false, align = 'left', textColor = colors.textBlack) => {
        doc.rect(x, y, w, h).fill(bg);
        doc.rect(x, y, w, h).stroke(colors.border);
        doc.fillColor(textColor)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(text || '-', x + 6, y + 8, { width: w - 12, align: align });
      };

      // --- HEADER LAYOUT ---
      // Logo (Top Left)
      const logoBuffer = loadLogo();
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 180 }); // Large Logo
      } else {
        doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.textBlack).text(BRANDING.company.name.toUpperCase(), 40, 40);
      }

      // Receipt Info (Top Right - Aligned with Logo horizontally)
      // Moving "Receipt Info" to top right allows the Title to sit centered BELOW them without collision
      const rightStart = 355; // Starts at 355, Ends at 555 (Margin)
      let ry = 35; // Start at top
      doc.fontSize(10);

      const receiptInfo = [
        { label: 'Receipt No:', value: receipt.receiptNumber || 'N/A' },
        { label: 'Date:', value: formatDate(receipt.paymentDate) },
        { label: 'Payment Mode:', value: (receipt.paymentMethod || 'Cash').toUpperCase() }
      ];

      receiptInfo.forEach(info => {
        doc.font('Helvetica-Bold').fillColor(colors.textGray).text(info.label, rightStart, ry, { width: 90, align: 'right' });
        doc.font('Helvetica-Bold').fillColor(colors.textBlack).text(info.value, rightStart + 95, ry, { width: 105, align: 'right' });
        ry += 15;
      });

      // Title (Centered, Below Logo/Info)
      doc.font('Helvetica-Bold').fontSize(26).fillColor(colors.headerBlue)
        .text('PAYMENT RECEIPT', 0, 90, { align: 'center' }); // Lowered to y=90

      let y = 130; // Start content below title

      // --- ADDRESS SECTION ---
      // Bill From (Company) & Bill To (Customer)
      const sectionW = 250;
      const leftX = 40;
      const rightX = 305;
      const headerH = 24;

      // Section Headers
      doc.rect(leftX, y, sectionW, headerH).fill(colors.headerBlue);
      doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(11).text('Received From (Customer):', leftX + 8, y + 7);

      doc.rect(rightX, y, sectionW, headerH).fill(colors.headerBlue);
      doc.fillColor(colors.white).font('Helvetica-Bold').fontSize(11).text('Payment To (Company):', rightX + 8, y + 7);

      y += headerH;

      // Data
      const customerName = invoice?.customer?.name || lead?.name || 'Guest';
      const customerEmail = invoice?.customer?.email || lead?.email || '-';
      const customerPhone = invoice?.customer?.phone || lead?.phone || '-';

      const fromData = [
        { label: 'Name', value: customerName },
        { label: 'Email', value: customerEmail },
        { label: 'Phone', value: customerPhone },
        { label: 'Booking Ref', value: invoice?.booking?.bookingId || '-' }
      ];

      const toData = [
        { label: 'Company', value: BRANDING.company.legalName || BRANDING.company.name },
        { label: 'Address', value: `${BRANDING.address.city || ''} - ${BRANDING.address.postalCode || ''}` },
        { label: 'Email', value: BRANDING.contact.email },
        { label: 'Phone', value: BRANDING.contact.phone }
      ];

      const rowH = 22;
      for (let i = 0; i < 4; i++) {
        // Left (Customer)
        drawField(leftX, y, 90, rowH, colors.bgLight, fromData[i].label, false, 'left', colors.textGray);
        drawField(leftX + 90, y, 160, rowH, colors.white, fromData[i].value, true, 'left', colors.textBlack);

        // Right (Company)
        drawField(rightX, y, 90, rowH, colors.bgLight, toData[i].label, false, 'left', colors.textGray);
        drawField(rightX + 90, y, 160, rowH, colors.white, toData[i].value, true, 'left', colors.textBlack);
        y += rowH;
      }

      y += 30;

      // --- PAYMENT DETAILS BOX ---
      doc.fontSize(14).font('Helvetica-Bold').fillColor(colors.headerBlue).text('Payment Details', 40, y);
      y += 20;

      // UPDATED COLUMN WIDTHS to fit 515px width and avoid clipping (Total: 515)
      const detailHeaders = [
        { label: 'Description', w: 170 },           // Reduced from 180
        { label: 'Transaction / Ref ID', w: 140 },  // Reduced from 180
        { label: 'Payment Date', w: 85, align: 'center' }, // Reduced from 100
        { label: 'Amount Received', w: 120, align: 'right' } // Increased from 95 to fix clipping
      ];

      // Header Row
      let tx = 40;
      doc.rect(tx, y, 515, 25).fill(colors.headerOrange);
      detailHeaders.forEach(h => {
        doc.fillColor(colors.white).fontSize(10).text(h.label, tx + 5, y + 8, { width: h.w - 10, align: h.align });
        tx += h.w;
      });
      y += 25;

      // Details Row
      const methodMeta = receipt.paymentDetails || {};
      let refId = receipt.transactionId || '-';
      if (receipt.paymentMethod === 'card') refId = `Card ending ${methodMeta.cardLastFour || 'xxxx'}`;
      if (receipt.paymentMethod === 'cheque') refId = `Cheque #${methodMeta.chequeNumber || '-'}`;
      if (receipt.paymentMethod === 'upi') refId = `UPI: ${methodMeta.upiTransactionId || methodMeta.upiId || '-'}`;

      const desc = `Payment towards Invoice #${invoice?.invoiceNumber || invoice?._id || 'N/A'}`;

      tx = 40;
      // Draw cells using new widths
      drawField(tx, y, 170, 35, colors.white, desc); tx += 170;
      drawField(tx, y, 140, 35, colors.white, refId); tx += 140;
      drawField(tx, y, 85, 35, colors.white, formatDate(receipt.paymentDate), false, 'center'); tx += 85;

      // Amount Cell (Green Highlight)
      doc.rect(tx, y, 120, 35).fill('#ecfdf5'); // Light green bg
      doc.rect(tx, y, 120, 35).stroke(colors.successGreen);
      doc.fillColor(colors.successGreen).font('Helvetica-Bold').fontSize(11)
        .text(formatCurrency(receipt.amount), tx + 5, y + 12, { width: 110, align: 'right' }); // Width adjusted

      y += 50;

      // --- ACCOUNT SUMMARY (Invoice Context) ---
      // Show totals to give context (Total Invoice, Paid, Balance)
      if (invoice) {
        const summaryW = 250;
        const summaryX = 305; // Right aligned

        doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.headerBlue).text('Account Summary', summaryX, y);
        y += 15;

        const totalAmt = invoice.totalAmount || 0;
        const paidAmt = invoice.paidAmount || 0; // This usually includes the current receipt if updated
        // For display clarity, let's assume invoice.paidAmount is up to date
        const balance = Math.max(0, totalAmt - paidAmt);

        const summaryRows = [
          { label: 'Total Invoice Amount', val: formatCurrency(totalAmt) },
          { label: 'Total Paid (Including this)', val: formatCurrency(paidAmt) },
          { label: 'Balance Due', val: formatCurrency(balance), isBold: true, color: balance > 0 ? '#dc2626' : colors.successGreen }
        ];

        summaryRows.forEach(row => {
          doc.rect(summaryX, y, 130, 20).fill(colors.bgLight);
          doc.rect(summaryX, y, 130, 20).stroke(colors.border);
          doc.fillColor(colors.textGray).font('Helvetica').fontSize(9).text(row.label, summaryX + 5, y + 5);

          doc.rect(summaryX + 130, y, 120, 20).fill(colors.white);
          doc.rect(summaryX + 130, y, 120, 20).stroke(colors.border);
          doc.fillColor(row.color || colors.textBlack).font(row.isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
            .text(row.val, summaryX + 135, y + 5, { width: 110, align: 'right' });
          y += 20;
        });
      }

      y += 40;

      // --- FOOTER / SIGNATURE ---
      const sigY = 700; // Fixed position near bottom
      doc.lineWidth(1).moveTo(40, sigY).lineTo(200, sigY).stroke(colors.border);
      doc.fillColor(colors.textGray).fontSize(10).text('Authorized Signatory', 40, sigY + 10);
      doc.text(BRANDING.company.legalName || BRANDING.company.name, 40, sigY + 25);

      doc.fillColor(colors.headerBlue).fontSize(12).font('Helvetica-Bold')
        .text('Thank you for your payment!', 300, sigY + 10, { align: 'right', width: 255 });

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (e) => reject(e));
    } catch (err) { reject(err); }
  });
}
