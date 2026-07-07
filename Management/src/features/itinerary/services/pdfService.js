/**
 * PDF generation service for itineraries
 * Enhanced with professional layout, images, and visual appeal
 * Aligned with backend day-based structure
 * Fetches complete package data from API for accurate information
 */

import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { PDF_CONFIG } from '../utils/constants';
import ApiService from './apiService';
import { formatCurrency, CURRENCY_CODE } from '../../../utils/currency.js';

/**
 * Load image and convert to base64
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 image data
 */
const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
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
const loadPackageImages = async (pkg) => {
  const images = {
    packageImages: [],
    dayImages: {}
  };

  try {
    // Load main package images
    if (pkg.images && Array.isArray(pkg.images) && pkg.images.length > 0) {
      const imagePromises = pkg.images.slice(0, 4).map(img => {
        const url = img.url || img;
        return loadImageAsBase64(url);
      });

      const loadedImages = await Promise.all(imagePromises);
      images.packageImages = loadedImages.filter(img => img !== null);
    }

    // Load day-specific images
    const dayEntries = pkg.days || pkg.itinerary?.days || [];
    if (dayEntries && dayEntries.length > 0) {
      for (const day of dayEntries) {
        if (day.images && Array.isArray(day.images) && day.images.length > 0) {
          const dayNumber = day.dayNumber || day.day;
          const dayImageUrl = day.images[0].url || day.images[0];
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

const BRAND_LOGO_PATH = '/website-logo-1.png';

const loadBrandLogo = async () => {
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
export const generateAndDownloadPDF = async (pkg) => {
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

/**
 * Legacy PDF builder retained for reference.
 */
// eslint-disable-next-line no-unused-vars
function legacyBuildPDFDocument(pkg, images) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    let pageNumber = 1;

    // Colors
    const primaryColor = [126, 93, 65]; // Warm chestnut
    const secondaryColor = [88, 68, 52]; // Deep cacao
    const accentColor = [55, 119, 79]; // Forest green accent
    const lightBg = [249, 242, 230]; // Muted parchment
    const successColor = [82, 121, 92]; // Soft sage

    // Helper function to add decorative header
    const addHeader = (isFirstPage = false) => {
      doc.setFillColor(247, 234, 212);
      doc.rect(0, 0, pageWidth, 38, 'F');

      doc.setFillColor(231, 199, 150);
      doc.rect(0, 0, pageWidth, 18, 'F');

      doc.setFontSize(20);
      doc.setTextColor(80, 62, 44);
      doc.setFont(undefined, 'bold');
      doc.text(PDF_CONFIG.company, margin, 14);

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(PDF_CONFIG.tagline, margin, 22);

      doc.setDrawColor(204, 176, 134);
      doc.setLineWidth(0.6);
      doc.line(margin, 28, pageWidth - margin, 28);

      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
    };

    // Helper function to add footer with page numbers
    const addFooter = () => {
      // Footer background
      doc.setFillColor(...lightBg);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');

      // Decorative line
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(0.8);
      doc.line(margin, pageHeight - 23, pageWidth - margin, pageHeight - 23);

      // Contact info
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      doc.setFont(undefined, 'normal');

      const footerY = pageHeight - 15;

      // Email (clickable)
      doc.setTextColor(41, 128, 185);
      const emailText = PDF_CONFIG.email;
      const emailWidth = doc.getTextWidth(emailText);
      doc.textWithLink(emailText, margin, footerY, { url: `mailto:${PDF_CONFIG.email}` });

      // Phone
      doc.setTextColor(...secondaryColor);
      doc.text(` | ${PDF_CONFIG.phone}`, margin + emailWidth, footerY);

      // Website (clickable, right-aligned)
      doc.setTextColor(41, 128, 185);
      const websiteText = PDF_CONFIG.website.replace('https://', '');
      const websiteWidth = doc.getTextWidth(websiteText);
      doc.textWithLink(websiteText, pageWidth - margin - websiteWidth, footerY, {
        url: PDF_CONFIG.website
      });

      // Page number (center)
      doc.setTextColor(...secondaryColor);
      doc.setFontSize(8);
      doc.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      pageNumber++;
    };

    // Helper function to check space and add new page if needed
    const ensureSpace = (requiredSpace) => {
      if (yPos + requiredSpace > pageHeight - 35) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 48;
        return true;
      }
      return false;
    };

    // Helper function for section titles with icon-like design
    const addSectionTitle = (title, color = primaryColor) => {
      ensureSpace(18);

      // Background box with rounded effect
      doc.setFillColor(...color);
      doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F');

      // White text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(title, margin + 4, yPos + 7);

      // Reset
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      yPos += 14;
    };

    // Helper function for info boxes
    const addInfoBox = (label, value, icon = '●') => {
      if (!value) return;

      ensureSpace(10);

      // Light background
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');

      // Icon/bullet
      doc.setTextColor(...primaryColor);
      doc.setFontSize(10);
      doc.text(icon, margin + 2, yPos + 5.5);

      // Label (bold)
      doc.setTextColor(...secondaryColor);
      doc.setFont(undefined, 'bold');
      doc.text(label + ': ', margin + 6, yPos + 5.5);

      // Value
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      const labelWidth = doc.getTextWidth(label + ': ');
      const valueText = String(value).trim();
      const lines = doc.splitTextToSize(valueText, contentWidth - labelWidth - 12);
      doc.text(lines[0], margin + 8 + labelWidth, yPos + 5.5);

      yPos += 10;
    };

    const coverPalette = {
      background: [243, 229, 207],
      deepText: [58, 44, 31],
      accent: [55, 119, 79],
      softAccent: [215, 178, 118],
      cardBg: [255, 245, 226],
      bullet: [80, 60, 45],
      divider: [214, 197, 168],
    };

    const drawBadge = (label, x, y, options = {}) => {
      const { fill = coverPalette.accent, textColor = [255, 255, 255], width = 55, height = 11 } = options;
      doc.setFillColor(...fill);
      doc.roundedRect(x, y, width, height, 3, 3, 'F');
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...textColor);
      doc.text(label, x + width / 2, y + height / 2 + 2, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    const addSectionLabel = (label, x, y) => {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...coverPalette.deepText);
      doc.text(label.toUpperCase(), x, y);
      doc.setDrawColor(...coverPalette.divider);
      doc.setLineWidth(0.6);
      doc.line(x, y + 2, x + 60, y + 2);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(60, 60, 60);
      return y + 8;
    };

    const addBulletColumn = (items, { x, y, columnWidth, maxColumns = 2, bulletColor = coverPalette.bullet }) => {
      if (!items || !items.length) return y;
      const sanitized = items.map((item) => String(item).trim()).filter(Boolean);
      if (!sanitized.length) return y;

      const columnCount = Math.min(maxColumns, sanitized.length);
      const rows = Math.ceil(sanitized.length / columnCount);
      let currentRow = 0;

      for (let index = 0; index < sanitized.length; index++) {
        const columnIndex = index % columnCount;
        const rowIndex = Math.floor(index / columnCount);
        currentRow = Math.max(currentRow, rowIndex);

        const itemX = x + columnIndex * columnWidth;
        const itemY = y + rowIndex * 8;

        doc.setFillColor(...bulletColor);
        doc.circle(itemX, itemY + 1.5, 0.9, 'F');

        doc.setFontSize(10);
        doc.setTextColor(69, 58, 45);
        const lines = doc.splitTextToSize(sanitized[index], columnWidth - 5);
        doc.text(lines, itemX + 3.5, itemY + 2.5);
      }

      return y + (currentRow + 1) * 8 + 4;
    };

    const formatPrice = (value) => {
      if (value === null || value === undefined || value === '') {
        return 'On request';
      }
      const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(numeric)) {
        return 'On request';
      }
      return formatCurrency(numeric, { maximumFractionDigits: 0 });
    };

    // ========== START PDF GENERATION ==========
    doc.setFillColor(...coverPalette.background);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    const coverMargin = 18;
    const heroWidth = pageWidth - coverMargin * 2;
    let coverY = coverMargin + 12;

    const durationDays = Number(pkg.duration) || null;
    const nightsCount = durationDays && durationDays > 1 ? durationDays - 1 : null;

    if (durationDays) {
      const nightsLabel = nightsCount
        ? `${nightsCount} ${nightsCount > 1 ? 'NIGHTS' : 'NIGHT'}`
        : '1 NIGHT';
      const daysLabel = `${durationDays} ${durationDays > 1 ? 'DAYS' : 'DAY'}`;
      drawBadge(
        `${nightsLabel} / ${daysLabel}`,
        pageWidth - coverMargin - 65,
        coverMargin - 4,
        { width: 65, height: 12 },
      );
    }

    // Primary title
    doc.setTextColor(...coverPalette.deepText);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(30);
    const primaryTitle = (pkg.name || pkg.destination || 'Signature Escape').toUpperCase();
    const primaryLines = doc.splitTextToSize(primaryTitle, heroWidth);
    doc.text(primaryLines, pageWidth / 2, coverY, { align: 'center' });
    coverY += primaryLines.length * 12 + 4;

    // Secondary title (category or tagline)
    const secondaryTitle =
      (pkg.category && `${pkg.category} Adventure`) ||
      pkg.tagline ||
      'Curated Travel Experience';
    doc.setFontSize(16);
    doc.text(secondaryTitle.toUpperCase(), pageWidth / 2, coverY + 6, { align: 'center' });
    coverY += 22;

    // Hero image
    const heroHeight = 80;
    doc.setDrawColor(...coverPalette.divider);
    doc.setLineWidth(0.6);
    doc.roundedRect(coverMargin, coverY, heroWidth, heroHeight, 8, 8, 'S');

    if (images.packageImages && images.packageImages.length > 0) {
      try {
        doc.addImage(
          images.packageImages[0],
          'JPEG',
          coverMargin + 1.5,
          coverY + 1.5,
          heroWidth - 3,
          heroHeight - 3,
        );
      } catch (error) {
        console.warn('Error adding hero image:', error);
        doc.setFillColor(180, 150, 110);
        doc.roundedRect(coverMargin + 1.5, coverY + 1.5, heroWidth - 3, heroHeight - 3, 7, 7, 'F');
      }
    } else {
      doc.setFillColor(200, 170, 130);
      doc.roundedRect(coverMargin + 1.5, coverY + 1.5, heroWidth - 3, heroHeight - 3, 7, 7, 'F');
    }

    coverY += heroHeight + 14;

    // Two-column layout
    const leftColumnWidth = heroWidth * 0.62;
    const rightColumnWidth = heroWidth - leftColumnWidth - 12;
    const leftX = coverMargin;
    const rightX = leftX + leftColumnWidth + 12;
    let leftY = coverY;
    let rightY = coverY;

    // Description
    const overviewText =
      pkg.description ||
      `Experience a bespoke journey with guided experiences, curated stays, and unforgettable highlights in ${pkg.destination || 'your chosen destination'}.`;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(79, 63, 49);
    const overviewLines = doc.splitTextToSize(overviewText, leftColumnWidth);
    doc.text(overviewLines, leftX, leftY);
    leftY += overviewLines.length * 5.5 + 10;

    const coverDays = pkg.days || pkg.itinerary?.days || [];

    // Highlights
    const highlightItems = (Array.isArray(pkg.highlights) && pkg.highlights.length
      ? pkg.highlights
      : [
        `Guided explorations of ${pkg.destination || 'signature attractions'}`,
        'Curated accommodations with local character',
        'Authentic culinary experiences & cultural immersions',
        'Dedicated travel specialist and concierge support',
      ]).slice(0, 6);

    leftY = addSectionLabel('Highlights', leftX, leftY);
    leftY = addBulletColumn(highlightItems, {
      x: leftX,
      y: leftY + 2,
      columnWidth: (leftColumnWidth - 6) / 2,
      maxColumns: 2,
    }) + 6;

    // Inclusions & Exclusions side-by-side
    const inclusionItems = (Array.isArray(pkg.inclusions) && pkg.inclusions.length
      ? pkg.inclusions
      : [
        'Premium hotel accommodation',
        'Daily breakfast & signature meals',
        'Private guided excursions',
        'All arranged ground transfers',
        'Entrance fees to listed attractions',
      ]).slice(0, 6);

    const exclusionItems = (Array.isArray(pkg.exclusions) && pkg.exclusions.length
      ? pkg.exclusions
      : [
        'International airfare',
        'Personal expenses & shopping',
        'Travel insurance policies',
        'Gratuities for guides & drivers',
        'Optional excursions not listed',
      ]).slice(0, 6);

    const basePairY = leftY;
    const inclusionLabelBottom = addSectionLabel('Inclusions', leftX, basePairY);
    const exclusionLabelBottom = addSectionLabel(
      'Exclusions',
      leftX + leftColumnWidth / 2 + 6,
      basePairY,
    );

    const inclusionEnd = addBulletColumn(inclusionItems, {
      x: leftX,
      y: inclusionLabelBottom + 2,
      columnWidth: leftColumnWidth / 2 - 6,
      maxColumns: 1,
    });

    const exclusionEnd = addBulletColumn(exclusionItems, {
      x: leftX + leftColumnWidth / 2 + 6,
      y: exclusionLabelBottom + 2,
      columnWidth: leftColumnWidth / 2 - 6,
      maxColumns: 1,
    });

    leftY = Math.max(inclusionEnd, exclusionEnd) + 10;

    // Itinerary snapshot
    const itineraryLabelBottom = addSectionLabel('Itinerary', leftX, leftY);
    let itineraryY = itineraryLabelBottom + 2;
    doc.setFontSize(10);
    doc.setTextColor(79, 63, 49);

    if (coverDays.length) {
      coverDays.slice(0, 4).forEach((day, idx) => {
        const dayNumber = day.dayNumber || day.day || idx + 1;
        const dayTitle = day.title || `Day ${dayNumber}`;
        const daySummary =
          day.description ||
          day.activities?.join(', ') ||
          `${pkg.destination || 'Destination'} exploration`;
        doc.setFont(undefined, 'bold');
        doc.text(`Day ${dayNumber}: ${dayTitle}`, leftX, itineraryY);
        doc.setFont(undefined, 'normal');
        const summaryLines = doc.splitTextToSize(daySummary, leftColumnWidth);
        doc.text(summaryLines, leftX, itineraryY + 4);
        itineraryY += summaryLines.length * 5 + 8;
      });
      if (coverDays.length > 4) {
        doc.setFont(undefined, 'italic');
        doc.text(`+${coverDays.length - 4} more days curated in detail`, leftX, itineraryY);
        doc.setFont(undefined, 'normal');
        itineraryY += 8;
      }
    } else {
      doc.text(
        'A bespoke day-wise plan crafted to balance adventure, relaxation, and cultural immersion.',
        leftX,
        itineraryY,
      );
      itineraryY += 12;
    }

    leftY = itineraryY + 4;

    // Right column info card
    doc.setFillColor(...coverPalette.cardBg);
    doc.setDrawColor(...coverPalette.softAccent);
    const infoCardHeight = 80;
    doc.roundedRect(rightX, rightY, rightColumnWidth, infoCardHeight, 6, 6, 'FD');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(94, 74, 52);
    doc.text('PRICE', rightX + 6, rightY + 12);
    doc.setFontSize(20);
    doc.text(formatPrice(pkg.price), rightX + 6, rightY + 28);

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('MAX GROUP SIZE', rightX + 6, rightY + 42);
    doc.setFont(undefined, 'normal');
    doc.text(pkg.maxGroupSize ? String(pkg.maxGroupSize) : 'Flexible', rightX + 6, rightY + 50);

    doc.setFont(undefined, 'bold');
    doc.text('DIFFICULTY LEVEL', rightX + 6, rightY + 60);
    doc.setFont(undefined, 'normal');
    const difficultyLabel = pkg.difficulty
      ? pkg.difficulty.charAt(0).toUpperCase() + pkg.difficulty.slice(1)
      : 'Moderate';
    doc.text(difficultyLabel, rightX + 6, rightY + 68);

    rightY += infoCardHeight + 10;

    // Secondary image / location badge
    const secondaryImage = images.packageImages?.[1];
    const secondaryHeight = 38;
    doc.setDrawColor(...coverPalette.divider);
    doc.roundedRect(rightX, rightY, rightColumnWidth, secondaryHeight, 6, 6, 'S');
    if (secondaryImage) {
      try {
        doc.addImage(
          secondaryImage,
          'JPEG',
          rightX + 1.5,
          rightY + 1.5,
          rightColumnWidth - 3,
          secondaryHeight - 3,
        );
      } catch (error) {
        console.warn('Error adding secondary image:', error);
      }
    } else {
      doc.setFillColor(204, 188, 160);
      doc.roundedRect(rightX + 1.5, rightY + 1.5, rightColumnWidth - 3, secondaryHeight - 3, 5, 5, 'F');
    }

    doc.setFillColor(...coverPalette.accent);
    doc.roundedRect(rightX, rightY + secondaryHeight - 12, rightColumnWidth, 12, 6, 6, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(
      (pkg.destination || pkg.country || 'Discover the World').toUpperCase(),
      rightX + rightColumnWidth / 2,
      rightY + secondaryHeight - 3,
      { align: 'center' },
    );

    // Reset to default styles
    doc.setTextColor(0, 0, 0);

    // Footer and next page setup
    addFooter();
    doc.addPage();
    addHeader();
    yPos = 48;

    const remainingGalleryImages = (images.packageImages || []).slice(2);
    if (remainingGalleryImages.length) {
      ensureSpace(20);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(...coverPalette.deepText);
      doc.text('Visual Highlights', margin, yPos);
      doc.setDrawColor(...coverPalette.divider);
      doc.line(margin, yPos + 2, margin + 60, yPos + 2);
      yPos += 12;

      const galleryPerRow = 3;
      const gallerySpacing = 6;
      const galleryWidth = (contentWidth - gallerySpacing * (galleryPerRow - 1)) / galleryPerRow;
      const galleryHeight = 45;

      const galleryRows = Math.ceil(remainingGalleryImages.length / galleryPerRow);
      ensureSpace(galleryRows * (galleryHeight + gallerySpacing) + 10);

      for (let row = 0; row < galleryRows; row++) {
        const rowY = yPos + row * (galleryHeight + gallerySpacing);

        for (let col = 0; col < galleryPerRow; col++) {
          const index = row * galleryPerRow + col;
          if (index >= remainingGalleryImages.length) break;

          const imgX = margin + col * (galleryWidth + gallerySpacing);
          const imgData = remainingGalleryImages[index];

          doc.setDrawColor(...coverPalette.divider);
          doc.setFillColor(...coverPalette.cardBg);
          doc.roundedRect(imgX, rowY, galleryWidth, galleryHeight, 6, 6, 'FD');

          if (imgData) {
            try {
              doc.addImage(
                imgData,
                'JPEG',
                imgX + 2,
                rowY + 2,
                galleryWidth - 4,
                galleryHeight - 4,
              );
            } catch (error) {
              console.warn('Error adding gallery image:', error);
            }
          }
        }
      }

      yPos += galleryRows * (galleryHeight + gallerySpacing) + 6;
      doc.setTextColor(0, 0, 0);
    }

    // ========== DAY-WISE ITINERARY ==========
    ensureSpace(30);

    // Itinerary header page
    doc.setFillColor(...accentColor);
    doc.rect(0, yPos - 3, pageWidth, 18, 'F');

    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('DETAILED ITINERARY', pageWidth / 2, yPos + 8, { align: 'center' });

    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    yPos += 23;

    // Process each day
    const days = pkg.days || pkg.itinerary?.days || [];

    if (days && days.length > 0) {
      days.forEach((day, dayIndex) => {
        ensureSpace(40);

        doc.setFillColor(...coverPalette.cardBg);
        doc.roundedRect(margin, yPos, contentWidth, 16, 3, 3, 'F');

        doc.setFillColor(...coverPalette.accent);
        doc.roundedRect(margin, yPos, 34, 16, 3, 3, 'F');

        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`DAY ${day.dayNumber || dayIndex + 1}`, margin + 17, yPos + 10, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(...coverPalette.deepText);
        doc.text(day.title || 'Curated Experience', margin + 42, yPos + 10);

        doc.setFont(undefined, 'normal');
        doc.setTextColor(92, 74, 58);
        yPos += 20;

        // Day image if available
        const dayNumber = day.dayNumber || dayIndex + 1;
        if (images.dayImages[dayNumber]) {
          const legacyImageHeight = 46;
          const legacyImagePadding = 2;
          const legacyTopMargin = 6;

          ensureSpace(legacyImageHeight + legacyTopMargin);

          const imgWidth = contentWidth;

          try {
            doc.addImage(
              images.dayImages[dayNumber],
              'JPEG',
              margin + legacyImagePadding,
              yPos + legacyTopMargin,
              imgWidth - legacyImagePadding * 2,
              legacyImageHeight - legacyImagePadding * 2,
            );
          } catch (error) {
            console.warn('Error adding day image:', error);
          }

          yPos += legacyImageHeight + legacyTopMargin + 2;
        }

        // Description
        if (day.description) {
          ensureSpace(15);

          doc.setFillColor(253, 247, 235);
          const descLines = doc.splitTextToSize(String(day.description).trim(), contentWidth - 8);
          const boxHeight = descLines.length * 5 + 6;

          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'F');
          doc.setDrawColor(...coverPalette.divider);
          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'S');

          doc.setFontSize(10);
          doc.setTextColor(92, 74, 58);
          doc.text(descLines, margin + 4, yPos + 5);

          yPos += boxHeight + 5;
          doc.setTextColor(92, 74, 58);
        }

        // Locations
        if (day.locations && day.locations.length > 0) {
          ensureSpace(10);

          doc.setFillColor(250, 241, 226);
          const locLines = doc.splitTextToSize(
            day.locations.map((l) => String(l).trim()).join('  •  '),
            contentWidth - 10,
          );
          const locHeight = locLines.length * 5 + 8;
          doc.roundedRect(margin, yPos, contentWidth, locHeight, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...coverPalette.accent);
          doc.text('Locations', margin + 4, yPos + 7);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);
          doc.setFontSize(10);
          doc.text(locLines, margin + 4, yPos + 13);

          yPos += locHeight + 4;
        }

        // Activities
        if (day.activities && day.activities.length > 0) {
          ensureSpace(10);

          doc.setFillColor(245, 232, 210);
          const actLines = doc.splitTextToSize(
            day.activities.map((a) => String(a).trim()).join('  •  '),
            contentWidth - 10,
          );
          const actHeight = actLines.length * 5 + 8;
          doc.roundedRect(margin, yPos, contentWidth, actHeight, 2, 2, 'F');

          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(176, 134, 80);
          doc.text('Signature Moments', margin + 4, yPos + 7);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);
          doc.setFontSize(10);
          doc.text(actLines, margin + 4, yPos + 13);

          yPos += actHeight + 4;
        }

        // Accommodation
        if (day.accommodation && day.accommodation.name) {
          ensureSpace(10);

          doc.setFillColor(253, 247, 235);
          doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');

          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(176, 134, 80);
          doc.text('Stay', margin + 4, yPos + 7);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);

          let accText = String(day.accommodation.name).trim();
          if (day.accommodation.type) accText += ` (${day.accommodation.type})`;
          if (day.accommodation.rating) {
            accText += ` - ${day.accommodation.rating} stars`;
          }

          doc.text(accText, margin + 26, yPos + 7);
          yPos += 14;
        }

        // Meals
        if (day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner)) {
          ensureSpace(10);

          doc.setFillColor(246, 232, 224);
          doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');

          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(193, 102, 80);
          doc.text('Meals', margin + 4, yPos + 7);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);

          const meals = [];
          if (day.meals.breakfast) meals.push('Breakfast');
          if (day.meals.lunch) meals.push('Lunch');
          if (day.meals.dinner) meals.push('Dinner');

          doc.text(meals.join('  •  '), margin + 26, yPos + 7);
          yPos += 14;
        }

        // Transport
        if (day.transport) {
          ensureSpace(10);

          doc.setFillColor(232, 239, 233);
          doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');

          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...coverPalette.accent);
          doc.text('Transport', margin + 4, yPos + 7);

          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);

          const transportText = String(day.transport).charAt(0).toUpperCase() + String(day.transport).slice(1);
          doc.text(transportText, margin + 26, yPos + 7);
          yPos += 14;
        }

        // Notes
        if (day.notes) {
          ensureSpace(12);

          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(142, 116, 94);

          const notesLines = doc.splitTextToSize('Note: ' + String(day.notes).trim(), contentWidth - 6);
          doc.text(notesLines, margin + 3, yPos + 5);

          yPos += notesLines.length * 4.5 + 5;
          doc.setFont(undefined, 'normal');
          doc.setTextColor(92, 74, 58);
        }

        // Separator between days
        yPos += 8;
        if (dayIndex < days.length - 1) {
          doc.setDrawColor(...coverPalette.divider);
          doc.setLineWidth(0.6);
          doc.line(margin + 18, yPos, pageWidth - margin - 18, yPos);
          yPos += 8;
        }
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text('No detailed itinerary available', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
    }

    // ========== TERMS & CONDITIONS ==========
    if (pkg.terms && pkg.terms.length > 0) {
      ensureSpace(20);
      addSectionTitle('Terms & Conditions', [149, 165, 166]);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);

      pkg.terms.forEach((term, index) => {
        const termText = String(term).trim();
        const lines = doc.splitTextToSize(`${index + 1}. ${termText}`, contentWidth - 4);

        ensureSpace(lines.length * 4 + 3);
        doc.text(lines, margin + 2, yPos);
        yPos += lines.length * 4 + 3;
      });

      doc.setTextColor(0, 0, 0);
    }

    // ========== FINAL FOOTER ==========
    addFooter();

    const fileName = `${(pkg.name || 'Package').replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`;
    return { doc, fileName };
  } catch (error) {
    console.error('[PDF Service] PDF generation error:', error);
    throw error;
  }
}

