import { z } from 'zod';

/**
 * Body for POST /receipts/:id/send. `channel` picks the delivery medium;
 * `email`/`phone` optionally override the receipt snapshot's contact.
 */
export const sendReceiptSchema = z.object({
  channel: z.enum(['email', 'whatsapp']).default('email'),
  email: z.string().email().optional(),
  phone: z.string().trim().min(1).optional(),
});

// The Management UI's payment-method/type/card/gateway option values use
// hyphens (e.g. 'bank-transfer', 'full-payment') to match how they're
// displayed, while the Prisma enums declared in schema.prisma use the
// underscore form as the JS-facing identifier ('bank_transfer',
// 'full_payment' — @map only renames the *stored* DB value). These maps
// translate at the API boundary so the UI's option values never need to
// match Prisma's identifiers 1:1. Unknown/unsupported values (e.g. the UI
// offers "RuPay"/"Paytm" as real-world options the schema has no dedicated
// slot for) fall back to 'other' rather than rejecting a real payment.
const PAYMENT_METHOD_MAP = {
  cash: 'cash', card: 'card', 'bank-transfer': 'bank_transfer', bank_transfer: 'bank_transfer',
  upi: 'upi', online: 'online', cheque: 'cheque', wallet: 'wallet', other: 'other',
};
const PAYMENT_TYPE_MAP = {
  advance: 'advance', installment: 'installment', 'full-payment': 'full_payment', full_payment: 'full_payment',
  'final-payment': 'final_payment', final_payment: 'final_payment', refund: 'refund',
};
const CARD_TYPE_MAP = { visa: 'visa', mastercard: 'mastercard', amex: 'amex', discover: 'discover' };
const PAYMENT_GATEWAY_MAP = { stripe: 'stripe', razorpay: 'razorpay', paypal: 'paypal', square: 'square' };

const mapOrOther = (map) => (value) => (value ? (map[value] || 'other') : undefined);

const paymentDetailsSchema = z
  .object({
    cardType: z.string().optional().transform(mapOrOther(CARD_TYPE_MAP)),
    cardLastFour: z.string().trim().max(4).optional(),
    bankName: z.string().trim().optional(),
    accountNumber: z.string().trim().optional(),
    transactionReference: z.string().trim().optional(),
    chequeNumber: z.string().trim().optional(),
    chequeDate: z.coerce.date().optional(),
    chequeBank: z.string().trim().optional(),
    paymentGateway: z.string().optional().transform(mapOrOther(PAYMENT_GATEWAY_MAP)),
    gatewayTransactionId: z.string().trim().optional(),
    upiId: z.string().trim().optional(),
    upiTransactionId: z.string().trim().optional(),
  })
  .partial()
  .optional();

/**
 * Body for POST /receipts — recording a payment against an invoice.
 * `invoiceId` is required; `leadId` is optional (falls back to the invoice's
 * own leadId in the controller). `paymentMethod`/`paymentType` are
 * translated from the UI's hyphenated option values to the Prisma enum's
 * underscore identifiers via `.transform()`.
 */
export const createReceiptSchema = z.object({
  invoiceId: z.string().min(1, 'invoiceId is required'),
  leadId: z.string().min(1).optional(),
  amount: z.coerce.number().positive('amount must be greater than zero'),
  currency: z.string().optional(),
  paymentMethod: z.string().min(1).transform((v) => PAYMENT_METHOD_MAP[v] || 'other'),
  paymentDate: z.coerce.date().optional(),
  paymentType: z.string().optional().transform((v) => (v ? (PAYMENT_TYPE_MAP[v] || 'installment') : 'installment')),
  transactionId: z.string().trim().optional(),
  notes: z.string().optional(),
  customerName: z.string().trim().optional(),
  customerEmail: z.string().trim().email().optional(),
  customerPhone: z.string().trim().optional(),
  customerAddress: z.string().trim().optional(),
  paymentDetails: paymentDetailsSchema,
});
