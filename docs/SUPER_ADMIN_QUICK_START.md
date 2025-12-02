# Quick Start: Super Admin Migration

## TL;DR - What You Need To Do

### 1. Run the Migration Script (One-time)
```bash
cd Server
node src/scripts/migrateSuperAdminRole.js
```

This updates the database so super admins have `role='superAdmin'` instead of `role='admin'`.

### 2. Restart Your Servers
```bash
# Terminal 1 - Server
cd Server
npm run dev

# Terminal 2 - Management (Dashboard)
cd Management
npm run dev
```

### 3. Test It Out
- Login as the super admin user
- You should now see **"Super Admin"** with a ⭐ badge in the sidebar (instead of just "admin")
- You should now be able to:
  - ✅ Update other admin accounts
  - ✅ Reset passwords for other admins
  - ✅ Manage permissions of other admins

---

## What Was Fixed

| Issue | Status |
|-------|--------|
| Sidebar shows "admin" instead of "Super Admin" | ✅ FIXED |
| Cannot update other admin accounts as super admin | ✅ FIXED |
| Cannot reset admin passwords as super admin | ✅ FIXED |
| Cannot modify admin permissions as super admin | ✅ FIXED |

---

## Files Changed

✅ `Server/src/models/user.model.js` - Removed role normalization
✅ `Server/src/controllers/admin.controller.js` - Fixed 5 authorization checks
✅ `Management/src/pages/Sidebar.jsx` - Display correct role
✅ `Server/src/middleware/auth.js` - Simplified role checks
✅ `Server/src/controllers/user.controller.js` - Updated role validation
✅ `Server/src/scripts/migrateSuperAdminRole.js` - New migration script

---

## Troubleshooting

### Migration script fails to connect
- Make sure MongoDB is running
- Check your `.env` file has correct `MONGODB_URI`

### Still seeing "admin" in sidebar after migration
- Clear browser cache/cookies
- Logout and login again
- Check browser console for errors

### Cannot update admins as super admin
- Run the migration script if you haven't
- Restart the server after migration
- Check that the user has `role='superAdmin'` in MongoDB

---

## Need Help?

See `SUPER_ADMIN_MIGRATION_SUMMARY.md` for detailed information about all changes.
