# Enhanced Billing & Invoicing System

## Overview

The Enhanced Billing & Invoicing System is a comprehensive solution for managing the complete sales cycle from quotation to payment receipt. All documents are automatically linked to Lead IDs for seamless tracking and management.

## Features

### 🎯 Three Main Modules

#### 1. **Quotations**
- Create and manage quotations for leads
- Search quotations by Lead ID, customer name, or quotation ID
- Track quotation status: Draft, Sent, Accepted, Rejected, Expired
- Convert accepted quotations to invoices automatically
- Duplicate quotations for quick creation
- Auto-fills customer details from lead data

#### 2. **Invoices**
- Create invoices manually or from accepted quotations
- Automatically inherits data from quotations when linked
- Multiple status tracking: Draft, Sent, Paid, Partial, Overdue, Cancelled
- Link invoices to leads and quotations
- Search by Lead ID, Invoice ID, or customer name
- Track payment status and amounts

#### 3. **Payment Receipts**
- Record payments against invoices
- Automatic status calculation:
  - **Paid in Advance**: Partial payment made
  - **Paid in Full**: Complete payment received
- Real-time balance calculation
- Transaction ID generation
- Multiple payment methods supported
- Updates invoice status automatically

### 🔗 Lead Integration

All documents (quotations, invoices, receipts) are linked to Lead IDs:

- **Lead Selection**: Smart search with autocomplete
- **Auto-fill Data**: Customer information populated from lead
- **Lead Tracking**: Filter and search by Lead ID
- **Invoice Linking**: Select from available invoices for the lead
- **Quotation Linking**: Convert accepted quotations to invoices

## User Interface

### Tab Navigation
```
┌─────────────────────────────────────────────────────┐
│  Quotations (15)  │  Invoices (12)  │  Receipts (8) │
└─────────────────────────────────────────────────────┘
```

Each tab shows:
- Search bar for filtering
- Status filter dropdown
- "New" button for creating documents
- Table with relevant columns
- Action buttons (View, Edit, Delete, Download, Send, etc.)

### Form Structure

#### Quotation Form
1. **Lead Selection** (with search)
   - Auto-populates customer details
   - Shows Lead ID, email, phone

2. **Basic Information**
   - Package name
   - Valid until date

3. **Line Items**
   - Description, quantity, rate
   - Auto-calculated amounts

4. **Totals**
   - Subtotal
   - Tax percentage
   - Discount percentage
   - Total amount

5. **Additional**
   - Status selection
   - Notes
   - Terms & conditions

#### Invoice Form
1. **Lead Selection** (with search)
   - Auto-populates customer details
   - Shows Lead ID, email, phone

2. **Optional Quotation Link**
   - Select from accepted quotations
   - Auto-fills all invoice data

3. **Basic Information**
   - Package name
   - Due date

4. **Line Items** (same as quotation)

5. **Totals** (same as quotation)

6. **Payment Information**
   - Status selection
   - Paid amount (for partial/paid status)

#### Payment Receipt Form
1. **Lead Selection** (with search)
   - Auto-populates customer details

2. **Invoice Selection**
   - Shows only unpaid/partially paid invoices
   - Displays invoice total and balance

3. **Payment Details**
   - Payment amount
   - Payment method
   - Payment date
   - Transaction ID (auto-generate option)

4. **Automatic Calculations**
   - Previous payments display
   - Remaining balance
   - Status determination (advance/full)

## Workflow Examples

### Scenario 1: New Lead → Quotation → Invoice → Receipt

```
1. Lead created in Lead Management
   └─ Lead ID: LEAD-001, Name: John Doe

2. Create Quotation
   └─ Search "John Doe" → Select lead
   └─ Fill package details
   └─ Generate quotation: QUO-001
   └─ Status: Draft → Sent → Accepted

3. Convert to Invoice
   └─ Click "Convert to Invoice" on QUO-001
   └─ All data auto-filled
   └─ Generate invoice: INV-001
   └─ Status: Draft → Sent

4. Record Payment
   └─ Select Lead: John Doe
   └─ Select Invoice: INV-001
   └─ Enter payment amount: $500 (partial)
   └─ Status: Paid in Advance
   └─ Generate receipt: REC-001

5. Record Final Payment
   └─ Select Lead: John Doe
   └─ Select Invoice: INV-001
   └─ Enter payment amount: $1,500
   └─ Status: Paid in Full
   └─ Invoice status: Paid
   └─ Generate receipt: REC-002
```

### Scenario 2: Direct Invoice (No Quotation)

```
1. Create Invoice Directly
   └─ Click "New Invoice"
   └─ Search and select lead
   └─ Fill package and line items
   └─ Generate invoice: INV-002
   └─ Status: Draft → Sent

2. Record Payment
   └─ Create receipt for INV-002
   └─ Status determined automatically
```

## Data Structure

