# Super Admin Quick Reference Guide

## What is Super Admin?

A **Super Admin** is the highest-level administrator role with:
- ✅ **All Permissions**: Full system access
- ✅ **Unrestricted Access**: Can manage any user or setting
- ✅ **Protection**: Cannot be deleted or demoted by others
- ✅ **Role Management**: Can promote/demote other admins
- ✅ **System Control**: Complete control over application configuration

---

## Quick Setup (2 Steps)

### Step 1: Promote an Existing Admin
You have two options:

**Option A: Using the API (Recommended)**
```bash
curl -X POST http://localhost:5000/api/v1/admin/super/promote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com"
  }'
```

**Option B: Using MongoDB**
```javascript
// In MongoDB Compass or mongosh
db.users.updateOne(
  { email: "admin@company.com" },
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

**Option C: Using Node.js Script**
```bash
# 1. Edit Server/scripts/promote-superadmin.js
# 2. Change ADMIN_EMAIL to your admin's email
# 3. Run:
node Server/scripts/promote-superadmin.js
```

### Step 2: Verify Promotion
```bash
# Check if promotion was successful
curl -X GET http://localhost:5000/api/v1/admin/super/list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Key Differences: Admin vs Super Admin

| Feature | Regular Admin | Super Admin |
|---------|--------------|------------|
| Create users | ✓ | ✓ |
| Delete users | ✓ | ✓ |
| Manage admins | ✓ | ✓ |
| Manage permissions | Limited | ✓ All |
| Promote admins | ✗ | ✓ |
| Can be deleted | ✓ | ✗ Cannot |
| Can be deactivated | ✓ | ✗ Cannot |
| Can demote themselves | ✗ | ✗ Cannot |
| Edit own details | ✓ | ✓ |
| Full permissions | ✗ | ✓ Yes |

---

## Super Admin Permissions (Auto-Assigned)

When promoted to Super Admin, the user automatically receives all these permissions:

1. **manage_users** - Create, edit, and manage customer accounts
2. **manage_sales_reps** - Manage sales representatives
3. **manage_vendors** - Manage vendor partnerships
4. **manage_admins** - Create and manage administrator accounts
5. **view_reports** - Access business reports and analytics
6. **manage_billing** - Handle billing and payment operations
7. **system_settings** - Configure system-wide settings
8. **audit_log** - View system audit logs and activity

These permissions cannot be modified for Super Admins - they have all permissions by default.

---

## API Endpoints Reference

### 1. Promote Admin to Super Admin
```
POST /api/v1/admin/super/promote
Authorization: Bearer {token}
Access: Super Admin only

Request:
{
  "userId": "admin_user_id"
  // OR
  // "email": "admin@company.com"
}

Response:
{
  "status": "success",
  "message": "John Doe has been promoted to Super Admin with all permissions",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "permissions": [...]
    }
  }
}
```

### 2. Demote Super Admin
```
POST /api/v1/admin/super/demote
Authorization: Bearer {token}
Access: Super Admin only

Request:
{
  "userId": "superadmin_user_id",
  "newRole": "admin"  // or "salesRep", "vendor", "customer"
}

Response:
{
  "status": "success",
  "message": "John Doe has been demoted to admin",
  "data": { "user": {...} }
}
```

### 3. Get Super Admin Info
```
GET /api/v1/admin/super/info
Authorization: Bearer {token}
Access: Super Admin only

Response:
{
  "status": "success",
  "data": {
    "currentUser": {...},
    "allSuperAdmins": [...]
  }
}
```

### 4. List All Super Admins
```
GET /api/v1/admin/super/list
Authorization: Bearer {token}
Access: Super Admin only

Response:
{
  "status": "success",
  "data": {
    "count": 2,
    "superAdmins": [...]
  }
}
```

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

### Find Super Admin by email
```javascript
db.users.findOne({ email: "admin@company.com" })
```

### Verify Super Admin fields
```javascript
db.users.findOne({ email: "admin@company.com" }, {
  name: 1,
  email: 1,
  role: 1,
  isSuperAdmin: 1,
  canBeDeleted: 1,
  permissions: 1
})
```

---

## Common Tasks

### Task 1: Create the First Super Admin
```bash
# Option 1: Using Node script (Easiest)
cd Server
node scripts/promote-superadmin.js

# Option 2: Using MongoDB
db.users.updateOne(
  { email: "your-admin@company.com" },
  { $set: { role: "superAdmin", isSuperAdmin: true, canBeDeleted: false, permissions: [...] } }
)
```

### Task 2: Add Another Super Admin
```bash
# Use the promote API endpoint
POST /api/v1/admin/super/promote
{
  "email": "another-admin@company.com"
}
```

### Task 3: Remove Super Admin Status
```bash
# Use the demote API endpoint
POST /api/v1/admin/super/demote
{
  "userId": "superadmin_id",
  "newRole": "admin"
}
```

