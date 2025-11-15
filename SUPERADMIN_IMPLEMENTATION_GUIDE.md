# Super Admin Implementation Guide

## Overview
This document provides a comprehensive guide for implementing and using the Super Admin system in Trip Sky Way. The Super Admin role provides complete system control with all permissions and protections against accidental deletion.

## System Architecture

### Database Schema Changes

#### User Model Updates
Added two new fields to the User schema:

```javascript
isSuperAdmin: {
  type: Boolean,
  default: false,
  validate: {
    validator(value) {
      return !value || this.role === 'superAdmin';
    },
    message: 'Only users with superAdmin role can have isSuperAdmin flag set to true',
  },
},

role: {
  // Updated enum to include 'superAdmin'
  enum: ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin']
},

canBeDeleted: {
  type: Boolean,
  default: true,
}
```

---

## Setup Instructions

### Step 1: Migrate Existing Admins to Database

To promote an existing admin to Super Admin, you can either:

#### Option A: Using MongoDB Compass or Database Client
```javascript
// Update a specific admin by email
db.users.updateOne(
  { email: "admin@tripskiway.com" },
  {
    $set: {
      role: "superAdmin",
      isSuperAdmin: true,
      canBeDeleted: false,
      permissions: [
        "manage_users",
        "manage_sales_reps",
        "manage_vendors",
        "manage_admins",
        "view_reports",
        "manage_billing",
        "system_settings",
        "audit_log"
      ]
    }
  }
)
```

#### Option B: Using MongoDB Command Line
```bash
# Connect to your MongoDB database
mongo

# Use your database
use tripskiway

# Promote specific admin
db.users.updateOne(
  { email: "youradmin@company.com" },
  {
    $set: {
      role: "superAdmin",
      isSuperAdmin: true,
      canBeDeleted: false,
      permissions: [
        "manage_users",
        "manage_sales_reps",
        "manage_vendors",
        "manage_admins",
        "view_reports",
        "manage_billing",
        "system_settings",
        "audit_log"
      ]
    }
  }
)
```

### Step 2: Verify Super Admin Creation
After promoting an admin to Super Admin, verify it was successful:

```bash
# In MongoDB
db.users.findOne({ email: "youradmin@company.com" })

# Should show:
{
  _id: ObjectId(...),
  name: "Admin Name",
  email: "youradmin@company.com",
  role: "superAdmin",
  isSuperAdmin: true,
  canBeDeleted: false,
  permissions: [
    "manage_users",
    "manage_sales_reps",
    "manage_vendors",
    "manage_admins",
    "view_reports",
    "manage_billing",
    "system_settings",
    "audit_log"
  ],
  ...
}
```

### Step 3: Restart Backend Services
After making database changes, restart your Node.js server:

```bash
# Stop the server
# Ctrl+C or command to stop

# Restart the server
npm run dev
# or
npm start
```

---

## API Endpoints

### Super Admin Management Endpoints

#### 1. Get Super Admin Information
```
GET /api/v1/admin/super/info
Authorization: Bearer {token}
Access: Super Admin only
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "currentUser": {
      "id": "user_id",
      "name": "Admin Name",
      "email": "admin@company.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "permissions": [/* all permissions */]
    },
    "allSuperAdmins": [
      {
        "id": "user_id",
        "name": "Super Admin 1",
        "email": "admin1@company.com",
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00Z",
        "lastLogin": "2024-11-15T15:30:00Z"
      }
    ]
  }
}
```

#### 2. List All Super Admins
```
GET /api/v1/admin/super/list
Authorization: Bearer {token}
Access: Super Admin only
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "count": 2,
    "superAdmins": [
      {
        "id": "user_id",
        "name": "Super Admin 1",
        "email": "admin1@company.com",
        "phone": "+1234567890",
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00Z",
        "lastLogin": "2024-11-15T15:30:00Z"
      }
    ]
  }
}
```

#### 3. Promote Admin to Super Admin
```
POST /api/v1/admin/super/promote
Authorization: Bearer {token}
Access: Super Admin only

Request Body:
{
  "userId": "admin_user_id",
  // OR
  "email": "admin@company.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "John Doe has been promoted to Super Admin with all permissions",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "permissions": [/* all permissions */]
    }
  }
}
```

