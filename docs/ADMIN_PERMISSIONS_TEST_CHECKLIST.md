# ✅ Admin Permissions - Quick Test Checklist

## Before You Start
- [ ] Backend server is running (`cd Server && npm run dev`)
- [ ] Frontend is running (`cd Management && npm run dev`)
- [ ] You're logged in as an admin user

---

## Test 1: Create New Admin with Permissions ✨

### Steps:
1. [ ] Click **"Add New Administrator"** button
2. [ ] Fill in the form:
   - [ ] Name: `Test Admin User`
   - [ ] Email: `testadmin@yourdomain.com`
   - [ ] Phone: `1234567890`
3. [ ] **Select permissions** (check at least 3):
   - [ ] ✓ Manage Website Users
   - [ ] ✓ View Reports
   - [ ] ✓ Manage Sales Reps
4. [ ] Click **"Create Admin"**

### Expected Results:
- [ ] ✅ Success message appears
- [ ] ✅ New admin appears in the table
- [ ] ✅ Permission count shows (e.g., "3 permissions")
- [ ] ✅ **REFRESH PAGE (F5)**
- [ ] ✅ Permission count STILL shows after refresh! 🎉

---

## Test 2: Edit Existing Admin Permissions ✏️

### Steps:
1. [ ] Find the admin you just created
2. [ ] Click the **Edit** button (pencil icon)
3. [ ] **Change permissions**:
   - [ ] Uncheck one permission
   - [ ] Check a new permission
4. [ ] Click **"Save Changes"**

### Expected Results:
- [ ] ✅ Success message appears
- [ ] ✅ Permission count updates in table
- [ ] ✅ **REFRESH PAGE (F5)**
- [ ] ✅ Changes are STILL there! 🎉

---

## Test 3: Verify in Database 🗄️

### Using MongoDB Compass:
1. [ ] Open MongoDB Compass
2. [ ] Connect to your database
3. [ ] Find the `users` collection
4. [ ] Filter: `{ role: "admin" }`
5. [ ] Find your test admin
6. [ ] **Check the `permissions` field**

### Expected:
```json
{
  "_id": "...",
  "name": "Test Admin User",
  "email": "testadmin@yourdomain.com",
  "role": "admin",
  "permissions": [
    "manage_users",
    "view_reports",
    "manage_sales_reps"
  ]
}
```
- [ ] ✅ `permissions` array exists
- [ ] ✅ Contains the correct permission IDs

---

## Test 4: View Admin Details 👁️

### Steps:
1. [ ] Click on the admin row in the table
2. [ ] Details modal should open
3. [ ] Scroll to the **Permissions section**

### Expected:
- [ ] ✅ All assigned permissions are displayed
- [ ] ✅ Each permission shows as a purple badge
- [ ] ✅ Permission labels are readable (not IDs)

---

## Test 5: Load Test - Multiple Admins 📊

### Steps:
1. [ ] Create 2-3 more admins with different permission sets
2. [ ] Refresh the page
3. [ ] Check each admin's permission count

### Expected:
- [ ] ✅ All admins show correct permission counts
- [ ] ✅ No admins lost their permissions
- [ ] ✅ Different admins can have different permissions

---

## 🐛 If Something Goes Wrong

### Permissions not saving?
1. Check browser console for errors (F12)
2. Check Network tab - look for failed API calls
3. Verify backend is running
4. Check backend logs for errors

### Can't create admin?
1. Verify you're using the correct endpoint: `/admin/users`
2. Check if you have admin privileges
3. Verify token is valid

### Database not updating?
1. Check MongoDB connection
2. Verify User model has `permissions` field
3. Run the test script: `node Server/scripts/test-permissions.js`

---

## 📊 Success Criteria

All tests pass if:
- ✅ Permissions can be selected during admin creation
- ✅ Permissions are saved to database
- ✅ Permissions persist after page refresh
- ✅ Permissions can be edited
- ✅ Changes are saved and persist
- ✅ Database contains correct permission data

---

## 🎉 After All Tests Pass

### Cleanup (Optional):
- [ ] Delete test admin users
- [ ] Clear test data from database

### Next Steps:
- [ ] Add permission badges in admin table
- [ ] Show permission summary in details modal
- [ ] Implement permission-based UI access control
- [ ] Add audit logging for permission changes

---

**Testing Date:** _______________  
**Tester:** _______________  
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Passed | ⬜ Failed

---

## Quick Commands

```bash
# Start backend
cd Server
npm run dev

# Start frontend
cd Management
npm run dev

# Test permissions (database)
cd Server
node scripts/test-permissions.js

# Check MongoDB
mongosh
use trip-sky-way
db.users.find({ role: "admin" }).pretty()
```

---

**Need Help?** Check `ADMIN_PERMISSIONS_BUG_FIX.md` for detailed fix information!
