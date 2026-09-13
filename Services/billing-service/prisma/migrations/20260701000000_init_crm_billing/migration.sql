-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm_billing";

-- CreateEnum
CREATE TYPE "crm_billing"."DiscountType" AS ENUM ('percentage', 'fixed', 'none');

-- CreateEnum
CREATE TYPE "crm_billing"."ItemCategory" AS ENUM ('accommodation', 'transportation', 'activity', 'food', 'guide', 'insurance', 'visa', 'package', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."Currency" AS ENUM ('LKR', 'USD', 'EUR', 'GBP', 'AUD', 'INR');

-- CreateEnum
CREATE TYPE "crm_billing"."PaymentMethod" AS ENUM ('cash', 'card', 'bank-transfer', 'online', 'cheque', 'upi', 'wallet', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."CardType" AS ENUM ('visa', 'mastercard', 'amex', 'discover', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."PaymentGateway" AS ENUM ('stripe', 'razorpay', 'paypal', 'square', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."InvoiceType" AS ENUM ('invoice', 'proforma', 'tax-invoice', 'commercial-invoice');

-- CreateEnum
CREATE TYPE "crm_billing"."InvoiceStatus" AS ENUM ('draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "crm_billing"."InvoicePaymentStatus" AS ENUM ('unpaid', 'partial', 'paid', 'overpaid', 'refunded');

-- CreateEnum
CREATE TYPE "crm_billing"."QuotationType" AS ENUM ('standard', 'custom', 'package-based');

-- CreateEnum
CREATE TYPE "crm_billing"."QuotationMode" AS ENUM ('summary', 'detailed');

-- CreateEnum
CREATE TYPE "crm_billing"."QuotationStatus" AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted');

-- CreateEnum
CREATE TYPE "crm_billing"."ReceiptStatus" AS ENUM ('paid-in-advance', 'paid-in-full', 'partial-payment', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "crm_billing"."ReceiptPaymentType" AS ENUM ('advance', 'installment', 'full-payment', 'final-payment', 'refund');

-- CreateEnum
CREATE TYPE "crm_billing"."PaymentHistoryStatus" AS ENUM ('pending', 'verified', 'reconciled', 'cancelled');

-- CreateEnum
CREATE TYPE "crm_billing"."PaymentHistoryType" AS ENUM ('advance', 'installment', 'full-payment', 'refund');

-- CreateEnum
CREATE TYPE "crm_billing"."CreditNoteType" AS ENUM ('refund', 'cancellation', 'discount', 'error-correction', 'service-not-provided', 'quality-issue', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."CreditNoteStatus" AS ENUM ('draft', 'issued', 'applied', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "crm_billing"."RefundStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'not-applicable');

-- CreateEnum
CREATE TYPE "crm_billing"."RefundMethod" AS ENUM ('original-method', 'bank-transfer', 'cheque', 'credit-balance', 'voucher', 'other');

-- CreateEnum
CREATE TYPE "crm_billing"."VoucherStatus" AS ENUM ('draft', 'sent', 'viewed', 'confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "crm_billing"."Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "leadId" TEXT NOT NULL,
    "quotationId" TEXT,
    "bookingId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "cancelledById" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerGstNumber" TEXT,
    "destination" TEXT,
    "type" "crm_billing"."InvoiceType" NOT NULL DEFAULT 'invoice',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" "crm_billing"."DiscountType" NOT NULL DEFAULT 'none',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceChargeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "crm_billing"."InvoiceStatus" NOT NULL DEFAULT 'draft',
    "paymentStatus" "crm_billing"."InvoicePaymentStatus" NOT NULL DEFAULT 'unpaid',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidDate" TIMESTAMP(3),
    "notes" TEXT,
    "terms" TEXT,
    "paymentTerms" TEXT,
    "paymentInstructions" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankName" TEXT,
    "bankIfscCode" TEXT,
    "bankSwiftCode" TEXT,
    "bankBranch" TEXT,
    "bankUpiId" TEXT,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastReminderSent" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "crm_billing"."ItemCategory" NOT NULL DEFAULT 'other',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."Quotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "leadId" TEXT NOT NULL,
    "packageId" TEXT,
    "itineraryId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "convertedToInvoiceId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "customerGstNumber" TEXT,
    "type" "crm_billing"."QuotationType" NOT NULL DEFAULT 'standard',
    "mode" "crm_billing"."QuotationMode" NOT NULL DEFAULT 'summary',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" "crm_billing"."DiscountType" NOT NULL DEFAULT 'none',
    "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceChargeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "serviceChargeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "crm_billing"."QuotationStatus" NOT NULL DEFAULT 'draft',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "paymentTerms" TEXT,
    "includedServices" TEXT[],
    "excludedServices" TEXT[],
    "destination" TEXT,
    "packageTitle" TEXT,
    "travelStartDate" TIMESTAMP(3),
    "travelEndDate" TIMESTAMP(3),
    "paxCount" INTEGER,
    "durationNights" INTEGER,
    "durationDays" INTEGER,
    "highlights" TEXT[],
    "itineraryDays" JSONB,
    "advisorName" TEXT,
    "advisorPhone" TEXT,
    "advisorEmail" TEXT,
    "coverImage" TEXT,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."QuotationItem" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "crm_billing"."ItemCategory" NOT NULL DEFAULT 'other',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."QuotationImage" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "url" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuotationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."QuotationRevision" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "modifiedById" TEXT,
    "modifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" TEXT,

    CONSTRAINT "QuotationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."PaymentReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "verifiedById" TEXT,
    "reconciledById" TEXT,
    "cancelledById" TEXT,
    "refundForId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "crm_billing"."Currency" NOT NULL DEFAULT 'LKR',
    "paymentMethod" "crm_billing"."PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionId" TEXT,
    "receiptStatus" "crm_billing"."ReceiptStatus" NOT NULL DEFAULT 'partial-payment',
    "paymentType" "crm_billing"."ReceiptPaymentType" NOT NULL,
    "notes" TEXT,
    "internalNotes" TEXT,
    "previousBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outstandingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cardType" "crm_billing"."CardType",
    "cardLastFour" TEXT,
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankTransactionRef" TEXT,
    "chequeNumber" TEXT,
    "chequeDate" TIMESTAMP(3),
    "chequeBank" TEXT,
    "paymentGateway" "crm_billing"."PaymentGateway",
    "gatewayTransactionId" TEXT,
    "gatewayPaymentId" TEXT,
    "upiId" TEXT,
    "upiTransactionId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciledAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."PaymentHistory" (
    "id" TEXT NOT NULL,
    "paymentHistoryNumber" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "crm_billing"."Currency" NOT NULL DEFAULT 'LKR',
    "paymentMethod" "crm_billing"."PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "paymentType" "crm_billing"."PaymentHistoryType" NOT NULL DEFAULT 'installment',
    "status" "crm_billing"."PaymentHistoryStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "verifiedById" TEXT,
    "reconciledById" TEXT,
    "cancelledById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "cancelledById" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT,
    "type" "crm_billing"."CreditNoteType" NOT NULL,
    "reason" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "crm_billing"."CreditNoteStatus" NOT NULL DEFAULT 'draft',
    "refundStatus" "crm_billing"."RefundStatus" NOT NULL DEFAULT 'not-applicable',
    "refundMethod" "crm_billing"."RefundMethod",
    "refundTransactionId" TEXT,
    "refundProcessedAt" TIMESTAMP(3),
    "refundBankName" TEXT,
    "refundAccountNumber" TEXT,
    "refundChequeNumber" TEXT,
    "refundNotes" TEXT,
    "appliedToInvoice" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" TIMESTAMP(3),
    "voucherGenerated" BOOLEAN NOT NULL DEFAULT false,
    "voucherCode" TEXT,
    "voucherValue" DOUBLE PRECISION,
    "voucherExpiryDate" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "internalNotes" TEXT,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "pdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."CreditNoteItem" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "creditAmount" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CreditNoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."Voucher" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "packageId" TEXT,
    "customizedPackageId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastModifiedById" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "packageDetails" JSONB,
    "travelStartDate" TIMESTAMP(3),
    "travelEndDate" TIMESTAMP(3),
    "notes" TEXT,
    "terms" TEXT[],
    "specialInstructions" TEXT,
    "status" "crm_billing"."VoucherStatus" NOT NULL DEFAULT 'draft',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappSentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."VoucherLocationDate" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "location" TEXT,
    "hotelName" TEXT,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherLocationDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."VoucherMealPlan" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "dayTitle" TEXT,
    "breakfast" BOOLEAN NOT NULL DEFAULT false,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "VoucherMealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."VoucherItinerarySummary" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,
    "locations" TEXT[],
    "activities" TEXT[],
    "accommodationName" TEXT,
    "accommodationType" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherItinerarySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_billing"."VoucherFlightSegment" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dayNumber" INTEGER,
    "marketingCarrier" TEXT,
    "flightNumber" TEXT,
    "origin" TEXT,
    "destination" TEXT,
    "departureAt" TIMESTAMP(3),
    "arrivalAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VoucherFlightSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "crm_billing"."Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_leadId_createdAt_idx" ON "crm_billing"."Invoice"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "crm_billing"."Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_paymentStatus_idx" ON "crm_billing"."Invoice"("paymentStatus");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "crm_billing"."Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_type_idx" ON "crm_billing"."Invoice"("type");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "crm_billing"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "crm_billing"."Quotation"("quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_leadId_createdAt_idx" ON "crm_billing"."Quotation"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Quotation_leadId_packageId_idx" ON "crm_billing"."Quotation"("leadId", "packageId");

-- CreateIndex
CREATE INDEX "Quotation_status_validUntil_idx" ON "crm_billing"."Quotation"("status", "validUntil");

-- CreateIndex
CREATE INDEX "Quotation_createdAt_idx" ON "crm_billing"."Quotation"("createdAt");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "crm_billing"."QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationImage_quotationId_idx" ON "crm_billing"."QuotationImage"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationRevision_quotationId_idx" ON "crm_billing"."QuotationRevision"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receiptNumber_key" ON "crm_billing"."PaymentReceipt"("receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentReceipt_leadId_createdAt_idx" ON "crm_billing"."PaymentReceipt"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReceipt_invoiceId_paymentDate_idx" ON "crm_billing"."PaymentReceipt"("invoiceId", "paymentDate");

-- CreateIndex
CREATE INDEX "PaymentReceipt_receiptStatus_idx" ON "crm_billing"."PaymentReceipt"("receiptStatus");

-- CreateIndex
CREATE INDEX "PaymentReceipt_paymentDate_idx" ON "crm_billing"."PaymentReceipt"("paymentDate");

-- CreateIndex
CREATE INDEX "PaymentReceipt_createdAt_idx" ON "crm_billing"."PaymentReceipt"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentReceipt_paymentMethod_idx" ON "crm_billing"."PaymentReceipt"("paymentMethod");

-- CreateIndex
CREATE INDEX "PaymentReceipt_verified_reconciled_idx" ON "crm_billing"."PaymentReceipt"("verified", "reconciled");

-- CreateIndex
CREATE INDEX "PaymentReceipt_transactionId_idx" ON "crm_billing"."PaymentReceipt"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentHistory_paymentHistoryNumber_key" ON "crm_billing"."PaymentHistory"("paymentHistoryNumber");

-- CreateIndex
CREATE INDEX "PaymentHistory_leadId_paymentDate_idx" ON "crm_billing"."PaymentHistory"("leadId", "paymentDate");

-- CreateIndex
CREATE INDEX "PaymentHistory_invoiceId_paymentDate_idx" ON "crm_billing"."PaymentHistory"("invoiceId", "paymentDate");

-- CreateIndex
CREATE INDEX "PaymentHistory_receiptId_idx" ON "crm_billing"."PaymentHistory"("receiptId");

-- CreateIndex
CREATE INDEX "PaymentHistory_paymentDate_idx" ON "crm_billing"."PaymentHistory"("paymentDate");

-- CreateIndex
CREATE INDEX "PaymentHistory_status_idx" ON "crm_billing"."PaymentHistory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "crm_billing"."CreditNote"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "CreditNote_leadId_createdAt_idx" ON "crm_billing"."CreditNote"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditNote_invoiceId_issueDate_idx" ON "crm_billing"."CreditNote"("invoiceId", "issueDate");

-- CreateIndex
CREATE INDEX "CreditNote_status_idx" ON "crm_billing"."CreditNote"("status");

-- CreateIndex
CREATE INDEX "CreditNote_refundStatus_idx" ON "crm_billing"."CreditNote"("refundStatus");

-- CreateIndex
CREATE INDEX "CreditNote_createdAt_idx" ON "crm_billing"."CreditNote"("createdAt");

-- CreateIndex
CREATE INDEX "CreditNote_type_idx" ON "crm_billing"."CreditNote"("type");

-- CreateIndex
CREATE INDEX "CreditNoteItem_creditNoteId_idx" ON "crm_billing"."CreditNoteItem"("creditNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherNumber_key" ON "crm_billing"."Voucher"("voucherNumber");

-- CreateIndex
CREATE INDEX "Voucher_leadId_createdAt_idx" ON "crm_billing"."Voucher"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Voucher_status_idx" ON "crm_billing"."Voucher"("status");

-- CreateIndex
CREATE INDEX "VoucherLocationDate_voucherId_idx" ON "crm_billing"."VoucherLocationDate"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherMealPlan_voucherId_idx" ON "crm_billing"."VoucherMealPlan"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherItinerarySummary_voucherId_idx" ON "crm_billing"."VoucherItinerarySummary"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherFlightSegment_voucherId_idx" ON "crm_billing"."VoucherFlightSegment"("voucherId");

-- AddForeignKey
ALTER TABLE "crm_billing"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "crm_billing"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "crm_billing"."Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."QuotationImage" ADD CONSTRAINT "QuotationImage_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "crm_billing"."Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."QuotationRevision" ADD CONSTRAINT "QuotationRevision_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "crm_billing"."Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "crm_billing"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."PaymentHistory" ADD CONSTRAINT "PaymentHistory_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "crm_billing"."PaymentReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "crm_billing"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "crm_billing"."CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."VoucherLocationDate" ADD CONSTRAINT "VoucherLocationDate_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "crm_billing"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."VoucherMealPlan" ADD CONSTRAINT "VoucherMealPlan_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "crm_billing"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_billing"."VoucherItinerarySummary" ADD CONSTRAINT "VoucherItinerarySummary_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "crm_billing"."Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
