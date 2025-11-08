# Vendor Management - Quick Reference Guide

## 🚀 Quick Start

### Base Information
- **Base URL**: `http://localhost:5000/api/v1/vendors`
- **Authentication**: Required (Admin role only)
- **Auth Header**: `Authorization: Bearer {JWT_TOKEN}`

---

## 📋 Quick API Reference

### Create Vendor
```bash
POST /api/v1/vendors
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@hotel.com",
  "phone": "1234567890",
  "businessName": "Luxury Hotels",
  "serviceType": "hotel",
  "businessRegistrationNumber": "BR123456"
}
```

### Get All Vendors
```bash
GET /api/v1/vendors?page=1&limit=10&search=luxury&serviceType=hotel
```

### Update Vendor Status
```bash
PATCH /api/v1/vendors/{id}/status
Content-Type: application/json

{
  "vendorStatus": "verified"
}
```

### Toggle Active Status
```bash
PATCH /api/v1/vendors/{id}/toggle-status
Content-Type: application/json

{
  "isActive": false
}
```

---

## 🎯 Service Types
- `hotel` - Hotels and accommodations
- `transport` - Transportation services
- `activity` - Tours and activities
- `restaurant` - Dining services
- `guide` - Tour guides
- `other` - Other services

---

## 📊 Vendor Status Flow

```
pending_verification → verified → active operations
                    ↓
                  rejected
                    ↓
                  suspended
```

### Status Values
- **pending_verification**: Awaiting admin approval
- **verified**: Approved and active
- **suspended**: Temporarily blocked
- **rejected**: Application denied

---

## 🔍 Search & Filter Queries

### By Service Type
```
GET /vendors?serviceType=hotel
```

### By Rating
```
GET /vendors?minRating=4.0
```

### Search by Text
```
GET /vendors?search=luxury
```

### Active Only
```
GET /vendors?isActive=true
```

### Combined Filters
```
GET /vendors?serviceType=hotel&minRating=4&isActive=true&page=1&limit=20
```

---

## 📧 Automated Emails

### When are emails sent?
1. **Vendor Creation** → Welcome email with temporary password
2. **Status Update** → Status change notification
3. **Password Reset** → New temporary password

---

## ✅ Validation Rules

### Required Fields
- name (2-50 chars)
- email (valid format, unique)
- phone (exactly 10 digits)
- businessName (2-100 chars)
- serviceType (enum)

### Optional Fields
- businessRegistrationNumber (unique if provided)
- taxIdentificationNumber
- address object
- contactPerson object
- bankDetails object

### Field Limits
- Rating: 0-5
- Search query: max 100 chars
- Pagination limit: max 100

---

## 🎨 Frontend Integration Snippets

### React Hook Example
```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useVendors = (filters) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get('/api/v1/vendors', {
          params: filters,
          headers: { Authorization: `Bearer ${token}` }
        });
        setVendors(data.data.vendors);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [filters]);

  return { vendors, loading };
};
```

### Status Update Function
```javascript
const updateVendorStatus = async (vendorId, newStatus) => {
  try {
    const response = await axios.patch(
      `/api/v1/vendors/${vendorId}/status`,
      { vendorStatus: newStatus },
      { headers: { Authorization: `Bearer ${token}` }}
    );
    toast.success('Status updated successfully');
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.message || 'Update failed');
    throw error;
  }
};
```

---

## 🛠️ Common Operations

### 1. Create and Verify Vendor
```javascript
// Step 1: Create vendor
const newVendor = await axios.post('/api/v1/vendors', vendorData);
const vendorId = newVendor.data.data.vendor.id;

// Step 2: Verify vendor
await axios.patch(`/api/v1/vendors/${vendorId}/status`, {
  vendorStatus: 'verified'
});
```

### 2. Search and Filter
```javascript
const searchVendors = async (searchTerm, serviceType) => {
  const params = {
    search: searchTerm,
    serviceType: serviceType,
    isActive: true,
    page: 1,
    limit: 20
  };
  const { data } = await axios.get('/api/v1/vendors', { params });
  return data.data.vendors;
};
```

