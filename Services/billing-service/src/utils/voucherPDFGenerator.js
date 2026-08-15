import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { getOrgSettings, toBrandingShape, hasRequiredOrgFieldsForVoucher } from '../config/orgSettings.js';
import { VoucherForPdf } from '@travel-crm/contracts';
import { formatDate } from './pdfFormatters.js';
import { loadRemoteImageBuffer } from './pdfImageLoader.js';
import AppError from './appError.js';

/**
 * Render a travel voucher snapshot to a branded, pdfkit-generated PDF
 * Buffer, matching the reference "TRAVEL VOUCHER" layout: header meta,
 * package banner, Guest/Booking detail cards, flight and hotel tables,
 * day-by-day itinerary, meal plan, inclusions/exclusions, and a signatory
 * footer. Ported from the legacy monolith's voucherPDFGenerator.js design,
 * rebuilt on the ensureSpace/sectionHeader/drawInfoCard helper conventions
 * shared by the invoice and payment-receipt generators in this service.
 *
 * @param {object} voucher - a Voucher row with locationDates, mealPlans,
 *   itinerarySummary, and flightSegments relations included.
 * @returns {Promise<Buffer>}
 */
export async function generateVoucherPDF(voucher) {
  // Fail loud on a shape mismatch instead of silently rendering blank
  // sections — narrow .passthrough() check on only the fields this
  // generator actually reads, not a full Voucher schema.
  VoucherForPdf.parse(voucher);

  const orgSettings = await getOrgSettings();
  const BRANDING = toBrandingShape(orgSettings);
  const T = BRANDING.theme;

  const { ok, missing } = hasRequiredOrgFieldsForVoucher(BRANDING);
  if (!ok) {
    throw new AppError(
      `Cannot generate voucher: organization settings are incomplete (missing: ${missing.join(', ')}). ` +
        'Complete Organization Settings before generating vouchers.',
      422,
    );
  }

  const logo = BRANDING.urls.logo;
  const logoBuffer =
    logo && !/^https?:/i.test(logo) && fs.existsSync(logo)
      ? logo
      : await loadRemoteImageBuffer(logo);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, left: 50, right: 50, bottom: 80 },
        bufferPages: true,
      });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_H = doc.page.height;
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const contentW = right - left;
      const bottomLimit = PAGE_H - doc.page.margins.bottom;

      const ensureSpace = (h) => { if (doc.y + h > bottomLimit) doc.addPage(); };

      const sectionHeader = (title) => {
        ensureSpace(30);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(T.ink).text(String(title), left, doc.y, { width: contentW });
        doc.x = left;
        doc.y += 18;
      };

      const drawFittedImage = (buf, boxX, boxY, boxW, boxH, align = 'left') => {
        const img = doc.openImage(buf);
        const scale = Math.min(boxW / img.width, boxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = align === 'center' ? boxX + (boxW - w) / 2 : boxX;
        doc.image(buf, x, boxY, { width: w, height: h });
        return { width: w, height: h };
      };

      const drawLogo = (x, y, maxW, maxH) => {
        if (logoBuffer) {
          try { drawFittedImage(logoBuffer, x, y, maxW, maxH, 'left'); return; } catch { /* fall through to text */ }
        }
        doc.font('Helvetica-Bold').fontSize(11).fillColor(T.brand).text(BRANDING.company.name, x, y + maxH / 2 - 5);
      };

      /** Header/data table: a brand-filled header row + bordered data rows, all sized off `colWidths`. */
      const drawTable = (headers, colWidths, rows) => {
        const colX = [];
        let x = left;
        for (const w of colWidths) { colX.push(x); x += w; }

        const headerH = 22;
        ensureSpace(headerH);
        const headerY = doc.y;
        doc.rect(left, headerY, contentW, headerH).fill(T.brand);
        headers.forEach((h, i) => {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(T.white)
            .text(h, colX[i] + 8, headerY + 7, { width: colWidths[i] - 16 });
        });
        doc.y = headerY + headerH;

        const rowH = 26;
        for (const row of rows) {
          ensureSpace(rowH);
          const ry = doc.y;
          doc.rect(left, ry, contentW, rowH).lineWidth(1).strokeColor(T.slate200).stroke();
          row.forEach((cell, i) => {
            doc.font('Helvetica').fontSize(8.5).fillColor(T.ink)
              .text(String(cell ?? '—'), colX[i] + 8, ry + 8, { width: colWidths[i] - 16 });
          });
          doc.y = ry + rowH;
        }
        doc.y += 16;
      };

      // ── Header row 1: logo (left) + voucher meta (right) ────────────
      drawLogo(left, 50, 150, 32);

      const metaW = 200;
      const metaX = right - metaW;
      let my = 50;
      const metaRow = (label, value) => {
        doc.font('Helvetica-Bold').fontSize(8).fillColor(T.muted).text(label, metaX, my, { width: metaW * 0.5 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(T.ink)
          .text(String(value ?? '—'), metaX + metaW * 0.5, my, { width: metaW * 0.5, align: 'right' });
        my += 15;
      };
      metaRow('Voucher No', voucher.voucherNumber);
      metaRow('Status', String(voucher.status || '').toUpperCase());

      // ── Header row 2: centered title ─────────────────────────────────
      const titleY = Math.max(50 + 32, my) + 14;
      doc.font('Helvetica-Bold').fontSize(26).fillColor(T.ink)
        .text('TRAVEL VOUCHER', left, titleY, { width: contentW, align: 'center' });

      doc.x = left;
      doc.y = Math.max(doc.y, titleY) + 20;

      // ── Package info banner ──────────────────────────────────────────
      const pkg = voucher.packageDetails || {};
      if (pkg.name || pkg.destination) {
        const bannerH = 50;
        ensureSpace(bannerH + 10);
        const by = doc.y;
        doc.rect(left, by, contentW, bannerH).fill(T.ink);
        if (pkg.name) {
          doc.font('Helvetica-Bold').fontSize(15).fillColor(T.white)
            .text(pkg.name, left + 14, by + 9, { width: contentW - 28 });
        }
        const subtitle = [pkg.destination, pkg.duration ? `${pkg.duration} Days` : null].filter(Boolean).join('  |  ');
        if (subtitle) {
          doc.font('Helvetica').fontSize(10).fillColor(T.slate50)
            .text(subtitle, left + 14, by + (pkg.name ? 30 : 18), { width: contentW - 28 });
        }
        doc.y = by + bannerH + 20;
      }

      // ── Guest Details / Booking Details (two bordered cards) ────────
      const guestRows = [
        ['Name', voucher.customerName],
        ['Email', voucher.customerEmail || '—'],
        ['Phone', voucher.customerPhone || '—'],
      ];
      const bookingRows = [
        ['Check-in', formatDate(voucher.travelStartDate)],
        ['Check-out', formatDate(voucher.travelEndDate)],
        ['Status', String(voucher.status || '').toUpperCase()],
      ];

      const colGap = 20;
      const colW = (contentW - colGap) / 2;
      const headerH = 20;
      const valueW = colW * 0.68 - 20;
      const rowCount = Math.max(guestRows.length, bookingRows.length);
      doc.font('Helvetica-Bold').fontSize(8.5);
      const rowHeights = Array.from({ length: rowCount }, (_, i) => {
        const gH = guestRows[i] ? doc.heightOfString(String(guestRows[i][1]), { width: valueW }) : 0;
        const bH = bookingRows[i] ? doc.heightOfString(String(bookingRows[i][1]), { width: valueW }) : 0;
        return Math.max(gH, bH, 11) + 6;
      });
      const cardH = headerH + rowHeights.reduce((a, b) => a + b, 0) + 8;
      ensureSpace(cardH + 16);
      const cardY = doc.y;

      const drawInfoCard = (cardTitle, rows, x) => {
        doc.roundedRect(x, cardY, colW, cardH, 6).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.rect(x, cardY, colW, headerH).fill(T.ink);
        doc.fillColor(T.white).font('Helvetica-Bold').fontSize(9).text(cardTitle, x + 10, cardY + 6);
        let ry = cardY + headerH + 8;
        rows.forEach(([k, v], i) => {
          doc.font('Helvetica').fontSize(8).fillColor(T.muted).text(k, x + 10, ry, { width: colW * 0.32 });
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(T.ink)
            .text(String(v), x + 10 + colW * 0.32, ry, { width: valueW });
          ry += rowHeights[i];
        });
      };
      drawInfoCard('Guest Details', guestRows, left);
      drawInfoCard('Booking Details', bookingRows, left + colW + colGap);
      doc.x = left;
      doc.y = cardY + cardH + 24;

      // ── Flight Details ────────────────────────────────────────────
      const flightSegments = voucher.flightSegments || [];
      if (flightSegments.length) {
        sectionHeader('FLIGHT DETAILS');
        drawTable(
          ['Day', 'Carrier / Flight No', 'Route', 'Departs', 'Arrives'],
          [contentW * 0.1, contentW * 0.25, contentW * 0.25, contentW * 0.2, contentW * 0.2],
          flightSegments.map((f) => [
            f.dayNumber ?? '—',
            [f.marketingCarrier, f.flightNumber].filter(Boolean).join(' '),
            [f.origin, f.destination].filter(Boolean).join(' → '),
            f.departureAt ? formatDate(f.departureAt) : '—',
            f.arrivalAt ? formatDate(f.arrivalAt) : '—',
          ]),
        );
      }

      // ── Hotel Bookings & Locations ────────────────────────────────
      const locationDates = voucher.locationDates || [];
      if (locationDates.length) {
        sectionHeader('HOTEL BOOKINGS & LOCATIONS');
        drawTable(
          ['City / Location', 'Hotel Name', 'Check-in', 'Check-out'],
          [contentW * 0.25, contentW * 0.35, contentW * 0.2, contentW * 0.2],
          locationDates.map((l) => [
            l.location || '—',
            l.hotelName || '—',
            l.checkIn ? formatDate(l.checkIn) : '—',
            l.checkOut ? formatDate(l.checkOut) : '—',
          ]),
        );
      }

      // ── Day-by-day itinerary ────────────────────────────────────────
      const itinerarySummary = voucher.itinerarySummary || [];
      if (itinerarySummary.length) {
        sectionHeader('DAY-BY-DAY ITINERARY');

        const cardPad = 12;
        const badgeR = 12;
        const textX = left + cardPad + badgeR * 2 + 8;
        const textW = contentW - cardPad * 2 - badgeR * 2 - 8;

        for (const day of itinerarySummary) {
          const title = day.title || `Day ${day.dayNumber}`;
          const locationsText = (day.locations || []).join(', ');
          const activities = day.activities || [];

          doc.font('Helvetica-Bold').fontSize(10);
          const titleH = doc.heightOfString(title, { width: textW });
          let bodyH = titleH + 4;

          doc.font('Helvetica').fontSize(8.5);
          if (locationsText) bodyH += doc.heightOfString(`Location: ${locationsText}`, { width: textW }) + 4;

          if (activities.length) {
            doc.font('Helvetica-Bold').fontSize(8.5);
            bodyH += doc.heightOfString('Activities:', { width: textW }) + 2;
            doc.font('Helvetica').fontSize(8.5);
            if (activities.length >= 4) {
              const half = Math.ceil(activities.length / 2);
              const colWidth = (textW - 12) / 2;
              const leftH = activities.slice(0, half)
                .reduce((h, a) => h + doc.heightOfString(`•  ${a}`, { width: colWidth }) + 2, 0);
              const rightH = activities.slice(half)
                .reduce((h, a) => h + doc.heightOfString(`•  ${a}`, { width: colWidth }) + 2, 0);
              bodyH += Math.max(leftH, rightH);
            } else {
              bodyH += activities.reduce((h, a) => h + doc.heightOfString(`•  ${a}`, { width: textW }) + 2, 0);
            }
          }

          if (day.accommodationName) bodyH += doc.heightOfString(`Hotel: ${day.accommodationName}`, { width: textW }) + 4;

          const cardH2 = Math.max(bodyH + cardPad * 2, badgeR * 2 + cardPad * 2);
          ensureSpace(cardH2 + 10);
          const cardY2 = doc.y;

          doc.roundedRect(left, cardY2, contentW, cardH2, 6).lineWidth(1).fillAndStroke(T.slate50, T.slate200);

          const badgeCx = left + cardPad + badgeR;
          const badgeCy = cardY2 + cardPad + badgeR;
          doc.circle(badgeCx, badgeCy, badgeR).fill(T.brand);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(T.white)
            .text(String(day.dayNumber), badgeCx - badgeR, badgeCy - 5, { width: badgeR * 2, align: 'center' });

          let ty = cardY2 + cardPad;
          doc.font('Helvetica-Bold').fontSize(10).fillColor(T.ink).text(title, textX, ty, { width: textW });
          ty += titleH + 4;

          if (locationsText) {
            doc.font('Helvetica').fontSize(8.5).fillColor(T.muted)
              .text(`Location: ${locationsText}`, textX, ty, { width: textW });
            ty += doc.heightOfString(`Location: ${locationsText}`, { width: textW }) + 4;
          }

          if (activities.length) {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(T.ink).text('Activities:', textX, ty, { width: textW });
            ty += doc.heightOfString('Activities:', { width: textW }) + 2;
            doc.font('Helvetica').fontSize(8.5).fillColor(T.ink);
            if (activities.length >= 4) {
              const half = Math.ceil(activities.length / 2);
              const colWidth = (textW - 12) / 2;
              let ly = ty;
              for (const a of activities.slice(0, half)) {
                doc.text(`•  ${a}`, textX, ly, { width: colWidth });
                ly += doc.heightOfString(`•  ${a}`, { width: colWidth }) + 2;
              }
              let ry2 = ty;
              for (const a of activities.slice(half)) {
                doc.text(`•  ${a}`, textX + colWidth + 12, ry2, { width: colWidth });
                ry2 += doc.heightOfString(`•  ${a}`, { width: colWidth }) + 2;
              }
              ty = Math.max(ly, ry2);
            } else {
              for (const a of activities) {
                doc.text(`•  ${a}`, textX, ty, { width: textW });
                ty += doc.heightOfString(`•  ${a}`, { width: textW }) + 2;
              }
            }
          }

          if (day.accommodationName) {
            doc.font('Helvetica').fontSize(8.5).fillColor(T.muted)
              .text(`Hotel: ${day.accommodationName}`, textX, ty, { width: textW });
          }

          doc.y = cardY2 + cardH2 + 10;
          doc.x = left;
        }
      }

      // ── Meal Plan ──────────────────────────────────────────────────
      const mealPlans = voucher.mealPlans || [];
      const hasMeals = mealPlans.some((m) => m.breakfast || m.lunch || m.dinner);
      if (hasMeals) {
        sectionHeader('MEAL PLAN');
        doc.font('Helvetica').fontSize(9).fillColor(T.ink);
        for (const m of mealPlans) {
          const meals = [m.breakfast && 'Breakfast', m.lunch && 'Lunch', m.dinner && 'Dinner'].filter(Boolean);
          if (!meals.length) continue;
          ensureSpace(16);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(T.ink).text(`Day ${m.dayNumber}: `, left, doc.y, { continued: true });
          doc.font('Helvetica').fillColor(T.ink).text(meals.join(', '));
          doc.y += 2;
        }
        doc.x = left;
        doc.y += 16;
      }

      // ── Inclusions / Exclusions ──────────────────────────────────────
      const inclusions = pkg.inclusions || [];
      const exclusions = pkg.exclusions || [];
      if (inclusions.length || exclusions.length) {
        sectionHeader('INCLUSIONS & EXCLUSIONS');
        const ieColW = (contentW - colGap) / 2;
        const ieY = doc.y;

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(T.ink).text('Inclusions', left, ieY, { width: ieColW });
        let iy = ieY + 16;
        doc.font('Helvetica').fontSize(8.5).fillColor(T.ink);
        for (const item of inclusions) {
          const h = doc.heightOfString(`•  ${item}`, { width: ieColW });
          ensureSpace(h);
          doc.text(`•  ${item}`, left, iy, { width: ieColW });
          iy += h + 3;
        }

        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(T.ink).text('Exclusions', left + ieColW + colGap, ieY, { width: ieColW });
        let ey = ieY + 16;
        doc.font('Helvetica').fontSize(8.5).fillColor(T.ink);
        for (const item of exclusions) {
          const h = doc.heightOfString(`•  ${item}`, { width: ieColW });
          ensureSpace(h);
          doc.text(`•  ${item}`, left + ieColW + colGap, ey, { width: ieColW });
          ey += h + 3;
        }

        doc.x = left;
        doc.y = Math.max(iy, ey) + 16;
      }

      // ── Special instructions ─────────────────────────────────────────
      if (voucher.specialInstructions) {
        doc.font('Helvetica').fontSize(9);
        const h = doc.heightOfString(voucher.specialInstructions, { width: contentW - 20 }) + 16;
        ensureSpace(h);
        const iy2 = doc.y;
        doc.rect(left, iy2, contentW, h).fill(T.cream);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(T.brandDark)
          .text('Special Instructions', left + 10, iy2 + 8, { width: contentW - 20 });
        doc.font('Helvetica').fontSize(9).fillColor(T.ink)
          .text(voucher.specialInstructions, left + 10, iy2 + 22, { width: contentW - 20 });
        doc.y = iy2 + h + 16;
      }

      // ── Signatory + thank-you footer ─────────────────────────────────
      const sigW = 200;
      const sigBlockH = 60;
      ensureSpace(sigBlockH);
      const sy = doc.y + 20;
      doc.moveTo(left, sy).lineTo(left + sigW, sy).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10).text('Authorized Signatory', left, sy + 5);
      doc.font('Helvetica').fontSize(9).fillColor(T.muted).text(BRANDING.company.name, left, sy + 19);

      doc.font('Helvetica-Bold').fontSize(11).fillColor(T.ink)
        .text(`Thank you for choosing ${BRANDING.company.name}!`, left, sy + 5, { width: contentW, align: 'right' });

      // ── Page numbers ───────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.page.margins.bottom = 0;
        doc.font('Helvetica').fontSize(8).fillColor(T.muted)
          .text(`Page ${i + 1} of ${range.count}`, left, PAGE_H - 40, { width: contentW, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateVoucherPDF;
