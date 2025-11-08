# Vendor Management System - Backend Documentation

## Overview
A comprehensive vendor management backend system for Trip Sky Way, managing third-party service providers including hotels, transport companies, activity providers, restaurants, tour guides, and other travel-related vendors.

---

## Table of Contents
1. [Architecture](#architecture)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Business Logic](#business-logic)
5. [Security & Authorization](#security--authorization)
6. [Email Notifications](#email-notifications)
7. [Testing Guide](#testing-guide)
8. [Integration Guide](#integration-guide)

---

## Architecture

### Tech Stack
- **Framework**: Express.js with ES6 modules
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Validation**: Joi schema validation
- **Email**: Nodemailer with custom templates
- **Logging**: Winston logger

### Key Components

```
Server/src/
├── controllers/
│   └── vendor.controller.js       # Business logic for vendor operations
├── routes/
│   └── vendor.routes.js           # RESTful API endpoints
├── validators/
│   └── vendor.validator.js        # Joi validation schemas
├── models/
│   └── user.model.js              # User model (includes vendor fields)
└── utils/
    └── emailService.js            # Email notifications for vendors
```

---

## API Endpoints

### Base URL: `/api/v1/vendors`

All endpoints require authentication and admin role.

#### 1. Get All Vendors
```http
GET /api/v1/vendors
```

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10, max: 100) - Items per page
- `sort` (string) - Sort field (prefix with `-` for descending, e.g., `-createdAt`)
- `search` (string) - Search in name, email, phone, business name, registration number
- `isActive` (boolean) - Filter by active status
- `isEmailVerified` (boolean) - Filter by email verification
- `serviceType` (string) - Filter by service type (hotel, transport, activity, restaurant, guide, other)
- `minRating` (number, 0-5) - Minimum rating filter
- `fields` (string) - Comma-separated fields to return

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "vendors": [
      {
        "id": "647abc123...",
        "name": "John Doe",
        "email": "john@luxuryhotels.com",
        "phone": "1234567890",
        "businessName": "Luxury Hotels Co.",
        "serviceType": "hotel",
        "businessRegistrationNumber": "BR123456",
        "vendorStatus": "verified",
        "rating": 4.5,
        "totalBookings": 150,
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalVendors": 48,
      "vendorsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

#### 2. Get Vendor By ID
```http
GET /api/v1/vendors/:id
```

**URL Parameters:**
- `id` (string, required) - MongoDB ObjectId of vendor

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "647abc123...",
    "name": "John Doe",
    "email": "john@luxuryhotels.com",
    "phone": "1234567890",
    "businessName": "Luxury Hotels Co.",
    "serviceType": "hotel",
    "businessRegistrationNumber": "BR123456",
    "taxIdentificationNumber": "TAX123456",
    "address": {
      "street": "123 Main St",
      "city": "Colombo",
      "state": "Western",
      "zipCode": "10100",
      "country": "Sri Lanka"
    },
    "contactPerson": {
      "name": "Jane Smith",
      "phone": "0987654321",
      "email": "jane@luxuryhotels.com",
      "designation": "Manager"
    },
    "bankDetails": {
      "accountName": "Luxury Hotels Co.",
      "accountNumber": "1234567890",
      "bankName": "Commercial Bank",
      "branchName": "Main Branch",
      "ifscCode": "COMB0001234"
    },
    "rating": 4.5,
    "totalBookings": 150,
    "vendorStatus": "verified",
    "isActive": true,
    "isEmailVerified": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-11-05T14:30:00Z"
  }
}
```

---

#### 3. Create Vendor
```http
POST /api/v1/vendors
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@luxuryhotels.com",
  "phone": "1234567890",
  "businessName": "Luxury Hotels Co.",
  "serviceType": "hotel",
  "businessRegistrationNumber": "BR123456",
  "taxIdentificationNumber": "TAX123456",
  "address": {
    "street": "123 Main St",
    "city": "Colombo",
    "state": "Western",
    "zipCode": "10100",
    "country": "Sri Lanka"
  },
  "contactPerson": {
    "name": "Jane Smith",
    "phone": "0987654321",
    "email": "jane@luxuryhotels.com",
    "designation": "Manager"
  },
  "bankDetails": {
    "accountName": "Luxury Hotels Co.",
    "accountNumber": "1234567890",
    "bankName": "Commercial Bank",
    "branchName": "Main Branch",
    "ifscCode": "COMB0001234"
  }
}
```

**Success Response (201):**
```json
{
  "status": "success",
  "message": "Vendor created successfully. Invitation email sent.",
  "data": {
    "vendor": {
      "id": "647abc123...",
      "name": "John Doe",
      "email": "john@luxuryhotels.com",
      "phone": "1234567890",
      "businessName": "Luxury Hotels Co.",
      "serviceType": "hotel",
      "businessRegistrationNumber": "BR123456",
      "role": "vendor",
      "isActive": true,
      "isEmailVerified": true,
      "isTempPassword": true,
      "mustChangePassword": true,
      "vendorStatus": "pending_verification",
      "createdAt": "2024-11-07T10:00:00Z"
    }
  }
}
```

---

#### 4. Update Vendor
```http
PUT /api/v1/vendors/:id
```

**Request Body:** (All fields optional)
```json
{
  "name": "John Doe Updated",
  "email": "newemail@luxuryhotels.com",
  "phone": "1234567890",
  "businessName": "Luxury Hotels International",
  "serviceType": "hotel",
  "businessRegistrationNumber": "BR123456NEW",
  "taxIdentificationNumber": "TAX123456NEW",
  "address": {
    "street": "456 New St",
    "city": "Galle",
    "state": "Southern",
    "zipCode": "80000",
    "country": "Sri Lanka"
  },
  "contactPerson": {
    "name": "Jane Smith Updated",
    "phone": "0987654321",
    "email": "jane.new@luxuryhotels.com",
    "designation": "Senior Manager"
  },
  "bankDetails": {
    "accountName": "Luxury Hotels International",
    "accountNumber": "9876543210",
    "bankName": "Bank of Ceylon",
    "branchName": "Galle Branch",
    "ifscCode": "BOC0009876"
  }
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vendor updated successfully",
  "data": {
    "vendor": {
      "id": "647abc123...",
      "name": "John Doe Updated",
      "email": "newemail@luxuryhotels.com",
      "phone": "1234567890",
      "businessName": "Luxury Hotels International",
      "serviceType": "hotel",
      "businessRegistrationNumber": "BR123456NEW",
      "address": {...},
      "contactPerson": {...},
      "isActive": true,
      "vendorStatus": "verified",
      "rating": 4.5,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-11-07T15:30:00Z"
    }
  }
}
```

---

#### 5. Update Vendor Status
```http
PATCH /api/v1/vendors/:id/status
```

**Request Body:**
```json
{
  "vendorStatus": "verified"
}
```

**Valid Status Values:**
- `pending_verification` - Initial status after creation
- `verified` - Vendor approved and can operate
- `suspended` - Temporarily blocked
- `rejected` - Application rejected

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vendor status updated to verified",
  "data": {
    "vendorStatus": "verified"
  }
}
```

**Note:** Sends automated email notification to vendor

---

#### 6. Update Vendor Rating
```http
PATCH /api/v1/vendors/:id/rating
```

**Request Body:**
```json
{
  "rating": 4.5
}
```

**Validation:** Rating must be between 0 and 5

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vendor rating updated successfully",
  "data": {
    "rating": 4.5
  }
}
```

---

#### 7. Toggle Vendor Active Status
```http
PATCH /api/v1/vendors/:id/toggle-status
```

**Request Body:**
```json
{
  "isActive": false
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vendor deactivated successfully",
  "data": {
    "isActive": false
  }
}
```

---

#### 8. Reset Vendor Password
```http
POST /api/v1/vendors/:id/reset-password
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset email sent to vendor",
  "data": {
    "email": "john@luxuryhotels.com",
    "message": "Temporary password has been sent to their email"
  }
}
```

**Note:** Generates new temporary password and sends via email

---

#### 9. Get Vendor Statistics
```http
GET /api/v1/vendors/stats
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "total": 48,
    "active": 42,
    "inactive": 6,
    "verified": 38,
    "pendingVerification": 7,
    "suspended": 3,
    "byServiceType": [
      { "_id": "hotel", "count": 15 },
      { "_id": "transport", "count": 12 },
      { "_id": "activity", "count": 10 },
      { "_id": "restaurant", "count": 6 },
      { "_id": "guide", "count": 3 },
      { "_id": "other", "count": 2 }
    ]
  }
}
```

---

#### 10. Get Vendors by Service Type
```http
GET /api/v1/vendors/by-service/:serviceType
```

**URL Parameters:**
- `serviceType` (string) - One of: hotel, transport, activity, restaurant, guide, other

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "serviceType": "hotel",
    "count": 15,
    "vendors": [
      {
        "id": "647abc123...",
        "name": "John Doe",
        "businessName": "Luxury Hotels Co.",
        "rating": 4.5,
        "isActive": true
      }
    ]
  }
}
```

