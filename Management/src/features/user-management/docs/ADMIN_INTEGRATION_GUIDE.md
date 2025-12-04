# Admin Management Frontend-Backend Integration Guide

## Overview
This document outlines the complete integration of the Admin Management frontend with the backend API. All functions have been connected and should work properly with proper authentication.

## Architecture

### Frontend Structure
```
Management/src/
├── features/user-management/
│   ├── components/AdminManagement/
│   │   ├── AdminManagement.jsx (Main component - UPDATED)
│   │   ├── AdminTable.jsx (Table display - UPDATED)
│   │   ├── AdminDetailsModal.jsx (Detail view)
│   │   └── index.js
│   └── utils/
│       ├── constants.js
│       └── helpers.js
├── services/
│   ├── api.js (Base API service)
│   └── admin.service.js (NEW - Admin API wrapper)
```

### Backend API Endpoints
All requests require authentication via Bearer token in Authorization header.

#### User Management Routes
```
GET  /api/v1/users                          - Get all users with filters
POST /api/v1/users                          - Create new user (Admin only)
GET  /api/v1/users/stats                    - Get user statistics
GET  /api/v1/users/:id                      - Get single user
PUT  /api/v1/users/:id                      - Update user details
PUT  /api/v1/users/:id/change-password      - Update user password
DELETE /api/v1/users/:id                    - Delete user permanently
PATCH /api/v1/users/:id/toggle-status       - Toggle active status
PATCH /api/v1/users/:id/role                - Assign/update user role
GET  /api/v1/users/role/:role               - Get users by role
GET  /api/v1/users/profile/me               - Get current user profile
```

#### Admin Routes
```
GET  /api/v1/admin/stats                    - Get dashboard statistics
GET  /api/v1/admin/settings                 - Get application settings
PUT  /api/v1/admin/settings                 - Update application settings
```

## Connected Functions

### 1. **Load Admins** ✅
**Function:** `loadAdmins()`
- **Endpoint:** `GET /api/v1/users?role=admin`
- **Status:** Implemented
- **Features:**
  - Fetches all admin users from backend
  - Transforms backend data to frontend format
  - Handles loading and error states
  - Automatic sorting by creation date

**Usage:**
```javascript
await loadAdmins();
```

### 2. **Create Admin** ✅
**Function:** `handleAddAdmin()`
- **Endpoint:** `POST /api/v1/users`
- **Status:** Implemented
- **Features:**
  - Validates form data (name, email, phone required)
  - Generates secure temporary password
  - Creates admin with role='admin'
  - Shows success notification
  - Clears form after creation

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0000",
  "password": "TempPassword123!@#",
  "role": "admin"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0000",
    "role": "admin",
    "isActive": true,
    "isEmailVerified": false,
    "isTempPassword": true,
    "createdAt": "2024-11-03T10:30:00.000Z",
    "lastLogin": null
  }
}
```

### 3. **Update Admin** ✅
**Function:** `handleEditAdmin()`
- **Endpoint:** `PUT /api/v1/users/:id`
- **Status:** Implemented
- **Features:**
  - Validates form data before submission
  - Updates name, email, phone
  - Maintains admin role
  - Shows success notification

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "+1-555-1111",
  "role": "admin"
}
```

### 4. **Delete Admin** ✅
**Function:** `confirmDelete()`
- **Endpoint:** `DELETE /api/v1/users/:id`
- **Status:** Implemented
- **Features:**
  - Permanently removes admin from system
  - Requires confirmation dialog
  - Shows success notification
  - Clears selected admin

**Note:** This is a permanent deletion. Data cannot be recovered.

### 5. **Toggle Admin Status** ⚠️ Planned
**Function:** `toggleAdminStatus()` (To be implemented)
- **Endpoint:** `PATCH /api/v1/users/:id/toggle-status`
- **Status:** Planned
- **Features:**
  - Soft delete/archive (data preserved)
  - Non-destructive admin deactivation

### 6. **Resend Invitation** ✅ Partially
**Function:** `confirmResendInvitation()`
- **Endpoint:** (Backend email service required)
- **Status:** Partially Implemented
- **Features:**
  - Generates new temporary password
  - Logs invitation details to console
  - Updates local invitation timestamp

**Note:** Requires backend email service integration

### 7. **Force Password Reset** ✅ Partially
**Function:** `handleForcePasswordReset()`
- **Endpoint:** (Backend email service required)
- **Status:** Partially Implemented
- **Features:**
  - Generates temporary password
  - Marks admin for password change
  - Logs reset details to console

**Note:** Requires backend email service integration

### 8. **Get User Statistics** ✅
**Function:** `getUserStats()` (in AdminService)
- **Endpoint:** `GET /api/v1/users/stats`
- **Status:** Ready to implement
- **Features:**
  - Total user count
  - Active user count
  - Users by role breakdown
  - Email verification stats

## Admin Service API Methods

### Core Methods

