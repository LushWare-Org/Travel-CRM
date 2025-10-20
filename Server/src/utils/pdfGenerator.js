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
