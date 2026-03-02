import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import BRANDING from '../config/branding.js';

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

// Helper: Fetch remote image with SSRF protection
const fetchImage = async (url) => {
  if (!url) return null;

  // SECURITY FIX: Validate URL to prevent SSRF attacks
  const ALLOWED_DOMAINS = [
    'res.cloudinary.com',
    'cloudinary.com',
    'localhost',
  ];

  // Handle relative paths (uploads) or full URLs
  const imageUrl = url;
  if (!url.startsWith('http')) {
    // Assuming local server or adjust base URL as needed.
    // Ideally, this should be a full URL/cloud storage link.
    // For now, if it's a relative path in uploads, we might try to read locally if possible,
    // otherwise we skip or try to construct a localhost URL if running locally?
    // Let's assume for production/cloud these are full URLs or we try to resolve against the server's public URL if configured.
    // For this environment, let's try to handle local file system if it starts with 'uploads/'
    if (url.startsWith('uploads/') || url.startsWith('/uploads/')) {
      const localPath = path.join(dirname, '../../', url.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      return null;
    }
    return null;
  }

  try {
    // Validate URL domain
    const urlObj = new URL(imageUrl);
    const isAllowed = ALLOWED_DOMAINS.some((domain) => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));

    if (!isAllowed) {
      console.warn('[Voucher PDF] Blocked request to untrusted domain:', urlObj.hostname);
      return null;
    }

    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    console.warn('[Voucher PDF] Failed to fetch image:', url);
    return null;
  }
};

// Modern Color Scheme - Teal/Slate Theme
const COLORS = {
  primary: '#0F766E', // Deep Teal
  primaryLight: '#14B8A6', // Light teal
  primaryDark: '#134E4A', // Dark teal
  secondary: '#1E293B', // Dark slate
  accent: '#F59E0B', // Amber gold
  accentLight: '#FEF3C7', // Light amber
  text: '#0F172A', // Near black
  textLight: '#64748B', // Gray text
  background: '#F8FAFC', // Light background
  white: '#FFFFFF',
  border: '#E2E8F0',
  accentBg: '#F0FDFA', // Light teal bg
};