---

#### 11. Get Vendor Performance
```http
GET /api/v1/vendors/:id/performance
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Performance metrics feature coming soon",
  "data": {
    "vendorId": "647abc123...",
    "email": "john@luxuryhotels.com",
    "businessName": "Luxury Hotels Co.",
    "serviceType": "hotel",
    "rating": 4.5,
    "totalBookings": 150
  }
}
```

**Note:** Will be enhanced with booking integration

---

#### 12. Delete Vendor (Permanent)
```http
DELETE /api/v1/vendors/:id
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Vendor deleted permanently",
  "data": null
}
```

**Warning:** This operation is irreversible. Consider using toggle status instead.

---

## Data Models

### Vendor Fields in User Model

```javascript
{
  // Standard User Fields
  name: String,
  email: String (unique, required),
  phone: String (10 digits),
  password: String (hashed),
  role: 'vendor',
  
  // Vendor-Specific Fields
  businessName: String,
  serviceType: String (enum: hotel, transport, activity, restaurant, guide, other),
  businessRegistrationNumber: String (unique, sparse),
  taxIdentificationNumber: String,
  
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  
  contactPerson: {
    name: String,
    phone: String,
    email: String,
    designation: String
  },
  
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branchName: String,
    ifscCode: String,
    swiftCode: String
  },
  
  rating: Number (0-5, default: 0),
  totalBookings: Number (default: 0),
  vendorStatus: String (enum: pending_verification, verified, suspended, rejected),
  
  // System Fields
  isActive: Boolean,
  isEmailVerified: Boolean,
  isTempPassword: Boolean,
  mustChangePassword: Boolean,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Business Logic

### Vendor Lifecycle

1. **Creation** → `pending_verification`
   - Admin creates vendor account
   - Temporary password generated
   - Welcome email sent with credentials
   - Account awaits verification

2. **Verification** → `verified`
   - Admin reviews vendor documents
   - Updates status to verified
   - Notification email sent
   - Vendor can start operations

3. **Operations**
   - Vendor receives booking requests
   - Rating updated based on service
   - Total bookings tracked
   - Performance metrics calculated

4. **Suspension** → `suspended`
   - Temporary block for policy violations
   - Vendor notified via email
   - Can be reactivated by admin

5. **Rejection** → `rejected`
   - Application rejected
   - Vendor notified
   - Cannot operate on platform

---

## Security & Authorization

### Authentication
- JWT token-based authentication
- Tokens stored in httpOnly cookies
- Token expiration: configurable via JWT_EXPIRES_IN

### Authorization (RBAC)
- **Admin Only**: All vendor management operations
- **Vendors**: Can access own profile (future enhancement)
- Permission checked via `protect` and `authorize('admin')` middleware

### Data Protection
- Passwords hashed using bcrypt (12 rounds)
- Sensitive fields excluded from API responses
- Business registration numbers unique and indexed
- Email addresses unique and validated

### Input Validation
- Joi schema validation on all endpoints
- MongoDB ObjectId format validation
- Email format validation
- Phone number format validation (10 digits)
- Service type enum validation
- Rating range validation (0-5)

---

## Email Notifications

### 1. Welcome Email (Staff Credentials)
**Trigger:** Vendor creation
**Template:** `sendStaffCredentials(vendor, tempPassword, 'vendor')`
**Contains:**
- Business name and service type
- Temporary credentials
- Login URL
- Password change requirement notice
- Verification status notice

### 2. Status Update Email
**Trigger:** Vendor status change
**Template:** `sendVendorStatusUpdate(vendor, status)`

**Status Messages:**
- **Verified**: Congratulations message with dashboard access
- **Suspended**: Suspension notice with contact information
- **Rejected**: Rejection notice with appeal information

### 3. Password Reset Email
**Trigger:** Admin-initiated password reset
**Template:** `sendPasswordReset(vendor, tempPassword)`
**Contains:**
- New temporary password
- Security notice
- Login instructions

---

## Testing Guide

### Manual Testing with Postman

#### 1. Setup
```
Base URL: http://localhost:5000/api/v1
Auth: Bearer Token (Admin JWT)
```

#### 2. Test Scenarios

**Create Vendor:**
```
POST /vendors
Body: {
  "name": "Test Vendor",
  "email": "test@vendor.com",
  "phone": "1234567890",
  "businessName": "Test Business",
  "serviceType": "hotel"
}
```

**Search Vendors:**
```
GET /vendors?search=luxury&serviceType=hotel&minRating=4
```

**Update Status:**
```
PATCH /vendors/{id}/status
Body: { "vendorStatus": "verified" }
```

**Filter & Paginate:**
```
GET /vendors?page=2&limit=20&sort=-rating&isActive=true
```

---

## Integration Guide

### Frontend Integration

#### 1. API Service Setup
```javascript
// services/vendorService.js
import api from './api';

