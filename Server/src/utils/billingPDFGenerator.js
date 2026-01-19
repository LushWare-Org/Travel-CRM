import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Path to logo in Management public folder
const LOGO_PATH = path.join(dirname, '../../../Management/public/website-logo-1.png');

// Mock Payment Details
const PAYMENT_DETAILS = {
  accountName: 'TRIPSKYWAY',
  bankName: 'ICICI Bank',
  accountNumber: '663705600957',
  ifscCode: 'ICIC0006637',
  accountType: 'Current Account',
  branch: 'New Delhi',
  upiId: 'harsh8412@icici',
  phone: '9128446597'
};

// Google Reviews Data Store (Simulated Dynamic Data)
const DESTINATION_REVIEWS = {
  'Maldives': [
    { name: 'NITI KENNY', rating: 5, text: 'We booked our honeymoon package to Maldives with Harsh from Tripskyway. He has been very friendly, kind, cooperative...', time: '11 months ago' },
    { name: 'Jeevan S.A', rating: 5, text: 'Had a very a good experience in Maldives @ Adaran select Huduran Fushi Resort.... Which was suggested and booked for us', time: 'a year ago' },
    { name: 'Vigneshwaran G', rating: 5, text: 'I would like to extend my sincere thanks to Harsh and the Tripsky team for their exceptional service in organizing our honeymoon trip to Maldives', time: 'a week ago' },
    { name: 'ASHIS KUMAR', rating: 5, text: 'Harsh is best tour programmer i have ever met so far. By planning your tour & travel from Tripskyway you are tensionfree', time: 'a year ago' }
  ],
  'Dubai': [
    { name: 'Sara Khan', rating: 5, text: 'Dubai trip was absolutely fantastic! The desert safari organized by Tripskyway was the highlight. Everything was smooth.', time: '2 weeks ago' },
    { name: 'Michael R', rating: 4, text: 'Great coordination for our family trip to Dubai. Hotel choices were excellent near the Marina. Thanks team.', time: '1 month ago' },
    { name: 'Priya Sethi', rating: 5, text: 'Burj Khalifa tickets and transfers were perfectly timed. No hassle at all. Will recommend Tripskyway to friends.', time: '3 months ago' }
  ],
  'Europe': [
    { name: 'James W', rating: 5, text: 'Our Euro tour was magical. Paris and Swiss Alps were breathtaking. The itinerary was well paced.', time: '3 weeks ago' },
    { name: 'Anjali Gupta', rating: 5, text: 'Best travel agency for Europe. Visa assistance was very helpful. Hotels were centrally located.', time: '2 months ago' }
  ],
  'Generic': [
    { name: 'Rahul Sharma', rating: 5, text: 'Amazing experience with Trip Sky Way! The itinerary was perfectly planned and executed. Highly recommended!', time: '1 month ago' },
    { name: 'Sneha Patel', rating: 5, text: 'Very professional team. They took care of every small detail. Will definitely book again.', time: '2 months ago' },
    { name: 'Amit Verma', rating: 4, text: 'Good service and support throughout the trip. Had a memorable vacation.', time: '3 months ago' }
  ]
};

const TERMS_TEXT = `Exclusions:
• Air Ticket
• Expenses of personal nature such as drinks, telephone, and laundry bills etc.
• Tips & Porter Charges
• Any boating Charges (Motor Boat / Pedal Boat)
• Any Other Services not specified above
• 5% TCS will be extra on Land Part which is Refundable after Filling ITR

Note on TCS:
(Get 100% credit of the TCS Amount, TCS is collected via Tripskyway). TCS credit would reflect in your Form 26AS on quarterly basis. Ex: Trip between 15 Jan - 19 Jan -> TCS reflected end of April.

Terms & Conditions for TCS:
• The above is just a quotation and no reservation has been processed at the time of this request.
• The pictures have been sourced from multiple third-party sources. Tripskyway does not assume any responsibility with respect to discrepancies.
• Any changes or cancellation after cancellation dateline will result in cancellation charges.
• It is mandatory that you carefully read, understand and accept all the Service Terms shared with you before making your first payment.
• In case client wishes to prepone /postpone his or her travel dates, we request you to kindly reach us 30 days prior.
• Maldivian resorts will never accept duplicate bookings under a client's name.
• Any dispute arising out of such use of the website or services is subject to the laws of India (Delhi jurisdiction).
• Tripskyway Not Owns any additional expenses incurred due to any flight delay or cancellation, weather conditions, etc.`;

