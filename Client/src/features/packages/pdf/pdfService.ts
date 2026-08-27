/**
 * PDF generation service for itineraries
 * Enhanced with professional layout, images, and visual appeal
 * Aligned with backend day-based structure
 * Fetches complete package data from API for accurate information
 */

import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { PDF_CONFIG } from './constants';
import { getPackageEnvelope } from '../../../services/api/packages';
import { formatCurrency } from '../../../lib/currency';
import { PALETTE, hexToRgb } from '../../../config/theme';

interface PdfDay {
  dayNumber?: number | string;
  day?: number | string;
  title?: string;
  description?: string;
  images?: Array<{ url?: string } | string>;
  places?: Array<{ place?: { name?: string }; customName?: string }>;
  locations?: string[];
  location?: string;
  activities?: Array<{ activity?: { name?: string } } | string>;
  timeline?: Array<{
    label?: string;
    timeOfDay?: string;
    time?: string;
    title?: string;
    description?: string;
    summary?: string;
    detail?: string;
    activity?: string;
    notes?: string;
  }>;
  morning?: string;
  afternoon?: string;
  evening?: string;
  night?: string;
  meals?: { breakfast?: boolean; lunch?: boolean; dinner?: boolean; snacks?: boolean };
  breakfastCount?: number;
  lunchCount?: number;
  dinnerCount?: number;
  accommodation?: { name?: string; type?: string; rating?: number } | string;
  transports?: Array<{ transportMode?: string; pricingModel?: string }>;
  transport?: string;
  notes?: string;
}

export interface PdfPackageData {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  destination?: string;
  country?: string;
  region?: string;
  category?: string;
  tagline?: string;
  theme?: string;
  difficulty?: string;
  duration?: number | string;
  maxGroupSize?: number | string;
  price?: number | string;
  priceNotes?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  terms?: string[];
  images?: Array<{ url?: string } | string>;
  itineraryDays?: PdfDay[] | Record<string, PdfDay[]>;
  days?: PdfDay[];
  itinerary?: { days?: PdfDay[] };
  [key: string]: unknown;
}

interface PdfImages {
  packageImages: Array<string | null>;
  dayImages: Record<string, string>;
  brandLogo?: string | null;
}

/**
 * Formats a currency value for PDF rendering. Wraps the shared
 * `formatCurrency` from `lib/currency.ts` (which formats missing/invalid
 * values as `0`) to restore the PDF layout's "On request" fallback for
 * absent prices.
 */
export const formatCurrencyForPdf = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') {
    return 'On request';
  }
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric)) {
    return 'On request';
  }
  return formatCurrency(numeric);
};

/**
 * Load image and convert to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 image data
 */
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataURL);
      } catch (error) {
        console.warn('Failed to convert image:', error);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Failed to load image:', url);
      resolve(null);
    };

    img.src = url;
  });
};

/**
 * Load all package and itinerary images
 * @param {object} pkg - Package object
 * @returns {Promise<object>} Object containing loaded images
 */
const loadPackageImages = async (pkg: PdfPackageData): Promise<PdfImages> => {
  const images: PdfImages = {
    packageImages: [],
    dayImages: {}
  };

  try {
    // Load main package images
    if (pkg.images && Array.isArray(pkg.images) && pkg.images.length > 0) {
      const imagePromises = pkg.images.slice(0, 4).map(img => {
        const url = typeof img === 'string' ? img : (img.url || '');
        return loadImageAsBase64(url);
      });

      const loadedImages = await Promise.all(imagePromises);
      images.packageImages = loadedImages.filter(img => img !== null);
    }

    // Load day-specific images
    const dayEntries = pkg.itineraryDays || pkg.days || pkg.itinerary?.days || [];
    if (Array.isArray(dayEntries) && dayEntries.length > 0) {
      for (const day of dayEntries) {
        if (day.images && Array.isArray(day.images) && day.images.length > 0) {
          const dayNumber = day.dayNumber || day.day;
          const dayImageUrl = (typeof day.images[0] === 'string' ? day.images[0] : day.images[0].url) || '';
          const loadedImage = await loadImageAsBase64(dayImageUrl);
          if (loadedImage) {
            images.dayImages[dayNumber] = loadedImage;
          }
        }
      }
    }

    console.log('[PDF Service] Loaded images:', {
      packageImages: images.packageImages.length,
      dayImages: Object.keys(images.dayImages).length
    });
  } catch (error) {
    console.warn('[PDF Service] Error loading images:', error);
  }

  return images;
};

