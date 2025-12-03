# API Response Examples & Mock Data

## Quick Reference for Testing

### 1. Get All Admins

**Request:**
```bash
GET /api/v1/users?role=admin&limit=10&page=1&sort=-createdAt
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "results": 2,
  "total": 2,
  "role": "admin",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Lisa Anderson",
      "email": "lisa@travelagency.com",
      "phone": "+1-555-9012",
      "role": "admin",
      "isActive": true,
      "isEmailVerified": true,
      "isTempPassword": false,
      "twoFactorEnabled": true,
      "createdAt": "2024-03-05T10:30:00.000Z",
      "updatedAt": "2024-10-20T15:45:00.000Z",
      "lastLogin": "2024-10-20T14:30:00.000Z",
      "passwordChangedAt": "2024-03-06T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "James Wilson",
      "email": "james@travelagency.com",
      "phone": "+1-555-4321",
      "role": "admin",
      "isActive": true,
      "isEmailVerified": false,
      "isTempPassword": true,
      "twoFactorEnabled": false,
      "createdAt": "2024-10-15T12:00:00.000Z",
      "updatedAt": "2024-10-15T12:00:00.000Z",
      "lastLogin": null,
      "passwordChangedAt": null
    }
  ]
}
```

### 2. Create Admin

**Request:**
```bash
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "John Doe",
  "email": "john@travelagency.com",
  "phone": "+1-555-0000",
  "password": "Temp@Pass123!",
  "role": "admin"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "message": "User created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": "John Doe",
    "email": "john@travelagency.com",
    "phone": "+1-555-0000",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": false,
    "isTempPassword": true,
    "twoFactorEnabled": false,
    "createdAt": "2024-11-03T10:30:00.000Z",
    "updatedAt": "2024-11-03T10:30:00.000Z",
    "lastLogin": null
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "status": "error",
  "message": "Validation failed",
  "error": {
    "message": "\"email\" must be a valid email"
  }
}
```

**Error Response (409 Conflict - Email Exists):**
```json
{
  "status": "error",
  "message": "Email already exists",
  "error": {
    "message": "An admin with email 'john@travelagency.com' already exists"
  }
}
```

### 3. Get Single Admin

**Request:**
```bash
GET /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Lisa Anderson",
    "email": "lisa@travelagency.com",
    "phone": "+1-555-9012",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": true,
    "isTempPassword": false,
    "twoFactorEnabled": true,
    "avatar": {
      "public_id": "tripskiway/users/507f1f77bcf86cd799439011",
      "url": "https://cloudinary.com/image.jpg"
    },
    "createdAt": "2024-03-05T10:30:00.000Z",
    "updatedAt": "2024-10-20T15:45:00.000Z",
    "lastLogin": "2024-10-20T14:30:00.000Z",
    "passwordChangedAt": "2024-03-06T10:00:00.000Z"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "status": "error",
  "message": "User not found",
  "error": {
    "message": "No user found with ID: 507f1f77bcf86cd799439099"
  }
}
```

### 4. Update Admin

**Request:**
```bash
PUT /api/v1/users/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Lisa Anderson Updated",
  "phone": "+1-555-9013",
  "email": "lisa.updated@travelagency.com",
  "role": "admin"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "User updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Lisa Anderson Updated",
    "email": "lisa.updated@travelagency.com",
    "phone": "+1-555-9013",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": true,
    "updatedAt": "2024-11-03T11:00:00.000Z"
  }
}
```

### 5. Delete Admin

**Request:**
```bash
DELETE /api/v1/users/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "User deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Lisa Anderson",
    "email": "lisa@travelagency.com",
    "deletedAt": "2024-11-03T11:05:00.000Z"
  }
}
```

### 6. Toggle Admin Status

**Request:**
```bash
PATCH /api/v1/users/507f1f77bcf86cd799439011/toggle-status
Content-Type: application/json
Authorization: Bearer <token>

{
  "isActive": false
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "User status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Lisa Anderson",
    "email": "lisa@travelagency.com",
    "isActive": false,
    "updatedAt": "2024-11-03T11:10:00.000Z"
  }
}
```

### 7. Assign User Role

**Request:**
```bash
PATCH /api/v1/users/507f1f77bcf86cd799439011/role
Content-Type: application/json
Authorization: Bearer <token>

{
  "role": "admin"
}
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "message": "User role updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "lisa@travelagency.com",
    "role": "admin"
  }
}
```

### 8. Get Users by Role

**Request:**
```bash
GET /api/v1/users/role/admin?limit=20&page=1
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "results": 2,
  "total": 2,
  "role": "admin",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Lisa Anderson",
      "email": "lisa@travelagency.com",
      "role": "admin",
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "James Wilson",
      "email": "james@travelagency.com",
      "role": "admin",
      "isActive": true
    }
  ]
}
```

