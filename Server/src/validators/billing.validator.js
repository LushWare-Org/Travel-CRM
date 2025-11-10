import { body, param, query } from 'express-validator';

export const createQuotationValidator = [
  body('lead')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID'),

  body('customer.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),

  body('customer.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('customer.phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.description')
    .notEmpty()
    .withMessage('Item description is required')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Description must be between 3 and 500 characters'),

  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),

  body('items.*.totalPrice')
    .isFloat({ min: 0 })
    .withMessage('Total price must be a positive number'),

  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),

  body('discountType')
    .optional()
    .isIn(['percentage', 'fixed', 'none'])
    .withMessage('Invalid discount type'),

  body('discountValue')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount value must be a positive number'),

  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until must be a valid date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Valid until date must be in the future');
      }
      return true;
    }),
];

export const updateQuotationValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid quotation ID'),

  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.description')
    .optional()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Description must be between 3 and 500 characters'),

  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
];

export const createInvoiceValidator = [
  body('lead')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID'),

  body('customer.name')
    .notEmpty()
    .withMessage('Customer name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),

  body('customer.email')
    .notEmpty()
    .withMessage('Customer email is required')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('customer.phone')
    .notEmpty()
    .withMessage('Customer phone is required')
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Invalid phone number'),

  body('type')
    .optional()
    .isIn(['invoice', 'proforma', 'tax-invoice', 'commercial-invoice'])
    .withMessage('Invalid invoice type'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
];

export const recordPaymentValidator = [
  body('invoice')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isMongoId()
    .withMessage('Invalid invoice ID'),

  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),

  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['cash', 'card', 'bank-transfer', 'online', 'cheque', 'upi', 'wallet', 'other'])
    .withMessage('Invalid payment method'),

  body('paymentType')
    .optional()
    .isIn(['advance', 'installment', 'full-payment', 'final-payment', 'refund'])
    .withMessage('Invalid payment type'),

  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid date'),
];

export const createCreditNoteValidator = [
  body('invoice')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isMongoId()
    .withMessage('Invalid invoice ID'),

  body('type')
    .notEmpty()
    .withMessage('Credit note type is required')
    .isIn(['refund', 'cancellation', 'discount', 'error-correction', 'service-not-provided', 'quality-issue', 'other'])
    .withMessage('Invalid credit note type'),

  body('reason')
    .notEmpty()
    .withMessage('Reason is required')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.description')
    .notEmpty()
    .withMessage('Item description is required'),

  body('items.*.originalAmount')
    .isFloat({ min: 0 })
    .withMessage('Original amount must be a positive number'),

  body('items.*.creditAmount')
    .isFloat({ min: 0 })
    .withMessage('Credit amount must be a positive number'),
];

export const getReportsValidator = [
  query('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),

  query('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

export const mongoIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID'),
];

export const leadIdValidator = [
  param('leadId')
    .isMongoId()
    .withMessage('Invalid lead ID'),
];

export const invoiceIdValidator = [
  param('invoiceId')
    .isMongoId()
    .withMessage('Invalid invoice ID'),
];