### Quotation
```javascript
{
  id: "QUO-001",
  leadId: "LEAD-001",
  leadName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  packageName: "Paris Romance Getaway",
  amount: 2000,
  tax: 10,  // percentage
  discount: 5,  // percentage
  total: 2100,
  status: "accepted",
  validUntil: "2025-11-30",
  issuedDate: "2025-10-30",
  items: [
    { description: "Flight Tickets", quantity: 2, rate: 500, amount: 1000 },
    { description: "Hotel (5 nights)", quantity: 1, rate: 1000, amount: 1000 }
  ],
  notes: "Special request noted",
  termsConditions: "Payment due within 30 days"
}
```

### Invoice
```javascript
{
  id: "INV-001",
  leadId: "LEAD-001",
  quotationId: "QUO-001",  // optional
  customerName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  packageName: "Paris Romance Getaway",
  amount: 2000,
  tax: 10,
  discount: 5,
  total: 2100,
  status: "partial",
  dueDate: "2025-11-15",
  issuedDate: "2025-10-30",
  paymentDate: null,
  paidAmount: 500,
  items: [...],
  notes: ""
}
```

### Payment Receipt
```javascript
{
  id: "REC-001",
  leadId: "LEAD-001",
  invoiceId: "INV-001",
  customerName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  amount: 500,
  paymentMethod: "Credit Card",
  paymentDate: "2025-10-30",
  status: "paid-in-advance",
  transactionId: "TXN-1730246400-1234",
  invoiceTotal: 2100,
  previousPayments: 0,
  remainingBalance: 1600,
  notes: "First installment",
  issuedDate: "2025-10-30"
}
```

## Status Definitions

### Quotation Status
- **Draft**: Being prepared, not sent to customer
- **Sent**: Sent to customer, awaiting response
- **Accepted**: Customer accepted the quotation
- **Rejected**: Customer declined the quotation
- **Expired**: Validity period has passed

### Invoice Status
- **Draft**: Being prepared, not sent to customer
- **Sent**: Sent to customer, awaiting payment
- **Paid**: Payment received in full
- **Partial**: Partial payment received
- **Overdue**: Past due date, unpaid
- **Cancelled**: Invoice cancelled

### Receipt Status
- **Paid in Advance**: Partial payment (balance remaining)
- **Paid in Full**: Complete payment (no balance)

## Features Highlights

### 🔍 Smart Search
- Search across Lead ID, customer name, document ID
- Real-time filtering as you type
- Dropdown suggestions for lead selection

### 📊 Automatic Calculations
- Line item amounts (quantity × rate)
- Subtotals
- Tax calculations
- Discount applications
- Total amounts
- Remaining balances

### 🔄 Data Linking
- Quotation → Invoice conversion
- Invoice → Receipt linking
- Lead → All documents tracking

### ✅ Status Management
- Automatic status updates
- Color-coded status badges
- Status-based filtering

### 📄 Document Actions
- View details
- Edit (status-dependent)
- Delete with confirmation
- Download PDF
- Send via email
- Duplicate (quotations)

## Technical Implementation

### File Structure
```
Management/src/
├── pages/
│   └── EnhancedBillingInvoicing.jsx  # Main page
├── features/
│   └── billing/
│       ├── components/
│       │   ├── TabNavigation.jsx
│       │   ├── QuotationsTable.jsx
│       │   ├── PaymentReceiptsTable.jsx
│       │   ├── form/
│       │   │   ├── QuotationForm.jsx
│       │   │   ├── EnhancedInvoiceForm.jsx
│       │   │   └── PaymentReceiptForm.jsx
│       │   └── index.js
│       ├── types/
│       │   └── index.js  # TypeScript definitions
│       └── utils/
│           └── constants.js
```

### Component Usage

```javascript
// In App.jsx or Routes
import EnhancedBillingInvoicing from './pages/EnhancedBillingInvoicing';

<Route path="/billing" component={EnhancedBillingInvoicing} />
```

## Best Practices

1. **Always Link to Leads**: Every document should be linked to a Lead ID
2. **Use Quotations**: Create quotations first, then convert to invoices
3. **Record All Payments**: Create receipts for every payment received
4. **Check Status**: Use status filters to quickly find documents
5. **Transaction IDs**: Use auto-generate for consistent tracking
6. **Notes**: Add relevant notes for reference

## Future Enhancements

- [ ] Backend API integration
- [ ] PDF generation with branding
- [ ] Email sending with templates
- [ ] Payment gateway integration
- [ ] Recurring invoices
- [ ] Multi-currency support
- [ ] Analytics dashboard
- [ ] Export to Excel/CSV
- [ ] Notification system
- [ ] Document templates

## Support

For issues or questions, please refer to:
- Technical Documentation: `/docs/billing/`
- API Documentation: `/docs/api/billing.md`
- Architecture Guide: `ARCHITECTURE.md`

---

**Last Updated**: October 30, 2025
**Version**: 2.0.0
