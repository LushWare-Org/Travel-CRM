# SuperAdmin Fix - Quick Testing Guide

## Immediate Action Items

### 1. Update Your SuperAdmin User in Database
Run this MongoDB query to manually fix the existing superAdmin user:

```javascript
// MongoDB Shell
db.users.updateOne(
  { email: "admin@tripskyway.com" },
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
        "manage_leads",
        "manage_packages"
      ]
    }
  }
)

// Verify the update
db.users.findOne({ email: "admin@tripskyway.com" })
```

### 2. Backend Testing (2 minutes)

**Start the server if not already running:**
```bash
cd Server
npm start
# or
npm run dev
```

**Test 1: Login and Check Auth Response**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tripskyway.com",
    "password": "your_password"
  }'

# Look for in response:
# "isSuperAdmin": true   ← Should be present now!
# "role": "superAdmin"
# "permissions": [ ... ] ← Should have 8 permissions
```

**Test 2: Get User Info Endpoint**
```bash
curl -X GET http://localhost:5000/api/v1/admin/super/info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return current superAdmin info with isSuperAdmin: true
```

**Test 3: Create User and Check Pre-Save Hook**
```bash
# Promote an admin to superAdmin
curl -X POST http://localhost:5000/api/v1/admin/super/promote \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "some_admin@example.com"
  }'

# Response should show:
# "role": "superAdmin"
# "isSuperAdmin": true
# 8 permissions granted
```

### 3. Frontend Testing (5 minutes)

**Start the management dashboard:**
```bash
cd Management
npm run dev
```

**Step 1: Login**
- Navigate to http://localhost:5173/login
- Login with superAdmin credentials (admin@tripskyway.com)
- Check browser DevTools (F12 → Application → Local Storage)
- Verify `user` object contains: `"isSuperAdmin": true`

**Step 2: Check Navigation**
- After login, you should see all navigation items:
  - ✅ Dashboard
  - ✅ Analytics
  - ✅ Lead Management
  - ✅ Packages
  - ✅ Billing
  - ✅ User Management
- If any item is missing, the permission context is not working correctly

**Step 3: Test Page Refresh**
- Click on "User Management" to go to /users
- Press F5 or Cmd+R to refresh the page
- Verify you still see the User Management page (not redirected)
- Check localStorage again - isSuperAdmin should still be true

**Step 4: Test After Logout/Login**
- Click Logout
- Click Login again with same credentials
- Verify all navigation items are still visible
- Verify isSuperAdmin is still true in localStorage

**Step 5: Test Permission-Based Sections**
- Navigate to each admin section and verify they load correctly
- Try to access a restricted section (if applicable)
- Verify no console errors related to permissions

### 4. Database Verification (2 minutes)

**After all tests, verify database state:**

```javascript
// Connect to MongoDB and run:
db.users.findOne({ email: "admin@tripskyway.com" })