const BRAND_LOGO_PATH = '/logo.png';

const loadBrandLogo = async (): Promise<string | null> => {
  try {
    return await loadImageAsBase64(BRAND_LOGO_PATH);
  } catch (error) {
    console.warn('[PDF Service] Could not load brand logo:', error);
    return null;
  }
};

/**
 * Generate and download PDF for a package
 * @param {object} pkg - Package object
 */
export const generateAndDownloadPDF = async (pkg: PdfPackageData): Promise<void> => {
  try {
    Swal.fire({
      title: 'Generating PDF...',
      html: 'Please wait while we create your beautiful itinerary',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const { blob, fileName } = await createPackagePdfBlob(pkg, {
      fetchLatest: true,
    });

    Swal.close();

    if (blob) {
      const downloadLink = document.createElement('a');
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadLink.href);
    }

    Swal.fire({
      icon: 'success',
      title: 'PDF Generated!',
      text: 'Your itinerary has been downloaded successfully.',
      confirmButtonColor: '#4682b4',
    });
  } catch (error) {
    console.error('[PDF Service] Error in generateAndDownloadPDF:', error);
    Swal.close();
    Swal.fire('Error', 'Failed to generate PDF. Please try again.', 'error');
  }
};

// NOTE: cover-page fields below (pkg.name, pkg.price, pkg.terms, pkg.highlights,
// pkg.maxGroupSize, pkg.duration) still reference the pre-relational package shape;
// serializePackage() actually returns title/basePrice/sellPrice/termsAndConditions
// (string)/inclusions/exclusions/durationDays. This degrades gracefully today
// ("On Request", empty terms section) rather than breaking, so it was left as a
// known gap out of scope for the itinerary-shape fix — see plan history.
function buildPDFDocument(pkg: PdfPackageData, images: PdfImages) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;
    let pageNumber = 1;

    const palette: Record<string, [number, number, number]> = {
      background: [249, 250, 251],
      secondaryBackground: [209, 213, 219],
      primaryText: [31, 41, 55],
      secondaryText: [75, 85, 99],
      mutedText: [107, 114, 128],
      accent: hexToRgb(PALETTE.brand[600]),
      accentDark: hexToRgb(PALETTE.brandAccent[500]),
      badgeBg: hexToRgb(PALETTE.brand[600]),
      badgeText: [255, 255, 255],
      cardBg: [245, 245, 245],
      cardBorder: [156, 163, 175],
      pillBg: [209, 213, 219],
      timeline: [0, 0, 0],
    };

    const sectionGap = 1; // minimal spacing between stacked sections
    const footerHeight = 18;
    const bottomPadding = footerHeight + 2;

    const ITINERARY_DAY_IMAGE_HEIGHT = 46;
    const ITINERARY_DAY_IMAGE_PADDING = 2;
    const ITINERARY_DAY_CARD_IMAGE_SIZE = 30;

    const setBodyFont = () => {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...palette.secondaryText);
      doc.setFontSize(10);
    };

    const applyPageBackground = () => {
      doc.setFillColor(...palette.background);
      doc.rect(0, 0, pageWidth, pageHeight, 'F')
    };

    const addFooter = () => {
      const footerTop = pageHeight - footerHeight;

      doc.setDrawColor(...palette.timeline);
      doc.setLineWidth(0.5);
      doc.line(margin, footerTop, pageWidth - margin, footerTop);

      doc.setFontSize(9);
      doc.setTextColor(...palette.secondaryText);
      doc.setFont(undefined, 'bold');
      doc.text(PDF_CONFIG.company, margin, footerTop + 6);

      doc.setFont(undefined, 'normal');
      doc.setTextColor(...palette.mutedText);
      const contactText = `${PDF_CONFIG.email}  |  ${PDF_CONFIG.phone}`;
      doc.text(contactText, pageWidth - margin, footerTop + 6, { align: 'right' });

      doc.setFontSize(8);
      doc.setTextColor(...palette.secondaryText);
      doc.text(`Page ${pageNumber}`, pageWidth / 2, footerTop + 6, { align: 'center' });

      pageNumber += 1;
    };

    const addSectionGap = (amount = sectionGap) => {
      yPos += amount;
    };

    const ensureSpace = (requiredSpace) => {
      const usableHeight = pageHeight - margin - bottomPadding;
      let spaceNeeded = requiredSpace;
      if (spaceNeeded > usableHeight) {
        spaceNeeded = usableHeight;
      }
      if (yPos + spaceNeeded > pageHeight - bottomPadding) {
        addFooter();
        doc.addPage();
        applyPageBackground();
        yPos = margin;
        return true;
      }
      return false;
    };

    const normalizeDays = () => {
      const rawDays = pkg.itineraryDays || pkg.days || pkg.itinerary?.days || [];
      if (Array.isArray(rawDays)) {
        return rawDays.slice().sort((a, b) => {
          const aDay = Number(a.dayNumber ?? a.day ?? 0);
          const bDay = Number(b.dayNumber ?? b.day ?? 0);
          return aDay - bDay;
        });
      }
      return Object.values(rawDays)
        .flat()
        .sort((a, b) => {
          const aDay = Number(a.dayNumber ?? a.day ?? 0);
          const bDay = Number(b.dayNumber ?? b.day ?? 0);
          return aDay - bDay;
        });
    };

    // Package API (serializePackage) returns day.places/day.activities as relational
    // objects ({ place: { name }, customName } / { activity: { name } }); older/local
    // editor state may still carry flat string[] (day.locations/day.activities). Both
    // are supported here so the PDF renders correctly regardless of the source shape.
    const getLocationNames = (day: PdfDay) => {
      if (Array.isArray(day.places) && day.places.length) {
        return day.places.map((p) => p?.place?.name || p?.customName).filter(Boolean);
      }
      const legacy = Array.isArray(day.locations) ? day.locations : (day.location ? [day.location] : []);
      return legacy.map((l) => String(l).trim()).filter(Boolean);
    };

    const getActivityNames = (day: PdfDay) => {
      if (Array.isArray(day.activities) && day.activities.length && day.activities[0] && typeof day.activities[0] === 'object' && 'activity' in day.activities[0]) {
        return day.activities.map((a) => (a as { activity?: { name?: string } }).activity?.name).filter(Boolean);
      }
      return (Array.isArray(day.activities) ? day.activities : []).map((a) => String(a).trim()).filter(Boolean);
    };

    const getDaySegments = (day: PdfDay) => {
      const segments = [];
      if (Array.isArray(day.timeline)) {
        day.timeline.forEach((segment) => {
          if (!segment) return;
          const label =
            segment.label ||
            segment.timeOfDay ||
            segment.time ||
            segment.title ||
            'Experience';
          const description =
            segment.description ||
            segment.summary ||
            segment.detail ||
            segment.activity ||
            segment.notes;
          if (description) {
            segments.push({
              label,
              description: String(description).trim(),
            });
          }
        });
      }
      (['morning', 'afternoon', 'evening', 'night'] as const).forEach((period) => {
        if (day[period]) {
          segments.push({
            label: period,
            description: String(day[period]).trim(),
          });
        }
      });
      const activityNames = getActivityNames(day);
      if (!segments.length && activityNames.length) {
        segments.push({
          label: 'Highlights',
          description: activityNames.join(', '),
        });
      }
      if (!segments.length && day.description) {
        segments.push({
          label: 'Overview',
          description: String(day.description).trim(),
        });
      }
      return segments.slice(0, 4);
    };

    const getMealsText = (day: PdfDay) => {
      if (day?.meals && typeof day.meals === 'object') {
        const legacy = [];
        if (day.meals.breakfast) legacy.push('Breakfast');
        if (day.meals.lunch) legacy.push('Lunch');
        if (day.meals.dinner) legacy.push('Dinner');
        if (day.meals.snacks) legacy.push('Snacks');
        if (legacy.length) return `Meals: ${legacy.join(', ')}`;
      }
      const counts = [];
      if (day?.breakfastCount > 0) counts.push('Breakfast');
      if (day?.lunchCount > 0) counts.push('Lunch');
      if (day?.dinnerCount > 0) counts.push('Dinner');
      return counts.length ? `Meals: ${counts.join(', ')}` : null;
    };

    const drawSectionHeading = (title, subtitle) => {
      ensureSpace(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...palette.primaryText);
      doc.setFontSize(15);
      doc.text(title.toUpperCase(), margin, yPos + 3);
      doc.setDrawColor(...palette.timeline);
      doc.setLineWidth(0.6);
      doc.line(margin, yPos + 4.5, margin + 60, yPos + 4.5);
      if (subtitle) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...palette.mutedText);
        const subLines = doc.splitTextToSize(subtitle, contentWidth);
        doc.text(subLines, margin, yPos + 10);
        yPos += subLines.length * 4.5 + 10;
      } else {
        yPos += 8;
      }
      setBodyFont();
    };

    const drawBulletListCard = (title, items, options: { innerPadding?: number; bulletColor?: [number, number, number] } = {}) => {
      const { innerPadding: customPadding, bulletColor = palette.accent } = options;
      const sanitizedItems = (items || [])
        .map((item) => String(item).trim())
        .filter(Boolean);

      if (!sanitizedItems.length) {
        return;
      }

      const innerPadding = customPadding ?? 16;
      const innerWidth = contentWidth - innerPadding * 2;

      const lineSets = sanitizedItems.map((item) => doc.splitTextToSize(item, innerWidth - 12));

      const headingHeight = 11;
      let contentHeight = 0;
      lineSets.forEach((lines) => {
        contentHeight += lines.length * 5.2 + 6;
      });
      const cardHeight = innerPadding * 2 + headingHeight + contentHeight;

      ensureSpace(cardHeight);
      doc.setFillColor(...palette.cardBg);
      doc.setDrawColor(...palette.cardBorder);
      doc.roundedRect(margin, yPos, contentWidth, cardHeight, 10, 10, 'FD');

      const textX = margin + innerPadding;
      let cursorY = yPos + innerPadding + 8;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...palette.primaryText);
      doc.text(title, textX, cursorY);

      cursorY += 12;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11.5);
      doc.setTextColor(...palette.secondaryText);
      lineSets.forEach((lines) => {
        const bulletCenterY = cursorY - 2;
        doc.setFillColor(...bulletColor);
        doc.circle(textX, bulletCenterY, 2, 'F');
        doc.text(lines, textX + 8, cursorY);
        cursorY += lines.length * 5.2 + 4;
      });

      yPos += cardHeight;
      addSectionGap();
      setBodyFont();
    };

    const drawOverviewHighlightsCard = (overview, highlightItems, options: { innerPadding?: number } = {}) => {
      const { innerPadding: customPadding } = options;
      const summaryText =
        overview ||
        `Experience a bespoke journey with guided experiences, curated stays, and unforgettable highlights in ${pkg.destination || 'your chosen destination'
        }.`;

      const sanitizedHighlights = (
        Array.isArray(highlightItems) && highlightItems.length
          ? highlightItems
          : [
            `Guided explorations of ${pkg.destination || 'signature attractions'}`,
            'Curated accommodations with local character',
            'Authentic culinary experiences & cultural immersions',
            'Dedicated travel specialist and concierge support',
          ]
      )
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 6);

      const innerPadding = customPadding ?? 16;
      const innerWidth = contentWidth - innerPadding * 2;
      const overviewFontSize = 13;

      // Trip Overview card
      doc.setFont(undefined, 'normal');
      doc.setFontSize(overviewFontSize);
      const overviewLines = doc.splitTextToSize(summaryText, innerWidth);
      const overviewDimensions = doc.getTextDimensions(overviewLines);
      const overviewTextHeight = overviewDimensions.h;
      const overviewHeadingHeight = 12;
      const overviewSpacing = 10;
      const overviewCardHeight =
        innerPadding * 2 + overviewHeadingHeight + overviewSpacing + overviewTextHeight;

      ensureSpace(overviewCardHeight);
      doc.setFillColor(...palette.cardBg);
      doc.setDrawColor(...palette.cardBorder);
      doc.roundedRect(margin, yPos, contentWidth, overviewCardHeight, 10, 10, 'FD');

      const overviewX = margin + innerPadding;
      let overviewCursorY = yPos + innerPadding + 8;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...palette.primaryText);
      doc.text('Trip Overview', overviewX, overviewCursorY);

      overviewCursorY += overviewSpacing;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(overviewFontSize);
      doc.setTextColor(...palette.secondaryText);
      doc.text(overviewLines, overviewX, overviewCursorY, {
        align: 'justify',
        maxWidth: innerWidth,
      });

      yPos += overviewCardHeight;
      addSectionGap();
      setBodyFont();

      return { highlightItems: sanitizedHighlights, innerPadding };
    };

    const drawBrandHeader = (logoData) => {
      const headerHeight = 28;
      const headerY = Math.max(8, margin - 4);
      const headerX = margin;
      const headerWidth = contentWidth;

      doc.setFillColor(...hexToRgb(PALETTE.brandDark[950]));
      doc.roundedRect(headerX, headerY, headerWidth, headerHeight, 6, 6, 'F');

      let cursorX = headerX + 14;

      if (logoData) {
        const logoHeight = 14;
        const logoWidth = 56;
        try {
          doc.addImage(
            logoData,
            'PNG',
            cursorX,
            headerY + (headerHeight - logoHeight) / 2,
            logoWidth,
            logoHeight,
          );
          cursorX += logoWidth + 14;
        } catch (error) {
          console.warn('Failed to draw brand logo in header:', error);
        }
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(PDF_CONFIG.company, cursorX, headerY + 14);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(210, 210, 210);
      doc.text(PDF_CONFIG.tagline, cursorX, headerY + 21);

      setBodyFont();
      return headerY + headerHeight;
    };

    const drawDayCard = (day: PdfDay, index: number) => {
      const dayNumber = day.dayNumber ?? day.day ?? index + 1;
      const dayTitle = day.title || `Curated Experience`;
      const locationText = getLocationNames(day).join(' • ');

      const segments = getDaySegments(day).map((segment) => ({
        ...segment,
        label: String(segment.label || 'Experience').toUpperCase(),
      }));

      const supportingNotes = [];
      if (typeof day.accommodation === 'object' && day.accommodation !== null && day.accommodation.name) {
        const accommodationParts = [
          day.accommodation.name,
          day.accommodation.type && `(${day.accommodation.type})`,
        ]
          .filter(Boolean)
          .join(' ');
        supportingNotes.push(`Stay: ${accommodationParts}`);
      } else if (typeof day.accommodation === 'string') {
        supportingNotes.push(`Stay: ${day.accommodation}`);
      }
      const mealsText = getMealsText(day);
      if (mealsText) supportingNotes.push(mealsText);
      // NOTE: day.flights (Json array from serializePackage) is not rendered anywhere
      // in this generator — pre-existing feature gap, out of scope for this fix.
      if (Array.isArray(day.transports) && day.transports.length) {
        const t = day.transports[0];
        if (t?.transportMode) {
          const transportText = String(t.transportMode);
          const label = `${transportText.charAt(0).toUpperCase()}${transportText.slice(1)}`;
          supportingNotes.push(`Transfers: ${label}${t.pricingModel ? ` (${t.pricingModel})` : ''}`);
        }
      } else if (day.transport) {
        const transportText = String(day.transport);
        supportingNotes.push(`Transfers: ${transportText.charAt(0).toUpperCase()}${transportText.slice(1)}`);
      }

      const noteLines = day.notes
        ? doc.splitTextToSize(`Note: ${String(day.notes).trim()}`, contentWidth - 60)
        : [];

      const locationLines = locationText
        ? doc.splitTextToSize(locationText, contentWidth - 120)
        : [];

      const segmentWidth = contentWidth - 60;
      const enrichedSegments = segments.map((segment) => ({
        ...segment,
        lines: doc.splitTextToSize(segment.description, segmentWidth),
      }));

      const supportingLines = supportingNotes.length
        ? doc.splitTextToSize(supportingNotes.join('  •  '), segmentWidth)
        : [];

      let estimatedHeight = 52;
      estimatedHeight += locationLines.length ? locationLines.length * 4.2 + 3 : 0;
      enrichedSegments.forEach((segment) => {
        estimatedHeight += segment.lines.length * 4.4 + 10;
      });
      estimatedHeight += supportingLines.length ? supportingLines.length * 4.4 + 6 : 0;
      estimatedHeight += noteLines.length ? noteLines.length * 4.2 + 4 : 0;

      const cardImage = images.dayImages?.[dayNumber] || images.packageImages?.[index + 1] || null;

      ensureSpace(estimatedHeight + 4);
      const cardTop = yPos;

      doc.setFillColor(...palette.cardBg);
      doc.setDrawColor(...palette.cardBorder);
      doc.roundedRect(margin, cardTop, contentWidth, estimatedHeight, 12, 12, 'FD');

      // Timeline spine
      doc.setDrawColor(...palette.timeline);
      doc.setLineWidth(1);
      doc.line(margin + 18, cardTop + 26, margin + 18, cardTop + estimatedHeight - 18);

      // Day badge
      doc.setFillColor(...palette.badgeBg);
      doc.circle(margin + 18, cardTop + 26, 9, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...palette.badgeText);
      doc.text(`DAY ${dayNumber}`, margin + 18, cardTop + 27.5, { align: 'center' });

      // Optional image
      const imageSize = ITINERARY_DAY_CARD_IMAGE_SIZE;
      const imageX = margin + contentWidth - imageSize - 12;
      const imageY = cardTop + 12;
      if (cardImage) {
        try {
          doc.addImage(cardImage, 'JPEG', imageX + 1.5, imageY + 1.5, imageSize - 3, imageSize - 3);
        } catch (error) {
          console.warn('Error adding day image:', error);
          doc.setFillColor(...palette.pillBg);
          doc.roundedRect(imageX + 1.5, imageY + 1.5, imageSize - 3, imageSize - 3, 16, 16, 'F');
        }
      } else {
        doc.setFillColor(...palette.pillBg);
        doc.roundedRect(imageX + 1.5, imageY + 1.5, imageSize - 3, imageSize - 3, 16, 16, 'F');
        doc.setFont(undefined, 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...palette.mutedText);
        doc.text('Image\npending', imageX + imageSize / 2, imageY + imageSize / 2 - 1, {
          align: 'center',
        });
      }

      // Day heading
      doc.setFont(undefined, 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...palette.primaryText);
      doc.text(dayTitle, margin + 36, cardTop + 18);
      if (locationLines.length) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...palette.mutedText);
        doc.text(locationLines, margin + 36, cardTop + 26);
      }

      let cursorY = cardTop + 36 + locationLines.length * 4.2;
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...palette.secondaryText);
      doc.setFontSize(10);

      enrichedSegments.forEach((segment, segIndex) => {
        const markerY = cursorY + 6;
        doc.setFillColor(...palette.accent);
        doc.circle(margin + 18, markerY, 2.2, 'F');

        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...palette.accentDark);
        doc.text(segment.label, margin + 36, cursorY + 4);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...palette.secondaryText);
        doc.text(segment.lines, margin + 36, cursorY + 9);
        cursorY += segment.lines.length * 4.4 + 12;

        if (segIndex === enrichedSegments.length - 1) {
          doc.setDrawColor(...palette.timeline);
          doc.setLineWidth(0.5);
          doc.circle(margin + 18, markerY, 2.3, 'S');
        }
      });

      if (supportingLines.length) {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...palette.accentDark);
        doc.text('Extras', margin + 36, cursorY);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...palette.secondaryText);
        doc.text(supportingLines, margin + 36, cursorY + 5);
        cursorY += supportingLines.length * 4.4 + 8;
      }

      if (noteLines.length) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...palette.mutedText);
        doc.text(noteLines, margin + 36, cursorY + 2);
        cursorY += noteLines.length * 4.2 + 4;
      }

      yPos = cardTop + estimatedHeight;
      setBodyFont();
    };

    const renderTerms = () => {
      if (!pkg.terms || !pkg.terms.length) return;
      drawSectionHeading('Important Notes', 'Key information for a seamless experience');
      setBodyFont();
      pkg.terms.forEach((term, index) => {
        const termText = `${index + 1}. ${String(term).trim()}`;
        const lines = doc.splitTextToSize(termText, contentWidth - 4);
        ensureSpace(lines.length * 4.6 + 6);
        doc.text(lines, margin + 2, yPos);
        yPos += lines.length * 4.6 + 6;
      });
    };

    // Cover Page
    applyPageBackground();
    setBodyFont();

    const destinationTitle =
      pkg.destination ||
      pkg.name ||
      pkg.country ||
      (pkg.region && `${pkg.region} Getaway`) ||
      'Signature Escape';
    const durationText =
      typeof pkg.duration === 'string'
        ? pkg.duration
        : pkg.duration
          ? `${pkg.duration} Day Trip`
          : `${normalizeDays().length || 5} Day Trip`;

    const headerBottom = drawBrandHeader(images.brandLogo);

    const heroHeight = 90;
    const heroX = margin;
    const heroY = headerBottom + 6;
    if (images.packageImages?.[0]) {
      try {
        doc.addImage(
          images.packageImages[0],
          'JPEG',
          heroX,
          heroY,
          contentWidth,
          heroHeight,
        );
      } catch (error) {
        console.warn('Error adding cover image:', error);
        doc.setFillColor(...palette.secondaryBackground);
        doc.roundedRect(heroX, heroY, contentWidth, heroHeight, 12, 12, 'F');
      }
    } else {
      doc.setFillColor(...palette.secondaryBackground);
      doc.roundedRect(heroX, heroY, contentWidth, heroHeight, 12, 12, 'F');
    }

    // Title overlay
    const overlayHeight = 34;
    const overlayWidth = contentWidth - 52;
    const overlayX = heroX + 0;
    const overlayY = heroY + heroHeight - overlayHeight + 1;

    // Main card
    doc.setFillColor(
      palette.cardBg[0],
      palette.cardBg[1],
      palette.cardBg[2],
      220,
    );
    doc.setDrawColor(255, 255, 255);
    doc.roundedRect(overlayX, overlayY, overlayWidth, overlayHeight, 10, 10, 'F');

    // Flatten left corners
    doc.setFillColor(
      palette.cardBg[0],
      palette.cardBg[1],
      palette.cardBg[2],
      220,
    );
    doc.rect(overlayX, overlayY, 12, overlayHeight, 'F');

    // Accent bar
    const accentWidth = 4;
    doc.setFillColor(...palette.accent);
    doc.rect(overlayX, overlayY, accentWidth, overlayHeight, 'F');

    // Destination text
    const overlayContentX = overlayX + accentWidth + 12;
    const overlayContentY = overlayY + 16;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(destinationTitle.toUpperCase(), overlayContentX, overlayContentY);

    // Subtitle/tagline
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(
      pkg.category ? `${pkg.category.toUpperCase()} COLLECTION` : 'CURATED ESCAPE',
      overlayContentX,
      overlayY + overlayHeight - 13,
    );

    // Duration text
    const durationLabel = durationText.toUpperCase();
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...palette.primaryText);
    doc.setTextColor(255, 255, 255);
    doc.text(durationLabel, overlayContentX, overlayY + overlayHeight - 8);

    yPos = heroY + heroHeight + 12;

    const { highlightItems, innerPadding: highlightPadding } = drawOverviewHighlightsCard(
      pkg.description ||
      `Experience the very best of ${destinationTitle} with a professionally curated program balancing exploration, culture, and moments of pure relaxation.`,
      pkg.highlights,
      { innerPadding: 14 },
    );

    // Investment / quick facts card (restructured - only Max Group Size and Trip Style)
    const investmentHeight = 45;
    ensureSpace(investmentHeight);
    doc.setDrawColor(...palette.cardBorder);
    doc.roundedRect(margin, yPos, contentWidth, investmentHeight, 9, 9, 'S');

    const leftColumnX = margin + 14;
    const leftColumnWidth = (contentWidth - 42) / 2; // Half width minus padding
    const rightColumnX = margin + leftColumnWidth + 28;
    const rightColumnWidth = (contentWidth - 42) / 2;

    const baseY = yPos + 15;

    // Max Group Size - Left Column
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...palette.accent);
    doc.text('MAX GROUP SIZE', leftColumnX, baseY);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(12.5);
    doc.setTextColor(...palette.primaryText);
    const groupSizeValue = pkg.maxGroupSize ? `${pkg.maxGroupSize} Travelers` : 'Tailored to your preference';
    const groupSizeLines = doc.splitTextToSize(groupSizeValue, leftColumnWidth - 4);
    doc.text(groupSizeLines, leftColumnX, baseY + 9);

    // Trip Style - Right Column
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...palette.accent);
    doc.text('TRIP STYLE', rightColumnX, baseY);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(12.5);
    doc.setTextColor(...palette.primaryText);
    const tripStyleValue =
      (pkg.category && `${pkg.category} Journey`) ||
      pkg.tagline ||
      pkg.theme ||
      'Curated Escape';
    const tripStyleLines = doc.splitTextToSize(tripStyleValue, rightColumnWidth - 4);
    doc.text(tripStyleLines, rightColumnX, baseY + 9);

    yPos += investmentHeight;
    addSectionGap();

    drawBulletListCard('Highlights', highlightItems, { innerPadding: highlightPadding });

    const inclusionItems = (Array.isArray(pkg.inclusions) && pkg.inclusions.length
      ? pkg.inclusions
      : [
        'Premium hotel accommodation',
        'Daily breakfast and curated dining',
        'Private guided excursions',
        'All arranged ground transfers',
        'Entrance fees to listed experiences',
      ]
    ).map((item) => String(item).trim());

    drawBulletListCard('Inclusions', inclusionItems, {
      innerPadding: highlightPadding,
      bulletColor: palette.accent,
    });

    const secondaryImage = images.packageImages?.[1];
    if (secondaryImage) {
      const imageHeight = 52;
      const imageTopMargin = 6;
      ensureSpace(imageHeight + imageTopMargin);

      const imageWidth = contentWidth;
      const imageX = margin;
      const imageY = yPos + imageTopMargin;

      try {
        doc.addImage(secondaryImage, 'JPEG', imageX, imageY, imageWidth, imageHeight);
      } catch (error) {
        console.warn('Error adding secondary image to inclusions section:', error);
        doc.setFillColor(...palette.secondaryBackground);
        doc.rect(imageX, imageY, imageWidth, imageHeight, 'F');
      }

      yPos = imageY + imageHeight;
      addSectionGap();
    }

    addFooter();
    doc.addPage();
    applyPageBackground();
    yPos = margin;

    // Detailed Itinerary Page
    drawSectionHeading(
      'Detailed Itinerary',
      'A day-by-day look at your professionally designed escape',
    );

    const days = normalizeDays();
    if (!days.length) {
      ensureSpace(20);
      doc.setFont(undefined, 'italic');
      doc.setFontSize(11);
      doc.setTextColor(...palette.mutedText);
      doc.text('Detailed day plan will be crafted once we confirm your preferences.', margin, yPos);
      yPos += 18;
    } else {
      days.forEach((day, index) => {
        drawDayCard(day, index);
      });
    }

    // Package Price Display (after day-by-day itinerary)
    addSectionGap();
    const priceCardHeight = 50;
    ensureSpace(priceCardHeight);
    doc.setDrawColor(...palette.cardBorder);
    doc.roundedRect(margin, yPos, contentWidth, priceCardHeight, 9, 9, 'S');

    const priceLeftX = margin + 14;
    const priceRightX = margin + contentWidth * 0.5 + 14;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...palette.accent);
    doc.text('Package Price', priceLeftX, yPos + 18);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(28);
    doc.setTextColor(...palette.primaryText);
    const priceText = formatCurrencyForPdf(pkg.price);
    const sanitizedPrice = priceText.replace(/[^\d.,]/g, '');
    const currencyCode = import.meta.env.VITE_CURRENCY_CODE || 'INR';
    doc.text(`${currencyCode} ${sanitizedPrice}`, priceLeftX, yPos + 36);

    if (pkg.priceNotes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...palette.secondaryText);
      const priceNotesLines = doc.splitTextToSize(
        pkg.priceNotes,
        contentWidth * 0.45 - 4,
      );
      doc.text(priceNotesLines, priceRightX, yPos + 20);
    }

    yPos += priceCardHeight;
    addSectionGap();

    renderTerms();

    addFooter();

    const fileName = `${(pkg.name || destinationTitle || 'Package').replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`;
    return { doc, fileName };
  } catch (error) {
    console.error('[PDF Service] PDF generation error:', error);
    throw error;
  }
}

