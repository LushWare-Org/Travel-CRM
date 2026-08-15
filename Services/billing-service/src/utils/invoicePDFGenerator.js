import PDFDocument from 'pdfkit';
import { getOrgSettings, toBrandingShape, hasRequiredOrgFieldsForInvoice } from '../config/orgSettings.js';
import { InvoiceForPdf } from '@travel-crm/contracts';
import { formatMoney, formatDate } from './pdfFormatters.js';
import { drawBankDetailsCard } from './pdfBankDetailsSection.js';
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
        ensureSpace(40);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(T.brand)
          .text(String(title).toUpperCase(), left, doc.y, { width: contentW });
        const ry = doc.y + 3;
        doc.moveTo(left, ry).lineTo(right, ry).lineWidth(1.5).strokeColor(T.brand).stroke();
        doc.lineWidth(1);
        doc.x = left;
        doc.y = ry + 12;
      };

      // ── Header: logo + title + invoice meta ──────────────────────
      const title = TITLES[invoice.type] || TITLES.invoice;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(T.brand).text(BRANDING.company.name, left, 50);
      doc.font('Helvetica-Bold').fontSize(26).fillColor(T.ink).text(title, left, 66);

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

      doc.x = left;
      doc.y = Math.max(doc.y, my) + 20;

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
      const rowH = 15;
      const rowCount = Math.max(billFromRows.length, billToRows.length);
      const cardH = headerH + rowCount * rowH + 10;
      ensureSpace(cardH + 16);
      const cardY = doc.y;

      const drawInfoCard = (cardTitle, rows, x) => {
        doc.roundedRect(x, cardY, colW, cardH, 6).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.rect(x, cardY, colW, headerH).fill(T.ink);
        doc.fillColor(T.white).font('Helvetica-Bold').fontSize(9).text(cardTitle, x + 10, cardY + 6);
        let ry = cardY + headerH + 8;
        for (const [k, v] of rows) {
          doc.font('Helvetica').fontSize(8).fillColor(T.muted).text(k, x + 10, ry, { width: colW * 0.32 });
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(T.ink)
            .text(String(v), x + 10 + colW * 0.32, ry, { width: colW * 0.68 - 20 });
          ry += rowH;
        }
      };
      drawInfoCard('Bill From', billFromRows, left);
      drawInfoCard('Bill To', billToRows, left + colW + colGap);
      doc.x = left;
      doc.y = cardY + cardH + 20;

      // ── Items table ────────────────────────────────────────────────
      const items = (invoice.items || []).length
        ? invoice.items
        : [{ description: `Travel Services${invoice.destination ? `\nDestination: ${invoice.destination}` : ''}`, totalPrice: invoice.totalAmount }];

      const colSno = 40;
      const colAmt = 110;
      const colDesc = contentW - colSno - colAmt;
      const headerRowH = 24;
      ensureSpace(headerRowH + 30);
      const theadY = doc.y;
      doc.rect(left, theadY, contentW, headerRowH).fill(T.ink);
      doc.fillColor(T.white).font('Helvetica-Bold').fontSize(9)
        .text('S.No', left + 8, theadY + 8, { width: colSno - 8 })
        .text('Service Description', left + colSno, theadY + 8, { width: colDesc })
        .text(`Amount (${currency})`, left + colSno + colDesc, theadY + 8, { width: colAmt - 8, align: 'right' });
      doc.y = theadY + headerRowH;

      items.forEach((item, idx) => {
        doc.font('Helvetica').fontSize(9);
        const desc = item.description || '';
        const descH = doc.heightOfString(desc, { width: colDesc - 8 });
        const rowH2 = Math.max(descH + 16, 30);
        ensureSpace(rowH2);
        const ry = doc.y;
        doc.rect(left, ry, contentW, rowH2).lineWidth(1).strokeColor(T.slate200).stroke();
        doc.fillColor(T.ink).font('Helvetica').fontSize(9)
          .text(String(idx + 1), left + 8, ry + 8, { width: colSno - 8 })
          .text(desc, left + colSno, ry + 8, { width: colDesc - 8 })
          .font('Helvetica-Bold')
          .text(formatMoney(item.totalPrice, currency), left + colSno + colDesc, ry + 8, { width: colAmt - 8, align: 'right' });
        doc.y = ry + rowH2;
      });
      doc.y += 12;

      // ── Totals ─────────────────────────────────────────────────────
      const priceColX = right - 150;
      const drawTotalRow = (label, amount, { bold = false } = {}) => {
        ensureSpace(18);
        const yy = doc.y;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10)
          .fillColor(bold ? T.ink : T.muted).text(label, left, yy, { width: priceColX - left - 8 });
        doc.font('Helvetica-Bold').fontSize(bold ? 12 : 10).fillColor(T.ink)
          .text(amount, priceColX, yy, { width: right - priceColX, align: 'right' });
        doc.y = yy + (bold ? 20 : 16);
      };
      drawTotalRow('Sub Total', formatMoney(invoice.subtotal, currency));
      if (Number(invoice.discountAmount) > 0) drawTotalRow('Discount', `- ${formatMoney(invoice.discountAmount, currency)}`);
      if (Number(invoice.taxAmount) > 0) drawTotalRow(`Tax (${invoice.taxRate}%)`, formatMoney(invoice.taxAmount, currency));
      if (Number(invoice.serviceChargeAmount) > 0) {
        drawTotalRow(`Service Charge (${invoice.serviceChargeRate}%)`, formatMoney(invoice.serviceChargeAmount, currency));
      }
      doc.moveTo(priceColX, doc.y).lineTo(right, doc.y).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.y += 6;
      drawTotalRow('Total Amount', formatMoney(invoice.totalAmount, currency), { bold: true });
      doc.y += 6;

      ensureSpace(30);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(T.muted)
        .text(`Total Amount in Words: ${numberToWords(invoice.totalAmount, currency)}`, left, doc.y, { width: contentW });
      doc.y += 24;

      // ── Payment Instructions (bank card + bullets) ────────────────
      const bank = {
        bankName: invoice.bankName,
        accountName: invoice.bankAccountName,
        accountNumber: invoice.bankAccountNumber,
        ifscCode: invoice.bankIfscCode,
        swiftCode: invoice.bankSwiftCode,
        branch: invoice.bankBranch,
        upiId: invoice.bankUpiId,
      };
      sectionHeader('Payment Instructions');
      doc.font('Helvetica').fontSize(9).fillColor(T.ink)
        .text('Kindly make the payment using the below details:', left, doc.y, { width: contentW });
      doc.y += 12;
      drawBankDetailsCard(doc, { left, contentW, T, ensureSpace }, bank);

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
      ensureSpace(70);
      doc.font('Helvetica').fontSize(8).fillColor(T.muted)
        .text('This is a computer generated invoice and does not require a physical signature.', left, doc.y, { width: contentW });
      doc.y += 40;

      const sigW = 160;
      const sy = doc.y;
      doc.moveTo(right - sigW, sy).lineTo(right, sy).lineWidth(1).strokeColor(T.slate200).stroke();
      doc.fillColor(T.ink).font('Helvetica-Bold').fontSize(10)
        .text('Authorised Signatory', right - sigW, sy + 5, { width: sigW, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor(T.muted)
        .text(BRANDING.company.name, right - sigW, sy + 19, { width: sigW, align: 'center' });

      // ── Page numbers ───────────────────────────────────────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
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
