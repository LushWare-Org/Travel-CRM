# Quick Test Guide - Permission System

## 🚀 Quick Start Testing

### Option A: Visual Inspection (Fast)

1. **Open Management Dashboard**
   - Login as superAdmin (should see all tabs)
   - Check browser DevTools → Application → localStorage
   - Verify `user.permissions` array exists and is populated

2. **Test Admin Tabs Visibility**
   - Open User Management page
   - Switch browser to DevTools
   - Open Console, run: `console.log(localStorage.getItem('user'))`
   - Check `permissions` array
   - Verify only permitted tabs are visible

3. **Test Button States**
   - Go to Admin Management section
   - Look for "Add Admin" button
   - If user has `manage_admins` permission: Button should be enabled
   - If user lacks permission: Button should be disabled/hidden with tooltip

4. **Test Permission Denied View**
   - Manually edit localStorage (for testing):
     ```javascript
     // In Console:
     let user = JSON.parse(localStorage.getItem('user'));
     user.permissions = ['manage_users']; // Remove manage_admins
     localStorage.setItem('user', JSON.stringify(user));
     location.reload();
     ```
   - Go to Admin Management tab
   - Should see "Access Restricted - You don't have permission to manage admins"

### Option B: API Testing (Intermediate)

**Using Postman/cURL**:

1. **Get Auth Token**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```
   Copy token from response

2. **Test Protected Endpoint - Should Fail**
   ```bash
   curl -X POST http://localhost:5000/api/admin/staff \
     -H "Authorization: Bearer {TOKEN}" \
     -H "Content-Type: application/json" \
     -d '{
       "name":"Test Admin",
       "email":"newadmin@test.com",
       "role":"admin",
       "permissions":["manage_admins"]
     }'
   ```
   Expected response: `403 Forbidden`
   ```json
   {
     "message": "You do not have permission to create admin accounts",
     "code": "PERMISSION_DENIED"
   }
   ```

3. **Verify User with Permission Can Create**
   - Update admin in database to have `manage_admins` permission
   - Repeat request above
   - Should succeed with `201 Created`

### Option C: Automated Testing (Comprehensive)

**Create test file**: `Management/src/features/user-management/__tests__/permission.test.js`

```javascript
import { renderHook, act } from '@testing-library/react';
import { usePermission } from '../../../contexts/PermissionContext';
import { getAccessibleTabs } from '../utils/permissionUtils';

describe('Permission System', () => {
  
  test('User with manage_users only sees Website Users tab', () => {
    const mockContext = {
      hasPermission: (perm) => perm === 'manage_users',
      hasAllPermissions: () => false,
      hasAnyPermission: () => false
    };
    
    const tabs = getAccessibleTabs(mockContext);
    expect(tabs).toHaveLength(1);
    expect(tabs[0].label).toBe('Website Users');
  });

  test('User with manage_admins sees Admin Management tab', () => {
    const mockContext = {
      hasPermission: (perm) => perm === 'manage_admins',
      hasAllPermissions: () => false,
      hasAnyPermission: () => false
    };
    
    const tabs = getAccessibleTabs(mockContext);
    expect(tabs.some(t => t.label === 'Manage Admins')).toBe(true);
  });

  test('User with no permissions sees no tabs', () => {
    const mockContext = {
      hasPermission: () => false,
      hasAllPermissions: () => false,
      hasAnyPermission: () => false
    };
    
    const tabs = getAccessibleTabs(mockContext);
    expect(tabs).toHaveLength(0);
  });
});
```

## 📊 Test Matrix

| User Type | manage_users | manage_admins | manage_vendors | manage_sales_reps | Expected Behavior |
|-----------|:---:|:---:|:---:|:---:|---|
| Website User Manager | ✅ | ❌ | ❌ | ❌ | Only sees "Website Users" tab |
| Admin Manager | ❌ | ✅ | ❌ | ❌ | Only sees "Manage Admins" tab |
| Vendor Manager | ❌ | ❌ | ✅ | ❌ | Only sees "Vendor Partners" tab |
| Sales Manager | ❌ | ❌ | ❌ | ✅ | Only sees "Sales Representatives" tab |
| Full Admin | ✅ | ✅ | ✅ | ✅ | Sees all 4 tabs |
| No Permissions | ❌ | ❌ | ❌ | ❌ | Sees "No sections available" message |
| SuperAdmin | ✅ | ✅ | ✅ | ✅ | Sees all tabs (bypasses all checks) |

## 🔍 What to Look For

### Frontend Indicators
- [ ] Tabs filtered based on permissions
- [ ] Add/Edit/Delete buttons respond to permission state
- [ ] Error toasts appear when permission denied
- [ ] Permission denied modal shows helpful message
- [ ] No console errors about undefined permissions
- [ ] PermissionDeniedView displays correctly

### Backend Indicators
- [ ] Server logs show "Permission check failed" for unauthorized requests
- [ ] 403 responses for unauthorized API calls
- [ ] Users cannot be created beyond their permission scope
- [ ] Existing user editing respects role permissions
- [ ] SuperAdmins bypass all permission checks

### Console Checks
```javascript
// In browser console, verify:
JSON.parse(localStorage.getItem('user')).permissions // Should exist and be array
JSON.parse(localStorage.getItem('user')).role // Should be 'admin' or 'superAdmin'

// Check PermissionContext is loaded:
window.__PERMISSION_DEBUG__ // May vary by implementation
```

## ✅ Sign-Off Checklist

- [ ] Backend returns 403 for unauthorized API calls
- [ ] Frontend shows PermissionDeniedView when appropriate
- [ ] All 8 permissions work correctly
- [ ] Tab filtering works for all role combinations
- [ ] Button states update based on permissions
- [ ] Error messages are clear and helpful
- [ ] SuperAdmin bypasses all checks
- [ ] No console errors or warnings
- [ ] Toast notifications appear for permission denials
- [ ] Permission context loads on app startup

## 🐛 Troubleshooting

### Symptoms: All tabs visible despite limited permissions
**Solution**: 
1. Check localStorage user object has permissions array
2. Clear browser cache and localStorage
3. Verify PermissionProvider wraps App in main.jsx
4. Check browser console for errors

### Symptoms: Add Admin button always enabled
**Solution**:
1. Verify usePermission hook is imported in component
2. Check canManageAdmins = permission.hasPermission('manage_admins')
3. Verify button has proper disabled state binding
4. Check component re-renders when permissions change

### Symptoms: Backend returns 500 instead of 403
**Solution**:
1. Check checkAdminPermissionForRole function exists in admin.controller.js
2. Verify error is thrown correctly: `throw new AppError(..., 403)`
3. Check error middleware catches and responds with correct status

### Symptoms: PermissionContext undefined in components
**Solution**:
1. Verify PermissionProvider wraps App
2. Check usePermission hook import path is correct
3. Ensure component is inside Provider tree

---

**Ready to Test**: Yes ✅
**Estimated Time**: 15-30 minutes for full test suite
**Risk Level**: Low (read-only permission checks, non-destructive)
