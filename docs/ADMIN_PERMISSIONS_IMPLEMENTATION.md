# Admin Permissions Implementation Guide

## Overview

This document describes the complete implementation of granular permission management for admin users in the Trip Sky Way application.

## 📋 Table of Contents

1. [Database Schema](#database-schema)
2. [Backend Implementation](#backend-implementation)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Permission Types](#permission-types)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)

---

## 🗄️ Database Schema

### User Model - Permissions Field

The `User` model has been updated to include a `permissions` array field:

```javascript
permissions: {
  type: [String],
  default: [],
  validate: {
    validator(permissionsArray) {
      const validPermissions = [
        'manage_users',
        'manage_sales_reps',
        'manage_vendors',
        'manage_admins',
        'view_reports',
        'manage_billing',
        'system_settings',
        'audit_log',
      ];
      return permissionsArray.every((perm) => validPermissions.includes(perm));
    },
    message: 'Invalid permission specified',
  },
}
```

**Features:**
- ✅ Array of permission strings
- ✅ Validation against allowed permissions
- ✅ Default empty array
- ✅ Only applies to admin users

---

## 🔧 Backend Implementation

### 1. Controllers (`admin.controller.js`)

#### `createStaff`
- **Updated** to support creating admin users with permissions
- Accepts `permissions` array in request body
- Only applies permissions if role is `admin`

```javascript
const user = await User.create({
  name,
  email,
  phone,
  password: tempPassword,
  role,
  permissions: role === 'admin' && permissions ? permissions : [],
  // ... other fields
});
```

#### `updateAdminPermissions` (NEW)
- Updates permissions for an admin user
- **Route:** `PATCH /api/v1/admin/users/:id/permissions`
- **Validations:**
  - User must exist
  - User must be an admin
  - Cannot modify own permissions
  - All permissions must be valid

#### `getAdminPermissions` (NEW)
- Retrieves permissions for a specific admin
- **Route:** `GET /api/v1/admin/users/:id/permissions`

#### `getAvailablePermissions` (NEW)
- Returns list of all available permissions with descriptions
- **Route:** `GET /api/v1/admin/permissions/available`

---

### 2. Validators (`auth.validator.js`)

#### `createStaffSchema`
- **Updated** to include `permissions` field
- Role now accepts `'admin'` in addition to `'salesRep'` and `'vendor'`

#### `updatePermissionsSchema` (NEW)
- Validates permission updates
- Ensures permissions array contains only valid permission strings

```javascript
export const updatePermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(
      Joi.string().valid(
        'manage_users',
        'manage_sales_reps',
        'manage_vendors',
        'manage_admins',
        'view_reports',
        'manage_billing',
        'system_settings',
        'audit_log',
      ),
    )
    .required()
});
```

---

### 3. Routes (`admin.routes.js`)

New routes added:

```javascript
// Get available permissions
router.get('/permissions/available', getAvailablePermissions);

// Admin permissions management
router.route('/users/:id/permissions')
  .get(getAdminPermissions)
  .patch(validate(updatePermissionsSchema), updateAdminPermissions);
```

---

### 4. RBAC Middleware (`rbac.js`)

#### Enhanced `hasPermission` Function

Now supports granular permission checking for admin users:

```javascript
const hasPermission = (role, resource, action, userPermissions = []) => {
  // ... existing code ...
  
  // For admins, check granular permissions if available
  if (role === 'admin' && userPermissions && userPermissions.length > 0) {
    const permissionMap = {
      'user:manage': 'manage_users',
      'salesRep:manage': 'manage_sales_reps',
      'vendor:manage': 'manage_vendors',
      'admin:manage': 'manage_admins',
      'reports:view': 'view_reports',
      'billing:manage': 'manage_billing',
      'settings:manage': 'system_settings',
      'audit:view': 'audit_log',
    };
    
    const requiredPermission = permissionMap[`${resource}:${action}`];
    if (requiredPermission) {
      return userPermissions.includes(requiredPermission);
    }
  }
  
  // ... rest of code ...
};
```

---

## 🌐 API Endpoints

### Permission Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/admin/permissions/available` | Get all available permissions | Admin |
| GET | `/api/v1/admin/users/:id/permissions` | Get admin's permissions | Admin |
| PATCH | `/api/v1/admin/users/:id/permissions` | Update admin's permissions | Admin |

### User Management (Updated)

| Method | Endpoint | Description | Changes |
|--------|----------|-------------|---------|
| POST | `/api/v1/admin/users` | Create staff/admin | Now accepts `permissions` for admins |

---

## 🎯 Permission Types

### Available Permissions

| Permission ID | Label | Category | Description |
|--------------|-------|----------|-------------|
| `manage_users` | Manage Website Users | Users | Create, edit, and manage customer accounts |
| `manage_sales_reps` | Manage Sales Reps | Staff | Manage sales representatives and their assignments |
| `manage_vendors` | Manage Vendors | Partners | Manage vendor partnerships and services |
| `manage_admins` | Manage Admins | System | Create and manage administrator accounts |
| `view_reports` | View Reports | Analytics | Access business reports and analytics |
| `manage_billing` | Manage Billing | Finance | Handle billing and payment operations |
| `system_settings` | System Settings | System | Configure system-wide settings |
| `audit_log` | View Audit Logs | System | View system audit logs and activity |

---

## 💻 Frontend Integration

### Admin Service (`admin.service.js`)

Three new methods added:

```javascript
/**
 * Get available permissions list
 */
async getAvailablePermissions() {
  const response = await this.api.get('/admin/permissions/available');
  return response;
}

/**
 * Get admin user permissions
 */
async getAdminPermissions(adminId) {
  const response = await this.api.get(`/admin/users/${adminId}/permissions`);
  return response;
}

/**
 * Update admin user permissions
 */
async updateAdminPermissions(adminId, permissions) {
  const response = await this.api.patch(
    `/admin/users/${adminId}/permissions`, 
    { permissions }
  );
  return response;
}
```

---

## 📝 Usage Examples

### Creating an Admin with Permissions

```javascript
const adminData = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '1234567890',
  role: 'admin',
  permissions: ['manage_users', 'view_reports', 'manage_sales_reps']
};

const response = await adminService.createAdmin(adminData);
```

### Updating Admin Permissions

```javascript
const adminId = '507f1f77bcf86cd799439011';
const newPermissions = ['manage_users', 'manage_vendors', 'view_reports'];

const response = await adminService.updateAdminPermissions(adminId, newPermissions);
```

### Getting Admin Permissions

```javascript
const adminId = '507f1f77bcf86cd799439011';
const response = await adminService.getAdminPermissions(adminId);

console.log(response.data.user.permissions);
// ['manage_users', 'view_reports']
```

### Getting Available Permissions

```javascript
const response = await adminService.getAvailablePermissions();

console.log(response.data.permissions);
// [
//   { id: 'manage_users', label: 'Manage Website Users', category: 'Users', ... },
//   { id: 'manage_sales_reps', label: 'Manage Sales Reps', category: 'Staff', ... },
//   ...
// ]
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Create Admin with Permissions**
   ```bash
   POST http://localhost:5000/api/v1/admin/users
   Content-Type: application/json
   Authorization: Bearer <admin-token>

   {
     "name": "Test Admin",
     "email": "testadmin@example.com",
     "phone": "1234567890",
     "role": "admin",
     "permissions": ["manage_users", "view_reports"]
   }
   ```

2. **Get Admin Permissions**
   ```bash
   GET http://localhost:5000/api/v1/admin/users/:id/permissions
   Authorization: Bearer <admin-token>
   ```

3. **Update Permissions**
   ```bash
   PATCH http://localhost:5000/api/v1/admin/users/:id/permissions
   Content-Type: application/json
   Authorization: Bearer <admin-token>

   {
     "permissions": ["manage_users", "manage_vendors", "view_reports"]
   }
   ```

4. **Get Available Permissions**
   ```bash
   GET http://localhost:5000/api/v1/admin/permissions/available
   Authorization: Bearer <admin-token>
   ```

### Test Cases

- ✅ Create admin without permissions (should use empty array)
- ✅ Create admin with valid permissions
- ✅ Create admin with invalid permission (should fail validation)
- ✅ Update admin permissions with valid data
- ✅ Try to update own permissions (should fail)
- ✅ Try to assign permissions to non-admin user (should fail)
- ✅ Get permissions for admin user
- ✅ Get available permissions list

---

## 🔒 Security Considerations

1. **Self-Modification Prevention**
   - Admins cannot modify their own permissions
   - Prevents privilege escalation

2. **Role Validation**
   - Permissions can only be assigned to admin users
   - Non-admin roles are rejected

3. **Permission Validation**
   - All permissions are validated against whitelist
   - Invalid permissions are rejected

4. **Authorization**
   - All permission endpoints require admin role
   - Protected by authentication middleware

---

## 🚀 Next Steps

To complete the implementation:

1. **Update Frontend AdminManagement Component**
   - Add permission checkbox group
   - Integrate with backend API
   - Show permission summary in admin table

2. **Add Permission Enforcement**
   - Check permissions in frontend routes
   - Conditionally show/hide UI elements based on permissions

3. **Add Audit Logging**
   - Log permission changes
   - Track who modified what permissions

4. **Add Tests**
   - Unit tests for permission validation
   - Integration tests for permission endpoints

---

## 📞 Support

For questions or issues, please refer to the main project documentation or contact the development team.

**Last Updated:** November 4, 2025
**Version:** 1.0.0
