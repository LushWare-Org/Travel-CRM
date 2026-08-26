import type { ComponentType } from 'react';

// Field shapes match billing-service's real Prisma models/controllers
// (Services/billing-service/prisma/schema.prisma, */controllers/*.js) - every
// document is a flat row with a denormalised customer snapshot (customerName/
// customerEmail) and a bare leadId, never a nested `customer`/`lead` relation
// object. No getAll endpoint in billing-service includes either relation.

export type QuotationStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partial' | 'overdue' | 'cancelled' | 'refunded';
export type ReceiptStatus = 'paid_in_advance' | 'paid_in_full' | 'partial_payment' | 'refunded' | 'cancelled';
export type VoucherStatus = 'draft' | 'sent' | 'viewed' | 'confirmed' | 'cancelled';
export type PaymentHistoryStatus = 'pending' | 'verified' | 'reconciled' | 'cancelled';

interface BillingDocumentBase {
  id: string;
  leadId: string;
  customerName?: string;
  customerEmail?: string;
  createdAt?: string;
}

export interface Quotation extends BillingDocumentBase {
  quotationNumber: string;
  status: QuotationStatus | string;
  totalAmount: number;
  issueDate?: string;
  validUntil?: string;
}

export interface Invoice extends BillingDocumentBase {
  invoiceNumber: string;
  status: InvoiceStatus | string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate?: string;
}

export interface Receipt extends BillingDocumentBase {
  receiptNumber: string;
  receiptStatus: ReceiptStatus | string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
}

export interface PackageDetailsSnapshot {
  name?: string;
  destination?: string;
}

export interface Voucher extends BillingDocumentBase {
  voucherNumber: string;
  status: VoucherStatus | string;
  packageDetails?: PackageDetailsSnapshot | null;
  travelStartDate?: string;
  travelEndDate?: string;
}

export interface PaymentHistoryRecord extends BillingDocumentBase {
  paymentHistoryNumber: string;
  status: PaymentHistoryStatus | string;
  amount: number;
  paymentMethod?: string;
  paymentDate?: string;
  receiptId?: string;
  invoiceId?: string;
  notes?: string;
}

export type BillingDocument = Quotation | Invoice | Receipt | Voucher | PaymentHistoryRecord;

export type DocumentType = 'quotation' | 'invoice' | 'receipt' | 'voucher' | 'payment-history';

export type ViewMode = 'grid' | 'table';

export interface TabConfig {
  id: DocumentType;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  count: number;
}
