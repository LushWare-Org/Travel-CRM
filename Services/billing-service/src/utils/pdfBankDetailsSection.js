// Shared "bank transfer card + UPI QR" block for pdfkit document generators.
// Extracted from quotationPDFGenerator.js so the quotation and invoice PDFs
// render payment details identically instead of duplicating the drawing code.

/**
 * Draws a bank-transfer card (bank name/account/IFSC/SWIFT/branch rows) with
 * a UPI QR placeholder + UPI id on the right, starting at the document's
 * current `doc.y`. Advances `doc.x`/`doc.y` past the card, mirroring the
 * other draw helpers in this codebase.
 *
 * @param {PDFKit.PDFDocument} doc
 * @param {{ left: number, contentW: number, T: object, ensureSpace: (h: number) => void }} layout
 * @param {{ bankName?, accountName?, accountNumber?, ifscCode?, swiftCode?, branch?, upiId? }} bank
 */
export function drawBankDetailsCard(doc, { left, contentW, T, ensureSpace }, bank) {
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
}

export default drawBankDetailsCard;
