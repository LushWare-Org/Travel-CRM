import prisma from '../db/client.js';
import { getOrgSettings } from '../config/orgSettings.js';

const pad = (n, len = 5) => String(n).padStart(len, '0');
const yyyymm = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Defaults preserved exactly as they were before doc number prefixes became
// org-configurable — falls back per-key so an admin can override just one
// document type without needing to set all six.
const DEFAULT_PREFIXES = {
  quotation: 'QUO', invoice: 'INV', receipt: 'REC',
  payment: 'PAY', creditNote: 'CN', voucher: 'VOU',
};

async function prefixFor(docType) {
  const settings = await getOrgSettings();
  return settings.docNumberPrefixes?.[docType] || DEFAULT_PREFIXES[docType];
}

export async function nextInvoiceNumber() {
  const prefix = `${await prefixFor('invoice')}-${yyyymm()}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const seq = last ? parseInt(last.invoiceNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

export async function nextQuotationNumber() {
  const prefix = `${await prefixFor('quotation')}-${yyyymm()}-`;
  const last = await prisma.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { quotationNumber: 'desc' },
    select: { quotationNumber: true },
  });
  const seq = last ? parseInt(last.quotationNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

export async function nextReceiptNumber() {
  const prefix = `${await prefixFor('receipt')}-${yyyymm()}-`;
  const last = await prisma.paymentReceipt.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  });
  const seq = last ? parseInt(last.receiptNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

export async function nextPaymentHistoryNumber() {
  const prefix = `${await prefixFor('payment')}-${yyyymm()}-`;
  const last = await prisma.paymentHistory.findFirst({
    where: { paymentHistoryNumber: { startsWith: prefix } },
    orderBy: { paymentHistoryNumber: 'desc' },
    select: { paymentHistoryNumber: true },
  });
  const seq = last ? parseInt(last.paymentHistoryNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

export async function nextCreditNoteNumber() {
  const prefix = `${await prefixFor('creditNote')}-${yyyymm()}-`;
  const last = await prisma.creditNote.findFirst({
    where: { creditNoteNumber: { startsWith: prefix } },
    orderBy: { creditNoteNumber: 'desc' },
    select: { creditNoteNumber: true },
  });
  const seq = last ? parseInt(last.creditNoteNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}

export async function nextVoucherNumber() {
  const prefix = `${await prefixFor('voucher')}-${yyyymm()}-`;
  const last = await prisma.voucher.findFirst({
    where: { voucherNumber: { startsWith: prefix } },
    orderBy: { voucherNumber: 'desc' },
    select: { voucherNumber: true },
  });
  const seq = last ? parseInt(last.voucherNumber.split('-').pop(), 10) + 1 : 1;
  return `${prefix}${pad(seq)}`;
}