### Task 4: View All Super Admins
```bash
# Use the list API endpoint
GET /api/v1/admin/super/list
```

### Task 5: Check Current Super Admin Account
```bash
# Use the info API endpoint
GET /api/v1/admin/super/info
```

---

## Important Rules & Restrictions

### ✅ What Super Admins CAN Do
- ✓ Manage all users (create, edit, delete)
- ✓ Promote admins to Super Admin
- ✓ Demote other Super Admins (but not themselves)
- ✓ Manage system settings
- ✓ View audit logs
- ✓ Manage billing
- ✓ Manage vendors and sales reps

### ❌ What Super Admins CANNOT Do
- ✗ Delete their own account
- ✗ Demote themselves
- ✗ Be deleted by regular admins
- ✗ Be deactivated by regular admins
- ✗ Have permissions modified (they have all by default)
- ✗ Be edited by regular admins (only by themselves)

---

## Security Best Practices

### 🔐 Protect Your Super Admin Accounts
1. **Use Strong Passwords**: 12+ characters, mixed case, numbers, symbols
2. **Enable 2FA**: Always enable two-factor authentication
3. **Limit Access**: Restrict who can access Super Admin accounts
4. **Monitor Logins**: Check last login times regularly
5. **Document Changes**: Keep audit trail of role promotions
6. **Backup Plan**: Keep at least 2 Super Admins in your system

### 📋 Administration Checklist
- [ ] Created at least one Super Admin
- [ ] Super Admin has strong password
- [ ] Super Admin has 2FA enabled
- [ ] Documented who is Super Admin
- [ ] Regular audit of Super Admin activities
- [ ] Backup Super Admin account exists
- [ ] Testing completed in staging

---

## Troubleshooting

### Problem: Can't find the user to promote
**Solution:**
```javascript
// List all admins
db.users.find({ role: "admin" }).pretty()
```

### Problem: User is already Super Admin
**Solution:**
```javascript
// Check current status
db.users.findOne({ email: "user@company.com" }).role
// Should return "superAdmin" if already promoted
```

### Problem: Promotion failed with "User not found"
**Solution:**
1. Verify the email address is correct (case-insensitive)
2. Check database connection
3. Verify user exists: `db.users.findOne({ email: "email@company.com" })`

### Problem: Can't demote Super Admin
**Solution:**
1. Make sure you're using another Super Admin account
2. Super Admins can't demote themselves - use a different account
3. Check error message in API response

### Problem: Super Admin still shows as deletable
**Solution:**
```javascript
// Verify canBeDeleted field
db.users.findOne({ email: "superadmin@company.com" }).canBeDeleted
// Should be false

// If true, fix it:
db.users.updateOne(
  { email: "superadmin@company.com" },
  { $set: { canBeDeleted: false } }
)
```

---

## File Changes Summary

### Backend Changes
- ✅ `Server/src/models/user.model.js` - Added `isSuperAdmin` and `canBeDeleted` fields
- ✅ `Server/src/validators/auth.validator.js` - Added validation schemas
- ✅ `Server/src/controllers/admin.controller.js` - Added promotion/demotion functions
- ✅ `Server/src/routes/admin.routes.js` - Added Super Admin routes
- ✅ `Server/src/middleware/auth.js` - Updated authorization logic

### Frontend Changes
- ✅ `Management/src/features/user-management/components/AdminManagement/AdminDetailsModal.jsx` - Shows Super Admin status
- ✅ `Management/src/features/user-management/components/AdminManagement/AdminManagement.jsx` - Add promote/demote UI

### Scripts Added
- ✅ `Server/scripts/promote-superadmin.js` - Easy promotion script

---

## Next Steps

1. **Deploy Backend Changes**
   ```bash
   cd Server
   npm install
   npm run dev
   ```

2. **Update Database**
   - Run promotion script or MongoDB query
   - Verify Super Admin was created

3. **Test API Endpoints**
   - Test `/api/v1/admin/super/list`
   - Test `/api/v1/admin/super/promote`
   - Test `/api/v1/admin/super/demote`

4. **Deploy Frontend Changes**
   ```bash
   cd Management
   npm install
   npm run dev
   ```

5. **Test Frontend**
   - View Super Admin badge in admin list
   - Test promote/demote buttons
   - Verify delete button is disabled for Super Admins

---

## Support Resources

- **Documentation**: See `SUPERADMIN_IMPLEMENTATION_GUIDE.md`
- **Frontend Integration**: See `SUPERADMIN_FRONTEND_INTEGRATION.md`
- **Migration Script**: `Server/scripts/promote-superadmin.js`
- **API Tests**: Use Postman or similar tool with the endpoints above

---

**Last Updated**: November 15, 2024  
**Version**: 1.0  
**Status**: Ready for Production

