# Super Admin Role Hierarchy & Permissions Matrix

## 👥 Role Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    USER ROLES                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🟢 CUSTOMER                                            │
│     └─ Basic user account                              │
│     └─ Can access public features                      │
│     └─ No admin capabilities                           │
│                                                         │
│  🔵 SALES REP                                           │
│     └─ Staff account                                    │
│     └─ Can manage assignments                          │
│     └─ Cannot access admin panel                       │
│                                                         │
│  🟠 VENDOR                                              │
│     └─ Business partner account                        │
│     └─ Can manage own services                         │
│     └─ Cannot access admin panel                       │
│                                                         │
│  🟣 ADMIN (Regular)                                     │
│     ├─ Can be created by: Admin or Super Admin         │
│     ├─ Can access: Admin panel with selected perms     │
│     ├─ CANNOT delete/deactivate other admins           │
│     ├─ CANNOT create Super Admins                      │
│     ├─ CANNOT modify other admin permissions           │
│     └─ Permissions: Manually assigned                  │
│                                                         │
│  👑 SUPER ADMIN                                         │
│     ├─ Can be created by: Only Super Admin             │
│     ├─ Can access: All admin features                  │
│     ├─ CANNOT be deleted (by anyone)                   │
│     ├─ CANNOT be deactivated (by anyone)               │
│     ├─ CAN delete/deactivate other admins              │
│     ├─ CAN create other Super Admins                   │
│     ├─ CAN modify any admin permissions                │
│     └─ Permissions: All 8 (auto-assigned)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Permissions Matrix

| Permission | Customer | Sales Rep | Vendor | Admin | Super Admin |
|------------|----------|-----------|--------|-------|-------------|
| manage_users | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| manage_sales_reps | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| manage_vendors | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| manage_admins | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| view_reports | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| manage_billing | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| system_settings | ❌ | ❌ | ❌ | ❓ Depends | ✅ |
| audit_log | ❌ | ❌ | ❌ | ❓ Depends | ✅ |

**Legend:**
- ✅ Always has permission
- ❌ Never has permission
- ❓ Depends: Assigned by Super Admin or other Super Admin

---

## 🛡️ Protection Matrix

### Who Can Perform What Action?

```
┌─────────────────────────────────────────────────────────────┐
│                     ACTION MATRIX                           │
├─────────────────────────┬──────────┬──────────┬─────────────┤
│ ACTION                  │ ADMIN    │ SUPER    │ REGULAR ACC │
│                         │ (Reg)    │ ADMIN    │             │
├─────────────────────────┼──────────┼──────────┼─────────────┤
│ Delete Admin            │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Delete Super Admin      │ ❌ NO    │ ❌ NO    │ ❌ NO       │
│ Delete Self             │ ❌ NO    │ ❌ NO    │ ❌ NO       │
├─────────────────────────┼──────────┼──────────┼─────────────┤
│ Deactivate Admin        │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Deactivate Super Admin  │ ❌ NO    │ ❌ NO    │ ❌ NO       │
│ Deactivate Self         │ ❌ NO    │ ❌ NO    │ ❌ NO       │
├─────────────────────────┼──────────┼──────────┼─────────────┤
│ Reset Own Password      │ ✅ YES   │ ✅ YES   │ ✅ YES      │
│ Reset Admin Password    │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Reset Super Admin Pwd   │ ❌ NO    │ ❌ NO    │ ❌ NO       │
├─────────────────────────┼──────────┼──────────┼─────────────┤
│ Modify Own Permissions  │ ❌ NO    │ ❌ NO    │ ❌ NO       │
│ Modify Admin Perms      │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Modify Super Admin Perms│ ❌ NO    │ ✅ YES   │ ❌ NO       │
├─────────────────────────┼──────────┼──────────┼─────────────┤
│ Create Admin            │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Create Super Admin      │ ❌ NO    │ ✅ YES   │ ❌ NO       │
│ Create Self             │ ❌ NO    │ ❌ NO    │ ❌ NO       │
└─────────────────────────┴──────────┴──────────┴─────────────┘
```

---

## 🔐 Security Rules

### Rule 1: Super Admin Immutability ⭐ CRITICAL
```
┌──────────────────────────────────────┐
│ NO ONE CAN DELETE A SUPER ADMIN      │
│ INCLUDING THEMSELVES                 │
└──────────────────────────────────────┘
```
- Regular Admin: ❌ Cannot delete Super Admin (403)
- Super Admin A: ❌ Cannot delete Super Admin B (403)
- Super Admin: ❌ Cannot delete themselves (403)

### Rule 2: Access Control Hierarchy
```
Regular Admin < Super Admin
     ↑              ↑
   Limited     Full Access
   Permissions  Permissions
```
- Regular Admin: Limited to assigned permissions
- Super Admin: Has all 8 permissions by default

### Rule 3: Creation Authority
```
Who can create Super Admin? → ONLY Super Admin
Who can create Admin?       → Only Super Admin
Who can create regular user? → Customers can self-register
```

### Rule 4: Self-Protection
```
No user can:
  ❌ Delete themselves
  ❌ Deactivate themselves
  ❌ Modify their own permissions
  
Super Admin extra protection:
  ❌ ALSO cannot be deleted by others
  ❌ ALSO cannot be deactivated by others
```

---

## 🎯 Use Cases