### 9. Get User Statistics

**Request:**
```bash
GET /api/v1/users/stats
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "totalUsers": 150,
    "activeUsers": 145,
    "inactiveUsers": 5,
    "byRole": {
      "admin": 5,
      "salesRep": 25,
      "vendor": 15,
      "customer": 105
    },
    "emailVerified": 145,
    "emailUnverified": 5,
    "twoFactorEnabled": 30,
    "twoFactorDisabled": 120
  }
}
```

### 10. Get Current User Profile

**Request:**
```bash
GET /api/v1/users/profile/me
Authorization: Bearer <token>
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439001",
    "name": "Admin User",
    "email": "admin@travelagency.com",
    "phone": "+1-555-0001",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": true,
    "twoFactorEnabled": true,
    "avatar": {
      "public_id": "tripskiway/users/507f1f77bcf86cd799439001",
      "url": "https://cloudinary.com/image.jpg"
    },
    "createdAt": "2024-01-01T10:00:00.000Z",
    "lastLogin": "2024-11-03T10:00:00.000Z"
  }
}
```

## Error Response Format

### Standard Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "error": {
    "message": "Detailed error message"
  }
}
```

### Common HTTP Status Codes
| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input data, validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | User not found |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Database error, server crash |

## Frontend Data Transformation

### From Backend to Frontend
```javascript
// Backend format
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "Lisa Anderson",
  "isActive": true,
  "isEmailVerified": true,
  "lastLogin": "2024-10-20T14:30:00.000Z"
}

// Transforms to frontend format
{
  id: "507f1f77bcf86cd799439011",
  name: "Lisa Anderson",
  status: "active",
  accountStatus: "verified",
  lastActive: "2024-10-20T14:30:00.000Z"
}
```

## Testing with cURL

### Get All Admins
```bash
curl -X GET "http://localhost:5000/api/v1/users?role=admin" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Create Admin
```bash
curl -X POST "http://localhost:5000/api/v1/users" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "test@example.com",
    "phone": "+1-555-1234",
    "password": "Temp@Pass123!",
    "role": "admin"
  }'
```

### Update Admin
```bash
curl -X PUT "http://localhost:5000/api/v1/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "phone": "+1-555-5678"
  }'
```

### Delete Admin
```bash
curl -X DELETE "http://localhost:5000/api/v1/users/507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing with Postman

1. **Set Environment Variables:**
   - `{{base_url}}` = `http://localhost:5000/api/v1`
   - `{{token}}` = Your JWT token

2. **Collection Endpoints:**
   - Create folder: "Admin Management"
   - Add requests for each endpoint
   - Use `{{base_url}}` and `{{token}}` variables

3. **Pre-request Script:**
```javascript
// Automatically add auth header
pm.request.headers.add({
    key: "Authorization",
    value: "Bearer " + pm.environment.get("token")
});
```

4. **Tests Script:**
```javascript
// Validate response
pm.test("Status is 200 or 201", function() {
    pm.expect([200, 201]).to.include(pm.response.code);
});

pm.test("Response has success status", function() {
    pm.expect(pm.response.json().status).to.equal("success");
});
```

## Mock Data for Testing

### Sample Admin Data
```javascript
const mockAdmins = [
  {
    _id: "507f1f77bcf86cd799439011",
    name: "Lisa Anderson",
    email: "lisa@travelagency.com",
    phone: "+1-555-9012",
    role: "admin",
    isActive: true,
    isEmailVerified: true,
    isTempPassword: false,
    twoFactorEnabled: true,
    createdAt: "2024-03-05T10:30:00.000Z",
    lastLogin: "2024-10-20T14:30:00.000Z"
  },
  {
    _id: "507f1f77bcf86cd799439012",
    name: "James Wilson",
    email: "james@travelagency.com",
    phone: "+1-555-4321",
    role: "admin",
    isActive: true,
    isEmailVerified: false,
    isTempPassword: true,
    twoFactorEnabled: false,
    createdAt: "2024-10-15T12:00:00.000Z",
    lastLogin: null
  }
];
```

## Response Time Benchmarks

| Endpoint | Expected Time | Max Acceptable |
|----------|---|---|
| GET /users | 100-200ms | 500ms |
| POST /users | 200-300ms | 800ms |
| PUT /users/:id | 150-250ms | 700ms |
| DELETE /users/:id | 150-250ms | 700ms |
| GET /users/stats | 200-300ms | 1000ms |

---

**Last Updated:** November 3, 2025
**API Version:** v1
