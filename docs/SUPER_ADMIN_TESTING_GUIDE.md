# Super Admin Testing Guide

## 🧪 Complete Testing Checklist

### Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on management portal
- Test database with at least one regular admin account
- Postman or similar API testing tool

---

## 📋 Test Case 1: Create Super Admin

### Via Frontend UI
**Steps:**
1. Login to Management Portal as Super Admin
2. Navigate to Admin Management section
3. Click "Add Admin" button
4. Fill in form:
   - Name: "Test Super Admin"
   - Email: "test.super@example.com"
   - Phone: "1234567890"
5. **CHECK** the "👑 Make Super Admin" checkbox
6. Verify all 8 permissions auto-populate:
   - ✓ manage_users
   - ✓ manage_sales_reps
   - ✓ manage_vendors
   - ✓ manage_admins
   - ✓ view_reports
   - ✓ manage_billing
   - ✓ system_settings
   - ✓ audit_log
7. Click "Create & Send Invitation"

**Expected Results:**
- ✅ Admin created successfully
- ✅ Success message: "✅ Admin created! Invitation sent to test.super@example.com"
- ✅ New admin appears in list with 👑 badge
- ✅ Email sent to test.super@example.com (check logs)

**DB Verification:**
```javascript
db.users.findOne({ email: "test.super@example.com" })
// Should show:
// {
//   role: "superAdmin",
//   isSuperAdmin: true,
//   permissions: [all 8],
//   ...
// }
```

---

### Via API (cURL)
**Command:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Super Admin",
    "email": "api.super@example.com",
    "phone": "9876543210",
    "role": "superAdmin",
    "isSuperAdmin": true
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Administrator created successfully. Login credentials sent to their email.",
  "data": {
    "user": {
      "id": "507f...",
      "name": "API Test Super Admin",
      "email": "api.super@example.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "phone": "9876543210",
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
      "createdAt": "2025-11-15T..."
    }
  }
}
```

---

## 📋 Test Case 2: Try to Create Super Admin Without Authorization

### Via Frontend UI
**Steps:**
1. Login as Regular Admin
2. Navigate to Admin Management
3. Click "Add Admin"
4. Fill in form fields
5. Try to check "👑 Make Super Admin" checkbox
6. Click "Create & Send Invitation"

**Expected Results:**
- ❌ Error message appears
- ❌ Message: "Only super admins can create other super admins"
- ❌ HTTP Status: 403 Forbidden
- ❌ Admin NOT created

### Via API (cURL)
**Command:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users \
  -H "Authorization: Bearer REGULAR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Unauthorized Super",
    "email": "unauthorized@example.com",
    "phone": "5555555555",
    "role": "superAdmin",
    "isSuperAdmin": true
  }'
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Only super admins can create other super admins",
  "code": 403
}
```

---

## 📋 Test Case 3: Delete Super Admin

### Via Frontend UI
**Steps:**
1. Login to Management Portal
2. Find a Super Admin in the list (marked with 👑)
3. Click the trash/delete icon
4. Confirmation dialog appears

**Expected Results:**
- ⚠️ Error message: "🔒 Security Policy: Super admin accounts cannot be deleted for security reasons."
- ❌ Delete button disabled or shows error
- ❌ Super Admin NOT deleted
- ❌ Super Admin remains in list

### Via API (cURL)
**Command:**
```bash
curl -X DELETE http://localhost:5000/api/v1/admin/users/{super_admin_id} \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Cannot delete super admin accounts",
  "code": 403
}
```

---

## 📋 Test Case 4: Try to Delete Regular Admin

### Via Frontend UI
**Steps:**
1. Login as Super Admin
2. Find a Regular Admin in the list (NO 👑 badge)
3. Click the trash/delete icon
4. Confirmation dialog appears
5. Click "Delete"

**Expected Results:**
- ✅ Confirmation message
- ✅ Message: "✅ Admin deleted successfully"
- ✅ Admin removed from list
- ❌ Regular Admin no longer in database

### Via API (cURL)
**Command:**
```bash
curl -X DELETE http://localhost:5000/api/v1/admin/users/{regular_admin_id} \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "User deleted successfully",
  "data": null
}
```

---

## 📋 Test Case 5: Try to Deactivate Super Admin

### Via Frontend UI
**Steps:**
1. Login as Super Admin
2. Find a Super Admin in the list
3. Click the status toggle/edit button
4. Try to change status to Inactive
5. Submit

**Expected Results:**
- ❌ Error: "Cannot deactivate admin/super admin accounts"
- ❌ HTTP Status: 403
- ❌ Super Admin remains Active

### Via API (cURL)
**Command:**
```bash
curl -X PATCH http://localhost:5000/api/v1/admin/users/{super_admin_id}/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Cannot deactivate admin/super admin accounts",
  "code": 403
}
```

---

## 📋 Test Case 6: Try to Reset Super Admin Password (Not Self)

### Via API (cURL)
**Command:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users/{OTHER_SUPER_ADMIN_ID}/reset-password \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Cannot reset other admin/super admin passwords",
  "code": 403
}
```

---

## 📋 Test Case 7: Super Admin Can Reset Own Password

### Via API (cURL)
**Command:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users/{OWN_ID}/reset-password \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successfully. New credentials sent to user email."
}
```

---

## 📋 Test Case 8: Dashboard Stats Show Super Admin Count

### Steps:**
1. Login as any Admin
2. Navigate to Dashboard
3. Check stats section

**Expected Results:**
- ✅ Stats show breakdown by role including Super Admin count
- ✅ Sample stats:
  ```
  Total Users: 100
  Active Users: 95
  Customer: 80
  Sales Rep: 10
  Vendor: 5
  Admin: 4
  Super Admin: 1  ← NEW
  ```

