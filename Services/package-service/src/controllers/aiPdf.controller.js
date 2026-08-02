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
    include: {
      itineraryDays: {
        orderBy: { dayNumber: 'asc' },
        include: { places: { include: { place: true } }, activities: { include: { activity: true } }, transports: true },
      },
    },
  });
  if (!pkg) throw new AppError('Package not found', 404);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="package-${id}.pdf"`);
  doc.pipe(res);

  const PW = doc.page.width - 100;

  // ── Cover header block ─────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 110).fill(ACCENT);
  doc.fillColor('#ffffff')
     .fontSize(24).font('Helvetica-Bold')
     .text(pkg.title || 'Travel Package', 50, 22, { width: PW });

  const meta = [
    pkg.destination,
    pkg.durationDays ? `${pkg.durationDays} Days` : null,
    pkg.category,
  ].filter(Boolean).join('  |  ');
  if (meta) doc.fontSize(11).font('Helvetica').text(meta, 50, 60, { width: PW });
  if (pkg.basePrice) {
    doc.fontSize(14).font('Helvetica-Bold')
       .text(`From $${Number(pkg.basePrice).toLocaleString()}`, 50, 82, { width: PW });
  }

  doc.fillColor('#000000');
  doc.y = 130;

  // ── Overview ───────────────────────────────────────────────
  if (pkg.description) {
    sectionTitle(doc, 'Overview');
    doc.fontSize(11).font('Helvetica').fillColor('#000000')
       .text(pkg.description, { width: PW, align: 'justify' });
    doc.moveDown();
  }

  // ── Inclusions ─────────────────────────────────────────────
  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  if (inclusions.length) {
    sectionTitle(doc, 'Inclusions');
    bulletList(doc, inclusions, '+', PW);
  }

  // ── Exclusions ─────────────────────────────────────────────
  const exclusions = Array.isArray(pkg.exclusions) ? pkg.exclusions : [];
  if (exclusions.length) {
    sectionTitle(doc, 'Exclusions');
    bulletList(doc, exclusions, '-', PW);
  }

  // ── Itinerary ──────────────────────────────────────────────
  const days = pkg.itineraryDays || [];
  if (days.length) {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, 60).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text('Day-by-Day Itinerary', 50, 20, { width: PW, align: 'center' });
    doc.fillColor('#000000');
    doc.y = 80;

    days.forEach((day) => {
      if (doc.y > 680) doc.addPage();

      const dayLabel = `Day ${day.dayNumber}${day.title ? ': ' + day.title : ''}`;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT).text(dayLabel);
      doc.fillColor('#000000');

      if (day.description) {
        doc.fontSize(10).font('Helvetica')
           .text(day.description, { width: PW, align: 'justify' })
           .moveDown(0.2);
      }

      const details = [];
      const locationNames = (day.places || []).map(p => p.place?.name || p.customName).filter(Boolean);
      if (locationNames.length) details.push(`Locations: ${locationNames.join(', ')}`);
      const activityNames = (day.activities || []).map(a => a.activity?.name).filter(Boolean);
      if (activityNames.length) details.push(`Activities: ${activityNames.join(', ')}`);
      if (day.transports?.length) {
        const t = day.transports[0];
        details.push(`Transport: ${t.transportMode} (${t.pricingModel})`);
      }
      const meals = [];
      if (day.breakfastCount > 0) meals.push(`${day.breakfastCount}x Breakfast`);
      if (day.lunchCount > 0) meals.push(`${day.lunchCount}x Lunch`);
      if (day.dinnerCount > 0) meals.push(`${day.dinnerCount}x Dinner`);
      if (meals.length) details.push(`Meals: ${meals.join(', ')}`);

      details.forEach(d => {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor(GRAY)
           .text(`  ${d}`, { width: PW });
      });
      doc.fillColor('#000000').moveDown(0.8);
    });
  }

  // ── Terms & Conditions ─────────────────────────────────────
  if (pkg.termsAndConditions) {
    if (doc.y > 580) doc.addPage();
    doc.moveDown(0.5);
    sectionTitle(doc, 'Terms & Conditions');
    doc.fontSize(10).font('Helvetica').fillColor('#000000')
       .text(pkg.termsAndConditions, { width: PW });
  }

  // ── Footer on last page ────────────────────────────────────
  doc.fontSize(8).fillColor(GRAY)
     .text(
       `Generated on ${new Date().toLocaleDateString()}  |  Package ID: ${id}`,
       50, doc.page.height - 35,
       { width: PW, align: 'center' }
     );

  doc.end();
});
