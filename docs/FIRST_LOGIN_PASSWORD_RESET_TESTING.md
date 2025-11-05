# First-Time Login Password Reset - Testing Guide

## 🚀 Quick Test (5 minutes)

### Before You Start
- Management UI should be running at `http://localhost:5174`
- Backend should be running at `http://localhost:5000`
- Email service should be configured (check console logs)

---

## Test 1: Create New Admin User

### Steps:
```
1. Log in to Management UI
   URL: http://localhost:5174/login
   Email: admin@tripskyway.com
   Password: Admin@123456

2. Go to: User Management → Admins tab
   
3. Click: "Create New Admin" button

4. Fill the form:
   Name: Test Admin
   Email: testadmin@example.com
   Phone: 1234567890
   Permissions: Check some boxes (e.g., "User Management")
   
5. Click: "Create Admin"

6. VERIFY: 
   ✓ Success message appears
   ✓ New admin appears in table
   ✓ Status shows: "🔐 Pending First Login"
   ✓ Email received (check console logs)
```

### What You Should See in Email:
```
Subject: Welcome to Trip Sky Way - Admin Account Created

Email: testadmin@example.com
Temporary Password: [some generated password]

Login: https://tripskiway.com/auth/invite/[admin-id]
```

---

## Test 2: Verify Status Persistence

### Steps:
```
1. Stay in Admin Management
   
2. Observe the table
   ✓ New admin shows: "🔐 Pending First Login"

3. Refresh page (F5 or Ctrl+R)

4. Observe the table again
   ✓ Status STILL shows: "🔐 Pending First Login"
   ✓ Status should NOT change after refresh!
```

### Expected Result:
Status remains "🔐 Pending First Login" after refresh ✅

---

## Test 3: First-Time Login Flow

### Steps:
```
1. Open new browser tab (or incognito window)
   
2. Note the temporary password from email
   Example: ABC123DEF456
   
3. Go to: http://localhost:5174/login
   
4. Enter credentials:
   Email: testadmin@example.com
   Password: [from email]
   
5. Click: "Sign In"

6. CRITICAL CHECK:
   ❌ Should NOT go to admin panel
   ✅ Should redirect to /reset-password
   
7. You should see:
   - "Reset Password" page
   - "Set your new permanent password"
   - Email field (pre-filled)
   - Temporary password field (pre-filled)
   - New password field
   - Confirm password field
```

### If You Go to Admin Panel Instead:
❌ **FIX DIDN'T WORK** - Check:
- Backend has `mustChangePassword: true` on user creation
- Frontend Login.jsx imports axios and checks response
- No browser cache issues (try incognito)

---

## Test 4: Password Reset Flow

### Steps:
```
1. On the Reset Password page:
   
2. Email should be: testadmin@example.com ✓
   
3. Temporary Password should be pre-filled ✓
   
4. Try entering WEAK password first:
   New Password: short1!
   
5. Click: "Reset Password"
   
6. VERIFY: Error message appears
   "Password must be at least 12 characters"

7. Now enter VALID password:
   New Password: NewTestAdmin@2024
   Confirm Password: NewTestAdmin@2024
   
8. Observe:
   ✓ Password strength meter shows "Strong" (Green)
   ✓ All requirements marked as complete (✓)
   ✓ "Passwords match!" message appears
   
9. Click: "Reset Password"

10. VERIFY:
    ✓ Success message appears
    ✓ Redirected to login page after 2 seconds
```

### Password Requirements Checklist:
```
Your new password must have ALL of these:

✓ At least 12 characters
  Example: "short1!" ← 7 chars, TOO SHORT ❌
  Example: "NewTestAdmin@2024" ← 17 chars ✅

✓ Uppercase letter (A-Z)
  Example: "newtestadmin@2024" ← no uppercase ❌
  Example: "NewTestAdmin@2024" ← has N and T ✅

✓ Lowercase letter (a-z)
  Example: "NEWTESTADMIN@2024" ← all uppercase ❌
  Example: "NewTestAdmin@2024" ← has many ✅

✓ Number (0-9)
  Example: "NewTestAdmin!" ← no number ❌
  Example: "NewTestAdmin@2024" ← has 2024 ✅

✓ Special character (!@#$%^&*)
  Example: "NewTestAdmin2024" ← no special char ❌
  Example: "NewTestAdmin@2024" ← has @ ✅
```

---

## Test 5: Login with New Password

