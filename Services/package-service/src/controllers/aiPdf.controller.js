import PDFDocument from 'pdfkit';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

const ACCENT = '#C0392B';
const GRAY   = '#666666';

function sectionTitle(doc, title) {
  if (doc.y > 700) doc.addPage();
  doc.fontSize(13).font('Helvetica-Bold').fillColor(ACCENT).text(title);
  doc.fillColor('#000000').moveDown(0.25);
}

function bulletList(doc, items, prefix, pageWidth) {
  items.forEach(item => {
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(`  ${prefix} ${item}`, { width: pageWidth });
  });
  doc.moveDown(0.5);
}

export const downloadAIPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pkg = await prisma.package.findUnique({
    where: { id },
    include: { itinerary: true },
  });
  if (!pkg) throw new AppError('Package not found', 404);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="package-${id}.pdf"`);
  doc.pipe(res);

  const PW = doc.page.width - 100; // usable width

  // ── Cover header block ─────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 110).fill(ACCENT);
  doc.fillColor('#ffffff')
     .fontSize(24).font('Helvetica-Bold')
     .text(pkg.name || 'Travel Package', 50, 22, { width: PW });

  const meta = [
    pkg.destination,
    pkg.duration ? `${pkg.duration} Days` : null,
    pkg.category,
    pkg.packageType,
  ].filter(Boolean).join('  |  ');
  if (meta) doc.fontSize(11).font('Helvetica').text(meta, 50, 60, { width: PW });
  if (pkg.price) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`From $${Number(pkg.price).toLocaleString()}`, 50, 82, { width: PW });
  }

  doc.fillColor('#000000');
  doc.y = 130;

  // ── Overview ───────────────────────────────────────────────────────────────
  if (pkg.description) {
    sectionTitle(doc, 'Overview');
    doc.fontSize(11).font('Helvetica').fillColor('#000000')
       .text(pkg.description, { width: PW, align: 'justify' });
    doc.moveDown();
  }

  // ── Highlights ─────────────────────────────────────────────────────────────
  if (pkg.highlights?.length) {
    sectionTitle(doc, 'Highlights');
    bulletList(doc, pkg.highlights, '*', PW);
  }

  // ── Inclusions ─────────────────────────────────────────────────────────────
  if (pkg.inclusions?.length) {
    sectionTitle(doc, 'Inclusions');
    bulletList(doc, pkg.inclusions, '+', PW);
  }

  // ── Exclusions ─────────────────────────────────────────────────────────────
  if (pkg.exclusions?.length) {
    sectionTitle(doc, 'Exclusions');
    bulletList(doc, pkg.exclusions, '-', PW);
  }

  // ── Itinerary ──────────────────────────────────────────────────────────────
  const days = Array.isArray(pkg.itinerary?.days) ? pkg.itinerary.days : [];
  if (days.length) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 60).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text('Day-by-Day Itinerary', 50, 20, { width: PW, align: 'center' });
    doc.fillColor('#000000');
    doc.y = 80;

    days.forEach((day) => {
      if (doc.y > 680) doc.addPage();

      const dayLabel = `Day ${day.dayNumber ?? ''}${day.title ? ': ' + day.title : ''}`;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT).text(dayLabel);
      doc.fillColor('#000000');

      if (day.description) {
        doc.fontSize(10).font('Helvetica')
           .text(day.description, { width: PW, align: 'justify' })
           .moveDown(0.2);
      }

      const details = [];
      if (day.activities?.length) details.push(`Activities: ${day.activities.join(', ')}`);
      if (day.locations?.length)  details.push(`Locations: ${day.locations.join(', ')}`);
      if (day.transport)          details.push(`Transport: ${day.transport}`);
      if (day.accommodation?.name) {
        const accom = day.accommodation;
        details.push(`Stay: ${accom.name}${accom.type ? ' (' + accom.type + ')' : ''}`);
      }
      const meals = ['breakfast', 'lunch', 'dinner']
        .filter(m => day.meals?.[m])
        .map(m => m.charAt(0).toUpperCase() + m.slice(1));
      if (meals.length) details.push(`Meals: ${meals.join(', ')}`);

      details.forEach(d => {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor(GRAY)
           .text(`  ${d}`, { width: PW });
      });
      doc.fillColor('#000000').moveDown(0.8);
    });
  }

  // ── Terms & Conditions ─────────────────────────────────────────────────────
  if (pkg.terms?.length) {
    if (doc.y > 580) doc.addPage();
    doc.moveDown(0.5);
    sectionTitle(doc, 'Terms & Conditions');
    pkg.terms.forEach((t, i) => {
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text(`${i + 1}. ${t}`, { width: PW });
    });
  }

  // ── Footer on last page ────────────────────────────────────────────────────
  doc.fontSize(8).fillColor(GRAY)
     .text(
       `Generated on ${new Date().toLocaleDateString()}  |  Package ID: ${id}`,
       50, doc.page.height - 35,
       { width: PW, align: 'center' }
     );

  doc.end();
});