### Scenario 1: Staffing New Admin
```
Super Admin creates Regular Admin
  ↓
System generates temporary password
  ↓
Sends invitation email
  ↓
Admin logs in and sets permanent password
  ↓
Super Admin assigns permissions
  ↓
Admin now has specific permissions
```

### Scenario 2: Staffing New Super Admin
```
Current Super Admin creates New Super Admin
  ↓
System generates temporary password
  ↓
Sends invitation email
  ↓
New Super Admin logs in and sets password
  ↓
New Super Admin automatically gets all permissions
  ↓
Now both Super Admins have full access
```

### Scenario 3: Removing Admin
```
Super Admin wants to delete Regular Admin
  ↓
Super Admin can: ✅ YES
  ├─ Regular Admin: ✅ Can be deleted
  └─ Super Admin: ❌ Cannot be deleted
```

### Scenario 4: Emergency Access
```
Super Admin 1 becomes unavailable
  ↓
Super Admin 2 continues operations
  ↓
Both have full access
  ↓
Neither can accidentally lock out the other
```

---

## 🚨 Error Codes & Messages

| HTTP | Error | Scenario |
|------|-------|----------|
| 403 | Cannot delete super admin accounts | Trying to delete Super Admin |
| 403 | Cannot deactivate admin/super admin accounts | Trying to deactivate any admin |
| 403 | Cannot reset other admin/super admin passwords | Regular admin resetting super admin pwd |
| 403 | Only super admins can create other super admins | Regular admin trying to create super admin |
| 403 | Only super admins can modify super admin permissions | Regular admin modifying super admin perms |
| 400 | You cannot delete your own account | Anyone trying to self-delete |
| 400 | You cannot deactivate your own account | Anyone trying to self-deactivate |
| 400 | You cannot modify your own permissions | Anyone trying to change own perms |

---

## 📊 Audit Trail Examples

```
[2025-11-15 10:30:00] Super Admin A created Super Admin B
[2025-11-15 10:35:00] Super Admin B logged in for first time
[2025-11-15 10:40:00] Super Admin B assigned permissions to Admin C

[2025-11-15 11:00:00] Admin C attempted to create Super Admin D
  └─ Result: REJECTED - Only Super Admin can create Super Admin

[2025-11-15 11:05:00] Super Admin A attempted to delete Super Admin B
  └─ Result: REJECTED - Cannot delete Super Admin accounts

[2025-11-15 11:10:00] Super Admin B attempted to deactivate themselves
  └─ Result: REJECTED - Cannot deactivate own account
```

---

## 🔄 State Transitions

### Regular Admin Lifecycle
```
Created by Super Admin
    ↓
Awaiting First Login
    ↓
Active (with permissions)
    ↓
Can be deactivated (by Super Admin)
    ↓
Inactive
    ↓
Can be deleted (by Super Admin)
    ↓
Removed from system
```

### Super Admin Lifecycle
```
Created by Super Admin
    ↓
Awaiting First Login
    ↓
Active (with all permissions)
    ↓
   ⏸️ CANNOT be deactivated
    ↓
    🔒 CANNOT be deleted
    ↓
Remains in system indefinitely
    ↓
Can only be deactivated by database manipulation
```

---

## 💡 Key Design Principles

1. **Immutability**: Super Admins cannot be removed to prevent system lockout
2. **Role Hierarchy**: Clear distinction between admin levels
3. **Least Privilege**: Regular admins only have assigned permissions
4. **Defense in Depth**: Multiple layers of protection
5. **Audit Trail**: All actions logged for security review
6. **Clear Error Messages**: Users understand why actions fail

---

## 🎓 Best Practices

### ✅ DO:
```
✅ Create 2-3 Super Admins for redundancy
✅ Use strong passwords for Super Admins
✅ Enable 2FA on all admin accounts
✅ Monitor admin activity in audit logs
✅ Document who has Super Admin access
✅ Use Super Admin role minimally
✅ Keep Super Admin account info updated
```

### ❌ DON'T:
```
❌ Try to delete Super Admins
❌ Create too many Super Admins (2-3 is enough)
❌ Share Super Admin credentials
❌ Leave Super Admin logged in unattended
❌ Disable 2FA for Super Admin accounts
❌ Use Super Admin for regular tasks
❌ Forget Super Admin passwords
```

---

## 📞 Decision Tree

```
DO YOU WANT TO...?

├─ Create a new admin?
│  └─ Are you a Super Admin? 
│     ├─ YES → You can create Regular Admin
│     └─ NO → Cannot, only Super Admin can
│
├─ Delete an admin?
│  └─ Is it a Super Admin?
│     ├─ YES → CANNOT delete Super Admin
│     └─ NO → Only Super Admin can delete Regular Admin
│
├─ Make someone Super Admin?
│  └─ Are you a Super Admin?
│     ├─ YES → You can create Super Admin
│     └─ NO → Cannot, only Super Admin can
│
├─ Reset admin password?
│  └─ Is it someone else's Super Admin password?
│     ├─ YES → CANNOT reset other Super Admin passwords
│     └─ NO → Only Super Admin or themselves
│
└─ Modify admin permissions?
   └─ Is it a Super Admin?
      ├─ YES → Only Super Admin can modify
      └─ NO → Only Super Admin can modify any admin
```

---

**Last Updated**: November 15, 2025
**Version**: 1.0
**Security Level**: 🔒 High
