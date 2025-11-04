# Phase 2: API Testing & Examples Guide

## 🧪 Complete Testing Guide for All 6 Core Operations

---

## 📌 Prerequisites

```
Base URL: http://localhost:5000/api/v1
Admin Token: (Get from login endpoint)
Regular User Token: (Get from login endpoint)
Sample User ID: (From GET /users response)
```

---

## 1️⃣ GET All Users - Advanced Filtering

### Basic Usage
```bash
curl -X GET "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### With Pagination
```bash
curl -X GET "http://localhost:5000/api/v1/users?page=1&limit=10" \
  -H "Authorization: Bearer {token}"
```

### Filter by Role
```bash
curl -X GET "http://localhost:5000/api/v1/users?role=admin" \
  -H "Authorization: Bearer {token}"
```

### Filter by Status
```bash
curl -X GET "http://localhost:5000/api/v1/users?isActive=true" \
  -H "Authorization: Bearer {token}"
```

### Search
```bash
curl -X GET "http://localhost:5000/api/v1/users?search=john" \
  -H "Authorization: Bearer {token}"
```

### Sort by Field
```bash
curl -X GET "http://localhost:5000/api/v1/users?sort=-createdAt" \
  -H "Authorization: Bearer {token}"
```

### Select Specific Fields
```bash
curl -X GET "http://localhost:5000/api/v1/users?fields=name,email,role" \
  -H "Authorization: Bearer {token}"
```

### Complex Query (All Features)
```bash
curl -X GET "http://localhost:5000/api/v1/users?page=1&limit=10&role=vendor&isActive=true&sort=-name&search=tech&fields=name,email,role" \
  -H "Authorization: Bearer {token}"
```

### Response Example
```json
{
  "status": "success",
  "data": {
    "users": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "admin",
        "isActive": true,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalUsers": 50,
      "usersPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

## 2️⃣ GET Single User by ID

### Get Own Profile
```bash
curl -X GET "http://localhost:5000/api/v1/users/{yourUserId}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Admin Getting Another User
```bash
curl -X GET "http://localhost:5000/api/v1/users/{otherUserId}" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json"
```

### Response
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": true,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-02-01T15:45:00Z"
  }
}
```

### Error: User Not Found
```json
{
  "status": "fail",
  "message": "User not found"
}
```

### Error: Unauthorized
```json
{
  "status": "fail",
  "message": "You can only view your own profile"
}
```

---

## 3️⃣ CREATE User

### Basic Request
```bash
curl -X POST "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "9876543210",
    "password": "SecurePass123",
    "role": "salesRep"
  }'
```

### Create Admin User
```bash
curl -X POST "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Admin",
    "email": "admin2@example.com",
    "password": "AdminPass123",
    "role": "admin"
  }'
```

### Create Vendor
```bash
curl -X POST "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vendor Company",
    "email": "vendor@example.com",
    "phone": "5555555555",
    "password": "VendorPass123",
    "role": "vendor"
  }'
```

### Response
```json
{
  "status": "success",
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "9876543210",
      "role": "salesRep",
      "isActive": true,
      "isEmailVerified": true,
      "createdAt": "2025-02-01T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Error: Duplicate Email
```json
{
  "status": "fail",
  "message": "Email already in use"
}
```

### Error: Invalid Role
```json
{
  "status": "fail",
  "message": "Invalid role: superadmin"
}
```

### Error: Non-Admin Creating Admin
```json
{
  "status": "fail",
  "message": "Only admins can create admin users"
}
```

---

## 4️⃣ UPDATE User

### Update Own Profile (Regular User)
```bash
curl -X PUT "http://localhost:5000/api/v1/users/{yourUserId}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "phone": "1234567890"
  }'
```

### Admin Update Any User (All Fields)
```bash
curl -X PUT "http://localhost:5000/api/v1/users/{userId}" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "9999999999",
    "role": "vendor",
    "isActive": true
  }'
```

### Update Role Only
```bash
curl -X PUT "http://localhost:5000/api/v1/users/{userId}" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin"
  }'
```

### Response
```json
{
  "status": "success",
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Updated",
      "email": "john@example.com",
      "phone": "1234567890",
      "role": "admin",
      "isActive": true,
      "isEmailVerified": true,
      "updatedAt": "2025-02-01T15:45:00Z"
    }
  }
}
```

### Error: Non-Admin Cannot Update Role
```json
{
  "status": "fail",
  "message": "You can only update your name and phone"
}
```

### Error: Invalid Phone Format
```json
{
  "status": "fail",
  "message": "Invalid phone number format"
}
```

---

## 5️⃣ DELETE User (Permanent)

### Delete with Confirmation
```bash
curl -X DELETE "http://localhost:5000/api/v1/users/{userId}" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmDelete": true
  }'
```

### Delete Without Confirmation (Will Fail)
```bash
curl -X DELETE "http://localhost:5000/api/v1/users/{userId}" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "confirmDelete": false
  }'
```

### Response
```json
{
  "status": "success",
  "message": "User permanently deleted successfully",
  "data": {
    "deletedUserId": "507f1f77bcf86cd799439011",
    "deletedEmail": "jane@example.com",
    "deletedAt": "2025-02-01T15:50:00Z"
  }
}
```

### Error: Missing Confirmation
```json
{
  "status": "fail",
  "message": "Permanent deletion requires confirmation. Set confirmDelete to true."
}
```

### Error: Cannot Delete Last Admin
```json
{
  "status": "fail",
  "message": "Cannot delete the last admin user"
}
```

### ⚠️ WARNING
This operation is **IRREVERSIBLE**. All data will be permanently deleted from the database.

---

## 6️⃣ SOFT DELETE / ARCHIVE User

### Archive User (Deactivate)
```bash
curl -X PATCH "http://localhost:5000/api/v1/users/{userId}/toggle-status" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### Restore User (Reactivate)
```bash
curl -X PATCH "http://localhost:5000/api/v1/users/{userId}/toggle-status" \
  -H "Authorization: Bearer {adminToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": true
  }'
```