### Steps:
```
1. On login page

2. Enter new credentials:
   Email: testadmin@example.com
   Password: NewTestAdmin@2024
   
3. Click: "Sign In"

4. VERIFY:
   ✓ Login successful
   ✓ Redirected to admin panel (Dashboard)
   ✓ Can access all features
   
5. Go back to User Management → Admins

6. Find the test admin user

7. VERIFY:
   ✓ Status now shows: "✓ Verified"
   ✓ NOT "🔐 Pending First Login"
```

---

## Test 6: Force Password Reset (Optional)

### Steps:
```
1. In Admin Management

2. Find the test admin user (status: "✓ Verified")

3. Click the "🔄 Rotate Icon" action button

4. In the dialog, click "Force Password Reset"

5. VERIFY:
   ✓ User status changes to "🔄 Password Reset Required"
   ✓ User receives email with new temporary password
   
6. Test admin needs to use /reset-password again with new temp password
```

---

## 🐛 Troubleshooting

### Problem: "Still goes to admin panel instead of /reset-password"

**Check #1: Backend User Creation**
```
1. Check server logs when creating admin
   Look for: "User created successfully"
   
2. Verify in database:
   db.users.findOne({email: "testadmin@example.com"})
   
   Should show:
   {
     "isTempPassword": true,
     "mustChangePassword": true,
     "isEmailVerified": true,
     ...
   }
```

**Check #2: Backend Login Response**
```
1. Use Postman or curl:
   POST http://localhost:5000/api/v1/auth/login
   
   Body:
   {
     "email": "testadmin@example.com",
     "password": "[temp password from email]"
   }
   
   Response should have:
   {
     "status": "success",
     "message": "Password change required",
     "data": {
       "mustChangePassword": true,
       "userId": "...",
       "email": "testadmin@example.com"
     }
   }
```

**Check #3: Frontend Login Code**
```
1. Check browser console (F12)
2. Look for any JavaScript errors
3. Verify axios import in Login.jsx
4. Check if response handling is working
```

### Problem: "Status changes after refresh"

**Check**: Use correct field for status
```javascript
// WRONG:
accountStatus: admin.isEmailVerified ? 'verified' : 'pending_first_login'

// CORRECT:
accountStatus: admin.mustChangePassword ? 'pending_password_reset' : (...)
```

### Problem: "Password reset page shows blank email"

**Check**: localStorage is being set
```javascript
// In Login.jsx handleSubmit:
localStorage.setItem('resetEmail', formData.email);
localStorage.setItem('tempPassword', formData.password);

// Clear browser cache/localStorage and try again
```

### Problem: "After password reset, can't log in with new password"

**Check**:
1. Verify password was saved in database
2. Try logging in with exact case (passwords are case-sensitive)
3. Check email confirmation was sent

---

## 📋 Test Checklist

Use this to verify all aspects are working:

### Creation & Status
- [ ] New admin created successfully
- [ ] Status shows "🔐 Pending First Login"
- [ ] Status persists after page refresh
- [ ] Email received with temporary password

### First Login
- [ ] Login with temp password redirects to /reset-password
- [ ] Email and temp password pre-filled on reset page
- [ ] Form prevents submission with weak password
- [ ] Strength meter shows real-time feedback

### Password Reset
- [ ] Can set valid password (12+ chars, upper, lower, number, special)
- [ ] Cannot set weak password
- [ ] Passwords match validation works
- [ ] Success message appears

### Final Login
- [ ] Can log in with new password
- [ ] Redirected to admin panel
- [ ] Status changes to "✓ Verified"
- [ ] All admin features accessible

---

## 📊 Success Criteria

All of these should be TRUE for the fix to be complete:

```
✅ Status shows "🔐 Pending First Login" for new admin users
✅ Status persists after page refresh
✅ Temporary password login redirects to /reset-password
✅ Reset password page has pre-filled credentials
✅ Weak passwords are rejected
✅ Strong passwords are accepted
✅ After reset, user can log in normally
✅ After reset, status shows "✓ Verified"
✅ New permanent password works for login
✅ Temporary password no longer works for login
```

---

## 🎯 Next Steps After Testing

1. **If all tests pass** ✅
   - Feature is ready for production
   - Document in release notes
   - Consider adding email notification for admin when user completes setup

2. **If any test fails** ❌
   - Check the troubleshooting section
   - Review the code changes
   - Check server/browser logs
   - Re-read FIRST_LOGIN_PASSWORD_RESET_FIX.md

---

**Last Updated**: November 3, 2025  
**Test Duration**: ~10-15 minutes  
**Difficulty**: Easy  
**Status**: Ready to Test ✅
