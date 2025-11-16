# Force Password Reset - Quick Troubleshooting Guide

## Current Status ✅

**Email Service: ACTIVE AND WORKING**

Latest confirmation (Nov 3, 22:26:07):
```
✅ Email service configured: smtp.gmail.com:587 (Secure: false)
✅ Email service connected successfully
```

**Admin Creation Emails: CONFIRMED WORKING**

Log entry from Nov 3, 20:27:03:
```
✅ Email sent successfully to anuradhaherath2001@gmail.com
✅ Invitation email sent to anuradhaherath2001@gmail.com
```

---

## Why Force Password Reset May Not Be Sending Emails

The **force password reset** feature is implemented but there are several possible reasons it's not sending:

### 1. **Email Not Actually Being Triggered**
   - **Check**: Did you click "Force Password Reset" in the Management UI?
   - **Verify**: Look for this log entry:
     ```
     Password reset for user [email] by admin
     ```
   - If this isn't in logs, the endpoint wasn't called

### 2. **User Being Reset is an Admin**
   - **Issue**: You cannot force reset another admin's password (security restriction)
   - **Code Location**: `admin.controller.js`, lines 213-215
   - **Message**: Returns 403 Forbidden
   - **Solution**: Only reset non-admin users (salesRep, vendor, customer, etc.)

### 3. **Email Sending Failed but Response Still Shows Success**
   - **Issue**: Error is caught but returns 200 OK with fallback message
   - **Check Logs**: Look for:
     ```
     Failed to send password reset email: [error]
     ```
   - **Response Shows**: Temporary password in response body
   - **Action**: Email failed but password IS changed - use temp password from response

### 4. **Email Configuration Issue**
   - **Signs**: "Email configuration is incomplete" in logs
   - **Solution**: Restart server to reload `.env` variables
   - **Verify**: Server logs should show:
     ```
     ✅ Email service configured: smtp.gmail.com:587 (Secure: false)
     Email service connected successfully
     ```

---

## How to Test Force Password Reset

### Step 1: Verify Setup
✅ Confirm admin creation emails work (test one first if needed)  
✅ Check server is running and shows "Email service connected successfully"

### Step 2: Force Reset a Non-Admin User
1. Login to Management interface as admin
2. Go to **User Management** section
3. Find a **non-admin user** (not another admin)
4. Click **"Force Password Reset"** button
5. Check UI response message

### Step 3: Monitor Server Logs
In a separate terminal, watch logs:
```powershell
Get-Content "C:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server\logs\combined.log" -Tail 50 -Wait | Select-String "Password reset|email|Email"
```

### Step 4: Check Email
1. Open email inbox for the user that was reset
2. Look for email subject: `"Welcome to Trip Sky Way - Your [Role] Account"`
3. Should contain:
   - Email address
   - Temporary password
   - Login link to http://localhost:5173/login

---

## Expected Log Entries

### Success Flow:
```
✅ Email service configured: smtp.gmail.com:587 (Secure: false)
✅ Email service connected successfully
Password reset for user [email@example.com] by admin
Email sent successfully: [message-id] to [email@example.com]
```

### Error Flow (Still Changes Password):
```
Error sending email to [email]: [error message]
Failed to send password reset email: [error message]
```
*Response will include temporary password as fallback*

### Permission Error:
```
Cannot reset other admin passwords
```
*Response: 403 Forbidden*

---

## API Endpoint Details

**Endpoint:** `POST /api/v1/admin/users/:id/reset-password`

**Requirements:**
- ✅ Must be authenticated (have JWT token)
- ✅ Must have admin role
- ✅ User ID must exist
- ✅ Target user must NOT be an admin (unless resetting own)

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/admin/users/USER_ID/reset-password \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successfully. New credentials sent to user email."
}
```

**Error Response:**
```json
{
  "status": "fail",
  "message": "Cannot reset other admin passwords"
}
```

---

## Code Locations

| Component | File | Line(s) |
|-----------|------|---------|
| **Route Definition** | `admin.routes.js` | 42 |
| **Controller Function** | `admin.controller.js` | 207-249 |
| **Email Function** | `emailService.js` | 130-161 |
| **User Model** | `user.model.js` | 66-67, 106-115 |

---

## Comparing Admin Creation vs Force Password Reset

Both use the **exact same email function**: `sendStaffCredentials()`

| Aspect | Admin Creation | Force Password Reset |
|--------|---|---|
| **Endpoint** | `POST /api/v1/admin/users` | `POST /api/v1/admin/users/:id/reset-password` |
| **Email Function** | `sendStaffCredentials()` | `sendStaffCredentials()` |
| **Email Template** | Same | Same |
| **Temp Password** | Yes | Yes |
| **Flags Set** | isTempPassword=true, mustChangePassword=true | Same |
| **Error Handling** | Catches & logs | Catches & logs |

**So if admin creation works, force password reset SHOULD work too!**

---

## Quick Debug Checklist

- [ ] Server shows "Email service connected successfully" in logs
- [ ] You're resetting a **non-admin** user
- [ ] User exists in database
- [ ] Check Gmail inbox for the email (check spam folder)
- [ ] Verify `.env` has correct EMAIL_* variables
- [ ] Check server logs for error messages containing "email" or "password"
- [ ] If password changed but no email, use temp password from response
- [ ] Confirm Management UI button is actually labeled "Force Password Reset"
- [ ] Check browser console for any error messages
- [ ] Try with a different user if first attempt was an admin

---

## Next Steps

1. **Test Now**: Follow the testing steps above
2. **Monitor**: Watch server logs in real-time
3. **Report**: If it doesn't work, provide:
   - Exact error message from UI
   - Server log entries (last 20 lines)
   - User role being reset (admin, salesRep, vendor, etc.)
   - Email configuration in `.env`

---

## References

- [Full Force Password Reset Flow](./FORCE_PASSWORD_RESET_FLOW.md)
- [Email Service Setup](./EMAIL_SERVICE_SETUP.md)
- [Admin Creation Complete Flow](./ADMIN_CREATION_COMPLETE_FLOW.md)

