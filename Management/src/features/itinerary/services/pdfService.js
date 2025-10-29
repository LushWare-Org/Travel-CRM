/**
 * PDF generation service for itineraries
 * Aligned with backend day-based structure
 */

import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { PDF_CONFIG } from '../utils/constants';

/**
 * Generate and download PDF for a package
 * @param {object} pkg - Package object
 */
export const generateAndDownloadPDF = (pkg) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = PDF_CONFIG.margin;
    const contentWidth = pageWidth - margin * 2;
    const lineHeight = PDF_CONFIG.lineHeight;

    // Helper function to add header
    const addHeader = () => {
      doc.setFontSize(20);
      doc.setTextColor(...PDF_CONFIG.headerBgColor);
      doc.text(PDF_CONFIG.company, pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(PDF_CONFIG.tagline, pageWidth / 2, 30, { align: 'center' });
      doc.setDrawColor(...PDF_CONFIG.headerBgColor);
      doc.line(margin, 35, pageWidth - margin, 35);
    };

    // Helper function to add footer
    const addFooter = () => {
      doc.setDrawColor(...PDF_CONFIG.headerBgColor);
      doc.line(margin, pageHeight - 27, pageWidth - margin, pageHeight - 27);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 255);
      
      // Email link
      const emailText = `Email: ${PDF_CONFIG.email}`;
      const emailWidth = doc.getTextWidth(emailText);
      const emailX = pageWidth / 2 - emailWidth / 2 - 40;
      doc.textWithLink(emailText, emailX, pageHeight - 15, {
        url: `mailto:${PDF_CONFIG.email}`,
      });
      
      // Phone
      doc.setTextColor(0, 0, 0);
      const phoneText = ` | Phone: ${PDF_CONFIG.phone}`;
      doc.text(phoneText, emailX + emailWidth, pageHeight - 15);
      
      // Website link
      doc.setTextColor(0, 0, 255);
      const websiteText = ` | ${PDF_CONFIG.website}`;
      const websiteX = emailX + emailWidth + doc.getTextWidth(phoneText);
      doc.textWithLink(websiteText, websiteX, pageHeight - 15, {
        url: PDF_CONFIG.website,
      });
      
      doc.setTextColor(0, 0, 0);
    };

    // Helper function to ensure space on page
    let yPos = 50;
    const ensureSpace = (h) => {
      if (yPos + h > pageHeight - margin - 20) {
        addFooter();
        doc.addPage();
        addHeader();
        yPos = 50;
      }
    };

    // Start first page
    addHeader();

    // Title
    doc.setFontSize(18);
    ensureSpace(10);
    doc.text(pkg.name, margin, yPos);
    yPos += 12;

    // Description
    doc.setFontSize(12);
    ensureSpace(lineHeight + 10);
    doc.text('Description:', margin, yPos);
    yPos += 6;
    const descriptionLines = doc.splitTextToSize(pkg.description || '', contentWidth);
    ensureSpace(descriptionLines.length * lineHeight + 4);
    doc.text(descriptionLines, margin, yPos);
    yPos += descriptionLines.length * lineHeight + 8;

    // Details
    const details = [
      `Category: ${pkg.category}`,
      `Region: ${pkg.region}`,
      `Duration: ${pkg.duration}`,
      `Price: ${pkg.price}`,
      `Destinations: ${pkg.destinations?.join(', ')}`,
      `Activities: ${pkg.activities?.join(', ')}`,
      `Accommodation: ${pkg.accommodation}`,
      `Transport: ${pkg.transport}`,
    ];

    details.forEach((line) => {
      ensureSpace(lineHeight + 4);
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    });
    yPos += 6;

    // Itinerary header
    ensureSpace(lineHeight + 6);
    doc.setFontSize(14);
    doc.text('Day-wise Itinerary', margin, yPos);
    yPos += 10;
    doc.setFontSize(12);

    // Helper function to write sections
    const writeSection = (title, text) => {
      const titleHeight = 14;
      const textLines = doc.splitTextToSize(text || '', contentWidth);
      const required = titleHeight + textLines.length * lineHeight + 8;
      ensureSpace(required);

      // Title block background
      doc.setFillColor(173, 216, 230);
      doc.rect(margin, yPos, contentWidth, 10, 'F');
      doc.setTextColor(0, 0, 0);
      doc.text(title || '', margin + 5, yPos + 7);
      yPos += 15;
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * lineHeight + 8;
    };

    // Add itinerary sections from days array
    const days = pkg.days || [];
    if (days.length > 0) {
      days.forEach((day) => {
        const title = `Day ${day.dayNumber}: ${day.title}`;
        const details = [
          `Description: ${day.description || ''}`,
          day.activities && day.activities.length > 0 ? `Activities: ${day.activities.join(', ')}` : '',
          day.transport ? `Transport: ${day.transport}` : '',
          day.accommodation?.name ? `Accommodation: ${day.accommodation.name}` : '',
          day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner)
            ? `Meals: ${[
                day.meals.breakfast ? 'Breakfast' : '',
                day.meals.lunch ? 'Lunch' : '',
                day.meals.dinner ? 'Dinner' : '',
              ]
                .filter(Boolean)
                .join(', ')}`
            : '',
          day.notes ? `Notes: ${day.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        writeSection(title, details);
      });
    } else {
      // Fallback for old structure if needed
      if (pkg.itinerary?.first_day) {
        writeSection('Arrival Day', pkg.itinerary.first_day);
      }
      if (pkg.itinerary?.last_day) {
        writeSection('Departure Day', pkg.itinerary.last_day);
      }
    }

    // Footer on last page
    addFooter();

    // Save PDF
    doc.save(`${pkg.name}_Itinerary.pdf`);

    Swal.fire(
      'Success',
      `Itinerary for ${pkg.name} downloaded as PDF.`,
      'success'
    );
  } catch (error) {
    console.error('PDF generation error:', error);
    Swal.fire(
      'Error',
      'Failed to generate PDF. Please try again.',
      'error'
    );
  }
};
