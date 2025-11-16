# Password Reset Feature - Quick Start Guide

## 🚀 Quick Access

| Purpose | URL/Link |
|---------|----------|
| **Reset Password Page** | `http://localhost:5174/reset-password` |
| **Login Page** | `http://localhost:5174/login` |
| **Backend Endpoint** | `POST /api/v1/auth/reset-temp-password` |

## 📝 For Users: How to Reset Your Password

### You've Just Received an Invitation Email? 

**Follow these 5 simple steps:**

#### 1️⃣ **Open the Reset Page**
```
Go to: http://localhost:5174/reset-password
```

#### 2️⃣ **Find Your Email**
- Look for the email address in your invitation
- Example: `john.doe@example.com`

#### 3️⃣ **Get Your Temporary Password**
- Check your invitation email
- Find the line that says: `Temporary Password: XXX`
- Copy it exactly (including capitals, numbers, and symbols)

#### 4️⃣ **Create Your New Password**
Your password MUST have:
- ✅ At least **12 characters** long
- ✅ At least 1 **UPPERCASE** letter (A-Z)
- ✅ At least 1 **lowercase** letter (a-z)
- ✅ At least 1 **number** (0-9)
- ✅ At least 1 **special character** (!@#$%^&*)

**Good Examples:**
- ✅ `MySecure@Pass2024`
- ✅ `WorkPassword#2024`
- ✅ `TravelGuide!123`

**Bad Examples:**
- ❌ `short123` (too short, no special char)
- ❌ `nocapital123!` (no uppercase)
- ❌ `NOLOWERCASE123!` (no lowercase)
- ❌ `NoNumbers!` (no number)
- ❌ `NoSpecial123` (no special character)

#### 5️⃣ **Submit & Login**
- Click "Reset Password" button
- Wait for success message
- Go to login page: `http://localhost:5174/login`
- Enter your email and new password
- Done! ✅

## 👨‍💼 For Administrators: How to Create User Accounts

### Create New User

1. Go to **User Management** section
2. Click **"Create New User"** button
3. Fill in:
   - Name
   - Email
   - Role (Admin, Sales Rep, etc.)
   - Status (Active/Inactive)
4. Click **"Create User"**
5. System automatically:
   - Generates temporary password
   - Sends invitation email with temporary password
   - User gets reset password notification

### What User Receives

The user will receive an email with:
```
Subject: Your Trip Sky Way Account Credentials

Hello John,

Your account has been created.

Email: john@tripskyway.com
Temporary Password: TempPass@123

You must reset this to a permanent password.

Go to: http://localhost:5174/reset-password
```

### Follow Up

- Share the reset password link with the user
- They should receive the invitation email automatically
- If they don't get the email, check your email configuration

## 🔐 Common Password Examples (For Testing)

### Valid Passwords (Will Work)
```
AdminPass@2024
SecurePassword123!
MyTrip@Sky2024
WorkPassword#2024
ValidPass!123456
```

### Invalid Passwords (Will NOT Work)
```
short1!          ← Too short (only 8 chars)
nouppercase123!  ← Missing uppercase
NOLOWERCASE123!  ← Missing lowercase  
NoNumbers!       ← Missing number
NoSpecial123     ← Missing special character
```

## 🛠️ API Reference for Developers

### Endpoint Details

**URL**: `POST /api/v1/auth/reset-temp-password`

**Request Body**:
```json
{
  "email": "user@example.com",
  "currentPassword": "TemporaryPassword123!",
  "newPassword": "NewPermanentPassword123!",
  "confirmPassword": "NewPermanentPassword123!"
}
```

**Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Password reset successful. You can now log in with your new password.",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@tripskyway.com",
      "role": "salesRep"
    }
  }
}
```

**Error Response (400/401/404)**:
```json
{
  "status": "error",
  "message": "Invalid temporary password"
}
```

## 🧪 Testing Checklist

- [ ] Create a new user in User Management
- [ ] Receive invitation email with temporary password
- [ ] Go to reset password page
- [ ] Try weak password (should show error)
- [ ] Try matching passwords (should show checkmark)
- [ ] Submit valid password
- [ ] See success message
- [ ] Login with new password works
- [ ] Old temporary password doesn't work

## ❓ Frequently Asked Questions

### Q: I forgot my temporary password
**A**: Ask the administrator to send you the invitation email again. Click "Resend Invitation" if available.

### Q: The password strength indicator says "Weak"
**A**: Add more variety! Include uppercase, lowercase, numbers, AND special characters.

### Q: How long is the temporary password valid?
**A**: Typically 24 hours. After that, ask administrator for a new invitation.

### Q: Can I change my password after I set it?
**A**: Yes! Once logged in, go to your profile settings and use "Change Password".

### Q: What if I see "Invalid temporary password"?
**A**: Make sure you copied it exactly from the email, including capitals and special characters.

## 📞 Need Help?

- **Technical Issues**: Contact the administrator
- **Lost Password**: Use "Forgot Password" on login page
- **Can't Access Email**: Contact administrator to resend invitation
- **Password Not Meeting Requirements**: Check against all 5 criteria above

---

**Last Updated**: November 3, 2025  
**Feature Status**: ✅ Ready to Use
