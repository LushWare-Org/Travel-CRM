# Quick Start Checklist - Backend & Frontend Integration

## ⚡ Start Here

### 1. Backend Server Setup (CRITICAL)

- [ ] Navigate to server directory:
  ```powershell
  cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server"
  ```

- [ ] Install dependencies:
  ```powershell
  npm install
  ```

- [ ] Check `.env` file exists with:
  ```
  PORT=5001
  MONGODB_URI=<your_connection_string>
  JWT_SECRET=<your_secret>
  NODE_ENV=development
  ```

- [ ] Start backend server:
  ```powershell
  npm start
  ```
  
  **Verify:** You should see:
  ```
  🚀 Server is running on http://localhost:5001
  ```

### 2. Frontend Server Setup

- [ ] Navigate to client directory:
  ```powershell
  cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Client"
  ```

- [ ] Verify `axios` is in package.json:
  ```powershell
  npm list axios
  ```

- [ ] Start frontend:
  ```powershell
  npm run dev
  ```
  
  **Verify:** Frontend opens at `http://localhost:5173` (or similar)

### 3. Test Login Page

- [ ] Go to: `http://localhost:5173/login`
- [ ] Verify you see Login/Register form
- [ ] Check browser console has **NO** errors

### 4. Test Registration Flow

- [ ] Fill in registration form:
  - Full Name: `Test User`
  - Email: `test@example.com`
  - Password: `test123456`
  - Confirm Password: `test123456`
  - Phone: `1234567890` (optional)

- [ ] Click "Create Account"
- [ ] **Expected Results:**
  - ✅ No console errors
  - ✅ Loading spinner appears
  - ✅ Success message or error message
  - ✅ If success: redirects to home page

### 5. Test Login Flow

- [ ] Use the email/password from registration
- [ ] Click "Sign In"
- [ ] **Expected Results:**
  - ✅ No console errors
  - ✅ Loading spinner appears
  - ✅ Success message or error message
  - ✅ If success: redirects to home page
  - ✅ User data visible in browser DevTools → Application → localStorage

### 6. Verify Token Storage

Open browser DevTools → Application → localStorage:
- [ ] `token` key exists with JWT value
- [ ] `user` key exists with user object (JSON)

Example:
```
token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
user: {"id":"507f...","name":"Test User","email":"test@example.com",...}
```

---

## 🔍 Common Issues & Fixes

### ❌ "Failed to load resource: net::ERR_CONNECTION_REFUSED"

**Problem:** Backend not running
**Fix:** 
1. Open new terminal
2. Start backend: `npm start` in Server folder
3. Verify: `http://localhost:5001/health` should work

### ❌ "Cannot read properties of undefined (reading '_handleError')"

**Status:** ✅ **Already Fixed**
- Updated all error handling to use `authService._handleError`
- No action needed

### ❌ Form not submitting / button not responding

**Causes:**
- Frontend not running
- Browser console errors
- Invalid form data

**Fix:**
1. Check browser console (F12)
2. Check all fields are filled correctly
3. Verify backend is running

### ❌ CORS errors in console

**Problem:** Frontend can't communicate with backend
**Fix:**
1. Check backend CORS config: `Server/src/config/cors.js`
2. Ensure it includes: `http://localhost:5173`
3. Restart backend server

### ❌ "Invalid credentials"

**Problem:** Email/password incorrect
**Fix:**
1. Use exact email/password from registration
2. Verify no typos
3. Try with fresh test account

---

## 📊 Testing Checklist

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| Registration | ✅ | ✅ | Ready |
| Login | ✅ | ✅ | Ready |
| Token Storage | ✅ | ✅ | Ready |
| Protected Routes | ✅ | ✅ | Ready |
| Error Handling | ✅ | ✅ | Ready |
| Auto Redirect | ✅ | - | Ready |
| Email Verification | - | ✅ | Needs Frontend Page |
| Password Reset | - | ✅ | Needs Frontend Page |
| Logout | ✅ | ✅ | Ready |

---

## 🎯 Next Steps After Testing

1. **Create Password Reset Page:**
   - Create `Client/src/pages/ForgotPassword.jsx`
   - Use `authService.forgotPassword()` and `authService.resetPassword()`

2. **Create Email Verification Page:**
   - Create `Client/src/pages/VerifyEmail.jsx`
   - Use `authService.verifyEmail()`

3. **Create User Profile Page:**
   - Create `Client/src/pages/Profile.jsx`
   - Use `authService.updateProfile()`

4. **Update Header Component:**
   - Show user name when logged in
   - Add logout button
   - Use `useAuth()` hook

5. **Add Remember Me:**
   - Save email to localStorage (optional)
   - Auto-fill on return

---

## 💡 Pro Tips

✅ **Use React DevTools:**
- Install: https://reactjs.org/link/react-devtools
- View Auth context in Components tab

✅ **Use Redux DevTools (if using Redux later):**
- Monitor all state changes

✅ **Use Postman for API Testing:**
- Test endpoints directly
- Verify backend before frontend testing

✅ **Enable verbose logging:**
- Add `console.log` in authService for debugging

---

## 📞 Quick Reference

**Important URLs:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`
- API: `http://localhost:5001/api/v1`
- Health Check: `http://localhost:5001/health`

**Important Files:**
- Auth Service: `Client/src/services/authService.js`
- Auth Context: `Client/src/contexts/AuthContext.jsx`
- Login Component: `Client/src/pages/Login.jsx`
- Protected Routes: `Client/src/components/ProtectedRoute.jsx`
- Backend Auth Controller: `Server/src/controllers/auth.controller.js`

---

**Version:** 1.0  
**Last Updated:** November 12, 2025
