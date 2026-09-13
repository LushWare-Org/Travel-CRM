import fs from 'node:fs';
import PDFDocument from 'pdfkit';
import { getOrgSettings, toBrandingShape, hasRequiredOrgFieldsForReceipt } from '../config/orgSettings.js';
import { ReceiptForPdf } from '@travel-crm/contracts';
import { formatMoney, formatDate } from './pdfFormatters.js';
import { loadRemoteImageBuffer } from './pdfImageLoader.js';
import AppError from './appError.js';

// Keyed by the Prisma PaymentMethod enum's JS-facing identifiers
// (underscore form — @map only renames the stored DB value), which is what
// `receipt.paymentMethod` actually contains when read back from the DB.
const PAYMENT_MODE_LABELS = {
  cash: 'Cash', card: 'Card', bank_transfer: 'Bank Transfer', upi: 'UPI',
  online: 'Online', cheque: 'Cheque', wallet: 'Wallet', other: 'Other',
};

/**
 * Render a payment receipt snapshot to a branded, pdfkit-generated PDF
 * Buffer, matching the reference "PAYMENT RECEIPT" layout: header meta,
 * Received From / Payment To cards, a Payment Details row referencing the
 * source invoice, an Account Summary (Total / Paid / Balance Due), and a
 * signatory footer. No bank details or itemized breakdown — a receipt
 * confirms money already received, not how to pay.
 *
 * @param {object} receipt - a PaymentReceipt row with its `invoice` relation included.
 * @returns {Promise<Buffer>}
 */
