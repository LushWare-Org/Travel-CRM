# Force Password Reset Flow - Complete Documentation

## Overview
The "Force Password Reset" feature allows admins to reset any user's password by sending them a temporary password via email with login instructions.

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ ADMIN INTERFACE (Management App)                                 │
│ - Admin selects a user from the user list                        │
│ - Admin clicks "Force Password Reset" button                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ API REQUEST: POST /api/v1/admin/users/:id/reset-password         │
│ Route: admin.routes.js (line 42)                                 │
│ Controller: resetUserPassword (admin.controller.js)              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: VALIDATE REQUEST                                         │
│ ✓ Verify admin is authenticated (@protect middleware)            │
│ ✓ Verify admin has admin role (@authorize('admin') middleware)   │
│ ✓ Fetch user by ID from database                                 │
│ ✓ Check if user exists (throw 404 if not)                        │
│ ✓ Prevent admins from resetting other admin passwords (403)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: GENERATE TEMPORARY PASSWORD                              │
│ Function: generateTempPassword() (imported from utils)           │
│ Example output: "TempPass@2025#123"                              │
│                                                                  │
│ Update User Document:                                            │
│ - user.password = tempPassword (hashed)                          │
│ - user.isTempPassword = true                                     │
│ - user.mustChangePassword = true                                 │
│ - user.passwordChangedAt = Date.now()                            │
│ - await user.save()                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: SEND EMAIL WITH NEW CREDENTIALS                         │
│ Function: emailService.sendStaffCredentials()                    │
│ Method: Nodemailer (Gmail SMTP)                                  │
│                                                                  │
│ Email Contents:                                                  │
│ ✓ To: user.email                                                 │
│ ✓ Subject: "Welcome to Trip Sky Way - Your [Role] Account"       │
│ ✓ Body: HTML email with:                                         │
│   - User name greeting                                           │
│   - Role display (admin, salesRep, vendor, etc.)                 │
│   - Email address                                                │
│   - Temporary password                                           │
│   - "Login Now" button linking to CLIENT_URL/login               │
│   - Instructions to change password on first login               │
│                                                                  │
│ Email Configuration Used:                                        │
│ - HOST: smtp.gmail.com                                           │
│ - PORT: 587 (TLS/STARTTLS)                                        │
│ - FROM: EMAIL_FROM from .env                                     │
│ - USER: EMAIL_USER from .env                                     │
│ - PASSWORD: EMAIL_PASSWORD from .env                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: RETURN RESPONSE                                          │
│                                                                  │
│ SUCCESS (Email Sent):                                            │
│ {                                                                │
│   "status": "success",                                           │
│   "message": "Password reset successfully.                       │
│               New credentials sent to user email."               │
│ }                                                                │
│                                                                  │
│ FALLBACK (Email Failed):                                         │
│ {                                                                │
│   "status": "success",                                           │
│   "message": "Password reset successfully,                       │
│               but failed to send email.",                        │
│   "data": {                                                      │
│     "temporaryPassword": "TempPass@2025#123"                     │
│   }                                                              │
│ }                                                                │
│                                                                  │
│ Note: Even if email fails, password is still changed!            │
│ The temporary password is shown in response as backup.           │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: USER RECEIVES EMAIL & LOGS IN                            │
│                                                                  │
│ User receives email with:                                        │
│ ✓ Email address                                                  │
│ ✓ Temporary password                                             │
│ ✓ Login link                                                     │
│                                                                  │
│ User clicks "Login Now" button or navigates to:                  │
│ http://localhost:5173/login (CLIENT_URL from .env)              │
│                                                                  │
│ User enters credentials:                                         │
│ - Email: user's email                                            │
│ - Password: temporary password from email                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: FORCE PASSWORD CHANGE                                    │
│                                                                  │
│ On successful login, Client App detects:                         │
│ - user.isTempPassword === true                                   │
│ - user.mustChangePassword === true                               │
│                                                                  │
│ Action: Redirect to password change screen                       │
│ User MUST change password before accessing app                   │
│                                                                  │
│ After password change:                                           │
│ - isTempPassword = false                                         │
│ - mustChangePassword = false                                     │
│ - User can now use the app normally                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Locations & Code References

