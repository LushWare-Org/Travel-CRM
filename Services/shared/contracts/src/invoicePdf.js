import { z } from 'zod';
import { moneyField } from './money.js';

// Narrow schema for the fields billing-service's generateInvoicePDF
// (Services/billing-service/src/utils/invoicePDFGenerator.js) actually
// dereferences off a persisted Invoice row. .passthrough() so unrelated
// Invoice columns (status, timestamps, relation ids, ...) aren't rejected.
export const InvoiceForPdf = z
  .object({
    invoiceNumber: z.string(),
    type: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    issueDate: z.coerce.date().nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
    bookingId: z.string().nullable().optional(),
    destination: z.string().nullable().optional(),

    customerName: z.string(),
    customerEmail: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),
    customerAddress: z.string().nullable().optional(),
    customerGstNumber: z.string().nullable().optional(),

    items: z
      .array(
        z
          .object({
            description: z.string().nullable().optional(),
            totalPrice: moneyField.optional(),
          })
          .passthrough(),
      )
      .optional(),

    subtotal: moneyField.optional(),
    taxRate: moneyField.optional(),
    taxAmount: moneyField.optional(),
    discountAmount: moneyField.optional(),
    serviceChargeAmount: moneyField.optional(),
    totalAmount: moneyField.optional(),

    notes: z.string().nullable().optional(),
    paymentTerms: z.string().nullable().optional(),
    paymentInstructions: z.string().nullable().optional(),

    bankAccountName: z.string().nullable().optional(),
    bankAccountNumber: z.string().nullable().optional(),
    bankName: z.string().nullable().optional(),
    bankIfscCode: z.string().nullable().optional(),
    bankSwiftCode: z.string().nullable().optional(),
    bankBranch: z.string().nullable().optional(),
    bankUpiId: z.string().nullable().optional(),
  })
  .passthrough();