// Expected output structure:
{
  _id: ObjectId("693154dab7cddcdc154631ec"),
  name: "Admin User",
  email: "admin@tripskyway.com",
  role: "superAdmin",                    // ← Must be "superAdmin"
  isSuperAdmin: true,                    // ← Must be true
  canBeDeleted: false,                   // ← Must be false
  permissions: [                         // ← Must have all 8
    "manage_users",
    "manage_sales_reps",
    "manage_vendors",
    "manage_admins",
    "view_reports",
    "manage_billing",
    "manage_leads",
    "manage_packages"
  ],
  isActive: true,
  // ... other fields
}
```

## Comprehensive Test Scenario

### Full End-to-End Test (15 minutes)

**Scenario: Promote Admin → SuperAdmin → Check Access → Demote Back**

1. **Start from Fresh Login**
   - Create/use a regular admin user: `testadmin@example.com`
   - Note their current role: `admin` with limited permissions

2. **Promote to SuperAdmin**
   ```bash
   curl -X POST http://localhost:5000/api/v1/admin/super/promote \
     -H "Authorization: Bearer SUPERADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email": "testadmin@example.com"}'
   ```
   - Response should show: `role: "superAdmin"`, `isSuperAdmin: true`

3. **Verify Database**
   ```javascript
   db.users.findOne({ email: "testadmin@example.com" })
   // Check: role === "superAdmin" && isSuperAdmin === true
   ```

4. **Logout and Login as New SuperAdmin**
   - Clear browser cache and localStorage
   - Login with `testadmin@example.com`
   - Verify auth response includes `isSuperAdmin: true`
   - Check localStorage shows `isSuperAdmin: true`

5. **Access All Admin Sections**
   - Dashboard ✓
   - Analytics ✓
   - Packages ✓
   - Billing ✓
   - User Management ✓
   - Try promoting/demoting other users

6. **Test Persistence (wait 30 seconds)**
   - Refresh page (F5)
   - Verify all sections still accessible
   - Verify isSuperAdmin still true in localStorage and auth state

7. **Demote Back to Admin**
   - Use another superAdmin account to demote
   - Logout from testadmin
   - Verify database shows: `role: "admin"`, `isSuperAdmin: false`
   - Login again and verify limited access restored

8. **Final Database Check**
   - Both users should have consistent role/isSuperAdmin states
   - No orphaned flags or mismatches

## Expected Behavior After Fix

| Action | Before Fix | After Fix |
|--------|-----------|-----------|
| Promote admin to superAdmin | Would downgrade to admin within seconds | Stays as superAdmin indefinitely |
| Login as superAdmin | `isSuperAdmin` missing from auth response | `isSuperAdmin: true` in auth response |
| Access admin sections | Could be restricted due to flag mismatch | Full access to all sections |
| Refresh page | Would lose superAdmin status | Status persists across refreshes |
| Logout/login cycle | Role would downgrade | Role stays consistent |
| Database check | `role: admin, isSuperAdmin: false` | `role: superAdmin, isSuperAdmin: true` |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Still seeing "admin" after promoting | Check browser DevTools → isSuperAdmin in localStorage. If false, cache is stale. Clear localStorage and reload. |
| Can't access certain sections | Check PermissionContext in DevTools. Run `usePermission().hasPermission('manage_xxx')` in console. |
| Navigation items missing | Check browser console for errors. Run `axios.get('/api/v1/admin/permissions/available')` to verify permissions endpoint. |
| Database shows mixed state | Run the update query above to fix. Restart server and app. Logout and login again. |
| Demote not working | Verify you're logged in as a different superAdmin. Can't demote yourself. |

## Error Messages to Watch For

❌ **These errors should NOT appear after the fix:**
- "Cannot modify superAdmin role through this endpoint"
- "Only super admin can access this information"
- "User state is inconsistent"
- "SuperAdmin flag mismatch detected"

✅ **These messages indicate success:**
- "Login successful"
- "User promoted to super admin with all permissions"
- "User demoted to admin"
- "Permissions granted successfully"

## Rollback Plan (if needed)

If you encounter critical issues after deployment:

1. **Revert the code changes:**
   ```bash
   git checkout develop -- Server/src/models/user.model.js
   git checkout develop -- Server/src/controllers/auth.controller.js
   git checkout develop -- Server/src/controllers/admin.controller.js
   git checkout develop -- Management/src/contexts/PermissionContext.jsx
   git checkout develop -- Management/src/pages/Sidebar.jsx
   ```

2. **Restart the services:**
   ```bash
   # Kill existing processes
   # Restart server and frontend
   ```

3. **Clear client cache:**
   - Delete localStorage in browser
   - Force clear browser cache (Ctrl+Shift+Delete)
   - Close all browser tabs and reopen

## Support

If tests fail or you encounter unexpected behavior:

1. **Check the logs:**
   - Server console for error messages
   - Browser DevTools Console for JavaScript errors
   - Network tab for API response details

2. **Verify database state:**
   - Always check what the database actually contains
   - Don't assume based on frontend display

3. **Check localStorage:**
   - Press F12 → Application → Local Storage
   - Look for the `user` object
   - Verify it contains `isSuperAdmin` field

4. **Review the Summary:**
   - Read SUPERADMIN_FIX_SUMMARY.md for technical details
   - Understand which files were changed and why

---

**Testing Duration:** ~20 minutes total  
**Difficulty:** Easy  
**Confidence Level:** High (5 independent fixes for same root cause)