### 1. **Admin Route** (`admin.routes.js`)
```javascript
// Line 42
router.post('/users/:id/reset-password', resetUserPassword);
```
**Path:** `Server/src/routes/admin.routes.js`

### 2. **Controller** (`admin.controller.js`)
**Function:** `resetUserPassword`  
**Path:** `Server/src/controllers/admin.controller.js` (Lines 207-249)

**Key Code:**
```javascript
export const resetUserPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Prevent resetting other admin passwords
  if (user.role === 'admin' && user._id.toString() !== req.user.id.toString()) {
    throw new AppError('Cannot reset other admin passwords', 403);
  }

  // Generate new temporary password
  const tempPassword = generateTempPassword();

  user.password = tempPassword;
  user.isTempPassword = true;
  user.mustChangePassword = true;
  user.passwordChangedAt = Date.now();
  await user.save();

  try {
    // Send new credentials email
    await emailService.sendStaffCredentials(user, tempPassword, user.role);

    logger.info(`Password reset for user ${user.email} by admin`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully. New credentials sent to user email.',
    });
  } catch (err) {
    logger.error(`Failed to send password reset email: ${err.message}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully, but failed to send email.',
      data: {
        temporaryPassword: tempPassword, // Only show if email failed
      },
    });
  }
});
```

### 3. **Email Service** (`emailService.js`)
**Function:** `sendStaffCredentials`  
**Path:** `Server/src/utils/emailService.js` (Lines 130-161)

**Email Template:**
```javascript
async sendStaffCredentials(user, tempPassword, role) {
  const loginUrl = `${process.env.CLIENT_URL}/login`;
  let roleDisplay;
  if (role === 'salesRep') {
    roleDisplay = 'Sales Representative';
  } else if (role === 'vendor') {
    roleDisplay = 'Vendor';
  } else {
    roleDisplay = role;
  }
  
  const subject = `Welcome to Trip Sky Way - Your ${roleDisplay} Account`;
  const html = `
    <h1>Welcome to Trip Sky Way!</h1>
    <p>Dear ${user.name},</p>
    <p>An account has been created for you as a <strong>${roleDisplay}</strong>.</p>
    <h2>Your Login Credentials:</h2>
    <ul>
      <li><strong>Email:</strong> ${user.email}</li>
      <li><strong>Temporary Password:</strong> ${tempPassword}</li>
    </ul>
    <p><strong>Important:</strong> You must change this temporary password 
       on your first login for security reasons.</p>
    <a href="${loginUrl}" style="...">Login Now</a>
    <p>If you have any questions, please contact the administrator.</p>
    <p>Best regards,</p>
    <p>The Trip Sky Way Team</p>
  `;

  return this.sendEmail({
    to: user.email,
    subject,
    html,
  });
}
```

### 4. **User Model** (`user.model.js`)
**Fields Updated:**
```javascript
isTempPassword: {
  type: Boolean,
  default: false,
},
mustChangePassword: {
  type: Boolean,
  default: false,
},
passwordChangedAt: Date,
resetPasswordToken: String,
resetPasswordExpire: Date,
```

---

## Why Emails Might Not Be Sending

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **Email not sent** | Email service not connected | Check server logs for "Email service connected successfully" |
| **Email not sent** | sendStaffCredentials error not caught | Check server error logs for email errors |
| **Email verification fails** | SMTP credentials incorrect | Verify `.env` file has correct EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD |
| **Timeout** | Gmail blocking connection | Ensure EMAIL_SECURE=false and EMAIL_PORT=587 |
| **Auth error** | Gmail app password wrong | Verify EMAIL_PASSWORD in `.env` is correct 16-char app password |
| **Silent failure** | Error caught but response still 200 | Check server logs for error messages |

---

## Debug Steps

### 1. **Check Server Logs**
Look for these messages:

**Success indicators:**
```
✅ Email service configured: smtp.gmail.com:587 (Secure: false)
Email service connected successfully
```

**Error indicators:**
```
error: Email service verification failed: [error message]
error: Failed to send password reset email: [error message]
```

### 2. **Verify Email Configuration**
```bash
# Check .env file has all required fields
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=anuradhaanupamaherath@gmail.com
EMAIL_PASSWORD=raaqugmzimidaorw
EMAIL_FROM=Trip Sky Way <anuradhaanupamaherath@gmail.com>
```

### 3. **Check User Role**
Ensure the user being reset is not an admin (unless you're resetting your own password):
```javascript
// Only admins can reset non-admin passwords
// Admins can only reset their own password
```

### 4. **Verify Email Service Initialization**
The email service now uses **lazy initialization**:
- ✅ Service doesn't connect until first email is sent
- ✅ Verification happens after server startup
- ✅ Should see "Email service connected successfully" in logs within 5 seconds of startup

---

## Testing the Force Password Reset

### Using Management Interface:
1. Go to User Management section
2. Select a user
3. Click "Force Password Reset" button
4. Check:
   - Response message in UI
   - Server logs for email sent confirmation
   - Email inbox for welcome email with credentials

### Using API (cURL):
```bash
curl -X POST http://localhost:5000/api/v1/admin/users/[USER_ID]/reset-password \
  -H "Authorization: Bearer [ADMIN_TOKEN]" \
  -H "Content-Type: application/json"
