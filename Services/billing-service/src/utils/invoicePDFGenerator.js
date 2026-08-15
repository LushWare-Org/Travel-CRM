import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { getOrgSettings, toBrandingShape, hasRequiredOrgFieldsForInvoice } from '../config/orgSettings.js';
import { InvoiceForPdf } from '@travel-crm/contracts';
import { formatMoney, formatDate } from './pdfFormatters.js';
import { loadRemoteImageBuffer } from './pdfImageLoader.js';
import { numberToWords } from './numberToWords.js';
import AppError from './appError.js';

const TITLES = { invoice: 'INVOICE', proforma: 'PROFORMA', 'tax-invoice': 'TAX INVOICE' };

/** Splits admin-entered terms/instructions text into bullet lines. */
const asBullets = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

/**
 * Render an invoice snapshot to a branded, pdfkit-generated PDF Buffer.
 *
 * Renders purely from the persisted Invoice row (customer/pricing/bank
 * snapshot fields already resolved at creation time — see
 * convertQuotationToInvoice) plus live org branding for the "Bill From"
 * block, so regeneration is deterministic except for company identity
 * edits. Fails loud via `hasRequiredOrgFieldsForInvoice` rather than ever
 * emitting a customer-facing PDF with blank company/bank fields.
 *
 * @param {object} invoice - an Invoice row with its `items` included.
 * @returns {Promise<Buffer>}
 */