const CANCELLATION_POLICY = `CANCELLATION POLICY:
In the event of cancellation of tour/travel services due to any avoidable/unavoidable reason/s, we must be notified of the same in writing.

Cancellation charges will be as follows:
• 30 days prior to arrival: 100% of the Tour/service cost.
• The booking Amount is non-refundable 5k per person once the package is booked.
Note: Rooms and flights are subject to availability.`;

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
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text('Trip Sky Way', 140, 35);
  doc.font('Helvetica').fontSize(9).text('Curating inspired journeys', 140, 55);
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
        // For manual, try to get package info from lead.package (base) or quotation.package
        mainPackage = lead.package || quotation.package || {};
        console.log('[PDF] Using manual itinerary (by type) with', itineraryDays.length, 'days');
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
        // For manual itinerary, try to get package info from lead.package for images/inclusions
        mainPackage = lead.package || quotation.package || {};
        console.log('[PDF] Using manual itinerary (fallback) with', itineraryDays.length, 'days');
      }
      // 4. Fallback to regular package
      else {
        mainPackage = lead?.package || quotation.package || {};
        console.log('[PDF] Using regular package:', mainPackage.name);
      }

      const packageName = mainPackage.name || lead?.packageName || 'Custom Tour Package';
      const packageHighlights = mainPackage.highlights || [];
      const packageInclusions = mainPackage.inclusions || [];
      const packageExclusions = mainPackage.exclusions || [];

      // Intelligent Image Hunt: Try current package -> original package -> lead's package
      let coverImageUrl = mainPackage.coverImage?.url || mainPackage.images?.[0]?.url;

      // If no image in current package, check if it's a customization of an original package
      if (!coverImageUrl && mainPackage.originalPackage) {
        const orig = mainPackage.originalPackage;
        coverImageUrl = orig.coverImage?.url || orig.images?.[0]?.url;
        console.log('[PDF] Using image from original package');
      }

      // Fallback to lead's package if different and still no image
      if (!coverImageUrl && lead && lead.package && lead.package._id?.toString() !== mainPackage._id?.toString()) {
        const leadPkg = lead.package;
        coverImageUrl = leadPkg.coverImage?.url || leadPkg.images?.[0]?.url;
        console.log('[PDF] Using image from lead package');
      }

      console.log('[PDF] Cover image URL:', coverImageUrl);
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
        // Two Column Layout Logic
        let colIndex = 0; // 0 or 1
        let rowStartY = yPos;
        let maxRowH = 0;

        itineraryDays.forEach((day, index) => {
          // Check page break for new ROW
          if (colIndex === 0 && yPos > 650) {
            doc.addPage();
            yPos = 50;
            rowStartY = yPos;
            maxRowH = 0;
          }

          const colX = colIndex === 0 ? 50 : 310;
          const colW = 235;

          // Use local Y for this column, starting from rowStartY
          let localY = rowStartY;

          // Day Header
          const dayLabel = `Day ${day.dayNumber || index + 1}`;

          // Draw Box Background for Day Header
          doc.rect(colX, localY, colW, 25).fill(PALETTE.lightOrange);
          doc.fillColor(PALETTE.black).font('Helvetica-Bold').fontSize(11).text(dayLabel, colX + 10, localY + 7);

          // Add title if exists
          if (day.title) {
            localY += 28;
            doc.fillColor(PALETTE.darkGray).font('Helvetica-Bold').fontSize(9)
              .text(day.title, colX + 10, localY, { width: colW - 20 });
            localY += doc.heightOfString(day.title, { width: colW - 20 }) + 3;
          } else {
            localY += 35;
          }

          // Description
          if (day.description) {
            doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(8.5)
              .text(day.description, colX + 10, localY, { width: colW - 20 });
            localY += doc.heightOfString(day.description, { width: colW - 20 }) + 5;
          }

          // Locations
          if (day.locations && day.locations.length > 0) {
            doc.fillColor(PALETTE.darkGray).font('Helvetica-Bold').fontSize(8)
              .text('Locations:', colX + 10, localY);
            localY += 10;
            day.locations.forEach(loc => {
              doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(8)
                .text(`• ${loc}`, colX + 15, localY, { width: colW - 25 });
              localY += 10;
            });
            localY += 3;
          }

          // Activities
          if (day.activities && day.activities.length > 0) {
            doc.fillColor(PALETTE.darkGray).font('Helvetica-Bold').fontSize(8)
              .text('Activities:', colX + 10, localY);
            localY += 10;
            day.activities.forEach(activity => {
              doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(8)
                .text(`• ${activity}`, colX + 15, localY, { width: colW - 25 });
              localY += doc.heightOfString(`• ${activity}`, { width: colW - 25 }) + 2;
            });
            localY += 3;
          }

          // Places
          if (day.places && day.places.length > 0) {
            day.places.forEach(place => {
              if (place.name) {
                doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(8)
                  .text(`• ${place.name}`, colX + 15, localY, { width: colW - 25 });
                localY += doc.heightOfString(`• ${place.name}`, { width: colW - 25 }) + 2;
              }
            });
            localY += 3;
          }

          // Accommodation
          if (day.accommodation && day.accommodation.name) {
            doc.fillColor(PALETTE.darkGray).font('Helvetica-Bold').fontSize(8)
              .text(`Hotel: ${day.accommodation.name}`, colX + 10, localY, { width: colW - 20 });
            localY += 10;
          }

          // Transport
          if (day.transport) {
            doc.fillColor(PALETTE.gray).font('Helvetica').fontSize(8)
              .text(`Transport: ${day.transport}`, colX + 10, localY, { width: colW - 20 });
            localY += 10;
          }

          // Meals
          if (day.meals) {
            const mealsList = [];
            if (day.meals.breakfast) mealsList.push('Breakfast');
            if (day.meals.lunch) mealsList.push('Lunch');
            if (day.meals.dinner) mealsList.push('Dinner');

            if (mealsList.length > 0) {
              doc.fillColor(PALETTE.orange).fontSize(8).font('Helvetica-Bold')
                .text(`Meals: ${mealsList.join(', ')}`, colX + 10, localY);
              localY += 12;
            }
          }

          localY += 10; // Padding at bottom of day

          // Track max height for this row
          const colHeight = localY - rowStartY;
          if (colHeight > maxRowH) maxRowH = colHeight;

          // Move to next column or next row
          colIndex++;
          if (colIndex === 2) {
            colIndex = 0;
            yPos = rowStartY + maxRowH + 15; // Move to next row
            rowStartY = yPos;
            maxRowH = 0;
          }
        });

        // If we ended on column 1, move yPos down
        if (colIndex === 1) {
          yPos = rowStartY + maxRowH + 15;
        }
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

      // --- PAGE 3+: REVIEWS (Dynamic Google Style Cards) ---
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

      doc.fillColor(PALETTE.black).fontSize(14).font('Helvetica-Bold').text('Trip Sky Way', 80, summaryY + 5);
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
      const pd = PAYMENT_DETAILS;
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
      doc.rect(qrX + 8, qrY + 28, 95, 95).stroke(PALETTE.black);
      doc.fillColor(PALETTE.black).fontSize(8).text('UPI QR Code', qrX + 32, qrY + 70);
      doc.fillColor(PALETTE.black).fontSize(9).text(`UPI: ${pd.upiId}`, qrX, qrY + 135);
      doc.text(`Mobile: ${pd.phone}`, qrX, qrY + 150);

      yPos += payBoxH + 25;

      // Logos
      const logoY = yPos;
      const logoUrls = [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/200px-UPI-Logo-vector.svg.png',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Paytm_Logo_%28standalone%29.svg/200px-Paytm_Logo_%28standalone%29.svg.png'
      ];
      let lx = 50;
      for (const lUrl of logoUrls) {
        try {
          const img = await fetchImage(lUrl);
          if (img) {
            doc.image(img, lx, logoY, { height: 24 });
            lx += 75;
          }
        } catch (e) { }
      }
      yPos += 35;

      // --- LAST PAGE: TERMS, CANCELLATION, CONTACT ---
      doc.addPage();
      if (logo) {
        try {
          doc.image(logo, 50, 40, { width: 80 });
        } catch (e) { console.warn('Logo error:', e.message); }
      }
      yPos = 100;

      // Terms
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('TERMS & CONDITIONS', 50, yPos);
      yPos += 20;
      doc.fillColor(PALETTE.darkGray).font('Helvetica').fontSize(9);
      doc.text(TERMS_TEXT, 50, yPos, { align: 'justify', lineGap: 3 });
      yPos += doc.heightOfString(TERMS_TEXT, { width: 495, lineGap: 3 }) + 30;

      // Cancellation
      if (yPos > 600) { doc.addPage(); yPos = 50; }
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(14).text('CANCELLATION POLICY', 50, yPos);
      yPos += 20;
      doc.fillColor(PALETTE.darkGray).font('Helvetica').fontSize(9);
      doc.text(CANCELLATION_POLICY, 50, yPos, { align: 'justify', lineGap: 3 });
      yPos += doc.heightOfString(CANCELLATION_POLICY, { width: 495, lineGap: 3 }) + 40;

      // Contact Us Section
      if (yPos > 650) { doc.addPage(); yPos = 50; }

      doc.rect(0, yPos, 595, 150).fill(PALETTE.black); // Footer Block
      yPos += 30;
      doc.fillColor(PALETTE.orange).font('Helvetica-Bold').fontSize(18).text('CONTACT US', 0, yPos, { align: 'center' });
      yPos += 30;
      doc.fillColor(PALETTE.white).font('Helvetica').fontSize(10)
        .text('Our team is always there to serve you and suggest you what can suit your travel needs the best.', 100, yPos, { width: 395, align: 'center' });
      yPos += 30;
      doc.font('Helvetica-Bold').fontSize(14)
        .text('+91 9128446597   |   +91 8318693015', 0, yPos, { align: 'center' });
      yPos += 20;
      doc.fontSize(10).text('harsh@tripskyway.com  |  TRIPSKYWAY.COM', 0, yPos, { align: 'center' });


      // Footer Logic
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        drawFooterWave(doc);
        doc.fillColor(PALETTE.white).fontSize(10).text(`Page ${i + 1} of ${pages.count}`, 0, 822, { align: 'center' });
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
        doc.fontSize(22).font('Helvetica-Bold').fillColor(colors.textBlack).text('TRIP SKY WAY', 40, 40);
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
        { label: 'Company Name', value: 'Trip Sky Way Travel Solutions' },
        { label: 'Address', value: 'B-70, 2nd Floor, Dwarka,\nNew Delhi - 110075' },
        { label: 'Phone', value: '+91 98765 43210' },
        { label: 'Email', value: 'billing@tripskyway.com' },
        { label: 'GST No', value: '07ABCDE1234F1Z5' }
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

      const bankData = [
        ['Account Name', 'Trip Sky Way Travel Solutions'],
        ['Bank Name', 'HDFC BANK'],
        ['Account Number', '50200086889269'],
        ['IFSC Code', 'HDFC0001234'],
        ['Branch', 'Dwarka, New Delhi']
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
        .text('Trip Sky Way', signX, signY + 18, { width: 130, align: 'center' });

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
        doc.fontSize(24).font('Helvetica-Bold').fillColor(colors.textBlack).text('TRIP SKY WAY', 40, 40);
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
        { label: 'Company', value: 'Trip Sky Way Travel Solutions' },
        { label: 'Address', value: 'New Delhi - 110075' },
        { label: 'Email', value: 'accounts@tripskyway.com' },
        { label: 'Phone', value: '+91 98765 43210' }
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
      doc.text('Trip Sky Way Travel Solutions', 40, sigY + 25);

      doc.fillColor(colors.headerBlue).fontSize(12).font('Helvetica-Bold')
        .text('Thank you for your payment!', 300, sigY + 10, { align: 'right', width: 255 });

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (e) => reject(e));
    } catch (err) { reject(err); }
  });
}
