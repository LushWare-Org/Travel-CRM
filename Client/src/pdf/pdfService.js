/**
 * PDF generation service for itineraries
 * Enhanced with professional layout, images, and visual appeal
 * Aligned with backend day-based structure
 * Fetches complete package data from API for accurate information
 */

import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { PDF_CONFIG } from './constants';
import ApiService from './apiService';

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

    const formatINR = (value) => {
      if (value === null || value === undefined || value === '') {
        return 'On request';
      }
      const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(numeric)) {
        return 'On request';
      }
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(numeric);
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
    doc.text(formatINR(pkg.price), rightX + 6, rightY + 28);

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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let yPos = margin;
    let pageNumber = 1;

    const palette = {
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

    const formatINR = (value) => {
      if (value === null || value === undefined || value === '') {
        return 'On request';
      }
      const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(numeric)) {
        return String(value);
      }
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(numeric);
    };

    const formatDateDisplay = (value) => {
      if (!value) return 'To be confirmed';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return String(value);
      }
      return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    };

    const normalizeDays = () => {
      const rawDays = pkg.days || pkg.itinerary?.days || [];
      if (Array.isArray(rawDays)) {
        return rawDays.slice().sort((a, b) => {
          const aDay = a.dayNumber ?? a.day ?? 0;
          const bDay = b.dayNumber ?? b.day ?? 0;
          return aDay - bDay;
        });
      }
      return Object.values(rawDays)
        .flat()
        .sort((a, b) => {
          const aDay = a.dayNumber ?? a.day ?? 0;
          const bDay = b.dayNumber ?? b.day ?? 0;
          return aDay - bDay;
        });
    };

    const getDaySegments = (day) => {
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
      ['morning', 'afternoon', 'evening', 'night'].forEach((period) => {
        if (day[period]) {
          segments.push({
            label: period,
            description: String(day[period]).trim(),
          });
        }
      });
      if (!segments.length && day.activities && day.activities.length) {
        segments.push({
          label: 'Highlights',
          description: day.activities.map((act) => String(act).trim()).join(', '),
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

    const getMealsText = (meals) => {
      if (!meals) return null;
      const available = [];
      if (meals.breakfast) available.push('Breakfast');
      if (meals.lunch) available.push('Lunch');
      if (meals.dinner) available.push('Dinner');
      if (meals.snacks) available.push('Snacks');
      return available.length ? `Meals: ${available.join(', ')}` : null;
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

    const drawInfoCard = (items) => {
      const cardHeight = 50;
      ensureSpace(cardHeight);
      doc.setFillColor(...palette.cardBg);
      doc.setDrawColor(...palette.cardBorder);
      doc.roundedRect(margin, yPos, contentWidth, cardHeight, 8, 8, 'FD');

      const columnWidth = contentWidth / items.length;
      items.forEach((item, index) => {
        const x = margin + index * columnWidth + 6;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...palette.accentDark);
        doc.text(item.label, x, yPos + 14);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(25);
        doc.setTextColor(...palette.primaryText);
        const lines = doc.splitTextToSize(item.value || '—', columnWidth - 12);
        doc.text(lines, x, yPos + 24);
      });

      yPos += cardHeight;
      addSectionGap();
      setBodyFont();
    };

    const drawBulletListCard = (title, items, options = {}) => {
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

    const drawOverviewHighlightsCard = (overview, highlightItems, options = {}) => {
      const { innerPadding: customPadding } = options;
      const summaryText =
        overview ||
        `Experience a bespoke journey with guided experiences, curated stays, and unforgettable highlights in ${
          pkg.destination || 'your chosen destination'
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

      doc.setFillColor(12, 12, 12);
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
      doc.text('Trip Sky Way', cursorX, headerY + 14);

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(210, 210, 210);
      doc.text('Curating inspired journeys', cursorX, headerY + 21);

      setBodyFont();
      return headerY + headerHeight;
    };

    const drawDayCard = (day, index) => {
      const dayNumber = day.dayNumber ?? day.day ?? index + 1;
      const dayTitle = day.title || `Curated Experience`;
      const locationText = Array.isArray(day.locations)
        ? day.locations.map((loc) => String(loc).trim()).filter(Boolean).join(' • ')
        : day.location || '';

      const segments = getDaySegments(day).map((segment) => ({
        ...segment,
        label: String(segment.label || 'Experience').toUpperCase(),
      }));

      const supportingNotes = [];
      if (day.accommodation?.name) {
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
      const mealsText = getMealsText(day.meals);
      if (mealsText) supportingNotes.push(mealsText);
      if (day.transport) {
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
    const priceText = formatINR(pkg.price);
    const sanitizedPrice = priceText.replace(/[^\d.,]/g, '');
    doc.text(`INR ${sanitizedPrice}`, priceLeftX, yPos + 36);

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