### Response - Archive
```json
{
  "status": "success",
  "message": "User deactivated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "isActive": false,
      "role": "vendor",
      "deactivatedAt": "2025-02-01T15:50:00Z",
      "updatedAt": "2025-02-01T15:50:00Z"
    },
    "action": "deactivated",
    "archiveInfo": {
      "isArchived": true,
      "archiveDate": "2025-02-01T15:50:00Z",
      "dataPreserved": true,
      "restorable": true
    }
  }
}
```

### Response - Restore
```json
{
  "status": "success",
  "message": "User activated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "jane@example.com",
      "name": "Jane Smith",
      "isActive": true,
      "role": "vendor",
      "deactivatedAt": null,
      "updatedAt": "2025-02-01T16:00:00Z"
    },
    "action": "activated",
    "archiveInfo": {
      "isArchived": false,
      "archiveDate": null,
      "dataPreserved": true,
      "restorable": true
    }
  }
}
```

### Error: Cannot Archive Last Admin
```json
{
  "status": "fail",
  "message": "Cannot deactivate the last admin user"
}
```

---

## 🧪 Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "User Management API - Phase 2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "GET All Users",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users?page=1&limit=10",
          "host": ["{{baseUrl}}"],
          "path": ["users"],
          "query": [
            {"key": "page", "value": "1"},
            {"key": "limit", "value": "10"}
          ]
        }
      }
    },
    {
      "name": "GET Single User",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/users/{{userId}}",
          "host": ["{{baseUrl}}"],
          "path": ["users", "{{userId}}"]
        }
      }
    },
    {
      "name": "CREATE User",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Jane Smith\",\n  \"email\": \"jane@example.com\",\n  \"phone\": \"9876543210\",\n  \"password\": \"SecurePass123\",\n  \"role\": \"salesRep\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users",
          "host": ["{{baseUrl}}"],
          "path": ["users"]
        }
      }
    },
    {
      "name": "UPDATE User",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Updated Name\",\n  \"phone\": \"1234567890\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users/{{userId}}",
          "host": ["{{baseUrl}}"],
          "path": ["users", "{{userId}}"]
        }
      }
    },
    {
      "name": "ARCHIVE User",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"isActive\": false\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users/{{userId}}/toggle-status",
          "host": ["{{baseUrl}}"],
          "path": ["users", "{{userId}}", "toggle-status"]
        }
      }
    },
    {
      "name": "DELETE User",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"confirmDelete\": true\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/users/{{userId}}",
          "host": ["{{baseUrl}}"],
          "path": ["users", "{{userId}}"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api/v1"
    },
    {
      "key": "token",
      "value": "your_token_here"
    },
    {
      "key": "userId",
      "value": "user_id_here"
    }
  ]
}
```

---

## 📊 Testing Checklist

### GET All Users
- [ ] Test with default pagination
- [ ] Test with custom page/limit
- [ ] Test filtering by role
- [ ] Test filtering by isActive
- [ ] Test search functionality
- [ ] Test sorting by different fields
- [ ] Test field selection
- [ ] Test combined filters
- [ ] Test pagination metadata
- [ ] Test error: invalid page number

### GET Single User
- [ ] Test retrieving own profile
- [ ] Test admin retrieving any user
- [ ] Test error: user not found
- [ ] Test error: unauthorized access
- [ ] Test error: invalid user ID format

### CREATE User
- [ ] Test creating customer user
- [ ] Test creating salesRep user
- [ ] Test creating vendor user
- [ ] Test creating admin user
- [ ] Test error: duplicate email
- [ ] Test error: invalid role
- [ ] Test error: non-admin creating admin
- [ ] Test password hashing
- [ ] Test email lowercase conversion
- [ ] Test JWT token generation

### UPDATE User
- [ ] Test non-admin update own profile
- [ ] Test non-admin cannot update others
- [ ] Test non-admin cannot update role
- [ ] Test non-admin cannot update isActive
- [ ] Test admin can update any field
- [ ] Test admin can change role
- [ ] Test admin can change isActive
- [ ] Test error: invalid phone format
- [ ] Test error: user not found
- [ ] Test validation

### ARCHIVE User
- [ ] Test archive (deactivate) user
- [ ] Test restore (activate) user
- [ ] Test error: cannot archive last admin
- [ ] Test archive preserves data
- [ ] Test archive metadata returned

### DELETE User
- [ ] Test delete with confirmation
- [ ] Test error: missing confirmation
- [ ] Test error: cannot delete last admin
- [ ] Test error: user not found
- [ ] Test error: invalid ID format
- [ ] Test data completely removed
- [ ] Test error logging

---

## 🎯 Test Scenarios

### Scenario 1: Complete User Lifecycle
```
1. CREATE a new user (vendor)
2. GET the user
3. UPDATE the user
4. LIST all users and verify
5. ARCHIVE the user
6. RESTORE the user
7. DELETE the user permanently
```

### Scenario 2: Filtering & Pagination
```
1. CREATE 20+ users with different roles
2. GET all active users
3. GET all admins
4. GET specific page with limit
5. SEARCH for users
6. SORT by different fields
```

### Scenario 3: Authorization Tests
```
1. Create customer user
2. Try to GET all users (should fail)
3. Try to CREATE user (should fail)
4. Try to UPDATE other user (should fail)
5. Try to UPDATE own profile (should succeed)
6. Create admin user
7. Verify admin can perform all operations
```

---

**Phase 2 Testing Guide Complete**

Created: November 2, 2025