#### 4. Demote Super Admin
```
POST /api/v1/admin/super/demote
Authorization: Bearer {token}
Access: Super Admin only

Request Body:
{
  "userId": "superadmin_user_id",
  "newRole": "admin" // or "salesRep", "vendor", "customer"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "John Doe has been demoted to admin",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "admin",
      "isSuperAdmin": false,
      "permissions": []
    }
  }
}
```

---

## Features & Protections

### Super Admin Features
✅ **Full System Access**: All permissions automatically assigned
✅ **Role Management**: Can promote admins to Super Admin and demote Super Admins
✅ **User Management**: Can manage all users across the system
✅ **Permission Management**: Can modify permissions for other admins
✅ **System Settings**: Full access to system configuration

### Super Admin Protections
🛡️ **Cannot Be Deleted**: Super Admin accounts have `canBeDeleted = false`
🛡️ **Cannot Self-Delete**: System prevents deletion of own account
🛡️ **Cannot Be Deactivated**: Protected from deactivation by other admins
🛡️ **Cannot Demote Self**: Super Admins cannot demote themselves
🛡️ **Protected Modification**: Only Super Admins can modify Super Admin details

---

## Permission Structure

### Available Permissions
```javascript
[
  {
    id: 'manage_users',
    label: 'Manage Website Users',
    category: 'Users',
    description: 'Create, edit, and manage customer accounts'
  },
  {
    id: 'manage_sales_reps',
    label: 'Manage Sales Reps',
    category: 'Staff',
    description: 'Manage sales representatives and their assignments'
  },
  {
    id: 'manage_vendors',
    label: 'Manage Vendors',
    category: 'Partners',
    description: 'Manage vendor partnerships and services'
  },
  {
    id: 'manage_admins',
    label: 'Manage Admins',
    category: 'System',
    description: 'Create and manage administrator accounts'
  },
  {
    id: 'view_reports',
    label: 'View Reports',
    category: 'Analytics',
    description: 'Access business reports and analytics'
  },
  {
    id: 'manage_billing',
    label: 'Manage Billing',
    category: 'Finance',
    description: 'Handle billing and payment operations'
  },
  {
    id: 'system_settings',
    label: 'System Settings',
    category: 'System',
    description: 'Configure system-wide settings'
  },
  {
    id: 'audit_log',
    label: 'View Audit Logs',
    category: 'System',
    description: 'View system audit logs and activity'
  }
]
```

### Super Admin Permissions
Super Admins automatically receive **ALL** permissions and cannot be modified.

---

## Frontend Integration

### Admin Details Modal
The `AdminDetailsModal` component now displays:
- Super Admin badge with crown icon 👑
- "Super Admin accounts have full system access and cannot be deleted" message
- Visual distinction from regular admins

### Admin Management Table
Enhanced features:
- Displays Super Admin indicator in admin list
- Disables delete/demote buttons for Super Admins
- Shows "Super Admin" status in action cells

---

## Best Practices

### 1. Super Admin Management
- ✅ Promote only trusted admins to Super Admin
- ✅ Document all Super Admin promotions in audit logs
- ✅ Maintain at least one Super Admin for system administration
- ❌ Don't share Super Admin credentials
- ❌ Don't demote the last Super Admin without a replacement

### 2. Security
- 🔐 Use strong, unique passwords for Super Admin accounts
- 🔐 Enable 2FA on all Super Admin accounts
- 🔐 Regularly audit Super Admin activities
- 🔐 Implement IP whitelisting if possible

### 3. Operations
- 📋 Keep audit logs of all role changes
- 📋 Document reason for Super Admin promotions
- 📋 Schedule periodic access reviews
- 📋 Implement backup Super Admin accounts

---

## Database Queries

### Find all Super Admins
```javascript
db.users.find({ role: "superAdmin" })
```

### Count Super Admins
```javascript
db.users.countDocuments({ role: "superAdmin" })
```

### Find admins who can be promoted
```javascript
db.users.find({ 
  role: "admin",
  isSuperAdmin: false,
  isActive: true
})
```

