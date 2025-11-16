# Billing Module - Quick API Reference

## Base URL
```
/api/v1/billing
```

---

## 📋 QUOTATIONS

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/quotations` | GET | List all quotations | ✅ |
| `/quotations/:id` | GET | Get quotation details | ✅ |
| `/quotations/lead/:leadId` | GET | Get quotations by lead | ✅ |
| `/quotations/stats` | GET | Get statistics | ✅ Admin/Manager |
| `/quotations` | POST | Create quotation | ✅ Admin/Staff |
| `/quotations/:id` | PUT | Update quotation | ✅ Admin/Staff |
| `/quotations/:id` | DELETE | Delete quotation | ✅ Admin |
| `/quotations/:id/send` | POST | Send to customer | ✅ Admin/Staff |
| `/quotations/:id/viewed` | POST | Mark as viewed | ❌ Public |
| `/quotations/:id/accept` | POST | Accept quotation | ✅ Customer |
| `/quotations/:id/reject` | POST | Reject quotation | ✅ Customer |
| `/quotations/:id/convert` | POST | Convert to invoice | ✅ Admin/Staff |

---

## 🧾 INVOICES

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/invoices` | GET | List all invoices | ✅ |
| `/invoices/:id` | GET | Get invoice details | ✅ |
| `/invoices/lead/:leadId` | GET | Get invoices by lead | ✅ |
| `/invoices/stats` | GET | Get statistics | ✅ Admin/Manager |
| `/invoices/overdue` | GET | Get overdue invoices | ✅ Admin/Manager |
| `/invoices` | POST | Create invoice | ✅ Admin/Staff |
| `/invoices/:id` | PUT | Update invoice | ✅ Admin/Staff |
| `/invoices/:id/cancel` | PUT | Cancel invoice | ✅ Admin |
| `/invoices/:id/send` | POST | Send to customer | ✅ Admin/Staff |
| `/invoices/:id/viewed` | POST | Mark as viewed | ❌ Public |
| `/invoices/:id/remind` | POST | Send payment reminder | ✅ Admin/Staff |
| `/invoices/:id/pdf` | GET | Download PDF | ✅ |

---

## 💰 PAYMENT RECEIPTS

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/receipts` | GET | List all receipts | ✅ |
| `/receipts/:id` | GET | Get receipt details | ✅ |
| `/receipts/lead/:leadId` | GET | Get receipts by lead | ✅ |
| `/receipts/invoice/:invoiceId` | GET | Get receipts by invoice | ✅ |
| `/receipts/stats` | GET | Get statistics | ✅ Admin/Manager |
| `/receipts` | POST | Record payment | ✅ Admin/Staff |
| `/receipts/:id` | PUT | Update receipt | ✅ Admin |
| `/receipts/:id/cancel` | PUT | Cancel receipt | ✅ Admin |
| `/receipts/:id/verify` | PUT | Verify payment | ✅ Admin/Manager |
| `/receipts/:id/reconcile` | PUT | Reconcile payment | ✅ Admin/Accountant |
| `/receipts/:id/send` | POST | Send to customer | ✅ Admin/Staff |
| `/receipts/:id/pdf` | GET | Download PDF | ✅ |

---

## 💳 CREDIT NOTES

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/credit-notes` | GET | List all credit notes | ✅ |
| `/credit-notes/:id` | GET | Get credit note details | ✅ |
| `/credit-notes/lead/:leadId` | GET | Get credit notes by lead | ✅ |
| `/credit-notes/invoice/:invoiceId` | GET | Get credit notes by invoice | ✅ |
| `/credit-notes/stats` | GET | Get statistics | ✅ Admin/Manager |
| `/credit-notes` | POST | Create credit note | ✅ Admin/Staff |
| `/credit-notes/:id` | PUT | Update credit note | ✅ Admin |
| `/credit-notes/:id/issue` | PUT | Issue credit note | ✅ Admin |
| `/credit-notes/:id/approve` | PUT | Approve credit note | ✅ Admin/Manager |
| `/credit-notes/:id/reject` | PUT | Reject credit note | ✅ Admin/Manager |
| `/credit-notes/:id/apply` | PUT | Apply to invoice | ✅ Admin/Staff |
| `/credit-notes/:id/refund` | PUT | Process refund | ✅ Admin |
| `/credit-notes/:id/voucher` | POST | Generate voucher | ✅ Admin/Staff |
| `/credit-notes/:id/cancel` | PUT | Cancel credit note | ✅ Admin |
| `/credit-notes/:id/send` | POST | Send to customer | ✅ Admin/Staff |

---

