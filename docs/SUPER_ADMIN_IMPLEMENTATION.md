# Super Admin Implementation Guide

## Overview
A new **Super Admin** role has been implemented with the following features:
- **Full permissions** - Super Admins have all system permissions by default
- **Protected from deletion** - Super Admins cannot be deleted by anyone (including other Super Admins or themselves)
- **Cannot deactivate themselves** - Super Admins cannot deactivate their own accounts
- **Only Super Admins can create other Super Admins** - Regular admins cannot create Super Admin accounts

---

## Backend Changes

### 1. **User Model** (`Server/src/models/user.model.js`)
Added two new fields:
```javascript
role: {
  type: String,
  enum: ['customer', 'salesRep', 'vendor', 'admin', 'superAdmin'],
  default: 'customer',
},
isSuperAdmin: {
  type: Boolean,
  default: false,
},
```

### 2. **Admin Controller** (`Server/src/controllers/admin.controller.js`)

#### `createStaff()` - Create Super Admin
- Only Super Admins can create other Super Admins
- Super Admins automatically receive all permissions:
  - `manage_users`
  - `manage_sales_reps`
  - `manage_vendors`
  - `manage_admins`
  - `view_reports`
  - `manage_billing`
  - `system_settings`
  - `audit_log`

```javascript
// Example request
POST /api/v1/admin/users
{
  "name": "Super Admin Name",
  "email": "superadmin@example.com",
  "phone": "1234567890",
  "role": "superAdmin",
  "isSuperAdmin": true
}
```

#### `deleteUser()` - Delete Protection
- **Cannot delete Super Admins** - Returns 403 Forbidden error
- **Cannot delete self** - Returns 400 Bad Request error
- **Cannot delete regular Admins** - Returns 403 Forbidden error

```javascript
// Security checks
if (user.role === 'superAdmin' || user.isSuperAdmin) {
  throw new AppError('Cannot delete super admin accounts', 403);
}
```

#### `updateUserStatus()` - Deactivation Protection
- **Cannot deactivate Super Admins** - Returns 403 Forbidden error
- **Cannot deactivate regular Admins** - Returns 403 Forbidden error
- **Cannot deactivate self** - Returns 400 Bad Request error

#### `resetUserPassword()` - Password Reset Protection
- **Cannot reset other Super Admin passwords**
- **Cannot reset other Admin passwords**
- Only Super Admins and Admins can reset their own password

#### `updateAdminPermissions()` - Permission Protection
- **Only Super Admins can modify Super Admin permissions**
- Regular Admins cannot modify Super Admin permissions
- **Cannot modify own permissions**
- Super Admins always maintain all permissions

#### `getDashboardStats()` - Updated Stats
- Added `superAdmin` count to statistics response

### 3. **Validation Schema** (`Server/src/validators/auth.validator.js`)
Updated `createStaffSchema` to include:
```javascript
role: Joi.string()
  .valid('salesRep', 'vendor', 'admin', 'superAdmin')
  .required(),
  
isSuperAdmin: Joi.boolean()
```

### 4. **Admin Routes** (`Server/src/routes/admin.routes.js`)
Updated middleware to authorize both admin and super admin:
```javascript
router.use(authorize('admin', 'superAdmin'));
```

---

## Frontend Changes

### 1. **AdminDetailsModal** (`Management/src/features/user-management/components/AdminManagement/AdminDetailsModal.jsx`)
- Displays **Super Admin badge** with crown icon (👑)
- Shows "SUPER ADMIN" label for Super Admin accounts
- Different icon and styling for Super Admins vs regular Admins

### 2. **AdminManagement Component** (`Management/src/features/user-management/components/AdminManagement/AdminManagement.jsx`)

#### Form Data State
Added `isSuperAdmin` to form state:
```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  permissions: [],
  twoFactorEnabled: false,
  isSuperAdmin: false  // ← NEW
});
```

#### Data Transformation
When loading admins from backend:
```javascript
isSuperAdmin: admin.isSuperAdmin || false,
role: admin.role || 'admin'
```

#### Creating Super Admin
- **"👑 Make Super Admin" checkbox** in the form
- When checked, automatically assigns all permissions
- Permissions are disabled when Super Admin is selected
- Shows info message: "Super Admins automatically have all permissions"

#### Deleting Super Admin
Protected with security check:
```javascript
if (adminToDelete.isSuperAdmin || adminToDelete.role === 'superAdmin') {
  setError('🔒 Security Policy: Super admin accounts cannot be deleted for security reasons.');
  return;
}
```

#### Editing Super Admin
- Cannot change Super Admin status from edit dialog
- Cannot modify own permissions if editing self
- Shows warning when trying to edit own account

---

## API Response Examples

### Create Super Admin Request
```bash
POST /api/v1/admin/users
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "John Super Admin",
  "email": "john.super@example.com",
  "phone": "1234567890",
  "role": "superAdmin",
  "isSuperAdmin": true
}
```

