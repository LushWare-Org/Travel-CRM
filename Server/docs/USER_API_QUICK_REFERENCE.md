# Phase 1: Developer Quick Reference

## 🎯 Quick Start Guide

### Imports You'll Need
```javascript
// In your routes or middleware
import { protect, authorize } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { 
  restrictToRoles, 
  canManageUsers, 
  adminOnly 
} from '../middleware/rbac.js';
```

---

## 📝 Route Examples

### 1. Get All Users (Admin Only)
```bash
GET /api/v1/users
Authorization: Bearer {token}

Query Parameters:
  ?page=1&limit=10&sort=-createdAt&role=admin&isActive=true
```

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "total": 5,
  "data": [
    {
      "_id": "...",
      "name": "John Admin",
      "email": "admin@example.com",
      "role": "admin",
      "isActive": true,
      ...
    }
  ]
}
```

### 2. Create User (Admin Only)
```bash
POST /api/v1/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "1234567890",
  "password": "SecurePass123",
  "role": "salesRep"
}
```

### 3. Get Users by Role
```bash
GET /api/v1/users/role/admin
Authorization: Bearer {token}
```

### 4. Update User
```bash
PUT /api/v1/users/{userId}
Authorization: Bearer {token}

{
  "name": "Updated Name",
  "phone": "9876543210"
}
```

### 5. Change User Password
```bash
PUT /api/v1/users/{userId}/change-password
Authorization: Bearer {token}

{
  "currentPassword": "oldPassword",
  "newPassword": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

### 6. Assign User Role (Admin Only)
```bash
PATCH /api/v1/users/{userId}/role
Authorization: Bearer {token}

{
  "role": "vendor"
}
```

### 7. Toggle User Status (Admin Only)
```bash
PATCH /api/v1/users/{userId}/toggle-status
Authorization: Bearer {token}

{
  "isActive": false
}
```

### 8. Get User Statistics (Admin Only)
```bash
GET /api/v1/users/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 42,
    "active": 38,
    "inactive": 4,
    "verified": 35,
    "byRole": [
      { "_id": "admin", "count": 2 },
      { "_id": "salesRep", "count": 5 },
      { "_id": "vendor", "count": 3 },
      { "_id": "customer", "count": 32 }
    ]
  }
}
```

---

## 🔐 RBAC Permission Levels

### Admin
- ✅ Create users
- ✅ Read all users
- ✅ Update any user
- ✅ Delete users
- ✅ Assign roles
- ✅ Toggle user status
- ✅ View statistics

### SalesRep
- ✅ Read own profile
- ✅ Update own profile
- ❌ Cannot manage other users

### Vendor
- ✅ Read own profile
- ✅ Update own profile
- ❌ Cannot manage other users

### Customer
- ✅ Read own profile
- ✅ Update own profile
- ❌ Cannot manage users

---

## 🛡️ Error Responses

### 400 - Bad Request
```json
{
  "status": "fail",
  "message": "Email already exists",
  "details": {
    "field": "email"
  }
}
```

### 401 - Unauthorized
```json
{
  "status": "fail",
  "message": "Not authorized to access this route"
}
```

### 403 - Forbidden
```json
{
  "status": "fail",
  "message": "User role 'customer' is not authorized to access this route"
}
```

### 404 - Not Found
```json
{
  "status": "fail",
  "message": "User not found"
}
```

### 500 - Server Error
```json
{
  "status": "error",
  "message": "Internal server error"
}
```

---

## 📋 Validation Rules

### Name
- Min: 2 characters
- Max: 50 characters
- Required

### Email
- Valid email format
- Must be unique
- Converted to lowercase
- Required

### Phone
- Format: 10 digits (e.g., 1234567890)
- Optional
- Validated if provided

### Password
- Min: 6 characters
- Max: 128 characters
- Required on creation
- Cannot be same as current password on change

### Role
- Valid values: `customer`, `salesRep`, `vendor`, `admin`
- Default: `customer`
- Only admins can assign

---

## 🔍 Usage Examples

### In Frontend (JavaScript/React)

```javascript
// Create user
const createUser = async (userData) => {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(userData)
  });
  return response.json();
};

// Get all users
const getAllUsers = async (page = 1, limit = 10) => {
  const response = await fetch(
    `/api/v1/users?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};

// Update user
const updateUser = async (userId, updates) => {
  const response = await fetch(`/api/v1/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updates)
  });
  return response.json();
};
```

---

## 🧪 Testing with Postman

### Setup
1. Create a collection named "User Management API"
2. Add variable: `{{baseUrl}}` = `http://localhost:5000/api/v1`
3. Add variable: `{{token}}` = Your JWT token

### Test Sequence
1. **Login** → Get token
2. **Create User** → POST /users
3. **Get All Users** → GET /users
4. **Get Single User** → GET /users/{id}
5. **Update User** → PUT /users/{id}
6. **Assign Role** → PATCH /users/{id}/role
7. **Toggle Status** → PATCH /users/{id}/toggle-status
8. **Delete User** → DELETE /users/{id}

---

## 📊 Database Schema Reminder

```javascript
User {
  _id: ObjectId
  name: String (required, 2-50 chars)
  email: String (required, unique, email format)
  phone: String (optional, 10-digit format)
  password: String (required, min 6 chars, hashed)
  role: String (enum: customer/salesRep/vendor/admin, default: customer)
  avatar: {
    public_id: String,
    url: String
  }
  isActive: Boolean (default: true)
  isEmailVerified: Boolean (default: false)
  isTempPassword: Boolean (default: false)
  mustChangePassword: Boolean (default: false)
  passwordChangedAt: Date
  createdBy: ObjectId (ref: User)
  lastLogin: Date
  timestamps: { createdAt, updatedAt }
}
```

---

## 🚀 Common Issues & Solutions

### Issue: Validation fails on email
**Solution:** Ensure email is valid format and lowercase

### Issue: Cannot assign admin role
**Solution:** Only admins can assign roles. Use admin token

### Issue: User not found
**Solution:** Check if userId is valid MongoDB ObjectId format

### Issue: Unauthorized error
**Solution:** Check JWT token is valid and not expired

### Issue: Cannot delete user
**Solution:** Ensure you have admin role. Deletion is soft delete (deactivation)

---

## 📚 Related Files

- **Routes:** `Server/src/routes/user.routes.js`
- **Controller:** `Server/src/controllers/user.controller.js`
- **Validators:** `Server/src/validators/user.validator.js`
- **RBAC:** `Server/src/middleware/rbac.js`
- **Error Handler:** `Server/src/middleware/userErrorHandler.js`
- **Model:** `Server/src/models/user.model.js`

---

**Last Updated:** November 2, 2025
