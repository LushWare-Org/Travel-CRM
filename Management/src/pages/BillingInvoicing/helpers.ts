import type { BillingDocument, DocumentType, Invoice, Receipt, Voucher, PaymentHistoryRecord, Quotation } from './types';

export function getDocumentNumber(type: DocumentType, item: BillingDocument): string {
  switch (type) {
    case 'quotation':
      return (item as Quotation).quotationNumber;
    case 'invoice':
      return (item as Invoice).invoiceNumber;
    case 'receipt':
      return (item as Receipt).receiptNumber;
    case 'voucher':
      return (item as Voucher).voucherNumber;
    case 'payment-history':
      return (item as PaymentHistoryRecord).paymentHistoryNumber;
  }
}

export function getDocumentStatus(type: DocumentType, item: BillingDocument): string | undefined {
  return type === 'receipt' ? (item as Receipt).receiptStatus : (item as { status?: string }).status;
}

export function getDocumentAmount(type: DocumentType, item: BillingDocument): number | undefined {
  switch (type) {
    case 'quotation':
      return (item as Quotation).totalAmount;
    case 'invoice':
      return (item as Invoice).totalAmount;
    case 'receipt':
      return (item as Receipt).amount;
    case 'voucher':
      return undefined;
    case 'payment-history':
      return (item as PaymentHistoryRecord).amount;
  }
}

export function getDocumentDate(type: DocumentType, item: BillingDocument): string | undefined {
  switch (type) {
    case 'quotation':
      return (item as Quotation).issueDate || item.createdAt;
    case 'invoice':
      return item.createdAt;
    case 'receipt':
      return (item as Receipt).paymentDate;
    case 'voucher':
      return item.createdAt;
    case 'payment-history':
      return (item as PaymentHistoryRecord).paymentDate;
  }
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Search matches customer name or document number - customerName/customerEmail
// are the real denormalised fields every billing-service model stores (see
// types.ts); no getAll endpoint returns a nested customer/lead relation to
// search against instead.
export function matchesSearch(type: DocumentType, item: BillingDocument, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const name = (item.customerName || '').toLowerCase();
  const number = getDocumentNumber(type, item).toLowerCase();
  return name.includes(needle) || number.includes(needle);
}
