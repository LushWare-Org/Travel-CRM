import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { getOrgSettings, toBrandingShape, getBankDetails, hasBankDetails } from '../config/orgSettings.js';
import { QuotationForPdf } from '@travel-crm/contracts';

// Built-in Helvetica (WinAnsi) has no rupee glyph, so INR uses a text prefix.
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: 'INR ', AUD: 'A$', LKR: 'Rs ' };

const formatMoney = (amount, currency = 'USD') => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  const value = (Number(amount) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${symbol}${value}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Group snapshot line items by their category for the detailed layout. */
const groupByCategory = (items = []) => {
  const groups = new Map();
  for (const item of items) {
    const key = item.category || 'other';
    if (!groups.has(key)) groups.set(key, { category: key, total: 0, items: [] });
    const g = groups.get(key);
    g.items.push(item);
    g.total += Number(item.totalPrice) || 0;
  }
  return [...groups.values()];
};

const titleCase = (s) => String(s || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const asList = (v) => (Array.isArray(v) ? v.filter(Boolean) : v ? [v] : []);

/** `itineraryDays` is a Json column — tolerate arrays or stringified arrays. */
const normalizeDays = (v) => {
  let arr = v;
  if (typeof v === 'string') {
    try { arr = JSON.parse(v); } catch { return []; }
  }
  return Array.isArray(arr) ? arr : [];
};

/**
 * Fetch a remote image URL into a Buffer for pdfkit's doc.image(). Returns
 * null (never throws) on a missing/non-http URL, a network failure, or a
 * timeout — every call site degrades to its existing placeholder rather than
 * failing PDF generation over a broken image link.
 */
async function loadRemoteImageBuffer(url, { timeoutMs = 5000 } = {}) {
  if (!url || typeof url !== 'string' || !/^https?:/i.test(url)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Render a quotation snapshot to a branded, multi-page PDF Buffer.
 *
 * The document flows section by section (cover → highlights → itinerary →
 * inclusions/exclusions → pricing → payment details → terms → cancellation →
 * reviews → contact) so the page count grows with the content. Every section
 * degrades gracefully when its snapshot fields are absent. Renders purely from
 * the persisted snapshot — no live lookups — so regeneration is deterministic.
 * Honors `quotation.mode`: `detailed` adds an itemized pricing breakdown.
 *
 * @param {object} quotation - a Quotation row with its `items` included.
 *   Optional `coverImageBuffer` (Buffer), a local-path `coverImage`, or a
 *   remote https `coverImage` URL renders the hero image; anything missing
 *   or unreachable falls back to a branded placeholder banner.
 * @returns {Promise<Buffer>}
 */
export async function generateQuotationPDF(quotation) {
  // Fail loud on a shape mismatch instead of silently rendering blank
  // sections — this is a narrow .passthrough() check on only the fields
  // this generator actually reads, not a full Quotation schema.
  QuotationForPdf.parse(quotation);
  const orgSettings = await getOrgSettings();
  const BRANDING = toBrandingShape(orgSettings);
  const T = BRANDING.theme;
  const CONTENT = BRANDING.content;

  // Image fetching is async; pdfkit's own build below is fully synchronous,
  // so every remote image this document needs is resolved to a Buffer up
  // front. A failed fetch resolves to null and each call site below falls
  // back to its existing placeholder — never blocks/crashes PDF generation.
  const days = normalizeDays(quotation.itineraryDays);
  const [coverImageBuffer, dayImageBuffers] = await Promise.all([
    quotation.coverImageBuffer
      ? Promise.resolve(quotation.coverImageBuffer)
      : loadRemoteImageBuffer(quotation.coverImage),
    Promise.all(days.map((d) => loadRemoteImageBuffer(asList(d.images)[0]))),
  ]);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, left: 50, right: 50, bottom: 92 },
        bufferPages: true,
      });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = quotation.currency || 'USD';
      const PAGE_W = doc.page.width; // 595.28
      const PAGE_H = doc.page.height; // 841.89
      const left = doc.page.margins.left; // 50
      const right = PAGE_W - doc.page.margins.right; // 545.28
      const contentW = right - left;
      const FOOTER_H = 80;
      const footerTop = PAGE_H - FOOTER_H;
      const bottomLimit = PAGE_H - doc.page.margins.bottom; // content must stop here

      // ── flow primitives ──────────────────────────────────────────
      const ensureSpace = (h) => { if (doc.y + h > bottomLimit) doc.addPage(); };

      const sectionHeader = (title) => {
        ensureSpace(48);
        doc.font('Helvetica-Bold').fontSize(14).fillColor(T.brand)
          .text(String(title).toUpperCase(), left, doc.y, { width: contentW });
        const ry = doc.y + 4;
        doc.moveTo(left, ry).lineTo(right, ry).lineWidth(2).strokeColor(T.brand).stroke();
        doc.lineWidth(1);
        doc.x = left;
        doc.y = ry + 14;
      };

      // A filled 5-point star (for rating rows) — avoids relying on the ★ glyph.
      const star = (cx, cy, outer, inner, color) => {
        const spikes = 5;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        doc.moveTo(cx, cy - outer);
        for (let i = 0; i < spikes; i += 1) {
          doc.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer); rot += step;
          doc.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner); rot += step;
        }
        doc.closePath().fill(color);
      };
      const stars = (x, y, n) => { for (let i = 0; i < n; i += 1) star(x + 6 + i * 13, y + 5, 5, 2.2, T.brand); };

      // ── Cover ────────────────────────────────────────────────────
      const coverPage = () => {
        const heroH = 330;
        let drew = false;
        const imgBuf = coverImageBuffer;
        const imgPath = typeof quotation.coverImage === 'string' && !/^https?:/i.test(quotation.coverImage)
          ? quotation.coverImage : null;
        try {
          if (imgBuf) {
            doc.image(imgBuf, left, 0, { width: contentW, height: heroH, cover: [contentW, heroH] });
            drew = true;
          } else if (imgPath && fs.existsSync(imgPath)) {
            doc.image(imgPath, left, 0, { width: contentW, height: heroH, cover: [contentW, heroH] });
            drew = true;
          }
        } catch { drew = false; }
        if (!drew) {
          doc.rect(left, 0, contentW, heroH).fill(T.brand);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(30)
            .text((quotation.destination || quotation.packageTitle || 'Your Destination').toUpperCase(),
              left + 20, heroH / 2 - 24, { width: contentW - 40, align: 'center' });
        }
        doc.rect(0, heroH, PAGE_W, 2).fill(T.slate200);

        const cardY = heroH + 30;
        const cardH = 150;
        doc.roundedRect(left, cardY, contentW, cardH, 12).fillAndStroke(T.white, T.slate200);
        doc.rect(left, cardY + 10, 6, cardH - 20).fill(T.brand);

        doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(20)
          .text(quotation.packageTitle || 'Travel Package', left + 24, cardY + 34, {
            width: contentW - 48, align: 'center',
          });

        doc.x = left;
        doc.y = cardY + cardH + 26;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(T.brand).text('TOUR DETAILS:', left, doc.y);
        doc.moveDown(0.4);
        const details = [];
        if (quotation.travelStartDate) {
          details.push(['Travel Date', `${formatDate(quotation.travelStartDate)}${quotation.travelEndDate ? ` to ${formatDate(quotation.travelEndDate)}` : ''}`]);
        }
        if (quotation.paxCount) details.push(['No. of Pax', `${quotation.paxCount} Person(s)`]);
        if (quotation.durationNights || quotation.durationDays) {
          const dur = `${quotation.durationNights ? `${quotation.durationNights} Nights ` : ''}${quotation.durationDays ? `${quotation.durationDays} Days` : ''}`.trim();
          details.push(['Duration', dur]);
        }
        doc.fontSize(10);
        for (const [k, v] of details) {
          doc.font('Helvetica-Bold').fillColor(T.ink).text(`${k}: `, left, doc.y, { continued: true })
            .font('Helvetica').fillColor(T.ink).text(v);
        }
        doc.addPage();
      };

      // ── Package highlights ───────────────────────────────────────
      const highlightsSection = () => {
        const hs = asList(quotation.highlights);
        if (!hs.length) return;
        sectionHeader('Package Highlights');
        doc.font('Helvetica').fontSize(9).fillColor(T.ink);
        for (const h of hs) {
          ensureSpace(18);
          doc.text(`•  ${h}`, left + 4, doc.y, { width: contentW - 8 });
          doc.y += 3;
        }
        doc.y += 8;
      };

      // ── Itinerary day cards ──────────────────────────────────────
      // Multi-image rule: only the first (cover) image per day is ever
      // rendered here — dayImageBuffers[idx] already resolved just that one
      // URL. Extra images stay stored/editable in Management but are never
      // shown in the PDF, keeping the document print-friendly. A day with
      // no image renders as a single-column card, visually unchanged from
      // before this feature (so old/legacy quotation snapshots still look
      // reasonable when regenerated).
      const CARD_PAD = 14;
      const IMG_W = 130;
      const IMG_H = 90;
      const CHIP_H = 18;
      const CHIP_GAP = 6;

      // Lays chip labels out into wrapped rows within maxWidth without
      // drawing anything — used both to measure the block's height up front
      // and (via drawChipRows) to actually render it, so the two stay in
      // sync. Assumes 'Helvetica-Bold' 8pt is the active font (chip text
      // size) when called, matching what drawChipRows renders with.
      const layoutChipRows = (items, maxWidth) => {
        const rows = [[]];
        let x = 0;
        for (const text of items) {
          const w = doc.widthOfString(text) + 16;
          if (x + w > maxWidth && rows[rows.length - 1].length > 0) {
            rows.push([]);
            x = 0;
          }
          rows[rows.length - 1].push({ text, w });
          x += w + CHIP_GAP;
        }
        return rows;
      };
      const chipRowsHeight = (rows) => rows.length * (CHIP_H + CHIP_GAP) - CHIP_GAP;
      const drawChipRows = (rows, x0, y0) => {
        doc.font('Helvetica-Bold').fontSize(8);
        let y = y0;
        for (const row of rows) {
          let x = x0;
          for (const { text, w } of row) {
            doc.roundedRect(x, y, w, CHIP_H, 9).fillOpacity(0.14).fill(T.brand).fillOpacity(1);
            doc.fillColor(T.brandDark).text(text, x, y + 4.5, { width: w, align: 'center' });
            x += w + CHIP_GAP;
          }
          y += CHIP_H + CHIP_GAP;
        }
        return y - CHIP_GAP;
      };

      const dayCard = (d, idx) => {
        const imgBuf = dayImageBuffers[idx];
        const hasImage = Boolean(imgBuf);
        const textX = hasImage ? left + CARD_PAD * 2 + IMG_W : left + CARD_PAD;
        const textW = hasImage ? contentW - IMG_W - CARD_PAD * 3 : contentW - CARD_PAD * 2;
        const badgeW = 34; // room reserved for the numbered circle before the title
        const titleText = `Day ${d.day ?? idx + 1}: ${d.title || ''}`.trim();
        const locs = asList(d.locations);
        const meals = asList(d.meals);
        const acts = (Array.isArray(d.activities) ? d.activities : []).filter((a) => a && a.name);
        const mealsText = meals.length ? `•  Meals: ${meals.join(', ')}` : null;

        // Dry-measure the text column height (pdfkit's heightOfString needs
        // the same font/size that will be used to draw) before drawing the
        // card background, so the background can be sized to fit.
        doc.font('Helvetica-Bold').fontSize(11);
        let textH = doc.heightOfString(titleText, { width: textW - badgeW });
        doc.font('Helvetica-Bold').fontSize(8);
        const locRows = locs.length ? layoutChipRows(locs, textW) : [];
        if (locRows.length) {
          doc.font('Helvetica-Bold').fontSize(9);
          textH += 10 + doc.heightOfString('LOCATIONS', { width: textW }) + chipRowsHeight(locRows);
        }
        doc.font('Helvetica').fontSize(9);
        if (mealsText) textH += 5 + doc.heightOfString(mealsText, { width: textW });
        if (acts.length) {
          doc.font('Helvetica-Bold').fontSize(9);
          textH += 10 + doc.heightOfString('ACTIVITIES', { width: textW });
          for (const a of acts) {
            doc.font('Helvetica-Bold').fontSize(9);
            let h = doc.heightOfString(a.name, { width: textW - 12 });
            if (a.description) {
              doc.font('Helvetica').fontSize(8);
              h += 2 + doc.heightOfString(a.description, { width: textW - 12 });
            }
            textH += h + 6;
          }
        }

        const cardH = Math.max(textH, hasImage ? IMG_H : 0) + CARD_PAD * 2;
        ensureSpace(cardH + 10);
        const startY = doc.y;

        doc.roundedRect(left, startY, contentW, cardH, 10).fillAndStroke(T.white, T.slate200);

        if (hasImage) {
          try {
            doc.image(imgBuf, left + CARD_PAD, startY + CARD_PAD, {
              width: IMG_W, height: IMG_H, cover: [IMG_W, IMG_H],
            });
          } catch { /* corrupt/undecodable buffer — card still renders text-only */ }
        }

        const cx = textX + 12;
        const cy = startY + CARD_PAD + 12;
        doc.circle(cx, cy, 12).fill(T.brand);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
          .text(String(d.day ?? idx + 1), cx - 12, cy - 6, { width: 24, align: 'center' });

        const titleX = cx + 22;
        doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(11)
          .text(titleText, titleX, cy - 6, { width: textX + textW - titleX });
        let yy = Math.max(doc.y, cy + 14) + 5;

        if (locRows.length) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor(T.brand)
            .text('LOCATIONS', textX, yy, { width: textW });
          yy = doc.y + 4;
          yy = drawChipRows(locRows, textX, yy) + 5;
        }
        doc.font('Helvetica').fontSize(9).fillColor(T.muted);
        if (mealsText) { doc.text(mealsText, textX, yy, { width: textW }); yy = doc.y + 5; }

        if (acts.length) {
          yy += 5;
          doc.font('Helvetica-Bold').fontSize(9).fillColor(T.brand)
            .text('ACTIVITIES', textX, yy, { width: textW });
          yy = doc.y + 4;
          for (const a of acts) {
            doc.circle(textX + 3, yy + 5, 2.5).fill(T.brand);
            const nameX = textX + 12;
            const nameW = textW - 12;
            doc.font('Helvetica-Bold').fontSize(9).fillColor(T.ink).text(a.name, nameX, yy, { width: nameW });
            yy = doc.y + 1;
            if (a.description) {
              doc.font('Helvetica').fontSize(8).fillColor(T.muted).text(a.description, nameX, yy, { width: nameW });
              yy = doc.y + 1;
            }
            yy += 6;
          }
        }

        doc.x = left;
        doc.y = startY + cardH + 10;
      };

      const itinerarySection = () => {
        if (!days.length) return;
        sectionHeader('Travel Itinerary');
        days.forEach(dayCard);
      };

      // ── Inclusions / exclusions (two columns) ────────────────────
      const inclusionsSection = () => {
        const inc = asList(quotation.includedServices);
        const exc = asList(quotation.excludedServices);
        if (!inc.length && !exc.length) return;
        sectionHeader('Inclusions & Exclusions');

        const colGap = 20;
        const colW = (contentW - colGap) / 2;
        const rx = left + colW + colGap;
        const est = Math.max(inc.length, exc.length) * 13 + 30;
        ensureSpace(Math.min(est, 260));
        const startY = doc.y;

        const drawCol = (title, items, x) => {
          doc.font('Helvetica-Bold').fontSize(11).fillColor(T.brand).text(title, x, startY, { width: colW });
          let yy = doc.y + 4;
          doc.font('Helvetica').fontSize(9).fillColor(T.ink);
          for (const it of (items.length ? items : ['—'])) {
            doc.text(`•  ${it}`, x, yy, { width: colW });
            yy = doc.y + 2;
          }
          return yy;
        };
        const endL = drawCol('INCLUSIONS', inc, left);
        const endR = drawCol('EXCLUSIONS', exc, rx);
        doc.x = left;
        doc.y = Math.max(endL, endR) + 8;
      };

      // ── Payment & pricing ────────────────────────────────────────
      const pricingSection = () => {
        sectionHeader('Payment & Pricing');
        const detailed = quotation.mode === 'detailed';
        const priceColX = right - 110;
        const drawRow = (label, amount, { bold = false, indent = 0 } = {}) => {
          ensureSpace(18);
          const yy = doc.y;
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
            .fillColor(bold ? T.ink : T.muted)
            .text(label, left + indent, yy, { width: priceColX - left - indent - 8 });
          const hh = doc.y - yy;
          doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(T.ink)
            .text(amount, priceColX, yy, { width: right - priceColX, align: 'right' });
          doc.y = yy + Math.max(hh, 14) + 4;
        };

        if (detailed && (quotation.items || []).length) {
          for (const g of groupByCategory(quotation.items)) {
            drawRow(titleCase(g.category), formatMoney(g.total, currency), { bold: true });
            for (const it of g.items) {
              const qty = Number(it.quantity) || 1;
              drawRow(qty > 1 ? `${it.description}  (x${qty})` : it.description, '', { indent: 14 });
            }
          }
          doc.moveTo(left, doc.y).lineTo(right, doc.y).lineWidth(1).strokeColor(T.slate200).stroke();
          doc.y += 8;
          drawRow('Subtotal', formatMoney(quotation.subtotal, currency));
          if (Number(quotation.discountAmount) > 0) {
            drawRow(`Discount${quotation.discountType === 'percentage' ? ` (${quotation.discountValue}%)` : ''}`,
              `- ${formatMoney(quotation.discountAmount, currency)}`);
          }
          if (Number(quotation.taxAmount) > 0) drawRow(`Tax (${quotation.taxRate}%)`, formatMoney(quotation.taxAmount, currency));
          if (Number(quotation.serviceChargeAmount) > 0) {
            drawRow(`Service charge (${quotation.serviceChargeRate}%)`, formatMoney(quotation.serviceChargeAmount, currency));
          }
          doc.y += 4;
        }

        ensureSpace(46);
        const by = doc.y;
        doc.roundedRect(left, by, contentW, 34, 6).fillOpacity(0.12).fill(T.brand).fillOpacity(1);
        doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(12).text('Total Package Cost', left + 14, by + 11);
        doc.fillColor(T.brandDark).font('Helvetica-Bold').fontSize(16)
          .text(formatMoney(quotation.totalAmount, currency), left, by + 8, { width: contentW - 14, align: 'right' });
        doc.x = left;
        doc.y = by + 34 + 14;
      };

      // ── Payment details (bank card + UPI + chips) ────────────────
      const paymentChips = () => {
        const chips = CONTENT.paymentMethods || [];
        if (!chips.length) return;
        ensureSpace(34);
        let x = left;
        let rowY = doc.y;
        const h = 22;
        const gap = 8;
        doc.font('Helvetica-Bold').fontSize(8.5);
        for (const c of chips) {
          const w = doc.widthOfString(c) + 20;
          if (x + w > right) { x = left; rowY += h + gap; }
          doc.roundedRect(x, rowY, w, h, 5).fillOpacity(0.12).fill(T.brand).fillOpacity(1);
          doc.fillColor(T.brand).text(c, x, rowY + 6.5, { width: w, align: 'center' });
          x += w + gap;
        }
        doc.x = left;
        doc.y = rowY + h + 12;
      };

      const paymentDetailsSection = () => {
        const bank = getBankDetails(BRANDING);
        if (!hasBankDetails(BRANDING) && !bank.upiId) return;
        sectionHeader('Payment Details');

        ensureSpace(160);
        const cardY = doc.y;
        const cardH = 150;
        doc.roundedRect(left, cardY, contentW, cardH, 10).fill(T.cream);

        const bx = left + 20;
        let by = cardY + 18;
        doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(11).text('Bank Transfer', bx, by);
        by += 20;
        const rows = [
          ['Bank', bank.bankName], ['Account Name', bank.accountName], ['Account No', bank.accountNumber],
          ['IFSC', bank.ifscCode], ['SWIFT', bank.swiftCode], ['Branch', bank.branch],
        ].filter(([, v]) => v);
        doc.fontSize(9);
        for (const [k, v] of rows) {
          doc.font('Helvetica').fillColor(T.muted).text(`${k}:`, bx, by, { width: 90 });
          doc.font('Helvetica-Bold').fillColor(T.ink).text(String(v), bx + 92, by, { width: contentW / 2 - 120 });
          by += 15;
        }

        // QR placeholder + UPI id on the right.
        const qs = 84;
        const qbx = left + contentW - 20 - qs;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(T.brand)
          .text('Scan to pay via UPI', qbx - 60, cardY + 18, { width: qs + 60, align: 'right' });
        const qby = cardY + 40;
        doc.roundedRect(qbx, qby, qs, qs, 6).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.fillColor(T.muted).font('Helvetica').fontSize(8)
          .text('UPI QR', qbx, qby + qs / 2 - 4, { width: qs, align: 'center' });
        if (bank.upiId) {
          doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(9)
            .text(`UPI: ${bank.upiId}`, qbx - 60, qby + qs + 6, { width: qs + 60, align: 'right' });
        }

        doc.x = left;
        doc.y = cardY + cardH + 14;
        paymentChips();
      };

      // ── Terms & cancellation ─────────────────────────────────────
      const paragraph = (title, text, muted = false) => {
        if (!text) return;
        ensureSpace(40);
        if (title) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(T.ink).text(title, left, doc.y, { width: contentW });
          doc.y += 2;
        }
        doc.font('Helvetica').fontSize(9).fillColor(muted ? T.muted : T.ink)
          .text(text, left, doc.y, { width: contentW, align: 'left' });
        doc.moveDown(0.6);
      };

      const termsSection = () => {
        const t = quotation.terms || CONTENT.defaultTerms;
        if (!t) return;
        sectionHeader('Terms & Conditions');
        paragraph('', t);
        paragraph('Payment Terms', quotation.paymentTerms, true);
        paragraph('Notes', quotation.notes, true);
      };

      const cancellationSection = () => {
        if (!CONTENT.cancellationPolicy) return;
        sectionHeader('Cancellation Policy');
        paragraph('', CONTENT.cancellationPolicy);
      };

      // ── Reviews (static placeholder content) ─────────────────────
      const reviewsSection = () => {
        const reviews = CONTENT.reviews || [];
        if (!reviews.length) return;
        sectionHeader('Reviews');
        const colGap = 20;
        const colW = (contentW - colGap) / 2;
        for (let i = 0; i < reviews.length; i += 2) {
          const pair = reviews.slice(i, i + 2);
          ensureSpace(66);
          const rowY = doc.y;
          let rowMax = rowY;
          pair.forEach((rv, j) => {
            const x = left + j * (colW + colGap);
            const accent = T.accents[(i + j) % T.accents.length];
            doc.circle(x + 12, rowY + 12, 12).fill(accent);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11)
              .text((rv.name || '?')[0].toUpperCase(), x, rowY + 6, { width: 24, align: 'center' });
            doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10)
              .text(rv.name || '', x + 32, rowY + 1, { width: colW - 32 });
            stars(x + 32, doc.y + 1, rv.rating || 5);
            doc.fillColor(T.muted).font('Helvetica').fontSize(9)
              .text(rv.text || '', x + 32, doc.y + 12, { width: colW - 32 });
            rowMax = Math.max(rowMax, doc.y);
          });
          doc.x = left;
          doc.y = rowMax + 14;
        }
      };

      // ── Contact & signatory ──────────────────────────────────────
      const centered = (text, font, size, color) => {
        doc.font(font).fontSize(size).fillColor(color).text(text, left, doc.y, { width: contentW, align: 'center' });
      };

      const contactSection = () => {
        sectionHeader('Contact Us');
        centered('Our team is always here to help. For any queries regarding your trip, contact us:',
          'Helvetica', 10, T.ink);
        doc.moveDown(0.6);
        centered(`Call: ${BRANDING.contact.phone}`, 'Helvetica-Bold', 13, T.brand);
        doc.moveDown(0.3);
        centered(`Email: ${BRANDING.contact.email}`, 'Helvetica', 10, T.ink);
        centered(`Web: ${BRANDING.urls.website}`, 'Helvetica', 10, T.brand);

        const { advisorName, advisorPhone, advisorEmail } = quotation;
        if (advisorName || advisorPhone || advisorEmail) {
          doc.moveDown(0.4);
          if (advisorName) centered(`Assigned Advisor: ${advisorName}`, 'Helvetica-Bold', 10, T.ink);
          const line = [advisorPhone && `Mobile: ${advisorPhone}`, advisorEmail && `Email: ${advisorEmail}`]
            .filter(Boolean).join('   |   ');
          if (line) centered(line, 'Helvetica', 9, T.muted);
        }

        doc.moveDown(0.8);
        centered('Your Trust, Our Responsibility', 'Helvetica-Bold', 12, T.brand);

        ensureSpace(72);
        const sy = doc.y + 26;
        doc.moveTo(right - 160, sy).lineTo(right, sy).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10)
          .text('Authorized Signatory', right - 160, sy + 5, { width: 160, align: 'center' });
        doc.font('Helvetica').fontSize(9).fillColor(T.muted)
          .text(CONTENT.signatoryName, right - 160, sy + 19, { width: 160, align: 'center' });
        doc.x = left;
        doc.y = sy + 44;

        const year = new Date().getFullYear();
        ensureSpace(16);
        centered(`© ${year} ${BRANDING.company.name}. All rights reserved.`, 'Helvetica', 8, T.muted);
      };

      // ── Per-page chrome: footer band, page numbers, logo ─────────
      const drawLogo = () => {
        const logo = BRANDING.urls.logo;
        if (logo && !/^https?:/i.test(logo) && fs.existsSync(logo)) {
          try { doc.image(logo, left, 28, { height: 16 }); return; } catch { /* fall through */ }
        }
        doc.font('Helvetica-Bold').fontSize(12).fillColor(T.brand).text(BRANDING.company.name, left, 28, { width: 240 });
      };

      const finalizeChrome = () => {
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i += 1) {
          doc.switchToPage(range.start + i);
          // The footer sits below the page's bottom margin; drop the margin so
          // pdfkit doesn't auto-add a blank page when we write text down here.
          doc.page.margins.bottom = 0;
          doc.rect(0, footerTop, PAGE_W, FOOTER_H).fill(T.brand);
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10)
            .text(CONTENT.ratingTagline, left, footerTop + 30, { width: contentW, align: 'center', lineBreak: false });
          doc.font('Helvetica').fontSize(8).fillColor('#FFFFFF')
            .text(`Page ${i + 1} of ${range.count}`, left, footerTop + 50, { width: contentW, align: 'center', lineBreak: false });
          if (i > 0) drawLogo();
        }
      };

      // ── Compose ──────────────────────────────────────────────────
      coverPage();
      highlightsSection();
      itinerarySection();
      inclusionsSection();
      pricingSection();
      paymentDetailsSection();
      termsSection();
      cancellationSection();
      reviewsSection();
      contactSection();
      finalizeChrome();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateQuotationPDF;