function buildPDFDocument(pkg, images) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();   // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;          // 182 mm
    let yPos = margin;
    let pageNumber = 1;

    // ── Colour palette ──────────────────────────────────────────
    const C = {
      navy:      [18,  52,  96],
      navyDark:  [11,  33,  63],
      navyLight: [38,  85, 152],
      gold:      [186, 148,  58],
      goldPale:  [250, 232, 160],
      ink:       [18,  20,  32],
      body:      [58,  64,  82],
      muted:     [128, 133, 152],
      white:     [255, 255, 255],
      offWhite:  [249, 248, 245],
      card:      [255, 255, 255],
      subtle:    [242, 244, 252],
      border:    [210, 216, 228],
      success:   [38, 116,  72],
      steel:     [180, 200, 232],
    };

    // ── Layout constants ─────────────────────────────────────────
    const footerH  = 16;
    const bottomPad = footerH + 3;

    // ── Utility helpers ──────────────────────────────────────────
    const setBody = () => {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...C.body);
    };

    const applyBg = () => {
      doc.setFillColor(...C.offWhite);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };

    const gap = (n = 4) => { yPos += n; };

    const ensureSpace = (needed) => {
      const clamp = Math.min(needed, pageHeight - bottomPad - margin);
      if (yPos + clamp > pageHeight - bottomPad) {
        addFooter();
        doc.addPage();
        applyBg();
        drawRunningHeader();
        yPos = margin + 12;
        return true;
      }
      return false;
    };

    const formatPrice = (value) => {
      if (value === null || value === undefined || value === '') return 'On Request';
      const n = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(n)) return String(value);
      return formatCurrency(n, { maximumFractionDigits: 0 });
    };

    const formatDateDisplay = (value) => {
      if (!value) return 'Year-Round';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const normalizeDays = () => {
      const raw = pkg.days || pkg.itinerary?.days || [];
      const arr = Array.isArray(raw) ? raw : Object.values(raw).flat();
      return arr.slice().sort((a, b) => (a.dayNumber ?? a.day ?? 0) - (b.dayNumber ?? b.day ?? 0));
    };

    const getDaySegments = (day) => {
      const segs = [];
      if (Array.isArray(day.timeline)) {
        day.timeline.forEach((s) => {
          if (!s) return;
          const label = s.label || s.timeOfDay || s.time || s.title || 'Experience';
          const desc  = s.description || s.summary || s.detail || s.activity || s.notes;
          if (desc) segs.push({ label, description: String(desc).trim() });
        });
      }
      ['morning', 'afternoon', 'evening', 'night'].forEach((p) => {
        if (day[p]) segs.push({ label: p, description: String(day[p]).trim() });
      });
      if (!segs.length && day.activities?.length)
        segs.push({ label: 'Activities', description: day.activities.map((a) => String(a).trim()).join(' · ') });
      if (!segs.length && day.description)
        segs.push({ label: 'Overview', description: String(day.description).trim() });
      return segs.slice(0, 4);
    };

    const getMealsText = (meals) => {
      if (!meals) return null;
      const m = [];
      if (meals.breakfast) m.push('Breakfast');
      if (meals.lunch)     m.push('Lunch');
      if (meals.dinner)    m.push('Dinner');
      if (meals.snacks)    m.push('Snacks');
      return m.length ? m.join(' · ') : null;
    };

    // ── Structural elements ───────────────────────────────────────
    const addFooter = () => {
      const fy = pageHeight - footerH;
      // top rule
      doc.setFillColor(...C.navy);
      doc.rect(0, fy, pageWidth, 0.8, 'F');
      // footer band
      doc.setFillColor(...C.subtle);
      doc.rect(0, fy + 0.8, pageWidth, footerH - 0.8, 'F');

      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.navy);
      doc.text(PDF_CONFIG.company, margin, fy + 9);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.muted);
      const contact = `${PDF_CONFIG.email}  ·  ${PDF_CONFIG.phone}  ·  ${PDF_CONFIG.website.replace(/^https?:\/\//, '')}`;
      doc.text(contact, pageWidth / 2, fy + 9, { align: 'center' });
      doc.text(`Page ${pageNumber}`, pageWidth - margin, fy + 9, { align: 'right' });

      pageNumber++;
    };

    const drawRunningHeader = () => {
      doc.setFillColor(...C.navyDark);
      doc.rect(0, 0, pageWidth, 10, 'F');
      doc.setFillColor(...C.gold);
      doc.rect(0, 10, pageWidth, 0.6, 'F');

      doc.setFont(undefined, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.white);
      doc.text(PDF_CONFIG.company.toUpperCase(), margin, 7);

      const pkgLabel = (pkg.name || pkg.destination || 'Itinerary').toUpperCase();
      doc.setFont(undefined, 'normal');
      doc.setTextColor(...C.steel);
      doc.text(pkgLabel, pageWidth - margin, 7, { align: 'right' });
    };

    const drawSectionHeading = (title, subtitle) => {
      ensureSpace(18);
      // gold accent bar
      doc.setFillColor(...C.gold);
      doc.rect(margin, yPos, 3.5, 13, 'F');
      // title
      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...C.navy);
      doc.text(title.toUpperCase(), margin + 9, yPos + 9.5);
      yPos += 15;
      if (subtitle) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...C.muted);
        const lines = doc.splitTextToSize(subtitle, contentWidth - 10);
        doc.text(lines, margin + 9, yPos);
        yPos += lines.length * 5 + 2;
      }
      gap(4);
      setBody();
    };

    // ── Cover helpers ─────────────────────────────────────────────

    const drawCoverHeader = (logoData) => {
      const hh = 22;
      doc.setFillColor(...C.navyDark);
      doc.rect(0, 0, pageWidth, hh, 'F');
      doc.setFillColor(...C.gold);
      doc.rect(0, hh - 1, pageWidth, 1, 'F');

      let lx = margin;
      if (logoData) {
        try {
          doc.addImage(logoData, 'PNG', margin, (hh - 13) / 2, 52, 13);
          lx = margin + 52 + 10;
        } catch (_) { /* fall through to text */ }
      }
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...C.white);
      doc.text(PDF_CONFIG.company, lx, hh / 2 + 1.5);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.steel);
      doc.text(PDF_CONFIG.tagline, lx, hh / 2 + 7.5);

      return hh;
    };

    const drawListCard = (x, y, w, h, title, items, accentColor) => {
      doc.setFillColor(...C.card);
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, w, h, 5, 5, 'FD');
      // left accent bar
      doc.setFillColor(...accentColor);
      doc.roundedRect(x, y, 4, h, 2, 2, 'F');

      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...C.navy);
      doc.text(title, x + 10, y + 10);

      const innerW = w - 18;
      let cy = y + 18;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9.5);
      items.forEach((item) => {
        const lines = doc.splitTextToSize(String(item).trim(), innerW - 8);
        doc.setFillColor(...accentColor);
        doc.circle(x + 9, cy - 1.5, 1.5, 'F');
        doc.setTextColor(...C.body);
        doc.text(lines, x + 14, cy);
        cy += lines.length * 4.8 + 3;
      });
    };

    // ── Day card ─────────────────────────────────────────────────
    const drawDayCard = (day, index) => {
      const dayNumber  = day.dayNumber ?? day.day ?? index + 1;
      const dayTitle   = day.title || `Day ${dayNumber} Experience`;
      const locationText = Array.isArray(day.locations)
        ? day.locations.map((l) => String(l).trim()).filter(Boolean).join(' · ')
        : day.location || '';

      const segments = getDaySegments(day).map((s) => ({
        ...s,
        label: String(s.label || 'Experience').toUpperCase(),
      }));

      const footerParts = [];
      if (day.accommodation?.name)       footerParts.push(`Stay: ${day.accommodation.name}`);
      else if (typeof day.accommodation === 'string' && day.accommodation)
                                         footerParts.push(`Stay: ${day.accommodation}`);
      const mealsText = getMealsText(day.meals);
      if (mealsText)                     footerParts.push(`Meals: ${mealsText}`);
      if (day.transport)                 footerParts.push(`Transfer: ${String(day.transport)}`);

      // Text area: leave left strip (28) + right margin padding (8)
      const textAreaW = contentWidth - 30;
      const cardImage = images.dayImages?.[dayNumber] || images.packageImages?.[index + 1] || null;
      const hasImg    = Boolean(cardImage);
      const imgW      = hasImg ? 28 : 0;

      const locLines = locationText
        ? doc.splitTextToSize(locationText, textAreaW - imgW - 4)
        : [];

      const enriched = segments.map((s) => ({
        ...s,
        lines: doc.splitTextToSize(s.description, textAreaW - 6),
      }));

      const noteLines = day.notes
        ? doc.splitTextToSize(`Note: ${String(day.notes).trim()}`, textAreaW - 6)
        : [];

      const footerText  = footerParts.join('   ·   ');
      const footerLines = footerText
        ? doc.splitTextToSize(footerText, contentWidth - 20)
        : [];
      const footerBlock = footerLines.length ? footerLines.length * 4.5 + 10 : 0;

      // Card height estimate
      const headerBlock = 28;
      let contentBlock  = 8;
      if (locLines.length) contentBlock += locLines.length * 4.5 + 3;
      enriched.forEach((s) => { contentBlock += 10 + s.lines.length * 4.8 + 4; });
      if (noteLines.length) contentBlock += noteLines.length * 4.2 + 4;
      const cardH = headerBlock + contentBlock + footerBlock;

      ensureSpace(cardH + 5);
      const ct = yPos; // card top

      // Card background
      doc.setFillColor(...C.card);
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin, ct, contentWidth, cardH, 6, 6, 'FD');

      // Navy header strip: draw navy rounded rect then cover its bottom with a plain navy rect
      doc.setFillColor(...C.navy);
      doc.roundedRect(margin, ct, contentWidth, headerBlock, 6, 6, 'F');
      doc.rect(margin, ct + headerBlock - 6, contentWidth, 6, 'F');

      // Gold day badge
      const badgeX = margin + 20;
      const badgeY = ct + headerBlock / 2;
      doc.setFillColor(...C.gold);
      doc.circle(badgeX, badgeY, 9, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...C.navyDark);
      doc.text('DAY', badgeX, badgeY - 1.5, { align: 'center' });
      doc.setFontSize(11.5);
      doc.text(String(dayNumber), badgeX, badgeY + 5, { align: 'center' });

      // Day title
      const titleX = margin + 37;
      const titleMaxW = hasImg ? contentWidth - 37 - imgW - 8 : contentWidth - 37 - 6;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(...C.white);
      const titleLines = doc.splitTextToSize(dayTitle, titleMaxW);
      doc.text(titleLines[0], titleX, ct + 12);

      // Location
      if (locLines.length) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.steel);
        doc.text(locLines[0], titleX, ct + 21);
      }

      // Optional image (top-right corner of header)
      if (hasImg) {
        const ix = margin + contentWidth - imgW - 4;
        const iy = ct + 2;
        try {
          doc.addImage(cardImage, 'JPEG', ix, iy, imgW, headerBlock - 4);
        } catch (_) {}
      }

      // Content area
      let cy = ct + headerBlock + 8;
      const tx = margin + 14;

      enriched.forEach((seg) => {
        // Pill label
        doc.setFillColor(...C.subtle);
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        const pillW = doc.getTextWidth(seg.label) + 14;
        doc.roundedRect(tx, cy - 4, pillW, 7, 2, 2, 'FD');
        doc.setFillColor(...C.gold);
        doc.rect(tx, cy - 4, 3, 7, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.navy);
        doc.text(seg.label, tx + 6, cy + 1);
        cy += 9;

        // Segment description
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...C.body);
        doc.text(seg.lines, tx + 4, cy);
        cy += seg.lines.length * 4.8 + 5;
      });

      // Notes
      if (noteLines.length) {
        doc.setFont(undefined, 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.muted);
        doc.text(noteLines, tx + 4, cy);
        cy += noteLines.length * 4.2 + 3;
      }

      // Footer strip (accommodation / meals / transport)
      if (footerLines.length) {
        const fy2 = ct + cardH - footerBlock;
        doc.setFillColor(...C.subtle);
        doc.rect(margin, fy2, contentWidth, footerBlock, 'F');
        // cover top half of rounded bottom corners
        doc.roundedRect(margin, fy2, contentWidth, footerBlock, 6, 6, 'F');
        doc.rect(margin, fy2, contentWidth, 6, 'F');

        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(margin + 6, fy2 + 0.5, margin + contentWidth - 6, fy2 + 0.5);

        doc.setFont(undefined, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.muted);
        doc.text(footerLines, tx, fy2 + 7);
      }

      yPos = ct + cardH + 4;
      setBody();
    };

    // ═══════════════════════════════════════════════════════════════
    // COVER PAGE
    // ═══════════════════════════════════════════════════════════════
    applyBg();
    setBody();

    const destinationTitle =
      pkg.destination || pkg.name || pkg.country ||
      (pkg.region && `${pkg.region} Getaway`) || 'Signature Escape';

    const durationText =
      typeof pkg.duration === 'string' ? pkg.duration
      : pkg.duration ? `${pkg.duration} Days`
      : `${normalizeDays().length || 5} Days`;

    // 1. Brand header
    const coverHeaderBottom = drawCoverHeader(images.brandLogo);

    // 2. Hero image
    const heroY = coverHeaderBottom + 2;
    const heroH = 82;
    if (images.packageImages?.[0]) {
      try {
        doc.addImage(images.packageImages[0], 'JPEG', margin, heroY, contentWidth, heroH);
      } catch (_) {
        doc.setFillColor(...C.navyDark);
        doc.roundedRect(margin, heroY, contentWidth, heroH, 5, 5, 'F');
      }
    } else {
      doc.setFillColor(...C.navyDark);
      doc.roundedRect(margin, heroY, contentWidth, heroH, 5, 5, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(28);
      doc.setTextColor(40, 70, 120);
      doc.text(destinationTitle.toUpperCase(), pageWidth / 2, heroY + heroH / 2 + 5, { align: 'center' });
    }

    // 3. Title strip (navy bar immediately below hero)
    const titleStripY = heroY + heroH;
    const titleStripH = 34;
    doc.setFillColor(...C.navyDark);
    doc.rect(margin, titleStripY, contentWidth, titleStripH, 'F');
    // gold left accent
    doc.setFillColor(...C.gold);
    doc.rect(margin, titleStripY, 5, titleStripH, 'F');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...C.white);
    doc.text(destinationTitle.toUpperCase(), margin + 11, titleStripY + 14);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.steel);
    const chipLine = [
      pkg.category ? pkg.category.toUpperCase() : 'CURATED ESCAPE',
      durationText.toUpperCase(),
    ].join('    ·    ');
    doc.text(chipLine, margin + 11, titleStripY + 23);

    // Price (right side of title strip)
    if (pkg.price) {
      const pText = formatPrice(pkg.price);
      const pNum  = pText.replace(/[^\d.,]/g, '');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(17);
      doc.setTextColor(...C.goldPale);
      doc.text(pText === 'On Request' ? 'On Request' : `${CURRENCY_CODE} ${pNum}`,
        margin + contentWidth - 4, titleStripY + 14, { align: 'right' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.steel);
      doc.text('PER PERSON', margin + contentWidth - 4, titleStripY + 22, { align: 'right' });
    }

    yPos = titleStripY + titleStripH + 4;

    // 4. Quick stats row
    const statsH = 26;
    ensureSpace(statsH);
    doc.setFillColor(...C.card);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, yPos, contentWidth, statsH, 5, 5, 'FD');
    // navy top rule
    doc.setFillColor(...C.navy);
    doc.rect(margin, yPos, contentWidth, 1.5, 'F');

    const stats = [
      { label: 'DURATION',   value: durationText },
      { label: 'GROUP SIZE', value: pkg.maxGroupSize ? `Up to ${pkg.maxGroupSize}` : 'Flexible' },
      { label: 'TRIP STYLE', value: pkg.category || pkg.theme || 'Tailored' },
      { label: 'DEPARTURE',  value: pkg.travelDate ? formatDateDisplay(pkg.travelDate) : 'Year-Round' },
    ];
    const statColW = contentWidth / stats.length;
    stats.forEach((stat, i) => {
      const sx = margin + i * statColW + 7;
      if (i > 0) {
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.2);
        doc.line(margin + i * statColW, yPos + 4, margin + i * statColW, yPos + statsH - 4);
      }
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...C.gold);
      doc.text(stat.label, sx, yPos + 9.5);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.ink);
      doc.text(doc.splitTextToSize(stat.value, statColW - 12)[0], sx, yPos + 19.5);
    });
    yPos += statsH + 5;

    // 5. Overview card
    const summaryText = pkg.description ||
      `Experience the very best of ${destinationTitle} with a professionally curated programme balancing exploration, culture, and moments of pure relaxation.`;
    doc.setFontSize(10.5);
    const overviewLines = doc.splitTextToSize(summaryText, contentWidth - 22);
    const overviewCardH  = 10 + 7 + overviewLines.length * 5.1 + 10;
    ensureSpace(overviewCardH);

    doc.setFillColor(...C.card);
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(margin, yPos, contentWidth, overviewCardH, 5, 5, 'FD');
    doc.setFillColor(...C.gold);
    doc.roundedRect(margin, yPos, 4, overviewCardH, 2, 2, 'F');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.navy);
    doc.text('About This Journey', margin + 10, yPos + 9);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...C.body);
    doc.text(overviewLines, margin + 10, yPos + 17, { maxWidth: contentWidth - 16 });
    yPos += overviewCardH + 5;

    // 6. Highlights + Inclusions (two columns)
    const highlights = (Array.isArray(pkg.highlights) && pkg.highlights.length
      ? pkg.highlights
      : [
          `Guided explorations of ${destinationTitle}`,
          'Curated accommodations with local character',
          'Authentic culinary experiences',
          'Dedicated travel specialist support',
        ]
    ).map((h) => String(h).trim()).filter(Boolean).slice(0, 6);

    const inclusions = (Array.isArray(pkg.inclusions) && pkg.inclusions.length
      ? pkg.inclusions
      : [
          'Premium hotel accommodation',
          'Daily breakfast & curated dining',
          'Private guided excursions',
          'All ground transfers included',
          'Entrance fees to listed experiences',
        ]
    ).map((i) => String(i).trim()).filter(Boolean);

    const halfW = (contentWidth - 4) / 2;

    const calcListCardH = (items, colW) => {
      let h = 22;
      items.forEach((item) => {
        h += doc.splitTextToSize(String(item).trim(), colW - 18).length * 4.8 + 3;
      });
      return h + 6;
    };

    doc.setFontSize(9.5);
    const hlH   = calcListCardH(highlights, halfW);
    const inclH = calcListCardH(inclusions, halfW);
    const twoColH = Math.max(hlH, inclH);
    ensureSpace(twoColH);

    drawListCard(margin,          yPos, halfW, twoColH, 'Highlights', highlights, C.gold);
    drawListCard(margin + halfW + 4, yPos, halfW, twoColH, 'Inclusions', inclusions, C.success);

    yPos += twoColH + 5;

    // 7. Secondary image (if available)
    if (images.packageImages?.[1]) {
      const imgH = 50;
      ensureSpace(imgH + 2);
      try {
        doc.addImage(images.packageImages[1], 'JPEG', margin, yPos, contentWidth, imgH);
        yPos += imgH + 4;
      } catch (_) {}
    }

    addFooter();

    // ═══════════════════════════════════════════════════════════════
    // ITINERARY PAGES
    // ═══════════════════════════════════════════════════════════════
    doc.addPage();
    applyBg();
    drawRunningHeader();
    yPos = 16;

    drawSectionHeading(
      'Detailed Itinerary',
      'A day-by-day journey through your curated escape',
    );

    const days = normalizeDays();
    if (!days.length) {
      ensureSpace(20);
      doc.setFont(undefined, 'italic');
      doc.setFontSize(11);
      doc.setTextColor(...C.muted);
      doc.text('Day-by-day itinerary will be crafted once your preferences are confirmed.', margin, yPos);
      yPos += 18;
    } else {
      days.forEach((day, i) => drawDayCard(day, i));
    }

    // Price card
    gap(4);
    const priceCardH = 44;
    ensureSpace(priceCardH);
    doc.setFillColor(...C.navyDark);
    doc.roundedRect(margin, yPos, contentWidth, priceCardH, 7, 7, 'F');
    doc.setFillColor(...C.gold);
    doc.roundedRect(margin, yPos, 6, priceCardH, 3, 3, 'F');

    doc.setFont(undefined, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.steel);
    doc.text('PACKAGE INVESTMENT', margin + 14, yPos + 12);

    const priceDisplay = formatPrice(pkg.price);
    const priceSanitized = priceDisplay.replace(/[^\d.,]/g, '');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...C.white);
    doc.text(
      priceDisplay === 'On Request' ? 'On Request' : `${CURRENCY_CODE} ${priceSanitized}`,
      margin + 14, yPos + 32,
    );

    if (pkg.priceNotes) {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.steel);
      const pnLines = doc.splitTextToSize(pkg.priceNotes, contentWidth * 0.42);
      doc.text(pnLines, margin + contentWidth - 4, yPos + 14, { align: 'right' });
    }

    yPos += priceCardH + 6;

    // Terms
    if (pkg.terms?.length) {
      drawSectionHeading('Important Notes', 'Key information for a seamless experience');
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...C.body);
      pkg.terms.forEach((term, i) => {
        const t = `${i + 1}.  ${String(term).trim()}`;
        const lines = doc.splitTextToSize(t, contentWidth - 4);
        ensureSpace(lines.length * 5 + 4);
        doc.text(lines, margin + 2, yPos);
        yPos += lines.length * 5 + 4;
      });
    }

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
  pkg,
  { fetchLatest = true, includeDoc = false } = {},
) => {
  let completePackage = pkg;

  if (fetchLatest && (pkg._id || pkg.id)) {
    try {
      const packageId = pkg._id || pkg.id;
      const response = await ApiService.getPackage(packageId);

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

  const result = {
    blob,
    fileName,
    packageData: completePackage,
  };

  if (includeDoc) {
    result.doc = doc;
  }

  return result;
};
