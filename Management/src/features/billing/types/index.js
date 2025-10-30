/**
 * @typedef {Object} LineItem
 * @property {string} description - Item description
 * @property {number} quantity - Item quantity
 * @property {number} rate - Item rate per unit
 * @property {number} amount - Total amount (quantity * rate)
 */

/**
 * @typedef {Object} Quotation
 * @property {string} id - Quotation ID (e.g., QUO-001)
 * @property {string} leadId - Associated Lead ID
 * @property {string} leadName - Lead/Customer name
 * @property {string} email - Customer email
 * @property {string} phone - Customer phone
 * @property {string} packageName - Package/service name
 * @property {number} amount - Subtotal amount
 * @property {number} tax - Tax amount
 * @property {number} discount - Discount amount
 * @property {number} total - Total amount (amount + tax - discount)
 * @property {string} status - Quotation status (draft, sent, accepted, rejected, expired)
 * @property {string} validUntil - Valid until date (YYYY-MM-DD)
 * @property {string} issuedDate - Issued date (YYYY-MM-DD)
 * @property {LineItem[]} items - Quotation line items
 * @property {string} notes - Additional notes
 * @property {string} termsConditions - Terms and conditions
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id - Invoice ID (e.g., INV-001)
 * @property {string} leadId - Associated Lead ID
 * @property {string} quotationId - Associated Quotation ID (optional)
 * @property {string} customerName - Customer name
 * @property {string} email - Customer email
 * @property {string} phone - Customer phone
 * @property {string} packageName - Package/service name
 * @property {number} amount - Subtotal amount
 * @property {number} tax - Tax amount
 * @property {number} discount - Discount amount
 * @property {number} total - Total amount (amount + tax - discount)
 * @property {string} status - Invoice status (draft, sent, paid, partial, overdue, cancelled)
 * @property {string} dueDate - Due date (YYYY-MM-DD)
 * @property {string} issuedDate - Issued date (YYYY-MM-DD)
 * @property {string|null} paymentDate - Payment date
 * @property {number} [paidAmount] - Paid amount for partial payments
 * @property {LineItem[]} items - Invoice line items
 * @property {string} notes - Additional notes
 */

/**
 * @typedef {Object} PaymentReceipt
 * @property {string} id - Receipt ID (e.g., REC-001)
 * @property {string} leadId - Associated Lead ID
 * @property {string} invoiceId - Associated Invoice ID
 * @property {string} customerName - Customer name
 * @property {string} email - Customer email
 * @property {string} phone - Customer phone
 * @property {number} amount - Payment amount
 * @property {string} paymentMethod - Payment method
 * @property {string} paymentDate - Payment date (YYYY-MM-DD)
 * @property {string} status - Receipt status (paid-in-advance, paid-in-full)
 * @property {string} transactionId - Transaction/reference ID
 * @property {number} invoiceTotal - Total invoice amount
 * @property {number} previousPayments - Sum of previous payments
 * @property {number} remainingBalance - Remaining balance after this payment
 * @property {string} notes - Additional notes
 * @property {string} issuedDate - Receipt issued date
 */

/**
 * Quotation status types
 */
export const QUOTATION_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

/**
 * Invoice status types
 */
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

/**
 * Payment receipt status types
 */
export const RECEIPT_STATUS = {
  PAID_IN_ADVANCE: 'paid-in-advance',
  PAID_IN_FULL: 'paid-in-full',
};

/**
 * Payment methods
 */
export const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'PayPal',
  'Cash',
  'Check',
  'Wire Transfer',
  'Mobile Payment',
];

export default {
  INVOICE_STATUS,
  PAYMENT_METHODS,
};