### 3. Update Rating
```javascript
const updateRating = async (vendorId, rating) => {
  await axios.patch(`/api/v1/vendors/${vendorId}/rating`, { rating });
};
```

---

## 🐛 Common Errors & Solutions

### 400 Bad Request
**Cause**: Invalid input data
**Solution**: Check validation rules, ensure required fields are present

### 401 Unauthorized
**Cause**: Missing or invalid JWT token
**Solution**: Include valid Bearer token in Authorization header

### 403 Forbidden
**Cause**: User doesn't have admin role
**Solution**: Ensure authenticated user has admin privileges

### 404 Not Found
**Cause**: Vendor ID doesn't exist
**Solution**: Verify vendor ID is correct MongoDB ObjectId

### 409 Conflict
**Cause**: Duplicate email or business registration number
**Solution**: Use unique values or search before creating

---

## 📝 Testing Checklist

### Create Vendor
- [ ] Valid data creates vendor successfully
- [ ] Welcome email sent
- [ ] Temporary password generated
- [ ] Status set to pending_verification
- [ ] Duplicate email rejected
- [ ] Invalid phone format rejected

### Update Vendor
- [ ] Update name, email, phone
- [ ] Update business information
- [ ] Update address and contact person
- [ ] Update bank details
- [ ] Duplicate business registration rejected

### Status Management
- [ ] Change status to verified
- [ ] Change status to suspended
- [ ] Change status to rejected
- [ ] Status email sent
- [ ] Toggle active/inactive

### Search & Filter
- [ ] Search by name
- [ ] Search by business name
- [ ] Filter by service type
- [ ] Filter by rating
- [ ] Filter by active status
- [ ] Pagination works correctly

---

## 🔐 Security Checklist

- [ ] All endpoints require authentication
- [ ] Only admins can access vendor management
- [ ] Passwords are hashed
- [ ] Sensitive data excluded from responses
- [ ] Input validation on all endpoints
- [ ] MongoDB injection prevention
- [ ] XSS attack prevention
- [ ] Rate limiting enabled

---

## 📈 Performance Tips

1. **Use field selection** to reduce payload:
   ```
   GET /vendors?fields=name,email,businessName,rating
   ```

2. **Implement pagination** for large lists:
   ```
   GET /vendors?page=1&limit=20
   ```

3. **Cache statistics** on frontend:
   - Fetch stats less frequently
   - Store in state management

4. **Debounce search** queries:
   - Wait 500ms after user stops typing
   - Reduces API calls

---

## 🚨 Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Email service credentials verified
- [ ] Database indexes created
- [ ] Error logging enabled
- [ ] Rate limiting configured
- [ ] CORS settings updated
- [ ] SSL/TLS enabled
- [ ] Backup strategy in place
- [ ] Monitoring tools configured

---

## 📞 Quick Support

### Logs Location
```
Server/logs/combined.log
Server/logs/error.log
```

### Database Check
```javascript
// Check vendor count
db.users.countDocuments({ role: 'vendor' })

// List pending verification
db.users.find({ role: 'vendor', vendorStatus: 'pending_verification' })
```

### Test Email Service
```bash
# Check email config
node -e "import('./Server/src/utils/emailService.js').then(e => e.default.verifyConnection())"
```

---

## 📚 Related Documentation

- Full API Documentation: `VENDOR_MANAGEMENT_BACKEND_DOCUMENTATION.md`
- User Model Schema: `Server/src/models/user.model.js`
- RBAC Documentation: `docs/ADMIN_PERMISSIONS_IMPLEMENTATION.md`
- Email Setup Guide: `docs/EMAIL_SERVICE_SETUP.md`

---

**Quick Help**: For detailed explanations, refer to the full documentation.
**Version**: 1.0.0
**Last Updated**: November 7, 2024