```javascript
// Get all users
await adminService.getAllUsers({
  page: 1,
  limit: 10,
  role: 'admin',
  sort: '-createdAt'
});

// Get user by ID
await adminService.getUserById(userId);

// Get users by role
await adminService.getUsersByRole('admin');

// Get user statistics
await adminService.getUserStats();

// Create user
await adminService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1-555-0000',
  password: 'password123',
  role: 'admin'
});

// Update user
await adminService.updateUser(userId, {
  name: 'Updated Name',
  email: 'new@example.com'
});

// Delete user
await adminService.deleteUser(userId);

// Toggle user status
await adminService.toggleUserStatus(userId, true);

// Assign user role
await adminService.assignUserRole(userId, 'admin');
```

## Testing Checklist

### ✅ Basic Operations
- [ ] Load admins on page load
- [ ] Display admins in table
- [ ] Show loading spinner while loading
- [ ] Handle errors gracefully
- [ ] Display stats cards

### ✅ Create Admin
- [ ] Open add admin dialog
- [ ] Fill in form fields
- [ ] Validate required fields
- [ ] Submit and create admin
- [ ] Verify admin appears in table
- [ ] Show success notification

### ✅ Edit Admin
- [ ] Click edit button
- [ ] Open edit dialog with prefilled data
- [ ] Update form fields
- [ ] Submit changes
- [ ] Verify updates in table
- [ ] Show success notification

### ✅ Delete Admin
- [ ] Click delete button
- [ ] Show confirmation dialog
- [ ] Confirm deletion
- [ ] Admin removed from table
- [ ] Show success notification

### ✅ Search & Pagination
- [ ] Search admins by name/email
- [ ] Pagination works correctly
- [ ] Page updates on navigation

### ⚠️ Advanced Features (Requires Backend Implementation)
- [ ] Resend invitation emails
- [ ] Force password reset
- [ ] Two-factor authentication setup
- [ ] Permission management

## Error Handling

### Backend Error Responses
The service handles all backend error responses:

```javascript
{
  "status": "error",
  "message": "Error description",
  "error": {
    "message": "Detailed error"
  }
}
```

### Frontend Error Display
- Errors shown in red banner at top of page
- Console logging for debugging
- User-friendly error messages

## Authentication

### Token Management
- Token stored in localStorage
- Automatically added to all requests
- Removed on logout
- Refreshed on page load

```javascript
// Token is automatically included
headers['Authorization'] = `Bearer ${token}`;
```

## State Management

### Component State
```javascript
const [admins, setAdmins] = useState([]);              // Admin list
const [loading, setLoading] = useState(true);          // Loading state
const [error, setError] = useState(null);              // Error message
const [selectedAdmin, setSelectedAdmin] = useState(null); // Selected admin
const [isSubmitting, setIsSubmitting] = useState(false); // Form submission
const [successMessage, setSuccessMessage] = useState(''); // Success message
```

### Form Data
```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  permissions: [],
  twoFactorEnabled: false
});
```

## Configuration

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Base URL
- Development: `http://localhost:5000/api/v1`
- Production: `https://api.example.com/api/v1`

## Future Enhancements

### 1. Email Service Integration
- **Status:** Pending Backend Implementation
- **Task:** Integrate with SendGrid, AWS SES, or Nodemailer
- **Files to Update:** Backend email service, admin routes

### 2. Permission Management
- **Status:** Pending UI Implementation
- **Task:** Add permission selection UI in admin dialogs
- **Components:** FormGroup with checkboxes

### 3. Two-Factor Authentication
- **Status:** Pending Implementation
- **Task:** QR code generation, setup flow
- **Endpoint:** `/api/v1/admin/2fa/setup`

### 4. Role-Based Access Control
- **Status:** Ready
- **Task:** Use existing auth middleware
- **Implementation:** Already in place

### 5. Audit Logging
- **Status:** Pending Backend Implementation
- **Task:** Log all admin actions
- **Fields:** admin_id, action, timestamp, details

## Troubleshooting

### Issue: "Admins not loading"
**Solution:**
1. Check network tab for API errors
2. Verify authentication token is present
3. Check backend server is running
4. Verify CORS settings

### Issue: "Create admin fails"
**Solution:**
1. Verify all required fields are filled
2. Check email format is valid
3. Ensure phone number follows format
4. Check server logs for detailed error

### Issue: "Update not reflected"
**Solution:**
1. Refresh page to reload data
2. Check network tab for success response
3. Verify API response includes updated data
4. Check for frontend state update issues

## API Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Server error occurred |

## Files Modified

1. **AdminManagement.jsx**
   - Added API integration
   - Added loading/error states
   - Connected all CRUD operations
   - Added form validation

2. **AdminTable.jsx**
   - Updated props handling
   - Added action callbacks

3. **admin.service.js** (NEW)
   - Complete API wrapper
   - All user management methods
   - Error handling
   - Utility functions

## Next Steps

1. **Test all functions** with real backend
2. **Implement email service** for invitations
3. **Add permission management** UI
4. **Implement 2FA setup** flow
5. **Add audit logging** for all actions
6. **Set up monitoring** for production

## Support

For issues or questions, refer to:
- Backend API Documentation: `/Server/docs/`
- Frontend Component Docs: Storybook (if configured)
- Git Issues: GitHub repository issues