export async function generateInvoicePDF(invoice) {
  // Fail loud on a shape mismatch instead of silently rendering blank
  // sections — narrow .passthrough() check on only the fields this
  // generator actually reads, not a full Invoice schema.
  InvoiceForPdf.parse(invoice);

  const orgSettings = await getOrgSettings();
  const BRANDING = toBrandingShape(orgSettings);
  const T = BRANDING.theme;
  const CONTENT = BRANDING.content;

  const { ok, missing } = hasRequiredOrgFieldsForInvoice(BRANDING);
  if (!ok) {
    throw new AppError(
      `Cannot generate invoice: organization settings are incomplete (missing: ${missing.join(', ')}). ` +
        'Complete Organization Settings before generating invoices.',
      422,
    );
  }

  // Resolved up front (pdfkit's own build below is synchronous): a local-path
  // logo is read straight from disk, an https URL is fetched to a Buffer, and
  // anything missing/unreachable resolves to null so the header/signature
  // block falls back to the company-name text it already draws today.
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

      const currency = invoice.currency || 'USD';
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

      // Draws `buf` scaled to fit inside a (boxW x boxH) box, preserving
      // aspect ratio on both axes — so a wide logo can never overflow into
      // neighboring content regardless of its native proportions. Returns
      // the actual rendered { width, height } so callers advance doc.y (or
      // center a caption below it) using the real size, not an assumption.
      const drawFittedImage = (buf, boxX, boxY, boxW, boxH, align = 'left') => {
        const img = doc.openImage(buf);
        const scale = Math.min(boxW / img.width, boxH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = align === 'center' ? boxX + (boxW - w) / 2 : boxX;
        doc.image(buf, x, boxY, { width: w, height: h });
        return { width: w, height: h };
      };

      // Draws the resolved logo (image or company-name fallback) at (x, y)
      // constrained to a (maxW x maxH) box; returns nothing — used in both
      // the header and the closing signature block so the two stay visually
      // consistent. Left-aligned in its box (the reference's logo sits
      // top-left, not centered).
      const drawLogo = (x, y, maxW, maxH) => {
        if (logoBuffer) {
          try { drawFittedImage(logoBuffer, x, y, maxW, maxH, 'left'); return; } catch { /* fall through to text */ }
        }
        doc.font('Helvetica-Bold').fontSize(11).fillColor(T.brand).text(BRANDING.company.name, x, y + maxH / 2 - 5);
      };

      // ── Header row 1: logo (left) + invoice meta (right) ───────────
      // Two independent columns with a wide gap between them — the logo's
      // box (capped at 150pt) and the meta block (starting at metaX, well
      // past 150) never touch regardless of the logo's aspect ratio.
      const title = TITLES[invoice.type] || TITLES.invoice;
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
      metaRow('Invoice No', invoice.invoiceNumber);
      metaRow('Invoice Date', formatDate(invoice.issueDate));
      metaRow('Due Date', formatDate(invoice.dueDate));
      metaRow('Booking Id', invoice.bookingId || '—');

      // ── Header row 2: centered title, on its own line below row 1 ──
      // Kept on a separate row (rather than sharing row 1's horizontal
      // space) so a wide logo or a long title ("TAX INVOICE") can never
      // collide with each other or with the meta block above.
      const titleY = Math.max(50 + 32, my) + 14;
      doc.font('Helvetica-Bold').fontSize(26).fillColor(T.ink)
        .text(title, left, titleY, { width: contentW, align: 'center' });

      doc.x = left;
      doc.y = Math.max(doc.y, titleY) + 20;

      // ── Bill From / Bill To (two bordered cards) ──────────────────
      const billFromRows = [
        ['Company Name', BRANDING.company.legalName || BRANDING.company.name],
        ['Address', BRANDING.company.address],
        ['Phone', BRANDING.contact.phone],
        ['Email', BRANDING.contact.email],
        ['GST No', BRANDING.company.gstNumber],
      ].filter(([, v]) => v);
      const billToRows = [
        ['Name', invoice.customerName],
        ['Address', invoice.customerAddress || '—'],
        ['Phone', invoice.customerPhone || '—'],
        ['Email', invoice.customerEmail || '—'],
        ...(invoice.customerGstNumber ? [['GST No', invoice.customerGstNumber]] : []),
        ...(invoice.destination ? [['Place of Supply', invoice.destination]] : []),
      ];

      const colGap = 20;
      const colW = (contentW - colGap) / 2;
      const headerH = 20;
      const valueW = colW * 0.68 - 20;
      const rowCount = Math.max(billFromRows.length, billToRows.length);
      // Row heights are index-aligned across both cards (row i draws at the
      // same y in Bill From and Bill To) and sized to whichever side wraps
      // taller, so a long address never overlaps the row below it.
      doc.font('Helvetica-Bold').fontSize(8.5);
      const rowHeights = Array.from({ length: rowCount }, (_, i) => {
        const fromH = billFromRows[i] ? doc.heightOfString(String(billFromRows[i][1]), { width: valueW }) : 0;
        const toH = billToRows[i] ? doc.heightOfString(String(billToRows[i][1]), { width: valueW }) : 0;
        return Math.max(fromH, toH, 11) + 6;
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
      drawInfoCard('Bill From', billFromRows, left);
      drawInfoCard('Bill To', billToRows, left + colW + colGap);
      doc.x = left;
      doc.y = cardY + cardH + 20;

      // ── Total Amount summary (no itemized cost breakdown) ──────────
      // Deliberately no S.No/description/per-item table and no Sub
      // Total/Discount/Tax/Service Charge rows — the invoice is meant to show
      // only the final figure the customer owes, not how it was assembled.
      const totalRowH = 26;
      ensureSpace(totalRowH);
      const totalRowY = doc.y;
      doc.rect(left, totalRowY, contentW, totalRowH).fill(T.slate50);
      doc.rect(left, totalRowY, contentW, totalRowH).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.font('Helvetica-Bold').fontSize(12).fillColor(T.ink)
        .text('Total Amount', left + 12, totalRowY + 7, { width: contentW / 2 });
      doc.font('Helvetica-Bold').fontSize(12).fillColor(T.ink)
        .text(formatMoney(invoice.totalAmount, currency), left, totalRowY + 7, { width: contentW - 12, align: 'right' });
      doc.y = totalRowY + totalRowH + 18;

      ensureSpace(30);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(T.muted)
        .text(`Total Amount in Words: ${numberToWords(invoice.totalAmount, currency)}`, left, doc.y, { width: contentW });
      doc.y += 24;

      // ── Payment Instructions (plain bank-details table + bullets) ─
      // Invoice-only rendering: unlike the quotation PDF's cream card + UPI
      // QR (drawBankDetailsCard, still used there), the reference invoice
      // shows bank details as a plain bordered label/value table — the same
      // visual language as the Bill From/Bill To cards above.
      const bankRows = [
        ['Account Name', invoice.bankAccountName],
        ['Bank Name', invoice.bankName],
        ['Account Number', invoice.bankAccountNumber],
        ['IFSC Code', invoice.bankIfscCode],
        ['SWIFT Code', invoice.bankSwiftCode],
        ['Account Type', invoice.bankAccountType],
        ['Branch', invoice.bankBranch],
        ['UPI ID', invoice.bankUpiId],
      ].filter(([, v]) => v);

      const drawBankDetailsTable = (rows) => {
        const rowH2 = 18;
        const labelW = 160;
        ensureSpace(rowH2);
        for (const [k, v] of rows) {
          ensureSpace(rowH2);
          const ry = doc.y;
          doc.rect(left, ry, contentW, rowH2).lineWidth(1).strokeColor(T.slate200).stroke();
          doc.font('Helvetica-Bold').fontSize(9).fillColor(T.ink).text(k, left + 10, ry + 5, { width: labelW - 10 });
          doc.font('Helvetica').fontSize(9).fillColor(T.ink).text(String(v), left + labelW, ry + 5, { width: contentW - labelW - 10 });
          doc.y = ry + rowH2;
        }
      };

      sectionHeader('Payment Instructions');
      doc.font('Helvetica').fontSize(9).fillColor(T.ink)
        .text('Kindly make the payment using the below details:', left, doc.y, { width: contentW });
      doc.y += 12;
      drawBankDetailsTable(bankRows);
      doc.y += 14;

      const paymentBullets = asBullets(invoice.paymentInstructions || CONTENT.invoicePaymentInstructions);
      doc.font('Helvetica').fontSize(9).fillColor(T.ink);
      for (const b of paymentBullets) {
        ensureSpace(16);
        doc.text(`•  ${b}`, left, doc.y, { width: contentW });
        doc.y += 3;
      }
      doc.y += 16;

      // ── Payment Terms ──────────────────────────────────────────────
      const termsBullets = asBullets(invoice.paymentTerms || CONTENT.invoiceTerms);
      if (termsBullets.length) {
        sectionHeader('Payment Terms');
        doc.font('Helvetica').fontSize(9).fillColor(T.ink);
        for (const b of termsBullets) {
          ensureSpace(16);
          doc.text(`•  ${b}`, left, doc.y, { width: contentW });
          doc.y += 3;
        }
        doc.y += 16;
      }

      // ── Disclaimer + signatory ────────────────────────────────────
      // Reserve the *whole* block's height (disclaimer line + gap + logo +
      // signature line + two caption lines) in one ensureSpace call before
      // drawing any of it. Otherwise, if the block only just doesn't fit,
      // pdfkit's own per-text-call auto-pagination can kick in mid-block and
      // split "Authorised Signatory" from the logo/company name onto a
      // trailing page of its own.
      const sigW = 160;
      const sigLogoMaxH = 22;
      const disclaimerText = 'This is a computer generated invoice and does not require a physical signature.';
      doc.font('Helvetica').fontSize(8);
      const disclaimerH = doc.heightOfString(disclaimerText, { width: contentW });
      const sigBlockH = disclaimerH + 40 + (logoBuffer ? sigLogoMaxH + 8 : 0) + 34;
      ensureSpace(sigBlockH);

      doc.font('Helvetica').fontSize(8).fillColor(T.muted)
        .text(disclaimerText, left, doc.y, { width: contentW });
      doc.y += 40;

      if (logoBuffer) {
        // Centered within the sigW box so it lines up with "Authorised
        // Signatory"/company name below it (both center-aligned), instead of
        // sitting flush left while the text below it is centered.
        try {
          const { height } = drawFittedImage(logoBuffer, right - sigW, doc.y, sigW - 20, sigLogoMaxH, 'center');
          doc.y += height + 8;
        } catch { /* skip */ }
      }
      const sy = doc.y;
      doc.moveTo(right - sigW, sy).lineTo(right, sy).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10)
        .text('Authorised Signatory', right - sigW, sy + 5, { width: sigW, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor(T.muted)
        .text(BRANDING.company.name, right - sigW, sy + 19, { width: sigW, align: 'center' });

      // ── Page numbers ───────────────────────────────────────────────
      // Sits inside the page's bottom margin band (80pt), well below
      // bottomLimit where content actually stops, so it never collides with
      // the signature block or any other content above it.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        // The footer sits below the page's bottom margin (in the margin
        // band); drop the margin here so pdfkit's own overflow check doesn't
        // treat that position as "off the page" and silently insert a new
        // blank page just to hold this one line of text.
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

export default generateInvoicePDF;