```

### Expected Response (Success):
```json
{
  "status": "success",
  "message": "Password reset successfully. New credentials sent to user email."
}
```

### Expected Response (Email Failed):
```json
{
  "status": "success",
  "message": "Password reset successfully, but failed to send email.",
  "data": {
    "temporaryPassword": "TempPass@2025#123"
  }
}
```

---

## Key Differences from Admin Creation Email

| Aspect | Admin Creation | Force Password Reset |
|--------|---|---|
| **Trigger** | POST /admin/users (createStaff) | POST /admin/users/:id/reset-password |
| **Email Function** | emailService.sendStaffCredentials() | emailService.sendStaffCredentials() |
| **Password Type** | New temp password | New temp password |
| **User Flags** | isTempPassword=true, mustChangePassword=true | isTempPassword=true, mustChangePassword=true |
| **Email Template** | Same (staff credentials) | Same (staff credentials) |
| **Response Behavior** | Catch errors | Catch errors & show temp password if email fails |

**Note:** Both flows use the same email template! They're identical in terms of email sending.

---

## Troubleshooting Checklist

- [ ] Server is running and shows "Email service connected successfully"
- [ ] `.env` file has all EMAIL_* variables set correctly
- [ ] User being reset is not an admin (or is resetting own password)
- [ ] User has valid email address in database
- [ ] Gmail SMTP port 587 is accessible from your network
- [ ] EMAIL_PASSWORD in `.env` is the 16-character app password (no spaces)
- [ ] Check server logs for any error messages containing "email" or "mail"
- [ ] Verify email address in management interface shows correct target user
- [ ] Check spam/trash folders in email inbox
- [ ] Try creating a new staff member first to confirm email works

---

## Server Log Monitoring

**Terminal Command (PowerShell):**
```powershell
# Tail the server logs
Get-Content "C:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server\logs\combined.log" -Tail 50 -Wait
```

**Look for:**
- "Email service configured" ✅
- "Email service connected successfully" ✅
- "Invitation email sent to" ✅ (for admin creation)
- "Password reset for user" ✅ (for force password reset)
- Any ERROR messages related to email

---

## Related Documentation

- [Email Configuration Setup](./EMAIL_SERVICE_SETUP.md)
- [Admin Creation Complete Flow](./ADMIN_CREATION_COMPLETE_FLOW.md)
- [Nodemailer Configuration](./README.md)