### Create Super Admin Response
```json
{
  "status": "success",
  "message": "Administrator created successfully. Login credentials sent to their email.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Super Admin",
      "email": "john.super@example.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "phone": "1234567890",
      "permissions": [
        "manage_users",
        "manage_sales_reps",
        "manage_vendors",
        "manage_admins",
        "view_reports",
        "manage_billing",
        "system_settings",
        "audit_log"
      ],
      "isActive": true,
      "createdAt": "2025-11-15T10:30:00Z"
    }
  }
}
```

### Delete Super Admin Error Response
```json
{
  "status": "error",
  "message": "Cannot delete super admin accounts",
  "code": 403
}
```

---

## Security Features

### 1. **Role-Based Protection**
- ✅ Super Admins cannot be deleted
- ✅ Super Admins cannot be deactivated
- ✅ Super Admins cannot have their passwords reset by others
- ✅ Super Admins cannot have their permissions modified by others
- ✅ Only Super Admins can create other Super Admins

### 2. **Self-Protection**
- ✅ No user can delete themselves
- ✅ No user can deactivate themselves
- ✅ No user can modify their own permissions
- ✅ Admins can only reset their own password (unless Super Admin)

### 3. **Access Control**
- ✅ Super Admin routes require authentication
- ✅ Super Admin creation requires Super Admin authorization
- ✅ Admin routes accessible to both Admin and Super Admin roles

---

## Testing Guide

### 1. **Create Super Admin**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer {super_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Super Admin",
    "email": "test.super@example.com",
    "phone": "9876543210",
    "role": "superAdmin",
    "isSuperAdmin": true
  }'
```

### 2. **Try to Delete Super Admin (Should Fail)**
```bash
curl -X DELETE http://localhost:5000/api/v1/admin/users/{super_admin_id} \
  -H "Authorization: Bearer {token}"
```
Expected: 403 Forbidden - "Cannot delete super admin accounts"

### 3. **Try to Deactivate Super Admin (Should Fail)**
```bash
curl -X PATCH http://localhost:5000/api/v1/admin/users/{super_admin_id}/status \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```
Expected: 403 Forbidden - "Cannot deactivate admin/super admin accounts"

### 4. **Regular Admin Tries to Create Super Admin (Should Fail)**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer {regular_admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Super",
    "email": "unauthorized@example.com",
    "phone": "5555555555",
    "role": "superAdmin",
    "isSuperAdmin": true
  }'
```
Expected: 403 Forbidden - "Only super admins can create other super admins"

---

## Feature Checklist

- ✅ Super Admin role enum value added to User model
- ✅ `isSuperAdmin` boolean field added to User model
- ✅ Super Admin creation with all permissions
- ✅ Super Admin deletion protection (403 error)
- ✅ Super Admin deactivation protection (403 error)
- ✅ Super Admin password reset protection
- ✅ Super Admin permission modification protection
- ✅ Only Super Admins can create Super Admins
- ✅ Frontend UI displays Super Admin badge (👑)
- ✅ Frontend form has "Make Super Admin" checkbox
- ✅ Delete dialog shows protection message for Super Admins
- ✅ Dashboard stats include Super Admin count
- ✅ Proper error messages for all security violations

---

## Usage in Frontend

### Creating a Super Admin via UI
1. Click "Add Admin" button
2. Fill in name, email, phone
3. Check the "👑 Make Super Admin" checkbox
4. All permissions will auto-populate
5. Click "Create & Send Invitation"

### Attempting to Delete Super Admin
1. Find the Super Admin in the list
2. Click the delete button
3. Get error message: "🔒 Security Policy: Super admin accounts cannot be deleted for security reasons."

---

## Database Migration (If Needed)

If you have existing admin users and want to upgrade one to Super Admin:

```javascript
// MongoDB update command
db.users.updateOne(
  { email: "existing.admin@example.com" },
  { 
    $set: { 
      role: "superAdmin",
      isSuperAdmin: true,
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
);
```

---

## Error Messages

| Scenario | Error Code | Message |
|----------|-----------|---------|
| Create Super Admin without authorization | 403 | Only super admins can create other super admins |
| Delete Super Admin | 403 | Cannot delete super admin accounts |
| Delete self | 400 | You cannot delete your own account |
| Deactivate Super Admin | 403 | Cannot deactivate admin/super admin accounts |
| Reset other Super Admin's password | 403 | Cannot reset other admin/super admin passwords |
| Modify other Super Admin's permissions | 403 | Only super admins can modify super admin permissions |
| Modify own permissions | 400 | You cannot modify your own permissions |

---

## Summary

The Super Admin implementation provides:
- **Ultimate security** - Super Admins cannot be removed from the system
- **Full permissions** - Automatic assignment of all permissions
- **Role hierarchy** - Only Super Admins can create Super Admins
- **User-friendly UI** - Clear badges and protection messages
- **Comprehensive error handling** - Specific messages for each violation

This ensures system administrators have complete control while preventing accidental or malicious removal of critical administrative accounts.