export const vendorService = {
  getAllVendors: (params) => api.get('/vendors', { params }),
  getVendorById: (id) => api.get(`/vendors/${id}`),
  createVendor: (data) => api.post('/vendors', data),
  updateVendor: (id, data) => api.put(`/vendors/${id}`, data),
  updateVendorStatus: (id, status) => api.patch(`/vendors/${id}/status`, { vendorStatus: status }),
  updateVendorRating: (id, rating) => api.patch(`/vendors/${id}/rating`, { rating }),
  toggleVendorStatus: (id, isActive) => api.patch(`/vendors/${id}/toggle-status`, { isActive }),
  resetPassword: (id) => api.post(`/vendors/${id}/reset-password`),
  getStats: () => api.get('/vendors/stats'),
  getByServiceType: (type) => api.get(`/vendors/by-service/${type}`),
  deleteVendor: (id) => api.delete(`/vendors/${id}`)
};
```

#### 2. React Component Example
```javascript
import { useState, useEffect } from 'react';
import { vendorService } from '../services/vendorService';

function VendorManagement() {
  const [vendors, setVendors] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    serviceType: '',
    isActive: true
  });

  useEffect(() => {
    loadVendors();
  }, [filters]);

  const loadVendors = async () => {
    try {
      const response = await vendorService.getAllVendors(filters);
      setVendors(response.data.vendors);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const handleStatusUpdate = async (vendorId, newStatus) => {
    try {
      await vendorService.updateVendorStatus(vendorId, newStatus);
      loadVendors(); // Refresh list
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    // Your JSX here
  );
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "status": "error",
  "message": "Vendor not found",
  "statusCode": 404
}
```

### Common Error Codes
- **400**: Validation error, invalid input
- **401**: Unauthorized, invalid/missing token
- **403**: Forbidden, insufficient permissions
- **404**: Resource not found
- **409**: Conflict, duplicate email/registration number
- **500**: Internal server error

---

## Performance Optimizations

1. **Database Indexes**
   - `email` (unique)
   - `role`
   - `businessRegistrationNumber` (unique, sparse)
   - `serviceType`
   - `vendorStatus`
   - `isActive`

2. **Query Optimization**
   - Lean queries for list endpoints
   - Field selection to reduce payload
   - Pagination to limit data transfer
   - Aggregation pipelines for statistics

3. **Caching Strategy** (Future Enhancement)
   - Redis for vendor statistics
   - Cache vendor lists by service type
   - Cache invalidation on updates

---

## Future Enhancements

1. **Performance Metrics**
   - Integration with booking system
   - Revenue tracking per vendor
   - Response time monitoring
   - Cancellation rate tracking
   - Customer satisfaction scores

2. **Document Management**
   - Upload and store vendor documents
   - Business license verification
   - Insurance certificate management
   - Contract document storage

3. **Rating & Reviews**
   - Customer review system
   - Automated rating calculation
   - Review moderation
   - Response to reviews

4. **Commission Management**
   - Commission rate configuration
   - Automated commission calculation
   - Payment tracking
   - Commission reports

5. **Notification System**
   - Real-time booking notifications
   - SMS notifications
   - In-app notifications
   - Email preferences

---

## Troubleshooting

### Common Issues

**Issue: Email not sending**
- Check EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD in .env
- Verify SMTP credentials
- Check email service logs

**Issue: Duplicate email error**
- Email must be unique across all users
- Use search before creating

**Issue: Invalid vendor ID format**
- Ensure ID is valid MongoDB ObjectId (24 hex characters)
- Use proper ID from database

**Issue: Permission denied**
- Verify admin authentication token
- Check token expiration
- Ensure user has admin role

---

## Maintenance

### Database Maintenance
```bash
# Create indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ businessRegistrationNumber: 1 }, { unique: true, sparse: true })

# Clean up test data
db.users.deleteMany({ role: 'vendor', email: { $regex: /test/i } })
```

### Monitoring
- Track vendor creation rate
- Monitor email delivery success rate
- Track API response times
- Monitor database query performance

---

## Support

For issues or questions:
- Check server logs: `Server/logs/`
- Review error messages in API responses
- Consult API documentation
- Contact development team

---

**Last Updated:** November 7, 2024
**Version:** 1.0.0
**Status:** Production Ready
