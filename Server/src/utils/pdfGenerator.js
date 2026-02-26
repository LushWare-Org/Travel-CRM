import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BRANDING from '../config/branding.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export function generateInvoicePDF(invoice, user, booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(dirname, '../../uploads/invoices', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Modern header with gradient
      doc.rect(0, 0, 595, 120).fillAndStroke('#3B82F6', '#2563EB');

      doc
        .fillColor('#FFFFFF')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text(BRANDING.company.name.toUpperCase(), 50, 30)
        .fontSize(10)
        .font('Helvetica')
        .text(BRANDING.company.tagline || 'Premium Travel Agency', 50, 62)
        .fontSize(9)
        .text(`Email: ${BRANDING.contact.email}`, 50, 80)
        .text(`Phone: ${BRANDING.contact.phone}`, 50, 95);

      // Invoice badge
      doc.roundedRect(410, 25, 140, 75, 8).fillAndStroke('#FFFFFF', '#FFFFFF');

      doc
        .fillColor('#3B82F6')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('INVOICE', 420, 38, { width: 120, align: 'center' });

      doc
        .fontSize(9)
        .fillColor('#6B7280')
        .font('Helvetica')
        .text(`#${invoice.invoiceNumber}`, 420, 65, { width: 120, align: 'center' })
        .text(new Date(invoice.createdAt).toLocaleDateString(), 420, 80, { width: 120, align: 'center' });

      // Customer info card
      doc.roundedRect(50, 145, 240, 90, 8).strokeColor('#E5E7EB').lineWidth(1.5).stroke();

      doc
        .fillColor('#1F2937')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('BILL TO', 65, 160)
        .fontSize(11)
        .text(user.name, 65, 182)
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6B7280')
        .text(user.email, 65, 200)
        .text(user.phone || '', 65, 215);

      // Package info card
      doc.roundedRect(305, 145, 245, 90, 8).strokeColor('#E5E7EB').lineWidth(1.5).stroke();

      doc
        .fillColor('#1F2937')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PACKAGE DETAILS', 320, 160)
        .fontSize(10)
        .font('Helvetica')
        .text(booking.package.name, 320, 182, { width: 215 })
        .fontSize(9)
        .fillColor('#6B7280')
        .text(`Travel: ${new Date(booking.travelDate).toLocaleDateString()}`, 320, 200)
        .text(`Travelers: ${booking.numberOfTravelers}`, 320, 215);

      // Table header
      const tableTop = 260;
      doc.rect(50, tableTop, 500, 28).fillAndStroke('#3B82F6', '#3B82F6');

      doc
        .fillColor('#FFFFFF')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Description', 60, tableTop + 9)
        .text('Quantity', 310, tableTop + 9)
        .text('Price', 400, tableTop + 9)
        .text('Amount', 480, tableTop + 9);

      // Table row
      const itemY = tableTop + 38;
      doc.rect(50, itemY, 500, 32).strokeColor('#E5E7EB').lineWidth(1).stroke();

      doc
        .fillColor('#1F2937')
        .fontSize(10)
        .font('Helvetica')
        .text(booking.package.name, 60, itemY + 11)
        .text(booking.numberOfTravelers.toString(), 310, itemY + 11)
        .text(`$${booking.package.price}`, 400, itemY + 11)
        .font('Helvetica-Bold')
        .text(`$${invoice.totalAmount}`, 480, itemY + 11);

      // Totals card
      const totalsTop = itemY + 55;
      doc.roundedRect(330, totalsTop, 220, 115, 8).fillAndStroke('#F9FAFB', '#E5E7EB');

      doc
        .fillColor('#6B7280')
        .fontSize(10)
        .font('Helvetica')
        .text('Subtotal:', 345, totalsTop + 18)
        .text(`$${invoice.totalAmount}`, 480, totalsTop + 18)
        .text('Tax (0%):', 345, totalsTop + 40)
        .text('$0.00', 480, totalsTop + 40);

      doc.rect(345, totalsTop + 65, 190, 35).fillAndStroke('#3B82F6', '#3B82F6');

      doc
        .fillColor('#FFFFFF')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('TOTAL:', 355, totalsTop + 76)
        .fontSize(14)
        .text(`$${invoice.totalAmount}`, 470, totalsTop + 75);

      // Payment info
      if (invoice.paidAmount > 0) {
        const payY = totalsTop + 200;
        doc
          .fillColor('#10B981')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Paid:', 345, payY)
          .text(`$${invoice.paidAmount}`, 480, payY);

        if (invoice.totalAmount - invoice.paidAmount > 0) {
          doc
            .fillColor('#EF4444')
            .text('Balance:', 345, payY + 18)
            .text(`$${invoice.totalAmount - invoice.paidAmount}`, 480, payY + 18);
        }
      }

      // Footer
      doc.rect(0, 750, 595, 92).fillAndStroke('#F9FAFB', '#F9FAFB');

      doc
        .fillColor('#1F2937')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('Thank You For Your Business!', 50, 770, { align: 'center', width: 495 })
        .fillColor('#6B7280')
        .fontSize(9)
        .font('Helvetica')
        .text(`For queries: ${BRANDING.contact.email} | ${BRANDING.contact.phone}`, 50, 790, { align: 'center', width: 495 });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function generateItineraryPDF(itinerary, packageData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `itinerary-${Date.now()}.pdf`;
      const filePath = path.join(dirname, '../../uploads/itineraries', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc
        .fontSize(24)
        .text('TRIP ITINERARY', { align: 'center' })
        .fontSize(18)
        .text(packageData.name, { align: 'center' })
        .moveDown();

      // Package Overview
      doc
        .fontSize(12)
        .text(`Duration: ${packageData.duration} days`, 50, 150)
        .text(`Destination: ${packageData.destination}`, 50, 170)
        .text(`Price: $${packageData.price} per person`, 50, 190)
        .moveDown();

      // Day-wise Itinerary
      let yPosition = 230;
      itinerary.days.forEach((day, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc
          .fontSize(14)
          .text(`Day ${index + 1}: ${day.title}`, 50, yPosition)
          .fontSize(10)
          .text(day.description, 50, yPosition + 20, { width: 500 })
          .moveDown();

        yPosition += 80;
      });

      // Inclusions
      doc
        .addPage()
        .fontSize(14)
        .text('Inclusions:', 50, 50)
        .fontSize(10);

      let inclusionY = 75;
      packageData.inclusions?.forEach((item) => {
        doc.text(`• ${item}`, 60, inclusionY);
        inclusionY += 20;
      });

      // Exclusions
      doc
        .fontSize(14)
        .text('Exclusions:', 50, inclusionY + 30)
        .fontSize(10);

      let exclusionY = inclusionY + 55;
      packageData.exclusions?.forEach((item) => {
        doc.text(`• ${item}`, 60, exclusionY);
        exclusionY += 20;
      });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Generate a professional itinerary PDF using full lead details
export function generateLeadItineraryPDF(lead, itinerary) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const fileName = `itinerary-${(lead.name || 'lead').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
      const filePath = path.join(dirname, '../../uploads/itineraries', fileName);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const primary = '#1e3a8a'; // blue-800
      const secondary = '#7c3aed'; // purple-600
      const gray = '#374151'; // gray-700

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header / Branding
      doc
        .fillColor(primary)
        .fontSize(24)
        .text(BRANDING.company.name.toUpperCase(), { align: 'left' })
        .moveDown(0.2)
        .fontSize(10)
        .fillColor(gray)
        .text(BRANDING.company.tagline || 'Travel & Tours', { align: 'left' })
        .moveDown(0.5);

      // Title
      doc
        .fontSize(22)
        .fillColor(primary)
        .text('CUSTOM ITINERARY', { align: 'center' })
        .moveDown(0.5);

      // Lead overview box
      const startY = doc.y;
      doc
        .rect(50, startY, 500, 110)
        .strokeColor(primary)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(gray)
        .fontSize(12)
        .text(`Lead Name: ${lead.name || '-'}`, 60, startY + 10)
        .text(`Email: ${lead.email || '-'}`, 60, startY + 30)
        .text(`Phone: ${lead.phone || '-'}`, 60, startY + 50)
        .text(`WhatsApp: ${lead.whatsapp || '-'}`, 60, startY + 70)
        .text(`Sales Rep: ${lead.salesRep || '-'}`, 300, startY + 10)
        .text(`Departure: ${lead.city || '-'}`, 300, startY + 30)
        .text(`Destination: ${lead.destination || '-'}`, 300, startY + 50)
        .text(`Travel Date: ${lead.travelDate ? new Date(lead.travelDate).toLocaleDateString() : '-'}`, 300, startY + 70)
        .moveDown(2);

      doc.moveDown(3);

      // Section: Day-wise itinerary
      doc
        .fontSize(16)
        .fillColor(primary)
        .text('Day-by-Day Plan', { underline: true })
        .moveDown(0.5);

      let { y } = doc;
      (itinerary.days || []).forEach((day, idx) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        const blockTop = y;
        // Card border
        doc
          .rect(50, blockTop, 500, 120)
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .stroke();

        // Day header
        doc
          .fillColor(secondary)
          .fontSize(14)
          .text(`Day ${day.dayNumber || idx + 1}: ${day.title || ''}`, 60, blockTop + 10)
          .fillColor(gray)
          .fontSize(10)
          .text(day.description || '', 60, blockTop + 30, { width: 480 });

        // Two columns: Destinations/Activities and Hotel
        const leftY = blockTop + 60;
        doc
          .fontSize(10)
          .fillColor(primary)
          .text('Destinations:', 60, leftY)
          .fillColor(gray)
          .text((day.locations && day.locations.length > 0) ? `• ${day.locations.join('\n• ')}` : '-', 60, leftY + 15, { width: 220 });

        doc
          .fillColor(primary)
          .text('Activities:', 60, leftY + 60)
          .fillColor(gray)
          .text((day.activities && day.activities.length > 0) ? `• ${day.activities.join('\n• ')}` : '-', 60, leftY + 75, { width: 220 });

        doc
          .fillColor(primary)
          .text('Hotel:', 320, leftY)
          .fillColor(gray)
          .text(day.accommodation?.name ? `${day.accommodation.name}` : '-', 320, leftY + 15, { width: 220 });

        y = blockTop + 140;
        doc.moveDown(0.5);
      });

      // Footer
      doc
        .moveDown(1)
        .fontSize(9)
        .fillColor(gray)
        .text(`Thank you for choosing ${BRANDING.company.name}. For assistance, contact ${BRANDING.contact.supportEmail}`, 50, 760, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}