### Audit Super Admin changes
```javascript
db.users.find({ 
  role: "superAdmin" 
}).projection({
  name: 1,
  email: 1,
  createdAt: 1,
  lastLogin: 1,
  isActive: 1
})
```

---

## Troubleshooting

### Issue: Admin not promoted to Super Admin
**Solution:**
1. Verify user exists: `db.users.findOne({ email: "admin@company.com" })`
2. Check if user role is 'admin': `db.users.findOne({ email: "admin@company.com" }).role`
3. Manually update: Use the MongoDB update query above
4. Restart backend server

### Issue: Super Admin can still be deleted
**Solution:**
1. Check `canBeDeleted` field: `db.users.findOne({ _id: ObjectId("...") }).canBeDeleted`
2. Verify it's set to `false`
3. If not, update: `db.users.updateOne({ _id: ObjectId("...") }, { $set: { canBeDeleted: false } })`

### Issue: Cannot see Super Admin endpoints in API
**Solution:**
1. Verify routes are imported in `admin.routes.js`
2. Check that middleware has `authorize('superAdmin')`
3. Restart backend server
4. Check token includes user with `isSuperAdmin: true`

---

## Migration Checklist

- [ ] Updated User model with `isSuperAdmin` and `canBeDeleted` fields
- [ ] Updated auth validator with new schemas
- [ ] Added Super Admin controller functions
- [ ] Updated admin routes with Super Admin endpoints
- [ ] Updated auth middleware for Super Admin authorization
- [ ] Updated Frontend AdminDetailsModal
- [ ] Updated Frontend AdminManagement component
- [ ] Promoted at least one admin to Super Admin via MongoDB
- [ ] Tested Super Admin creation endpoint: `POST /api/v1/admin/super/promote`
- [ ] Tested Super Admin list endpoint: `GET /api/v1/admin/super/list`
- [ ] Tested Super Admin info endpoint: `GET /api/v1/admin/super/info`
- [ ] Verified Super Admins cannot be deleted
- [ ] Verified Super Admins cannot be demoted by themselves
- [ ] Updated documentation
- [ ] Tested in staging environment
- [ ] Deployed to production

---

## Code Changes Summary

### Backend Files Modified
1. **User Model** (`Server/src/models/user.model.js`)
   - Added `isSuperAdmin` field
   - Updated `role` enum to include 'superAdmin'
   - Added `canBeDeleted` field

2. **Auth Validator** (`Server/src/validators/auth.validator.js`)
   - Added `promoteSuperAdminSchema`
   - Added `demoteSuperAdminSchema`

3. **Admin Controller** (`Server/src/controllers/admin.controller.js`)
   - Added `promoteSuperAdmin()` function
   - Added `demoteSuperAdmin()` function
   - Added `getSuperAdminInfo()` function
   - Added `listSuperAdmins()` function
   - Updated `deleteUser()` with Super Admin protection
   - Updated `updateUser()` with Super Admin protection

4. **Admin Routes** (`Server/src/routes/admin.routes.js`)
   - Added Super Admin management routes
   - Protected routes with `authorize('superAdmin')`

5. **Auth Middleware** (`Server/src/middleware/auth.js`)
   - Updated `authorize()` to recognize Super Admin role

### Frontend Files Modified
1. **AdminDetailsModal** (`Management/src/features/user-management/components/AdminManagement/AdminDetailsModal.jsx`)
   - Added Crown icon for Super Admin display
   - Added Super Admin badge
   - Added Super Admin protection notice
   - Added `isSuperAdmin` prop support

2. **AdminManagement** (`Management/src/features/user-management/components/AdminManagement/AdminManagement.jsx`)
   - Should be enhanced with:
     - Promote to Super Admin button
     - Demote from Super Admin button
     - Super Admin indicator in table
     - Disable delete/edit for Super Admins

---

## Support

For issues or questions about the Super Admin implementation, please refer to:
- API Documentation: Check server logs for detailed error messages
- Database Status: Use MongoDB Compass to inspect user documents
- Frontend Console: Check browser console for any frontend errors

