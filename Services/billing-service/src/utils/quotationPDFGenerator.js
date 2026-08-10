import PDFDocument from 'pdfkit';
import BRANDING, { getBankDetails, hasBankDetails } from '../config/branding.js';

const COLORS = {
  ink: '#0F172A',
  muted: '#64748B',
  brand: '#0F766E',
  line: '#E2E8F0',
  band: '#F1F5F9',
};

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', LKR: 'Rs ' };

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

/** Group snapshot line items by their category for the summary layout. */
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

/**
 * Render a quotation snapshot to a PDF Buffer. Honors `quotation.mode`:
 * `summary` (default) shows category subtotals + the final price; `detailed`
 * lists every line item. Renders purely from the snapshot — no live lookups.
 *
 * @param {object} quotation - a Quotation row with its `items` included
 * @returns {Promise<Buffer>}
 */
export function generateQuotationPDF(quotation) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const currency = quotation.currency || 'USD';
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;

      // ── Header band ──
      doc.rect(0, 0, doc.page.width, 90).fill(COLORS.brand);
      doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
        .text(BRANDING.company.name, left, 28);
      doc.fontSize(10).font('Helvetica')
        .text(BRANDING.company.tagline, left, 56);
      doc.fontSize(20).font('Helvetica-Bold')
        .text('QUOTATION', left, 30, { width: pageWidth, align: 'right' });
      doc.fontSize(10).font('Helvetica')
        .text(quotation.quotationNumber || '', left, 58, { width: pageWidth, align: 'right' });

      doc.fillColor(COLORS.ink);
      let y = 110;

      // ── Meta row: bill-to + dates ──
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted).text('PREPARED FOR', left, y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.muted)
        .text('DETAILS', left + pageWidth / 2, y, { width: pageWidth / 2, align: 'right' });
      y += 14;

      doc.font('Helvetica').fillColor(COLORS.ink).fontSize(11)
        .text(quotation.customerName || 'Customer', left, y);
      const metaRight = [
        `Issued: ${formatDate(quotation.issueDate)}`,
        `Valid until: ${formatDate(quotation.validUntil)}`,
        `Status: ${titleCase(quotation.status || 'draft')}`,
      ].join('\n');
      doc.fontSize(9).fillColor(COLORS.muted)
        .text(metaRight, left + pageWidth / 2, y, { width: pageWidth / 2, align: 'right' });

      y += 14;
      doc.fontSize(9).fillColor(COLORS.muted);
      if (quotation.customerEmail) { doc.text(quotation.customerEmail, left, y); y += 12; }
      if (quotation.customerPhone) { doc.text(quotation.customerPhone, left, y); y += 12; }
      if (quotation.customerAddress) { doc.text(quotation.customerAddress, left, y); y += 12; }

      y = Math.max(y, 180) + 10;
      doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).stroke();
      y += 16;

      // ── Items ──
      const detailed = quotation.mode === 'detailed';
      doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.ink)
        .text(detailed ? 'Itemized Breakdown' : 'Trip Summary', left, y);
      y += 22;

      const priceColX = right - 110;
      const drawRow = (label, amount, { bold = false, indent = 0 } = {}) => {
        if (y > doc.page.height - 160) { doc.addPage(); y = 60; }
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
          .fillColor(bold ? COLORS.ink : COLORS.muted)
          .text(label, left + indent, y, { width: priceColX - left - indent - 8 });
        const rowHeight = doc.heightOfString(label, { width: priceColX - left - indent - 8 });
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(COLORS.ink)
          .text(amount, priceColX, y, { width: right - priceColX, align: 'right' });
        y += Math.max(rowHeight, 14) + 4;
      };

      if (detailed) {
        for (const item of quotation.items || []) {
          const qty = Number(item.quantity) || 1;
          const label = qty > 1 ? `${item.description}  (×${qty})` : item.description;
          drawRow(label, formatMoney(item.totalPrice, currency));
        }
      } else {
        for (const group of groupByCategory(quotation.items)) {
          drawRow(titleCase(group.category), formatMoney(group.total, currency), { bold: true });
          for (const item of group.items) {
            const qty = Number(item.quantity) || 1;
            const label = qty > 1 ? `${item.description}  (×${qty})` : item.description;
            drawRow(label, '', { indent: 14 });
          }
        }
      }

      y += 6;
      doc.moveTo(left, y).lineTo(right, y).strokeColor(COLORS.line).stroke();
      y += 12;

      // ── Totals ──
      drawRow('Subtotal', formatMoney(quotation.subtotal, currency));
      if (Number(quotation.discountAmount) > 0) {
        drawRow(`Discount${quotation.discountType === 'percentage' ? ` (${quotation.discountValue}%)` : ''}`,
          `- ${formatMoney(quotation.discountAmount, currency)}`);
      }
      if (Number(quotation.taxAmount) > 0) {
        drawRow(`Tax (${quotation.taxRate}%)`, formatMoney(quotation.taxAmount, currency));
      }
      if (Number(quotation.serviceChargeAmount) > 0) {
        drawRow(`Service charge (${quotation.serviceChargeRate}%)`, formatMoney(quotation.serviceChargeAmount, currency));
      }

      // Grand total band
      if (y > doc.page.height - 160) { doc.addPage(); y = 60; }
      y += 4;
      doc.rect(priceColX - 160, y, right - priceColX + 160, 30).fill(COLORS.band);
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12)
        .text('Total', priceColX - 150, y + 9);
      doc.fontSize(13).text(formatMoney(quotation.totalAmount, currency), priceColX - 10, y + 8,
        { width: right - priceColX + 10, align: 'right' });
      y += 46;

      // ── Inclusions / exclusions ──
      const bullets = (title, list) => {
        if (!list || list.length === 0) return;
        if (y > doc.page.height - 140) { doc.addPage(); y = 60; }
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(title, left, y);
        y += 15;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted);
        for (const entry of list) {
          if (y > doc.page.height - 90) { doc.addPage(); y = 60; }
          doc.text(`•  ${entry}`, left + 6, y, { width: pageWidth - 12 });
          y += doc.heightOfString(`•  ${entry}`, { width: pageWidth - 12 }) + 3;
        }
        y += 8;
      };
      bullets('Includes', quotation.includedServices);
      bullets('Excludes', quotation.excludedServices);

      // ── Notes / terms ──
      const paragraph = (title, text) => {
        if (!text) return;
        if (y > doc.page.height - 120) { doc.addPage(); y = 60; }
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(title, left, y);
        y += 14;
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
          .text(text, left, y, { width: pageWidth });
        y += doc.heightOfString(text, { width: pageWidth }) + 10;
      };
      paragraph('Notes', quotation.notes);
      paragraph('Payment terms', quotation.paymentTerms);
      paragraph('Terms & conditions', quotation.terms);

      // ── Bank details (only when configured) ──
      if (hasBankDetails()) {
        if (y > doc.page.height - 140) { doc.addPage(); y = 60; }
        const bank = getBankDetails();
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text('Payment Details', left, y);
        y += 14;
        const lines = [
          bank.accountName && `Account Name: ${bank.accountName}`,
          bank.bankName && `Bank: ${bank.bankName}`,
          bank.accountNumber && `Account No: ${bank.accountNumber}`,
          bank.ifscCode && `IFSC: ${bank.ifscCode}`,
          bank.swiftCode && `SWIFT: ${bank.swiftCode}`,
          bank.branch && `Branch: ${bank.branch}`,
          bank.upiId && `UPI: ${bank.upiId}`,
        ].filter(Boolean);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(lines.join('\n'), left, y);
        y += lines.length * 12 + 10;
      }

      // ── Footer ──
      const footerY = doc.page.height - 60;
      doc.moveTo(left, footerY).lineTo(right, footerY).strokeColor(COLORS.line).stroke();
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(
        `${BRANDING.company.name}  ·  ${BRANDING.contact.email}  ·  ${BRANDING.contact.phone}  ·  ${BRANDING.urls.website}`,
        left, footerY + 8, { width: pageWidth, align: 'center' },
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export default generateQuotationPDF;