const formatDate = (date) => {
  if (!date) return 'TBD';
  const locale = (process.env.CURRENCY_CODE === 'INR') ? 'en-IN' : 'en-US';
  return new Date(date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export async function generateVoucherPDF(voucher, lead) {
  // FIXED: Removed async from Promise constructor to prevent anti-pattern
  // All async operations are now handled before creating the Promise
  try {
    // --- ASSETS PRE-LOADING (async operations done first) ---
    const logoBuffer = loadLogo();

    // Get Package Image (Cover)
    const galleryImages = [];
    const pkg = voucher.package || voucher.customizedPackage || {};
    const packageDetails = voucher.packageDetails || {};

    // Determine Cover Image Source
    let coverImageUrl = null;
    if (packageDetails.coverImage?.url) {
      coverImageUrl = packageDetails.coverImage.url;
    } else if (pkg.coverImage) {
      coverImageUrl = pkg.coverImage?.url || (typeof pkg.coverImage === 'string' ? pkg.coverImage : null);
    }

    if (coverImageUrl) {
      await fetchImage(coverImageUrl);
    }

    // Determine Gallery Images Source
    let imagesSource = [];
    if (packageDetails.images && packageDetails.images.length > 0) {
      imagesSource = packageDetails.images;
    } else if (pkg.images && pkg.images.length > 0) {
      imagesSource = pkg.images;
    }

    // Fetch gallery images (limit to 3)
    if (imagesSource.length > 0) {
      const imagesToFetch = imagesSource.slice(0, 3);
      for (const img of imagesToFetch) {
        const imgUrl = img?.url || (typeof img === 'string' ? img : null);
        if (imgUrl) {
          const imgBuf = await fetchImage(imgUrl);
          if (imgBuf) galleryImages.push(imgBuf);
        }
      }
    }

    // Now create the Promise with all async work done
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 0,
          size: 'A4',
          bufferPages: true, // Enable buffer pages for improved performance if needed
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // --- LAYOUT CONSTANTS ---
        const margin = 40;
        const contentWidth = 595 - (margin * 2);
        let y = 0;

        // --- 1. MODERN HEADER SECTION ---
        // Two-tone header background
        doc.rect(0, 0, 595, 90).fill(COLORS.secondary);
        doc.rect(420, 0, 175, 90).fill(COLORS.primary);

        if (logoBuffer) {
          doc.image(logoBuffer, margin, 18, { height: 55 });

          // Company Name & Motto
          doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(18)
            .text(BRANDING.company.name, margin + 70, 28);

          doc.font('Helvetica').fontSize(9).fillColor('#94A3B8') // Light gray for motto
            .text(BRANDING.company.tagline || 'Premium Travel Experiences', margin + 70, 50);
        } else {
          doc.fillColor(COLORS.white).fontSize(20).font('Helvetica-Bold')
            .text(BRANDING.company.name, margin, 25);
          doc.font('Helvetica').fontSize(10).fillColor('#94A3B8')
            .text(BRANDING.company.tagline || 'Premium Travel Experiences', margin, 50);
        }

        // Voucher Title (Right side in teal section)
        doc.fontSize(14).font('Helvetica-Bold').fillColor(COLORS.white)
          .text('TRAVEL', 435, 25, { width: 145, align: 'center' })
          .text('VOUCHER', 435, 42, { width: 145, align: 'center' });

        // Voucher number badge
        doc.roundedRect(445, 65, 125, 18, 4).fill(COLORS.accent);
        doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold')
          .text(`#${voucher.voucherNumber || 'DRAFT'}`, 450, 69, { width: 115, align: 'center' });

        y = 100;

        // --- 2. PACKAGE INFO BANNER ---
        doc.rect(0, y, 595, 80).fill(COLORS.primaryDark);
        doc.fillColor(COLORS.white).fontSize(20).font('Helvetica-Bold')
          .text(packageDetails.name || 'Your Trip', margin, y + 25);
        doc.fontSize(11).font('Helvetica').fillColor(COLORS.accentLight)
          .text(`${packageDetails.destination || ''}  |  ${packageDetails.duration || 0} Days`, margin, y + 52);
        y += 95;

        // --- 3. TRIP INFO GRID ---
        // Grid configuration
        const col1X = margin;
        const col2X = 300;
        const startY = y;

        // Guest Details (Left Col)
        doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold').text('GUEST DETAILS', col1X, y);
        y += 15;
        doc.rect(col1X, y, 240, 0.5).fill(COLORS.border); // separator
        y += 10;

        doc.fillColor(COLORS.secondary).fontSize(12).font('Helvetica-Bold').text(voucher.customer?.name || lead.name || 'Guest', col1X, y);
        y += 15;
        doc.fillColor(COLORS.textLight).fontSize(10).font('Helvetica')
          .text(voucher.customer?.email || lead.email || '', col1X, y)
          .text(voucher.customer?.phone || lead.phone || '', col1X, y + 12);

        y += 30; // Spacing

        // Booking Details (Right Col)
        let rightY = startY;
        doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold').text('BOOKING DETAILS', col2X, rightY);
        rightY += 15;
        doc.rect(col2X, rightY, 240, 0.5).fill(COLORS.border);
        rightY += 10;

        // Data pairs helper
        const drawDataPair = (label, value, x, y) => {
          doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(label, x, y);
          doc.fillColor(COLORS.secondary).fontSize(10).font('Helvetica-Bold').text(value, x + 80, y);
        };

        drawDataPair('Check-in:', voucher.travelStartDate ? formatDate(voucher.travelStartDate) : 'TBD', col2X, rightY);
        rightY += 15;
        drawDataPair('Check-out:', voucher.travelEndDate ? formatDate(voucher.travelEndDate) : 'TBD', col2X, rightY);
        rightY += 15;
        drawDataPair('Status:', (voucher.status || 'DRAFT').toUpperCase(), col2X, rightY);
        rightY += 20;

        // Update main Y to below the lowest column
        y = Math.max(y, rightY) + 20;

        // --- 4. FLIGHT / TRANSPORT / LOCATION DETAILS ---
        // If we have location dates, show them nicely
        if (voucher.locationDates && voucher.locationDates.length > 0) {
          doc.roundedRect(margin, y, contentWidth, 30, 4).fill(COLORS.accentBg);
          doc.fillColor(COLORS.primaryDark).fontSize(11).font('Helvetica-Bold').text('HOTEL BOOKINGS & LOCATIONS', margin + 10, y + 9);
          y += 40;

          // Table Header
          doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica-Bold');
          doc.text('CITY / LOCATION', margin + 10, y);
          doc.text('HOTEL NAME', margin + 180, y);
          doc.text('CHECK-IN', margin + 340, y);
          doc.text('CHECK-OUT', margin + 430, y);
          y += 12;
          doc.rect(margin, y, contentWidth, 0.5).fill(COLORS.border);
          y += 10;

          // Table Rows
          doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
          voucher.locationDates.forEach((loc) => {
            // Check for page break
            if (y > 750) {
              doc.addPage();
              y = 50;
            }
            if (!loc.location) return;
            doc.text(loc.location, margin + 10, y, { width: 160 });
            doc.text(loc.hotelName || 'TBD', margin + 180, y, { width: 150 });
            doc.text(formatDate(loc.checkIn), margin + 340, y);
            doc.text(formatDate(loc.checkOut), margin + 430, y);
            y += 20;
          });
          y += 20;
        }

        // --- 5. ITINERARY SUMMARY (Enhanced UI) ---
        if (voucher.itinerarySummary && voucher.itinerarySummary.length > 0) {
          // Check for page break if starting new section near bottom
          if (y > 680) {
            doc.addPage();
            y = 50;
          }

          doc.roundedRect(margin, y, contentWidth, 30, 4).fill(COLORS.accentBg);
          doc.fillColor(COLORS.primaryDark).fontSize(11).font('Helvetica-Bold').text('DAY-BY-DAY ITINERARY', margin + 10, y + 9);
          y += 40;

          for (let i = 0; i < voucher.itinerarySummary.length; i++) {
            const day = voucher.itinerarySummary[i];

            // --- CALC HEIGHT ---
            const textWidth = contentWidth - 50;
            const titleHeight = 15;

            let locationHeight = 0;
            if (day.locations && day.locations.length > 0) {
              locationHeight = doc.heightOfString(`Location: ${day.locations.join(', ')}`, { width: textWidth }) + 5;
            }

            let activitiesHeight = 0;
            if (day.activities && day.activities.length > 0) {
              activitiesHeight = 12; // "Activities:" label

              if (day.activities.length >= 4) {
                // Two-column layout - calculate height for each column
                const columnWidth = (textWidth - 20) / 2;
                let leftHeight = 0;
                let rightHeight = 0;

                day.activities.forEach((activity, idx) => {
                  const actHeight = doc.heightOfString(`• ${activity}`, { width: columnWidth - 5 }) + 2;
                  if (idx % 2 === 0) {
                    leftHeight += actHeight;
                  } else {
                    rightHeight += actHeight;
                  }
                });

                activitiesHeight += Math.max(leftHeight, rightHeight) + 3;
              } else {
                // Single column for 1-3 activities
                day.activities.forEach((activity) => {
                  activitiesHeight += doc.heightOfString(`• ${activity}`, { width: textWidth - 10 }) + 2;
                });
                activitiesHeight += 3;
              }
            }

            let hotelHeight = 0;
            if (day.accommodation && day.accommodation.name) {
              hotelHeight = doc.heightOfString(`Hotel: ${day.accommodation.name}`, { width: textWidth }) + 5;
            }

            const cardPadding = 30; // Increased padding for better spacing
            const cardHeight = titleHeight + 3 + locationHeight + 2 + activitiesHeight + hotelHeight + cardPadding;

            // --- PAGE BREAK CHECK ---
            if (y + cardHeight > 750) {
              doc.addPage();
              y = 50;
            }

            // Day card with subtle background
            // --- RENDER ---
            // Background (Light teal with teal border)
            doc.roundedRect(margin, y, contentWidth, cardHeight, 5).fillAndStroke(COLORS.accentBg, COLORS.primaryLight);

            // Badge
            doc.circle(margin + 15, y + 20, 12).fill(COLORS.primary);
            doc.fillColor(COLORS.white).fontSize(10).font('Helvetica-Bold')
              .text(day.dayNumber.toString(), margin + 10, y + 15, { width: 10, align: 'center' });

            let currentTextY = y + 15;

            // Title
            doc.fillColor(COLORS.secondary).fontSize(11).font('Helvetica-Bold')
              .text(day.title || `Day ${day.dayNumber}`, margin + 35, currentTextY, { width: textWidth });
            currentTextY += titleHeight + 3; // Extra spacing after title

            // Location
            if (locationHeight > 0) {
              doc.font('Helvetica-Bold').fillColor(COLORS.textLight).fontSize(9)
                .text('Location: ', margin + 35, currentTextY, { continued: true })
                .font('Helvetica')
                .text(day.locations.join(', '), { width: textWidth });
              currentTextY += locationHeight + 2;
            }

            // Activities - Display ALL activities with smart two-column layout
            if (activitiesHeight > 0 && day.activities && day.activities.length > 0) {
              doc.font('Helvetica-Bold').fillColor(COLORS.text).fontSize(9)
                .text('Activities:', margin + 35, currentTextY);
              currentTextY += 12;

              // Use two columns if there are 4+ activities
              if (day.activities.length >= 4) {
                const columnWidth = (textWidth - 20) / 2; // Two columns with gap
                const leftColumnX = margin + 45;
                const rightColumnX = margin + 45 + columnWidth + 10; // 10px gap

                let leftY = currentTextY;
                let rightY = currentTextY;

                day.activities.forEach((activity, idx) => {
                  const isLeftColumn = idx % 2 === 0;
                  const xPos = isLeftColumn ? leftColumnX : rightColumnX;
                  const currentY = isLeftColumn ? leftY : rightY;

                  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
                    .text(`• ${activity}`, xPos, currentY, { width: columnWidth - 5 });
                  const activityHeight = doc.heightOfString(`• ${activity}`, { width: columnWidth - 5 });

                  if (isLeftColumn) {
                    leftY += activityHeight + 2;
                  } else {
                    rightY += activityHeight + 2;
                  }
                });

                // Move currentTextY to the bottom of the tallest column
                currentTextY = Math.max(leftY, rightY) + 3;
              } else {
                // Single column for 1-3 activities
                day.activities.forEach((activity) => {
                  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text)
                    .text(`• ${activity}`, margin + 45, currentTextY, { width: textWidth - 10 });
                  const activityHeight = doc.heightOfString(`• ${activity}`, { width: textWidth - 10 });
                  currentTextY += activityHeight + 2;
                });
                currentTextY += 3; // Extra spacing after activities
              }
            }

            // Hotel
            if (hotelHeight > 0) {
              doc.font('Helvetica-Bold').fillColor(COLORS.primaryDark).fontSize(9)
                .text('Hotel: ', margin + 35, currentTextY, { continued: true })
                .font('Helvetica')
                .text(day.accommodation.name, { width: textWidth });
              currentTextY += hotelHeight;
            }

            y += cardHeight + 15; // Gap
          }
          y += 20;
        }

        // --- 6. MEAL PLANS ---
        if (voucher.mealPlans && voucher.mealPlans.some((m) => m.breakfast || m.lunch || m.dinner)) {
          // Check for page break
          if (y > 650) {
            doc.addPage();
            y = 50;
          }

          doc.roundedRect(margin, y, contentWidth, 30, 4).fill(COLORS.accentBg);
          doc.fillColor(COLORS.primaryDark).fontSize(11).font('Helvetica-Bold').text('MEAL PLAN', margin + 10, y + 9);
          y += 40;

          doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
          voucher.mealPlans.forEach((plan) => {
            const meals = [];
            if (plan.breakfast) meals.push('Breakfast');
            if (plan.lunch) meals.push('Lunch');
            if (plan.dinner) meals.push('Dinner');

            if (meals.length > 0) {
              if (y > 750) {
                doc.addPage();
                y = 50;
              }
              doc.font('Helvetica-Bold').text(`Day ${plan.dayNumber}: `, margin + 10, y, { continued: true });
              doc.font('Helvetica').text(meals.join(', '));
              y += 15;
            }
          });
          y += 30;
        }

        // Check for page break
        if (y > 650) {
          doc.addPage();
          y = 50;
        }

        // --- 7. INCLUSIONS & EXCLUSIONS (Side by side) ---
        const hasInclusions = packageDetails.inclusions && packageDetails.inclusions.length > 0;
        const hasExclusions = packageDetails.exclusions && packageDetails.exclusions.length > 0;

        if (hasInclusions || hasExclusions) {
          const startListY = y;

          // Inclusions
          if (hasInclusions) {
            doc.fillColor(COLORS.primary).fontSize(11).font('Helvetica-Bold').text('INCLUSIONS', margin, y);
            y += 15;
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
            packageDetails.inclusions.forEach((item) => {
              if (typeof item === 'string') {
                doc.text(`•  ${item}`, { width: 240 });
              }
            });
          }

          // Exclusions
          let rightListY = startListY;
          if (hasExclusions) {
            doc.fillColor(COLORS.primary).fontSize(11).font('Helvetica-Bold').text('EXCLUSIONS', 300, rightListY);
            rightListY += 15;
            doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
            packageDetails.exclusions.forEach((item) => {
              if (typeof item === 'string') {
                doc.text(`•  ${item}`, 300, rightListY, { width: 240 });
                rightListY += doc.heightOfString(`•  ${item}`, { width: 240 });
              }
            });
          }

          y = Math.max(y, rightListY) + 30;
        }

        // --- 8. GALLERY SECTION (Commented out as requested) ---
        // if (galleryImages.length > 0) {
        //   // Check space
        //   if (y + 150 > 750) {
        //     doc.addPage();
        //     y = 50;
        //   }
        //
        //   doc.fillColor(COLORS.primary).fontSize(11).font('Helvetica-Bold').text('EXPERIENCE', margin, y);
        //   y += 20;
        //
        //   const imgWidth = 160;
        //   const imgGap = 15;
        //   let imgX = margin;
        //
        //   galleryImages.forEach(imgBuf => {
        //     doc.image(imgBuf, imgX, y, { width: imgWidth, height: 100, fit: [imgWidth, 100] });
        //     imgX += imgWidth + imgGap;
        //   });
        //
        //   y += 120;
        // }

        // --- 8. SPECIAL INSTRUCTIONS ---
        if (voucher.specialInstructions && voucher.specialInstructions.trim() !== '') {
          // Check for page break
          if (y > 650) {
            doc.addPage();
            y = 50;
          }

          doc.roundedRect(margin, y, contentWidth, 30, 4).fill('#FEF3C7');
          doc.fillColor('#92400E').fontSize(11).font('Helvetica-Bold').text('SPECIAL INSTRUCTIONS', margin + 10, y + 9);
          y += 40;

          doc.fillColor(COLORS.text).fontSize(10).font('Helvetica')
            .text(voucher.specialInstructions, margin + 10, y, { width: contentWidth - 20, align: 'left' });
          y += doc.heightOfString(voucher.specialInstructions, { width: contentWidth - 20 }) + 30;
        }

        // --- 9. FOOTER ---
        // Ensure footer is at bottom
        doc.rect(0, 780, 595, 62).fill(COLORS.secondary);
        doc.fillColor(COLORS.white).fontSize(10).font('Helvetica-Bold')
          .text(`Thank you for choosing ${BRANDING.company.name}!`, 0, 795, { align: 'center' });
        doc.fontSize(8).font('Helvetica')
          .text(`${BRANDING.urls.website.replace('https://', '').replace('http://', '')}  |  ${BRANDING.contact.supportEmail}`, 0, 810, { align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    // Handle errors from async operations (image fetching, etc.)
    throw error;
  }
}