export async function generatePaymentReceiptPDF(receipt) {
  // Fail loud on a shape mismatch instead of silently rendering blank
  // sections — narrow .passthrough() check on only the fields this
  // generator actually reads, not a full PaymentReceipt schema.
  ReceiptForPdf.parse(receipt);

  const orgSettings = await getOrgSettings();
  const BRANDING = toBrandingShape(orgSettings);
  const T = BRANDING.theme;

  const { ok, missing } = hasRequiredOrgFieldsForReceipt(BRANDING);
  if (!ok) {
    throw new AppError(
      `Cannot generate payment receipt: organization settings are incomplete (missing: ${missing.join(', ')}). ` +
        'Complete Organization Settings before generating receipts.',
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

      const currency = receipt.currency || 'USD';
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

      // ── Header row 1: logo (left) + receipt meta (right) ───────────
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
      metaRow('Receipt No', receipt.receiptNumber);
      metaRow('Date', formatDate(receipt.paymentDate));
      metaRow('Payment Mode', PAYMENT_MODE_LABELS[receipt.paymentMethod] || receipt.paymentMethod || '—');

      // ── Header row 2: centered title ────────────────────────────────
      const titleY = Math.max(50 + 32, my) + 14;
      doc.font('Helvetica-Bold').fontSize(26).fillColor(T.ink)
        .text('PAYMENT RECEIPT', left, titleY, { width: contentW, align: 'center' });

      doc.x = left;
      doc.y = Math.max(doc.y, titleY) + 20;

      // ── Received From / Payment To (two bordered cards) ────────────
      const receivedFromRows = [
        ['Name', receipt.customerName],
        ['Email', receipt.customerEmail || '—'],
        ['Phone', receipt.customerPhone || '—'],
        ['Booking Ref', receipt.invoice?.bookingId || '—'],
      ];
      const paymentToRows = [
        ['Company', BRANDING.company.name],
        ['Address', BRANDING.company.address],
        ['Email', BRANDING.contact.email],
        ['Phone', BRANDING.contact.phone],
      ].filter(([, v]) => v);

      const colGap = 20;
      const colW = (contentW - colGap) / 2;
      const headerH = 20;
      const valueW = colW * 0.68 - 20;
      const rowCount = Math.max(receivedFromRows.length, paymentToRows.length);
      doc.font('Helvetica-Bold').fontSize(8.5);
      const rowHeights = Array.from({ length: rowCount }, (_, i) => {
        const fromH = receivedFromRows[i] ? doc.heightOfString(String(receivedFromRows[i][1]), { width: valueW }) : 0;
        const toH = paymentToRows[i] ? doc.heightOfString(String(paymentToRows[i][1]), { width: valueW }) : 0;
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
      drawInfoCard('Received From (Customer)', receivedFromRows, left);
      drawInfoCard('Payment To (Company)', paymentToRows, left + colW + colGap);
      doc.x = left;
      doc.y = cardY + cardH + 24;

      // ── Payment Details (single-row table, highlighted amount) ─────
      sectionHeader('Payment Details');
      const pdColW = [contentW * 0.4, contentW * 0.22, contentW * 0.18, contentW * 0.2];
      const pdX = [left, left + pdColW[0], left + pdColW[0] + pdColW[1], left + pdColW[0] + pdColW[1] + pdColW[2]];
      const pdHeaderH = 22;
      ensureSpace(pdHeaderH);
      const pdHeaderY = doc.y;
      doc.rect(left, pdHeaderY, contentW, pdHeaderH).fill(T.brand);
      const pdHeaders = ['Description', 'Transaction / Ref ID', 'Payment Date', 'Amount Received'];
      pdHeaders.forEach((h, i) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(T.white)
          .text(h, pdX[i] + 8, pdHeaderY + 7, { width: pdColW[i] - 16 });
      });
      doc.y = pdHeaderY + pdHeaderH;

      const description = receipt.invoice?.invoiceNumber
        ? `Payment towards Invoice #${receipt.invoice.invoiceNumber}`
        : 'Payment received';
      const refId = receipt.transactionId || '—';
      const pdRowH = 30;
      ensureSpace(pdRowH);
      const pdRowY = doc.y;
      doc.rect(left, pdRowY, contentW, pdRowH).lineWidth(1).strokeColor(T.slate200).stroke();
      // Amount Received gets its own light-green highlighted cell, matching
      // the reference receipt's "money in" emphasis on this one figure.
      doc.rect(pdX[3], pdRowY, pdColW[3], pdRowH).fill('#ECFDF5');
      doc.font('Helvetica').fontSize(8.5).fillColor(T.ink).text(description, pdX[0] + 8, pdRowY + 9, { width: pdColW[0] - 16 });
      doc.text(refId, pdX[1] + 8, pdRowY + 9, { width: pdColW[1] - 16 });
      doc.text(formatDate(receipt.paymentDate), pdX[2] + 8, pdRowY + 9, { width: pdColW[2] - 16 });
      doc.font('Helvetica-Bold').fillColor('#047857')
        .text(formatMoney(receipt.amount, currency), pdX[3] + 8, pdRowY + 9, { width: pdColW[3] - 16 });
      doc.y = pdRowY + pdRowH + 20;

      // ── Account Summary ─────────────────────────────────────────────
      sectionHeader('Account Summary');
      const summaryRows = [
        ['Total Invoice Amount', formatMoney(receipt.invoice?.totalAmount, currency), T.ink],
        ['Amount Paid (This Receipt)', formatMoney(receipt.amount, currency), T.ink],
        ['Balance Due (After this Payment)', formatMoney(receipt.outstandingBalance, currency), '#DC2626'],
      ];
      const rowH2 = 20;
      const labelW = contentW - 160;
      for (const [label, value, color] of summaryRows) {
        ensureSpace(rowH2);
        const ry = doc.y;
        doc.rect(left, ry, contentW, rowH2).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.font('Helvetica').fontSize(9).fillColor(T.ink).text(label, left + 10, ry + 5, { width: labelW - 10 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(color)
          .text(value, left + labelW, ry + 5, { width: contentW - labelW - 10, align: 'right' });
        doc.y = ry + rowH2;
      }
      doc.y += 30;

      // ── Signatory + thank-you footer ─────────────────────────────────
      const sigW = 200;
      const sigBlockH = 60;
      ensureSpace(sigBlockH);
      const sy = doc.y + 20;
      doc.moveTo(left, sy).lineTo(left + sigW, sy).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10).text('Authorized Signatory', left, sy + 5);
      doc.font('Helvetica').fontSize(9).fillColor(T.muted).text(BRANDING.company.name, left, sy + 19);

      doc.font('Helvetica-Bold').fontSize(11).fillColor(T.ink)
        .text('Thank you for your payment!', left, sy + 5, { width: contentW, align: 'right' });

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

export default generatePaymentReceiptPDF;
