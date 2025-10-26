# Billing & Invoicing Module - Backend API Documentation

## Overview

The Billing & Invoicing Module provides comprehensive financial management capabilities for the Trip Sky Way travel agency system. This module handles quotations, invoices, payment receipts, and credit notes with full traceability to leads.

## Table of Contents

1. [Features](#features)
2. [Data Models](#data-models)
3. [API Endpoints](#api-endpoints)
4. [Business Logic](#business-logic)
5. [Integration Points](#integration-points)
6. [Security & Permissions](#security--permissions)

---

## Features

### ✅ Implemented Features

1. **Quotation Management**
   - Create, update, and delete quotations
   - Link quotations to leads
   - Track quotation status (draft, sent, viewed, accepted, rejected, expired, converted)
   - Auto-generate quotation numbers
   - Revision history tracking
   - Convert quotations to invoices
   - Calculate taxes, discounts, and service charges automatically

2. **Invoice Management**
   - Create invoices manually or from quotations
   - Support for multiple invoice types (invoice, proforma, tax-invoice, commercial-invoice)
   - Auto-generate invoice numbers
   - Track payment status (unpaid, partial, paid, overpaid, refunded)
   - Overdue invoice detection
   - Payment reminders tracking
   - Link to payment receipts and credit notes

3. **Payment Receipt Management**
   - Record payments with detailed information
   - Support multiple payment methods (cash, card, bank-transfer, online, cheque, UPI, wallet)
   - Payment gateway integration ready (Stripe, Razorpay, PayPal, Square)
   - Receipt status tracking (paid-in-advance, paid-in-full, partial-payment, refunded)
   - Payment verification and reconciliation workflow
   - Automatic balance calculation

4. **Credit Note & Refund Management**
   - Create credit notes for various reasons (refund, cancellation, discount, error-correction)
   - Approval workflow for credit notes
   - Apply credit notes to invoices
   - Process refunds through multiple methods
   - Generate vouchers from credit notes
   - Track refund status

5. **Billing Reports & Analytics**
   - Financial reports with date range filtering
   - Aging report for outstanding invoices
   - Payment method breakdown
   - Revenue trends (monthly, quarterly, yearly)
   - Top customers by revenue
   - Dashboard statistics
   - Export billing data

6. **Lead Integration**
   - All billing documents linked to leads
   - Comprehensive billing summary per lead
   - Automatic lead status updates

---

## Data Models

### 1. Quotation Model

```javascript
{
  quotationNumber: String (unique, auto-generated),
  lead: ObjectId (ref: 'Lead', required),
  customer: {
    name: String,
    email: String,
    phone: String,
    address: String,
    gstNumber: String
  },
  type: Enum ['standard', 'custom', 'package-based'],
  package: ObjectId (ref: 'Package'),
  items: [
    {
      description: String,
      category: Enum,
      quantity: Number,
      unitPrice: Number,
      totalPrice: Number,
      notes: String
    }
  ],
  subtotal: Number,
  taxRate: Number,
  taxAmount: Number,
  discountType: Enum ['percentage', 'fixed', 'none'],
  discountValue: Number,
  discountAmount: Number,
  serviceChargeRate: Number,
  serviceChargeAmount: Number,
  totalAmount: Number,
  status: Enum ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
  validUntil: Date,
  convertedToInvoice: ObjectId (ref: 'Invoice'),
  createdBy: ObjectId (ref: 'User'),
  version: Number,
  revisionHistory: []
}
```

### 2. Invoice Model

```javascript
{
  invoiceNumber: String (unique, auto-generated),
  lead: ObjectId (ref: 'Lead', required),
  quotation: ObjectId (ref: 'Quotation'),
  booking: ObjectId (ref: 'Booking'),
  customer: { /* same as quotation */ },
  type: Enum ['invoice', 'proforma', 'tax-invoice', 'commercial-invoice'],
  items: [ /* same structure as quotation */ ],
  subtotal: Number,
  taxRate: Number,
  taxAmount: Number,
  discountType: Enum,
  discountValue: Number,
  discountAmount: Number,
  serviceChargeRate: Number,
  serviceChargeAmount: Number,
  totalAmount: Number,
  paidAmount: Number,
  outstandingAmount: Number,
  status: Enum ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'],
  paymentStatus: Enum ['unpaid', 'partial', 'paid', 'overpaid', 'refunded'],
  dueDate: Date,
  issueDate: Date,
  payments: [ObjectId] (ref: 'PaymentReceipt'),
  creditNotes: [ObjectId] (ref: 'CreditNote'),
  bankDetails: {},
  remindersSent: Number,
  lastReminderSent: Date,
  createdBy: ObjectId (ref: 'User')
}
```

### 3. PaymentReceipt Model

```javascript
{
  receiptNumber: String (unique, auto-generated),
  lead: ObjectId (ref: 'Lead', required),
  invoice: ObjectId (ref: 'Invoice', required),
  customer: { /* same structure */ },
  amount: Number,
  currency: Enum ['LKR', 'USD', 'EUR', 'GBP', 'AUD', 'INR'],
  paymentMethod: Enum ['cash', 'card', 'bank-transfer', 'online', 'cheque', 'upi', 'wallet', 'other'],
  paymentDetails: {
    cardType: String,
    cardLastFour: String,
    bankName: String,
    transactionReference: String,
    chequeNumber: String,
    paymentGateway: Enum ['stripe', 'razorpay', 'paypal', 'square', 'other'],
    gatewayTransactionId: String,
    upiId: String
  },
  transactionId: String,
  paymentDate: Date,
  receiptStatus: Enum ['paid-in-advance', 'paid-in-full', 'partial-payment', 'refunded', 'cancelled'],
  paymentType: Enum ['advance', 'installment', 'full-payment', 'final-payment', 'refund'],
  previousBalance: Number,
  outstandingBalance: Number,
  verified: Boolean,
  verifiedBy: ObjectId (ref: 'User'),
  reconciled: Boolean,
  reconciledBy: ObjectId (ref: 'User'),
  createdBy: ObjectId (ref: 'User')
}
```

### 4. CreditNote Model

```javascript
{
  creditNoteNumber: String (unique, auto-generated),
  lead: ObjectId (ref: 'Lead', required),
  invoice: ObjectId (ref: 'Invoice', required),
  customer: { /* same structure */ },
  type: Enum ['refund', 'cancellation', 'discount', 'error-correction', 'service-not-provided', 'quality-issue', 'other'],
  reason: String,
  items: [
    {
      description: String,
      originalAmount: Number,
      creditAmount: Number,
      quantity: Number
    }
  ],
  subtotal: Number,
  taxAmount: Number,
  totalAmount: Number,
  status: Enum ['draft', 'issued', 'applied', 'refunded', 'cancelled'],
  refundStatus: Enum ['pending', 'processing', 'completed', 'failed', 'not-applicable'],
  refundMethod: Enum,
  refundDetails: {},
  appliedToInvoice: Boolean,
  voucherGenerated: Boolean,
  voucherCode: String,
  approvalRequired: Boolean,
  approvedBy: ObjectId (ref: 'User'),
  createdBy: ObjectId (ref: 'User')
}
```

---

## API Endpoints

### Base URL
```
/api/v1/billing
```

### Quotations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/quotations` | Get all quotations | Admin, Staff |
| GET | `/quotations/:id` | Get quotation by ID | Admin, Staff |
| GET | `/quotations/lead/:leadId` | Get quotations by lead | Admin, Staff |
| GET | `/quotations/stats` | Get quotation statistics | Admin, Manager |
| POST | `/quotations` | Create new quotation | Admin, Staff |
| PUT | `/quotations/:id` | Update quotation | Admin, Staff |
| DELETE | `/quotations/:id` | Delete quotation | Admin |
| POST | `/quotations/:id/send` | Send quotation to customer | Admin, Staff |
| POST | `/quotations/:id/viewed` | Mark as viewed | Public |
| POST | `/quotations/:id/accept` | Accept quotation | Customer |
| POST | `/quotations/:id/reject` | Reject quotation | Customer |
| POST | `/quotations/:id/convert` | Convert to invoice | Admin, Staff |

### Invoices

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | Get all invoices | Admin, Staff |
| GET | `/invoices/:id` | Get invoice by ID | Admin, Staff |
| GET | `/invoices/lead/:leadId` | Get invoices by lead | Admin, Staff |
| GET | `/invoices/stats` | Get invoice statistics | Admin, Manager |
| GET | `/invoices/overdue` | Get overdue invoices | Admin, Manager |
| POST | `/invoices` | Create new invoice | Admin, Staff |
| PUT | `/invoices/:id` | Update invoice | Admin, Staff |
| PUT | `/invoices/:id/cancel` | Cancel invoice | Admin |
| POST | `/invoices/:id/send` | Send invoice to customer | Admin, Staff |
| POST | `/invoices/:id/viewed` | Mark as viewed | Public |
| POST | `/invoices/:id/remind` | Send payment reminder | Admin, Staff |
| GET | `/invoices/:id/pdf` | Download invoice PDF | Admin, Staff, Customer |

### Payment Receipts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/receipts` | Get all payment receipts | Admin, Staff |
| GET | `/receipts/:id` | Get receipt by ID | Admin, Staff |
| GET | `/receipts/lead/:leadId` | Get receipts by lead | Admin, Staff |
| GET | `/receipts/invoice/:invoiceId` | Get receipts by invoice | Admin, Staff |
| GET | `/receipts/stats` | Get receipt statistics | Admin, Manager |
| POST | `/receipts` | Record new payment | Admin, Staff |
| PUT | `/receipts/:id` | Update payment receipt | Admin |
| PUT | `/receipts/:id/cancel` | Cancel payment receipt | Admin |
| PUT | `/receipts/:id/verify` | Verify payment | Admin, Manager |
| PUT | `/receipts/:id/reconcile` | Reconcile payment | Admin, Accountant |
| POST | `/receipts/:id/send` | Send receipt to customer | Admin, Staff |
| GET | `/receipts/:id/pdf` | Download receipt PDF | Admin, Staff, Customer |

### Credit Notes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/credit-notes` | Get all credit notes | Admin, Staff |
| GET | `/credit-notes/:id` | Get credit note by ID | Admin, Staff |
| GET | `/credit-notes/lead/:leadId` | Get credit notes by lead | Admin, Staff |
| GET | `/credit-notes/invoice/:invoiceId` | Get credit notes by invoice | Admin, Staff |
| GET | `/credit-notes/stats` | Get credit note statistics | Admin, Manager |
| POST | `/credit-notes` | Create credit note | Admin, Staff |
| PUT | `/credit-notes/:id` | Update credit note | Admin |
| PUT | `/credit-notes/:id/issue` | Issue credit note | Admin |
| PUT | `/credit-notes/:id/approve` | Approve credit note | Admin, Manager |
| PUT | `/credit-notes/:id/reject` | Reject credit note | Admin, Manager |
| PUT | `/credit-notes/:id/apply` | Apply to invoice | Admin, Staff |
| PUT | `/credit-notes/:id/refund` | Process refund | Admin |
| POST | `/credit-notes/:id/voucher` | Generate voucher | Admin, Staff |
| PUT | `/credit-notes/:id/cancel` | Cancel credit note | Admin |
| POST | `/credit-notes/:id/send` | Send to customer | Admin, Staff |

### Reports & Analytics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/dashboard` | Get dashboard statistics | Admin, Manager |
| GET | `/summary/lead/:leadId` | Get billing summary for lead | Admin, Staff |
| GET | `/reports/financial` | Get financial reports | Admin, Accountant |
| GET | `/reports/aging` | Get aging report | Admin, Accountant |
| GET | `/reports/payment-methods` | Payment method breakdown | Admin, Accountant |
| GET | `/reports/revenue-trends` | Revenue trends analysis | Admin, Accountant |
| GET | `/reports/top-customers` | Top customers by revenue | Admin, Accountant |
| GET | `/export` | Export billing data | Admin, Accountant |

---

## Business Logic

### Quotation to Invoice Conversion

When a quotation is converted to an invoice:
1. All items, amounts, and customer details are copied
2. Quotation status is set to 'converted'
3. Lead status is updated to 'converted'
4. Invoice is created with default 15-day payment term
5. Quotation reference is maintained in invoice

### Payment Recording

When a payment is recorded:
1. Payment receipt is created and linked to invoice
2. Invoice's `paidAmount` is incremented
3. Invoice's `outstandingAmount` is recalculated
4. Invoice's `paymentStatus` is updated (unpaid → partial → paid)
5. Receipt status is determined automatically based on total paid vs invoice total

### Credit Note Application

When a credit note is applied to an invoice:
1. Credit note must be approved (if approval required)
2. Credit note status changes to 'applied'
3. Invoice's `paidAmount` is incremented by credit amount
4. Invoice's payment status is recalculated
5. Credit note is added to invoice's credit notes array

### Auto-Calculations

All financial documents automatically calculate:
- **Subtotal**: Sum of all item totals
- **Discount Amount**: Based on discount type (percentage or fixed)
- **Service Charge**: Calculated on subtotal
- **Tax Amount**: Calculated on (subtotal - discount + service charge)
- **Total Amount**: Final amount including all charges

### Status Transitions

**Quotation Status Flow:**
```
draft → sent → viewed → accepted → converted
                    ↓
                rejected / expired
```

**Invoice Status Flow:**
```
draft → sent → viewed → partial → paid
                    ↓
                overdue (if past due date)
                    ↓
                cancelled / refunded
```

---

## Integration Points

### Payment Gateway Integration

The system is ready to integrate with:
- **Stripe**: Credit card processing
- **Razorpay**: Indian payments (UPI, cards, net banking)
- **PayPal**: International payments
- **Square**: POS and online payments

Payment gateway fields are included in `PaymentReceipt.paymentDetails`:
```javascript
{
  paymentGateway: 'stripe' | 'razorpay' | 'paypal' | 'square',
  gatewayTransactionId: String,
  gatewayPaymentId: String
}
```

### Email Service Integration

Email sending points (to be implemented):
1. Send quotation to customer
2. Send invoice to customer
3. Send payment receipt to customer
4. Send payment reminder
5. Send credit note to customer

All models have `sentAt` and `emailSent` fields ready for email tracking.

### PDF Generation

PDF generation endpoints are ready:
- `/invoices/:id/pdf` - Download invoice PDF
- `/receipts/:id/pdf` - Download receipt PDF

Models include `pdfUrl` field to store generated PDF locations.

---

## Security & Permissions

### Role-Based Access Control

**Admin:**
- Full access to all billing operations
- Can create, update, delete, and cancel all documents
- Can approve credit notes
- Can verify and reconcile payments
- Access to all reports

**Manager:**
- View all billing documents
- Approve/reject credit notes
- Verify payments
- Access to reports and analytics

**Staff:**
- Create and update quotations and invoices
- Record payments
- Send documents to customers
- View billing data

**Accountant:**
- View all billing documents
- Reconcile payments
- Access to financial reports
- Export billing data

**Customer/Lead:**
- View their own quotations and invoices
- Accept/reject quotations
- Make payments

### Data Security

1. **Lead Association**: All billing documents must be linked to a lead
2. **Audit Trail**: All documents track creator and modifier
3. **Status Protection**: Paid/cancelled documents cannot be modified
4. **Verification Workflow**: Payments can be verified and reconciled separately
5. **Approval Workflow**: Credit notes require approval before applying

---

## Next Steps / TODO

1. **PDF Generation**: Implement PDF generation using PDFKit
2. **Email Service**: Integrate Nodemailer for automated emails
3. **Payment Gateway Integration**: Connect Stripe/Razorpay APIs
4. **CSV/Excel Export**: Implement data export functionality
5. **Scheduled Tasks**: Auto-send payment reminders for overdue invoices
6. **SMS Notifications**: Integrate Twilio for payment confirmations
7. **Webhook Handlers**: Implement payment gateway webhooks
8. **Advanced Reports**: Add more visualization and charts
9. **Tax Calculations**: Support multiple tax rates per item
10. **Multi-Currency**: Full support for currency conversion

---

## Testing

### Sample API Calls

**Create Quotation:**
```bash
POST /api/v1/billing/quotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "lead": "507f1f77bcf86cd799439011",
  "items": [
    {
      "description": "Bali Beach Resort - 5 Nights",
      "category": "accommodation",
      "quantity": 2,
      "unitPrice": 150,
      "totalPrice": 300
    },
    {
      "description": "Airport Transfer",
      "category": "transportation",
      "quantity": 1,
      "unitPrice": 50,
      "totalPrice": 50
    }
  ],
  "taxRate": 10,
  "discountType": "percentage",
  "discountValue": 5,
  "validUntil": "2025-12-31"
}
```

**Record Payment:**
```bash
POST /api/v1/billing/receipts
Authorization: Bearer <token>
Content-Type: application/json

{
  "invoice": "507f1f77bcf86cd799439012",
  "amount": 100,
  "paymentMethod": "bank-transfer",
  "paymentType": "advance",
  "transactionId": "TXN123456",
  "paymentDetails": {
    "bankName": "ABC Bank",
    "transactionReference": "REF789"
  },
  "notes": "Advance payment for Bali trip"
}
```

---

## Support

For issues or questions:
- Check API error responses for detailed messages
- Review validation requirements in `billing.validator.js`
- Consult business logic in `billing.service.js`
- Contact development team for integration support

---

**Version:** 1.0.0  
**Last Updated:** October 26, 2025  
**Maintained By:** Trip Sky Way Development Team
