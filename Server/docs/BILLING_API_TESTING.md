# Billing Module - API Testing Guide

## Postman Collection Testing Steps

### Prerequisites
1. Server running on `http://localhost:5000`
2. Valid authentication token (login as admin/staff)
3. At least one lead created in the system

---

## Test Sequence

### 1. Authentication

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@tripskyway.dev",
  "password": "DevAdmin@2025"
}
```

**Save the token from response for subsequent requests**

---

### 2. Create a Test Lead (if needed)

```http
POST http://localhost:5000/api/v1/leads
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+94771234567",
  "source": "website",
  "destination": "Maldives",
  "numberOfTravelers": 2,
  "budget": "2000-3000 USD",
  "message": "Looking for honeymoon package"
}
```

**Save the lead ID from response**

---

### 3. Create Quotation

```http
POST http://localhost:5000/api/v1/billing/quotations
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "lead": "LEAD_ID_HERE",
  "customer": {
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "+94771234567",
    "address": "123 Main Street, Colombo, Sri Lanka"
  },
  "type": "package-based",
  "items": [
    {
      "description": "5 Star Beach Resort - 5 Nights",
      "category": "accommodation",
      "quantity": 2,
      "unitPrice": 600,
      "totalPrice": 1200,
      "notes": "Ocean view rooms with breakfast"
    },
    {
      "description": "Speedboat Transfers (Airport-Resort-Airport)",
      "category": "transportation",
      "quantity": 2,
      "unitPrice": 150,
      "totalPrice": 300
    },
    {
      "description": "Couple Spa Package",
      "category": "activity",
      "quantity": 1,
      "unitPrice": 200,
      "totalPrice": 200
    },
    {
      "description": "Candlelight Dinner on Beach",
      "category": "food",
      "quantity": 1,
      "unitPrice": 150,
      "totalPrice": 150
    }
  ],
  "taxRate": 12,
  "discountType": "percentage",
  "discountValue": 10,
  "serviceChargeRate": 5,
  "validUntil": "2025-12-31T23:59:59Z",
  "notes": "Special honeymoon package with complimentary room upgrade",
  "terms": "Payment required 7 days before travel date. Cancellation charges apply.",
  "paymentTerms": "50% advance required at booking. Balance 7 days before travel.",
  "includedServices": [
    "Daily breakfast",
    "Airport transfers",
    "Welcome drink",
    "Honeymoon decoration"
  ],
  "excludedServices": [
    "Lunch and dinner (except candlelight dinner)",
    "Personal expenses",
    "Travel insurance",
    "Visa fees"
  ]
}
```

**Expected Response:**
- Status: 201 Created
- Auto-calculated totals
- Quotation number generated
- Lead status updated to "quoted"

**Save the quotation ID**

---

### 4. Get Quotation Details

```http
GET http://localhost:5000/api/v1/billing/quotations/QUOTATION_ID
Authorization: Bearer YOUR_TOKEN
```

---

### 5. Send Quotation to Customer

```http
POST http://localhost:5000/api/v1/billing/quotations/QUOTATION_ID/send
Authorization: Bearer YOUR_TOKEN
```

**Expected:** Status changes to "sent", sentAt timestamp added

---

### 6. Accept Quotation (Simulate Customer)

```http
POST http://localhost:5000/api/v1/billing/quotations/QUOTATION_ID/accept
Authorization: Bearer YOUR_TOKEN
```

**Expected:** Status changes to "accepted"

---

### 7. Convert Quotation to Invoice

```http
POST http://localhost:5000/api/v1/billing/quotations/QUOTATION_ID/convert
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "type": "invoice",
  "dueDate": "2025-12-15T23:59:59Z",
  "paymentTerms": "Net 15 days",
  "paymentInstructions": "Please make payment to the bank account details provided below",
  "bankDetails": {
    "accountName": "Trip Sky Way (Pvt) Ltd",
    "accountNumber": "123456789",
    "bankName": "Commercial Bank of Ceylon",
    "ifscCode": "CCEYLKLX",
    "branch": "Colombo Main Branch"
  }
}
```

**Expected:**
- Invoice created with all items from quotation
- Quotation status changes to "converted"
- Lead status updates to "converted"

**Save the invoice ID**

---

### 8. Get Invoice Details

```http
GET http://localhost:5000/api/v1/billing/invoices/INVOICE_ID
Authorization: Bearer YOUR_TOKEN
```

---

### 9. Send Invoice to Customer

```http
POST http://localhost:5000/api/v1/billing/invoices/INVOICE_ID/send
Authorization: Bearer YOUR_TOKEN
```

---

### 10. Record Advance Payment (50%)

```http
POST http://localhost:5000/api/v1/billing/receipts
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "invoice": "INVOICE_ID_HERE",
  "amount": 950.40,
  "currency": "USD",
  "paymentMethod": "bank-transfer",
  "paymentType": "advance",
  "transactionId": "TXN20251026001",
  "paymentDate": "2025-10-26T10:30:00Z",
  "paymentDetails": {
    "bankName": "Sampath Bank",
    "accountNumber": "9876543210",
    "transactionReference": "REF123456789"
  },
  "notes": "50% advance payment for Maldives honeymoon package"
}
```

**Expected:**
- Payment receipt created
- Invoice paidAmount updated
- Receipt status: "paid-in-advance"
- Invoice status changes to "partial"

**Save the receipt ID**

---

### 11. Verify Payment

```http
PUT http://localhost:5000/api/v1/billing/receipts/RECEIPT_ID/verify
Authorization: Bearer YOUR_TOKEN
```

**Expected:** Receipt marked as verified

---

### 12. Record Final Payment (Remaining 50%)

```http
POST http://localhost:5000/api/v1/billing/receipts
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "invoice": "INVOICE_ID_HERE",
  "amount": 950.40,
  "currency": "USD",
  "paymentMethod": "online",
  "paymentType": "final-payment",
  "transactionId": "TXN20251215002",
  "paymentDate": "2025-12-15T14:20:00Z",
  "paymentDetails": {
    "paymentGateway": "stripe",
    "gatewayTransactionId": "ch_3AbcDefGhi123456",
    "cardType": "visa",
    "cardLastFour": "4242"
  },
  "notes": "Final payment - balance cleared"
}
```

**Expected:**
- Second payment receipt created
- Invoice paidAmount = totalAmount
- Receipt status: "paid-in-full"
- Invoice status changes to "paid"
- Invoice paidDate set

---

### 13. Get Lead Billing Summary

```http
GET http://localhost:5000/api/v1/billing/summary/lead/LEAD_ID
Authorization: Bearer YOUR_TOKEN
```

**Expected:** Complete billing history with:
- All quotations
- All invoices
- All payment receipts
- Summary totals

---

### 14. Get Dashboard Statistics

```http
GET http://localhost:5000/api/v1/billing/dashboard
Authorization: Bearer YOUR_TOKEN
```

**Expected:** Overview of:
- Total quotations and pending
- Total invoices, paid, overdue
- Financial totals
- Recent payments
- Pending approvals

---

## Testing Credit Notes

### 15. Create Credit Note (Partial Refund Scenario)

```http
POST http://localhost:5000/api/v1/billing/credit-notes
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "invoice": "INVOICE_ID_HERE",
  "type": "service-not-provided",
  "reason": "Spa package was not available due to maintenance. Customer requested refund for this service.",
  "items": [
    {
      "description": "Couple Spa Package - Not provided",
      "originalAmount": 200,
      "creditAmount": 200,
      "quantity": 1,
      "notes": "Spa facility closed for maintenance"
    }
  ],
  "approvalRequired": true,
  "notes": "Customer satisfaction - immediate refund approved"
}
```

**Save the credit note ID**

---

### 16. Approve Credit Note

```http
PUT http://localhost:5000/api/v1/billing/credit-notes/CREDIT_NOTE_ID/approve
Authorization: Bearer YOUR_TOKEN
```

---

### 17. Issue Credit Note

```http
PUT http://localhost:5000/api/v1/billing/credit-notes/CREDIT_NOTE_ID/issue
Authorization: Bearer YOUR_TOKEN
```

---

### 18. Apply Credit Note to Invoice

```http
PUT http://localhost:5000/api/v1/billing/credit-notes/CREDIT_NOTE_ID/apply
Authorization: Bearer YOUR_TOKEN
```

**Expected:**
- Credit note applied to invoice
- Invoice paidAmount increased by credit amount
- Invoice balance recalculated

---

## Testing Reports

### 19. Financial Report

```http
GET http://localhost:5000/api/v1/billing/reports/financial?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer YOUR_TOKEN
```

---

### 20. Aging Report

```http
GET http://localhost:5000/api/v1/billing/reports/aging
Authorization: Bearer YOUR_TOKEN
```

---

### 21. Payment Method Breakdown

```http
GET http://localhost:5000/api/v1/billing/reports/payment-methods?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer YOUR_TOKEN
```

---

### 22. Revenue Trends

```http
GET http://localhost:5000/api/v1/billing/reports/revenue-trends?period=monthly&year=2025
Authorization: Bearer YOUR_TOKEN
```

---

### 23. Top Customers

```http
GET http://localhost:5000/api/v1/billing/reports/top-customers?limit=10
Authorization: Bearer YOUR_TOKEN
```

---

## Advanced Scenarios

### Scenario A: Complete Cancellation with Full Refund

1. Create invoice
2. Record full payment
3. Create credit note for full amount (type: "cancellation")
4. Approve and issue credit note
5. Process refund through original payment method
6. Generate voucher as alternative

### Scenario B: Multiple Partial Payments

1. Create invoice for $5000
2. Record payment 1: $1000 (advance)
3. Record payment 2: $1500 (installment)
4. Record payment 3: $1500 (installment)
5. Record payment 4: $1000 (final payment)
6. Track each receipt status

### Scenario C: Overdue Invoice Management

1. Create invoice with past due date
2. System auto-marks as "overdue"
3. Send payment reminder
4. Get overdue invoices report
5. Record late payment

---

## Expected Results Summary

### Quotation Flow:
- ✅ Quotation created with auto-number
- ✅ Automatic calculations correct
- ✅ Status transitions properly
- ✅ Lead status updates
- ✅ Conversion creates invoice

### Invoice Flow:
- ✅ Invoice inherits quotation data
- ✅ Payment tracking accurate
- ✅ Outstanding balance correct
- ✅ Status changes automatically
- ✅ Overdue detection works

### Payment Flow:
- ✅ Receipt created and linked
- ✅ Invoice updated automatically
- ✅ Status determined correctly
- ✅ Balance calculations accurate
- ✅ Verification workflow functional

### Credit Note Flow:
- ✅ Approval workflow enforced
- ✅ Application updates invoice
- ✅ Refund processing tracked
- ✅ Voucher generation works

### Reports:
- ✅ Dashboard shows real-time data
- ✅ Financial reports accurate
- ✅ Aging buckets correct
- ✅ Trends displayed properly

---

## Validation Testing

### Test Invalid Inputs:

1. **Missing required fields** - Should return 400 error
2. **Invalid MongoDB IDs** - Should return validation error
3. **Past dates for validUntil** - Should reject
4. **Negative amounts** - Should reject
5. **Payment exceeding invoice total** - Should reject
6. **Updating paid invoices** - Should reject
7. **Applying unapproved credit notes** - Should reject

---

## Performance Testing

### Recommended Tests:

1. Create 100 quotations - Check response time
2. Query with pagination - Verify efficiency
3. Generate reports with large date ranges
4. Bulk operations performance

---

## Notes

- All amounts are auto-calculated based on items
- Status transitions follow business rules
- Audit trails are maintained automatically
- Role-based permissions are enforced
- Lead association is mandatory

---

**Happy Testing! 🚀**

For issues or questions, refer to:
- API Documentation: `docs/BILLING_MODULE_API.md`
- Implementation Guide: `docs/BILLING_IMPLEMENTATION_GUIDE.md`
