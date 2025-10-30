/**
 * @typedef {Object} InvoiceItem
 * @property {string} description - Item description
 * @property {number} quantity - Item quantity
 * @property {number} rate - Item rate per unit
 * @property {number} amount - Total amount (quantity * rate)
 */

/**
 * @typedef {Object} Invoice
 * @property {string} id - Invoice ID
 * @property {string} customerName - Customer name
 * @property {string} email - Customer email
 * @property {string} packageName - Package/service name
 * @property {number} amount - Subtotal amount
 * @property {number} tax - Tax amount
 * @property {number} total - Total amount (amount + tax)
 * @property {string} status - Invoice status (paid, pending, partial, overdue)
 * @property {string} dueDate - Due date (YYYY-MM-DD)
 * @property {string} issuedDate - Issued date (YYYY-MM-DD)
 * @property {string|null} paymentDate - Payment date
 * @property {string|null} paymentMethod - Payment method
 * @property {number} [paidAmount] - Paid amount for partial payments
 * @property {InvoiceItem[]} items - Invoice line items
 * @property {string} notes - Additional notes
 */

/**
 * @typedef {Object} InvoiceStats
 * @property {number} totalRevenue - Total revenue from all invoices
 * @property {number} paidCount - Number of paid invoices
 * @property {number} pendingAmount - Total pending amount
 * @property {number} overdueCount - Number of overdue invoices
 */

/**
 * Invoice status types
 */
export const INVOICE_STATUS = {
  PAID: 'paid',
  PENDING: 'pending',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
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
];

export default {
  INVOICE_STATUS,
  PAYMENT_METHODS,
};
