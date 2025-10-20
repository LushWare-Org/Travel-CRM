# Trip Sky Way - Server Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Customer Website (Port 5173)  │  Management Dashboard (5174)   │
│  - Browse Packages             │  - Lead Management             │
│  - Book Trips                  │  - Booking Management          │
│  - View Bookings               │  - Package Creation            │
│  - Make Payments               │  - Invoice Generation          │
└─────────────────┬───────────────┴────────────────┬──────────────┘
                  │                                │
                  │        HTTP/HTTPS/REST         │
                  │                                │
┌─────────────────┴────────────────────────────────┴──────────────┐
│                      API GATEWAY (Express)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Middleware Layer                                          │  │
│  │ • CORS • Rate Limiting • Helmet • Authentication • Logging│  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                        ROUTES LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│ /api/v1/auth        │ /api/v1/packages   │ /api/v1/bookings     │
│ /api/v1/users       │ /api/v1/leads      │ /api/v1/invoices     │
│ /api/v1/itineraries │ /api/v1/payments   │ /api/v1/dashboard    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                     CONTROLLER LAYER                             │
├──────────────────────────────────────────────────────────────────┤
│  Request Handling • Input Validation • Response Formatting       │
│  auth.controller  │  package.controller  │  booking.controller   │
│  lead.controller  │  invoice.controller  │  payment.controller   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                      SERVICE LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│  Business Logic • Data Processing • External API Integration     │
│  Email Service │ Payment Service │ PDF Generation │ SMS Service  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                     DATA ACCESS LAYER (Models)                   │
├──────────────────────────────────────────────────────────────────┤
│  User │ Package │ Booking │ Lead │ Invoice │ Itinerary          │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               │ Mongoose ODM
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│                         DATABASE LAYER                           │
│                         MongoDB                                  │
│  Collections: users, packages, bookings, leads, invoices, etc.  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
├──────────────────────────────────────────────────────────────────┤
│  Cloudinary  │  Stripe/Razorpay  │  Twilio  │  Email Service    │
│  (Images)    │  (Payments)       │  (SMS)   │  (Notifications)  │
└──────────────────────────────────────────────────────────────────┘
```

## Request Flow

```
User Request
    │
    ▼
┌───────────────┐
│  API Gateway  │──► CORS Check
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Rate Limiter  │──► Check request limits
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Authentication│──► Verify JWT token
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Route Match  │──► Match URL to handler
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Validation   │──► Validate request data
└───────┬───────┘
        │
        ▼
┌───────────────┐
│  Controller   │──► Process request
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Service     │──► Business logic
└───────┬───────┘
        │
        ▼
┌───────────────┐
│     Model     │──► Database operation
└───────┬───────┘
        │
        ▼
┌───────────────┐
│   Response    │──► Format & send response
└───────────────┘
```

## Database Schema Relationships

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       │ creates
       ▼
┌──────────────┐     references    ┌──────────────┐
│   Package    │◄──────────────────│  Itinerary   │
└──────┬───────┘                   └──────────────┘
       │
       │ booked in
       ▼
┌──────────────┐     generates     ┌──────────────┐
│   Booking    │──────────────────►│   Invoice    │
└──────┬───────┘                   └──────────────┘
       │
       │ assigned to
       ▼
┌──────────────┐
│     Lead     │
└──────────────┘

Relationships:
• User (1) ──► (N) Bookings
• User (1) ──► (N) Packages (as creator)
• User (1) ──► (N) Leads (as staff)
• Package (1) ──► (1) Itinerary
• Package (1) ──► (N) Bookings
• Booking (1) ──► (1) Invoice
• Lead (1) ──► (1) Booking (when converted)
```

## Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ POST /api/v1/auth/register
       ▼
┌─────────────┐
│  Register   │──► Hash password ──► Save to DB ──► Generate JWT
└──────┬──────┘
       │
       │ Return token & user data
       ▼
┌─────────────┐
│   Client    │ Store token in localStorage/cookies
└──────┬──────┘
       │
       │ Subsequent requests with Authorization header
       │ Authorization: Bearer <token>
       ▼
┌─────────────┐
│  Middleware │──► Verify token ──► Extract user ──► Attach to req.user
└──────┬──────┘
       │
       │ Proceed to protected route
       ▼
┌─────────────┐
│  Controller │
└─────────────┘
```

## Payment Flow

```
Customer ──► Select Package ──► Create Booking
    │
    ▼
Create Payment Intent (Stripe/Razorpay)
    │
    ▼
Client receives payment URL/token
    │
    ▼
Customer completes payment on gateway
    │
    ▼
Payment Gateway sends webhook
    │
    ▼
Server verifies payment signature
    │
    ▼
Update booking & invoice status
    │
    ▼
Send confirmation email/SMS
    │
    ▼
Generate invoice PDF
```

## File Upload Flow

```
User uploads file
    │
    ▼
Multer middleware validates file
    │
    ├─► Check file type
    ├─► Check file size
    └─► Save to temp directory
        │
        ▼
Upload to Cloudinary
    │
    ▼
Receive Cloudinary URL
    │
    ▼
Save URL to database
    │
    ▼
Delete temp file
    │
    ▼
Return URL to client
```

## Lead Management Flow

```
Website Form ──► Create Lead ──► Assign to Staff
    │
    ▼
Staff contacted lead
    │
    ├─► Interested ──► Send Quote ──► Follow up
    │       │
    │       ├─► Converted ──► Create Booking ──► Generate Invoice
    │       │
    │       └─► Lost ──► Mark reason ──► Archive
    │
    └─► Not Interested ──► Mark reason ──► Archive
```

## Notification System

```
Trigger Event (Booking, Payment, etc.)
    │
    ├─► Email Service
    │       │
    │       ├─► Generate HTML template
    │       ├─► Send via Nodemailer
    │       └─► Log result
    │
    └─► SMS Service (Optional)
            │
            ├─► Format message
            ├─► Send via Twilio
            └─► Log result
```

## Security Layers

```
┌────────────────────────────────────┐
│  1. Network Layer                  │
│     • HTTPS/TLS                    │
│     • CORS Configuration           │
└────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  2. Application Layer              │
│     • Rate Limiting                │
│     • Helmet (Security Headers)    │
│     • XSS Protection               │
│     • MongoDB Sanitization         │
└────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  3. Authentication Layer           │
│     • JWT Token Verification       │
│     • Password Hashing (Bcrypt)    │
│     • Role-based Access Control    │
└────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────┐
│  4. Data Layer                     │
│     • Input Validation             │
│     • SQL Injection Prevention     │
│     • Data Encryption              │
└────────────────────────────────────┘
```

---

**Technology Stack Summary:**
- **Server:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + Bcrypt
- **Storage:** Cloudinary
- **Payments:** Stripe + Razorpay
- **Notifications:** Nodemailer + Twilio
- **Security:** Helmet + Rate Limiter + XSS Clean