/**
 * Build a PDF blob for preview or download
 * @param {object} pkg - Package object
 * @param {object} options - Additional options
 * @param {boolean} options.fetchLatest - Whether to fetch the latest package data from API
 * @param {boolean} options.includeDoc - Whether to include jsPDF instance in the response
 * @returns {Promise<{ blob: Blob, fileName: string, packageData: object, doc?: jsPDF }>}
 */
export const createPackagePdfBlob = async (
  pkg: PdfPackageData,
  { fetchLatest = true, includeDoc = false }: { fetchLatest?: boolean; includeDoc?: boolean } = {},
): Promise<{ blob: Blob; fileName: string; packageData: PdfPackageData; doc?: jsPDF }> => {
  let completePackage = pkg;

  if (fetchLatest && (pkg._id || pkg.id)) {
    try {
      const packageId = pkg._id || pkg.id;
      const response = await getPackageEnvelope(packageId);

      if (response.success && response.data) {
        completePackage = response.data;
        console.log('[PDF Service] Fetched complete package data:', completePackage);
      }
    } catch (error) {
      console.warn('[PDF Service] Could not fetch complete package data, using local data:', error);
    }
  }

  const images = await loadPackageImages(completePackage);
  images.brandLogo = await loadBrandLogo();
  const { doc, fileName } = buildPDFDocument(completePackage, images);
  const blob = doc.output('blob');

  const result: { blob: Blob; fileName: string; packageData: PdfPackageData; doc?: jsPDF } = {
    blob,
    fileName,
    packageData: completePackage,
  };

  if (includeDoc) {
    result.doc = doc;
  }

  return result;
};
