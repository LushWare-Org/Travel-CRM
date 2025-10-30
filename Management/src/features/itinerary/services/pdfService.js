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
 * Generate and download PDF for a package
 * @param {object} pkg - Package object
 */
export const generateAndDownloadPDF = async (pkg) => {
  try {
    // Show loading indicator
    Swal.fire({
      title: 'Generating PDF...',
      html: 'Please wait while we create your beautiful itinerary',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // First, fetch the complete package data from the API to ensure all details are up-to-date
    let completePackage = pkg;
    
    if (pkg._id || pkg.id) {
      try {
        const packageId = pkg._id || pkg.id;
        const response = await ApiService.getPackage(packageId);
        
        if (response.success && response.data) {
          completePackage = response.data;
          console.log('[PDF Service] Fetched complete package data:', completePackage);
        }
      } catch (error) {
        console.warn('[PDF Service] Could not fetch complete package data, using local data:', error);
        // Continue with local data if fetch fails
      }
    }
    
    // Load all images before generating PDF
    const images = await loadPackageImages(completePackage);
    
    // Generate PDF with images
    await generatePDF(completePackage, images);
    
    Swal.close();
  } catch (error) {
    console.error('[PDF Service] Error in generateAndDownloadPDF:', error);
    Swal.fire('Error', 'Failed to generate PDF. Please try again.', 'error');
  }
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
    const days = pkg.days || pkg.itinerary?.days || [];
    if (days && days.length > 0) {
      for (const day of days) {
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

/**
 * Internal function to generate the actual PDF with enhanced visuals
 * @param {object} pkg - Complete package object
 * @param {object} images - Loaded images object
 */
const generatePDF = async (pkg, images) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    let pageNumber = 1;

    // Colors
    const primaryColor = [41, 128, 185]; // Professional blue
    const secondaryColor = [52, 73, 94]; // Dark blue-grey
    const accentColor = [231, 76, 60]; // Red accent
    const lightBg = [236, 240, 241]; // Light grey background
    const successColor = [39, 174, 96]; // Green

    // Helper function to add decorative header
    const addHeader = (isFirstPage = false) => {
      // Gradient-like header background
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setFillColor(30, 90, 140);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      // Company name
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(PDF_CONFIG.company, pageWidth / 2, 15, { align: 'center' });
      
      // Tagline
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(PDF_CONFIG.tagline, pageWidth / 2, 22, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);
      
      // Small decorative elements
      doc.setFillColor(255, 255, 255);
      doc.circle(margin, 28, 1.5, 'F');
      doc.circle(pageWidth - margin, 28, 1.5, 'F');
      
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

    // Helper function to add images in a grid
    const addImageGrid = (imageArray, maxImages = 4) => {
      if (!imageArray || imageArray.length === 0) return;
      
      const imagesToShow = imageArray.slice(0, maxImages);
      const imagesPerRow = 2;
      const imageWidth = (contentWidth - 5) / imagesPerRow;
      const imageHeight = 50;
      const spacing = 5;
      
      let row = 0;
      let col = 0;
      
      imagesToShow.forEach((imgData, index) => {
        if (imgData) {
          ensureSpace(imageHeight + spacing);
          
          const x = margin + (col * (imageWidth + spacing));
          const y = yPos;
          
          // Border
          doc.setDrawColor(...primaryColor);
          doc.setLineWidth(0.5);
          doc.rect(x, y, imageWidth, imageHeight);
          
          try {
            // Add image with padding
            doc.addImage(imgData, 'JPEG', x + 1, y + 1, imageWidth - 2, imageHeight - 2);
          } catch (error) {
            console.warn('Error adding image to PDF:', error);
          }
          
          col++;
          if (col >= imagesPerRow) {
            col = 0;
            row++;
            yPos += imageHeight + spacing;
          }
        }
      });
      
      // Move past the last row
      if (col > 0) {
        yPos += imageHeight + spacing;
      }
    };

    // ========== START PDF GENERATION ==========
    
    // First page header
    addHeader(true);
    yPos = 48;

    // ========== COVER SECTION WITH IMAGES ==========
    
    // Package title with decorative background
    doc.setFillColor(...primaryColor);
    doc.rect(0, yPos - 5, pageWidth, 25, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    const titleLines = doc.splitTextToSize(pkg.name || 'Travel Package', pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, yPos + 5, { align: 'center' });
    
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    yPos += 30;

    // Package images grid
    if (images.packageImages && images.packageImages.length > 0) {
      yPos += 5;
      addImageGrid(images.packageImages, 4);
      yPos += 5;
    }

    // ========== DESCRIPTION SECTION ==========
    if (pkg.description) {
      addSectionTitle('Package Overview', primaryColor);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const descLines = doc.splitTextToSize(pkg.description, contentWidth - 4);
      
      ensureSpace(descLines.length * 6 + 10);
      
      // Description box
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(margin, yPos, contentWidth, descLines.length * 6 + 4, 2, 2, 'F');
      doc.setDrawColor(...lightBg);
      doc.roundedRect(margin, yPos, contentWidth, descLines.length * 6 + 4, 2, 2, 'S');
      
      doc.text(descLines, margin + 3, yPos + 5);
      yPos += descLines.length * 6 + 10;
      doc.setTextColor(0, 0, 0);
    }

    // ========== PACKAGE DETAILS IN STYLED BOXES ==========
    addSectionTitle('Package Details', secondaryColor);
    
    // Create a details grid
    const details = [
      { label: 'Destination', value: pkg.destination, icon: '>>' },
      { label: 'Duration', value: `${pkg.duration} Days`, icon: '>>' },
      { label: 'Category', value: pkg.category?.charAt(0).toUpperCase() + pkg.category?.slice(1), icon: '>>' },
      { label: 'Difficulty', value: pkg.difficulty?.charAt(0).toUpperCase() + pkg.difficulty?.slice(1), icon: '>>' },
      { label: 'Max Group Size', value: pkg.maxGroupSize + ' People', icon: '>>' },
      { label: 'Price', value: `Rs. ${parseInt(pkg.price).toLocaleString('en-IN')}`, icon: '>>' },
    ];

    details.forEach(detail => {
      if (detail.value) {
        addInfoBox(detail.label, detail.value, detail.icon);
      }
    });
    
    yPos += 5;

    // ========== HIGHLIGHTS ==========
    if (pkg.highlights && pkg.highlights.length > 0) {
      addSectionTitle('Tour Highlights', accentColor);
      
      pkg.highlights.forEach((highlight, index) => {
        ensureSpace(8);
        
        // Alternating background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.roundedRect(margin, yPos, contentWidth, 7, 1, 1, 'F');
        }
        
        doc.setFontSize(10);
        doc.setTextColor(...accentColor);
        doc.text('*', margin + 2, yPos + 5);
        
        doc.setTextColor(0, 0, 0);
        const highlightText = String(highlight).trim();
        const lines = doc.splitTextToSize(highlightText, contentWidth - 10);
        doc.text(lines, margin + 6, yPos + 5);
        
        yPos += Math.max(7, lines.length * 5 + 2);
      });
      
      yPos += 5;
    }

    // ========== INCLUSIONS & EXCLUSIONS ==========
    if (pkg.inclusions && pkg.inclusions.length > 0) {
      addSectionTitle('What\'s Included', successColor);
      
      pkg.inclusions.forEach((item, index) => {
        ensureSpace(8);
        
        doc.setFontSize(10);
        doc.setTextColor(...successColor);
        doc.text('+', margin + 2, yPos + 5);
        
        doc.setTextColor(0, 0, 0);
        const itemText = String(item).trim();
        const lines = doc.splitTextToSize(itemText, contentWidth - 10);
        doc.text(lines, margin + 6, yPos + 5);
        
        yPos += Math.max(7, lines.length * 5 + 2);
      });
      
      yPos += 5;
    }

    if (pkg.exclusions && pkg.exclusions.length > 0) {
      addSectionTitle('What\'s Excluded', [189, 195, 199]);
      
      pkg.exclusions.forEach((item, index) => {
        ensureSpace(8);
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('-', margin + 2, yPos + 5);
        
        doc.setTextColor(80, 80, 80);
        const itemText = String(item).trim();
        const lines = doc.splitTextToSize(itemText, contentWidth - 10);
        doc.text(lines, margin + 6, yPos + 5);
        
        yPos += Math.max(7, lines.length * 5 + 2);
      });
      
      yPos += 5;
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
        
        // Day header with gradient effect
        doc.setFillColor(...primaryColor);
        doc.roundedRect(margin, yPos, contentWidth, 12, 2, 2, 'F');
        
        doc.setFillColor(30, 90, 140);
        doc.roundedRect(margin, yPos, 40, 12, 2, 2, 'F');
        
        // Day number
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`DAY ${day.dayNumber || dayIndex + 1}`, margin + 20, yPos + 8, { align: 'center' });
        
        // Day title
        doc.setFontSize(13);
        doc.text(day.title || 'Untitled', margin + 45, yPos + 8);
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        yPos += 16;
        
        // Day image if available
        const dayNumber = day.dayNumber || dayIndex + 1;
        if (images.dayImages[dayNumber]) {
          ensureSpace(55);
          
          const imgWidth = contentWidth;
          const imgHeight = 50;
          
          // Border
          doc.setDrawColor(...primaryColor);
          doc.setLineWidth(0.8);
          doc.roundedRect(margin, yPos, imgWidth, imgHeight, 2, 2, 'S');
          
          try {
            doc.addImage(images.dayImages[dayNumber], 'JPEG', margin + 1, yPos + 1, imgWidth - 2, imgHeight - 2);
          } catch (error) {
            console.warn('Error adding day image:', error);
          }
          
          yPos += imgHeight + 8;
        }
        
        // Description
        if (day.description) {
          ensureSpace(15);
          
          doc.setFillColor(248, 249, 250);
          const descLines = doc.splitTextToSize(String(day.description).trim(), contentWidth - 8);
          const boxHeight = descLines.length * 5 + 6;
          
          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(margin, yPos, contentWidth, boxHeight, 2, 2, 'S');
          
          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          doc.text(descLines, margin + 4, yPos + 5);
          
          yPos += boxHeight + 5;
          doc.setTextColor(0, 0, 0);
        }
        
        // Locations
        if (day.locations && day.locations.length > 0) {
          ensureSpace(10);
          
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(...successColor);
          doc.text('>> Locations:', margin + 2, yPos + 5);
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          
          const locText = day.locations.map(l => String(l).trim()).join(' • ');
          const locLines = doc.splitTextToSize(locText, contentWidth - 6);
          doc.text(locLines, margin + 4, yPos + 10);
          
          yPos += 10 + (locLines.length * 5);
        }
        
        // Activities
        if (day.activities && day.activities.length > 0) {
          ensureSpace(10);
          
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(52, 152, 219);
          doc.text('>> Activities:', margin + 2, yPos + 5);
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
          
          const actText = day.activities.map(a => String(a).trim()).join(' • ');
          const actLines = doc.splitTextToSize(actText, contentWidth - 6);
          doc.text(actLines, margin + 4, yPos + 10);
          
          yPos += 10 + (actLines.length * 5);
        }
        
        // Accommodation
        if (day.accommodation && day.accommodation.name) {
          ensureSpace(10);
          
          doc.setFillColor(255, 248, 220);
          doc.roundedRect(margin, yPos, contentWidth, 9, 1, 1, 'F');
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(184, 134, 11);
          doc.text('>> Accommodation:', margin + 2, yPos + 6);
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          
          let accText = String(day.accommodation.name).trim();
          if (day.accommodation.type) accText += ` (${day.accommodation.type})`;
          if (day.accommodation.rating) {
            accText += ` - ${day.accommodation.rating} stars`;
          }
          
          doc.text(accText, margin + 40, yPos + 6);
          yPos += 11;
        }
        
        // Meals
        if (day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner)) {
          ensureSpace(10);
          
          doc.setFillColor(255, 240, 245);
          doc.roundedRect(margin, yPos, contentWidth, 9, 1, 1, 'F');
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(220, 20, 60);
          doc.text('>> Meals:', margin + 2, yPos + 6);
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          
          const meals = [];
          if (day.meals.breakfast) meals.push('Breakfast');
          if (day.meals.lunch) meals.push('Lunch');
          if (day.meals.dinner) meals.push('Dinner');
          
          doc.text(meals.join(' | '), margin + 20, yPos + 6);
          yPos += 11;
        }
        
        // Transport
        if (day.transport) {
          ensureSpace(10);
          
          doc.setFillColor(240, 248, 255);
          doc.roundedRect(margin, yPos, contentWidth, 9, 1, 1, 'F');
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(65, 105, 225);
          doc.text('>> Transport:', margin + 2, yPos + 6);
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
          
          const transportText = String(day.transport).charAt(0).toUpperCase() + String(day.transport).slice(1);
          doc.text(transportText, margin + 28, yPos + 6);
          yPos += 11;
        }
        
        // Notes
        if (day.notes) {
          ensureSpace(12);
          
          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.setTextColor(120, 120, 120);
          
          const notesLines = doc.splitTextToSize('Note: ' + String(day.notes).trim(), contentWidth - 4);
          doc.text(notesLines, margin + 2, yPos + 5);
          
          yPos += notesLines.length * 4.5 + 5;
          doc.setFont(undefined, 'normal');
          doc.setTextColor(0, 0, 0);
        }
        
        // Separator between days
        yPos += 8;
        if (dayIndex < days.length - 1) {
          doc.setDrawColor(...lightBg);
          doc.setLineWidth(0.5);
          doc.line(margin + 20, yPos, pageWidth - margin - 20, yPos);
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

    // Save the PDF
    const fileName = `${(pkg.name || 'Package').replace(/[^a-z0-9]/gi, '_')}_Itinerary.pdf`;
    doc.save(fileName);

    Swal.fire({
      icon: 'success',
      title: 'PDF Generated!',
      text: `Your itinerary has been downloaded successfully.`,
      confirmButtonColor: '#4682b4'
    });
    
  } catch (error) {
    console.error('[PDF Service] PDF generation error:', error);
    throw error;
  }
};
