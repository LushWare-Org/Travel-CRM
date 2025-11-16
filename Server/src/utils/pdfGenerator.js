import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

      // Header
      doc
        .fontSize(20)
        .text('TRIP SKY WAY', 50, 50)
        .fontSize(10)
        .text('India Travel Agency', 50, 75)
        .text('Email: info@tripskyway.com', 50, 90)
        .text('Phone: +91 XXX XXX XXXX', 50, 105);

      // Invoice Title
      doc
        .fontSize(24)
        .text('INVOICE', 400, 50);

      // Invoice Details
      doc
        .fontSize(10)
        .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 80)
        .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 95)
        .text(`Status: ${invoice.status.toUpperCase()}`, 400, 110);

      // Line
      doc
        .moveTo(50, 140)
        .lineTo(550, 140)
        .stroke();

      // Customer Details
      doc
        .fontSize(12)
        .text('Bill To:', 50, 160)
        .fontSize(10)
        .text(user.name, 50, 180)
        .text(user.email, 50, 195)
        .text(user.phone || '', 50, 210);

      // Package Details
      doc
        .fontSize(12)
        .text('Package Details:', 50, 250)
        .fontSize(10)
        .text(`Package: ${booking.package.name}`, 50, 270)
        .text(`Travel Date: ${new Date(booking.travelDate).toLocaleDateString()}`, 50, 285)
        .text(`Travelers: ${booking.numberOfTravelers}`, 50, 300);

      // Table Header
      const tableTop = 350;
      doc
        .fontSize(10)
        .text('Description', 50, tableTop)
        .text('Quantity', 300, tableTop)
        .text('Price', 400, tableTop)
        .text('Amount', 480, tableTop);

      // Line
      doc
        .moveTo(50, tableTop + 20)
        .lineTo(550, tableTop + 20)
        .stroke();

      // Table Row
      const itemY = tableTop + 30;
      doc
        .text(booking.package.name, 50, itemY)
        .text(booking.numberOfTravelers.toString(), 300, itemY)
        .text(`$${booking.package.price}`, 400, itemY)
        .text(`$${invoice.totalAmount}`, 480, itemY);

      // Totals
      const totalsTop = itemY + 50;
      doc
        .moveTo(50, totalsTop)
        .lineTo(550, totalsTop)
        .stroke();

      doc
        .fontSize(10)
        .text('Subtotal:', 400, totalsTop + 20)
        .text(`$${invoice.totalAmount}`, 480, totalsTop + 20)
        .text('Tax (0%):', 400, totalsTop + 40)
        .text('$0.00', 480, totalsTop + 40)
        .fontSize(12)
        .text('Total:', 400, totalsTop + 60)
        .text(`$${invoice.totalAmount}`, 480, totalsTop + 60);

      // Payment Info
      if (invoice.paidAmount > 0) {
        doc
          .fontSize(10)
          .text('Paid:', 400, totalsTop + 90)
          .text(`$${invoice.paidAmount}`, 480, totalsTop + 90)
          .text('Balance Due:', 400, totalsTop + 110)
          .text(`$${invoice.totalAmount - invoice.paidAmount}`, 480, totalsTop + 110);
      }

      // Footer
      doc
        .fontSize(10)
        .text('Thank you for your business!', 50, 700, { align: 'center' })
        .text('For any queries, contact us at info@tripskyway.com', 50, 715, { align: 'center' });

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
        .text('TRIP SKY WAY', { align: 'left' })
        .moveDown(0.2)
        .fontSize(10)
        .fillColor(gray)
        .text('Travel & Tours', { align: 'left' })
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

      let y = doc.y;
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
        .text('Thank you for choosing Trip Sky Way. For assistance, contact support@tripskyway.com', 50, 760, { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
}