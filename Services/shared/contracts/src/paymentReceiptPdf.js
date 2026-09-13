import { z } from 'zod';
import { moneyField } from './money.js';

// Narrow schema for the fields billing-service's generatePaymentReceiptPDF
// (Services/billing-service/src/utils/paymentReceiptPDFGenerator.js) actually
// dereferences off a persisted PaymentReceipt row (with its `invoice` relation
// included). .passthrough() so unrelated PaymentReceipt columns (receiptStatus,
// timestamps, relation ids, ...) aren't rejected.
export const ReceiptForPdf = z
  .object({
    receiptNumber: z.string(),
    currency: z.string().nullable().optional(),
    paymentDate: z.coerce.date().nullable().optional(),
    paymentMethod: z.string().nullable().optional(),
    transactionId: z.string().nullable().optional(),

    customerName: z.string(),
    customerEmail: z.string().nullable().optional(),
    customerPhone: z.string().nullable().optional(),

    amount: moneyField,
    previousBalance: moneyField.optional(),
    outstandingBalance: moneyField.optional(),

    invoice: z
      .object({
        invoiceNumber: z.string(),
        totalAmount: moneyField.optional(),
        bookingId: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();