## 📊 REPORTS & ANALYTICS

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/dashboard` | GET | Dashboard statistics | ✅ Admin/Manager |
| `/summary/lead/:leadId` | GET | Lead billing summary | ✅ |
| `/reports/financial` | GET | Financial reports | ✅ Admin/Accountant |
| `/reports/aging` | GET | Aging report | ✅ Admin/Accountant |
| `/reports/payment-methods` | GET | Payment method breakdown | ✅ Admin/Accountant |
| `/reports/revenue-trends` | GET | Revenue trends | ✅ Admin/Accountant |
| `/reports/top-customers` | GET | Top customers | ✅ Admin/Accountant |
| `/export` | GET | Export billing data | ✅ Admin/Accountant |

---

## 📝 Common Request Bodies

### Create Quotation
```json
{
  "lead": "MongoDB_ObjectId",
  "customer": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "address": "string"
  },
  "items": [
    {
      "description": "string",
      "category": "accommodation|transportation|activity|food|guide|insurance|visa|other",
      "quantity": 1,
      "unitPrice": 0,
      "totalPrice": 0
    }
  ],
  "taxRate": 0,
  "discountType": "percentage|fixed|none",
  "discountValue": 0,
  "serviceChargeRate": 0,
  "validUntil": "ISO8601_date",
  "notes": "string",
  "terms": "string"
}
```

### Record Payment
```json
{
  "invoice": "MongoDB_ObjectId",
  "amount": 0,
  "currency": "LKR|USD|EUR|GBP|AUD|INR",
  "paymentMethod": "cash|card|bank-transfer|online|cheque|upi|wallet|other",
  "paymentType": "advance|installment|full-payment|final-payment",
  "transactionId": "string",
  "paymentDate": "ISO8601_date",
  "paymentDetails": {},
  "notes": "string"
}
```

### Create Credit Note
```json
{
  "invoice": "MongoDB_ObjectId",
  "type": "refund|cancellation|discount|error-correction|service-not-provided|quality-issue|other",
  "reason": "string",
  "items": [
    {
      "description": "string",
      "originalAmount": 0,
      "creditAmount": 0,
      "quantity": 1
    }
  ],
  "approvalRequired": true
}
```

---

## 🔑 Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "message": "string" // optional
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## 📌 Query Parameters

### Pagination & Filtering
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Sort field (prefix with `-` for descending)
- `status` - Filter by status
- `paymentStatus` - Filter by payment status
- `startDate` - Start date for reports
- `endDate` - End date for reports

### Examples
```
GET /api/v1/billing/quotations?page=2&limit=20&sort=-createdAt&status=sent
GET /api/v1/billing/invoices?paymentStatus=partial&sort=dueDate
GET /api/v1/billing/reports/financial?startDate=2025-01-01&endDate=2025-12-31
```

---

## 🎯 Status Values

### Quotation Status
- `draft` - Being prepared
- `sent` - Sent to customer
- `viewed` - Opened by customer
- `accepted` - Customer accepted
- `rejected` - Customer rejected
- `expired` - Past valid date
- `converted` - Converted to invoice

### Invoice Status
- `draft` - Being prepared
- `sent` - Sent to customer
- `viewed` - Opened by customer
- `partial` - Partially paid
- `paid` - Fully paid
- `overdue` - Past due date
- `cancelled` - Cancelled
- `refunded` - Refunded

### Payment Status
- `unpaid` - No payment received
- `partial` - Partially paid
- `paid` - Fully paid
- `overpaid` - Paid more than due
- `refunded` - Refunded

### Receipt Status
- `paid-in-advance` - Advance payment
- `paid-in-full` - Full payment
- `partial-payment` - Partial payment
- `refunded` - Refunded
- `cancelled` - Cancelled

### Credit Note Status
- `draft` - Being prepared
- `issued` - Issued to customer
- `applied` - Applied to invoice
- `refunded` - Refunded
- `cancelled` - Cancelled

---

## 🔐 Authentication

All requests (except public endpoints) require authentication:

```http
Authorization: Bearer <jwt_token>
```

Get token from login:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

---

## 🎨 Payment Methods Supported

- `cash` - Cash payment
- `card` - Credit/Debit card
- `bank-transfer` - Bank transfer
- `online` - Online payment gateway
- `cheque` - Cheque payment
- `upi` - UPI payment (India)
- `wallet` - Digital wallet
- `other` - Other methods

---

## 💼 Payment Gateways Supported

- `stripe` - Stripe
- `razorpay` - Razorpay
- `paypal` - PayPal
- `square` - Square
- `other` - Other gateways

---

## 📦 Item Categories

- `accommodation` - Hotels, resorts
- `transportation` - Flights, transfers
- `activity` - Tours, activities
- `food` - Meals, dining
- `guide` - Tour guides
- `insurance` - Travel insurance
- `visa` - Visa fees
- `other` - Other services

---

## 🌍 Currencies Supported

- `LKR` - Sri Lankan Rupee
- `USD` - US Dollar
- `EUR` - Euro
- `GBP` - British Pound
- `AUD` - Australian Dollar
- `INR` - Indian Rupee

---

## ⚡ Quick Start Examples

### Get Dashboard
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/v1/billing/dashboard
```

### Create Quotation
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lead":"ID","items":[...]}' \
  http://localhost:5000/api/v1/billing/quotations
```

### Record Payment
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoice":"ID","amount":100,"paymentMethod":"cash"}' \
  http://localhost:5000/api/v1/billing/receipts
```

---

## 📱 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

**Total Endpoints: 59**  
**Version: 1.0.0**  
**Last Updated: October 26, 2025**

For detailed documentation, see: `docs/BILLING_MODULE_API.md`