### Via API
**Command:**
```bash
curl http://localhost:5000/api/v1/admin/stats \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "stats": {
      "totalUsers": 100,
      "activeUsers": 95,
      "inactiveUsers": 5,
      "recentUsers": 10,
      "unverifiedEmails": 2,
      "usersByRole": {
        "customer": 80,
        "salesRep": 10,
        "vendor": 5,
        "admin": 4,
        "superAdmin": 1
      }
    }
  }
}
```

---

## 📋 Test Case 9: Super Admin Badge Display

### Steps:**
1. Create a Super Admin
2. Go to Admin Management list
3. Find the Super Admin in the list

**Expected Results:**
- ✅ Super Admin has **👑 SUPER ADMIN** badge in gold/amber color
- ✅ Regular Admin has just name without badge
- ✅ Clicking admin shows details modal
- ✅ Details modal shows Crown icon for Super Admin
- ✅ Details modal shows "Super Administrator (Full Access)" as role

---

## 📋 Test Case 10: Permission Auto-Population

### Via Frontend UI
**Steps:**
1. Click "Add Admin" button
2. Leave Super Admin checkbox unchecked
3. Check individual permissions manually
4. Now check "👑 Make Super Admin" checkbox

**Expected Results:**
- ✅ All 8 permissions become checked
- ✅ Permission checkboxes become disabled (grayed out)
- ✅ Help message appears: "Super Admins automatically have all permissions"
- ✅ Uncheck "👑 Make Super Admin" checkbox
- ✅ Permissions remain selected but checkboxes become enabled again

---

## 📋 Test Case 11: Try to Modify Super Admin Permissions

### Via API (cURL)
**Command (Regular Admin trying to modify Super Admin permissions):**
```bash
curl -X PATCH http://localhost:5000/api/v1/admin/users/{SUPER_ADMIN_ID}/permissions \
  -H "Authorization: Bearer REGULAR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["manage_users", "manage_admins"]
  }'
```

**Expected Response (403):**
```json
{
  "status": "error",
  "message": "Only super admins can modify super admin permissions",
  "code": 403
}
```

---

## 📋 Test Case 12: Super Admin Can Modify Other Super Admin Permissions

### Via API (cURL)
**Command:**
```bash
curl -X PATCH http://localhost:5000/api/v1/admin/users/{OTHER_SUPER_ADMIN_ID}/permissions \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "manage_users",
      "manage_admins",
      "view_reports"
    ]
  }'
```

**Expected Response (200):**
```json
{
  "status": "success",
  "message": "Admin permissions updated successfully",
  "data": {
    "user": {
      "id": "507f...",
      "name": "Other Super Admin",
      "email": "other.super@example.com",
      "role": "superAdmin",
      "permissions": [
        "manage_users",
        "manage_admins",
        "view_reports"
      ]
    }
  }
}
```

---

## 📋 Test Case 13: Get Super Admin Details

### Via API (cURL)
**Command:**
```bash
curl http://localhost:5000/api/v1/admin/users/{super_admin_id}/permissions \
  -H "Authorization: Bearer TOKEN"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "507f...",
      "name": "Super Admin Name",
      "email": "super@example.com",
      "role": "superAdmin",
      "isSuperAdmin": true,
      "permissions": [
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
}
```

---

## ✅ Final Verification Checklist

- [ ] Super Admin can be created by another Super Admin
- [ ] Regular Admin cannot create Super Admin (403)
- [ ] Super Admin appears with 👑 badge in list
- [ ] Super Admin cannot be deleted (403)
- [ ] Regular Admin can be deleted by Super Admin (200)
- [ ] Super Admin cannot be deactivated (403)
- [ ] Dashboard shows Super Admin count
- [ ] Details modal shows crown icon for Super Admin
- [ ] "Make Super Admin" checkbox auto-populates all permissions
- [ ] Regular Admin cannot modify Super Admin permissions (403)
- [ ] Super Admin can modify other Super Admin permissions (200)
- [ ] All error messages are clear and user-friendly
- [ ] Backend logs show all attempts
- [ ] Database correctly stores role and isSuperAdmin fields

---

## 🐛 Troubleshooting

### Issue: Super Admin doesn't appear with badge
**Solution:**
- Verify `isSuperAdmin: true` in database
- Verify `role: "superAdmin"` in database
- Refresh browser cache
- Check frontend component updates

### Issue: Can still delete Super Admin
**Solution:**
- Verify admin.controller.js deleteUser() has protection check
- Check token authorization level
- Restart backend server

### Issue: Permissions not auto-populating
**Solution:**
- Verify AdminManagement.jsx checkbox logic
- Check browser console for JavaScript errors
- Verify form state updates correctly

### Issue: Dashboard doesn't show Super Admin count
**Solution:**
- Verify getDashboardStats() includes superAdmin count
- Check API response includes usersByRole.superAdmin
- Refresh dashboard or clear cache

---

## 📊 Test Report Template

```markdown
# Super Admin Testing Report
Date: [DATE]
Tester: [NAME]
Build: [VERSION]

## Test Results

### Test Case 1: Create Super Admin
Status: [PASS/FAIL]
Notes: [ANY ISSUES]

### Test Case 2: Prevent Unauthorized Super Admin Creation
Status: [PASS/FAIL]
Notes: [ANY ISSUES]

[Continue for all test cases...]

## Summary
- Total Tests: 13
- Passed: [X]
- Failed: [Y]
- Blocked: [Z]

## Issues Found
[LIST ANY ISSUES]

## Recommendations
[ANY IMPROVEMENTS NEEDED]
```

---

**Testing Date**: [Your Date]
**Tested By**: [Your Name]
**Status**: ✅ Ready for Testing
