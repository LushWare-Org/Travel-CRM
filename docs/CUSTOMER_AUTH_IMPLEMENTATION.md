# Backend & Frontend Integration Guide - Login & Registration

## Overview
This document explains the complete setup and implementation of customer login/registration with backend-frontend integration.

---

## ✅ What Has Been Implemented

### 1. **Backend (Already Exists)**
- ✅ Authentication routes: `/api/v1/auth/register` and `/api/v1/auth/login`
- ✅ Email verification system
- ✅ Password reset functionality
- ✅ JWT token generation
- ✅ User model with validation
- ✅ Rate limiting on auth routes

### 2. **Frontend - New Implementation**

#### A. **Auth Service** (`Client/src/services/authService.js`)
A centralized API client with:
- **Axios instance** with request/response interceptors
- **Auto token injection** in Authorization headers
- **Auto token refresh** on 401 responses
- **Error handling** with consistent format
- **Methods for:**
  - `register()` - Register new customer
  - `login()` - Login user
  - `logout()` - Logout user
  - `getCurrentUser()` - Fetch current user profile
  - `updateProfile()` - Update user details
  - `changePassword()` - Change password
  - `forgotPassword()` - Request password reset
  - `resetPassword()` - Reset password with token
  - `verifyEmail()` - Verify email address
  - `resendVerification()` - Resend verification email

#### B. **Auth Context** (`Client/src/contexts/AuthContext.jsx`)
Global state management for authentication:
- **State:**
  - `user` - Current user object
  - `token` - JWT token
  - `isLoading` - Loading state
  - `isAuthenticated` - Auth status
  - `error` - Error messages

- **Methods:**
  - `register()` - Register user
  - `login()` - Login user
  - `logout()` - Logout user
  - `updateProfile()` - Update profile
  - `changePassword()` - Change password
  - `forgotPassword()` - Request reset
  - `resetPassword()` - Reset password
  - `verifyEmail()` - Verify email
  - `resendVerification()` - Resend verification

- **Features:**
  - Auto-initializes from localStorage
  - Persists token/user on login
  - Clears on logout
  - useAuth hook for easy access

#### C. **Protected Routes** (`Client/src/components/ProtectedRoute.jsx`)
Route wrapper for authentication:
- Checks if user is authenticated
- Optional role-based access control
- Auto-redirects to login if not authenticated
- Shows loading state while checking auth

#### D. **Updated Login Component** (`Client/src/pages/Login.jsx`)
Complete login/registration UI:
- **Features:**
  - Toggle between login and registration modes
  - Form validation
  - Password visibility toggle
  - Error/success messages
  - Loading states on submit button
  - Phone number field (optional)
  - Responsive design

- **Integration:**
  - Uses `useAuth` hook for auth operations
  - Auto-redirects on successful login/register
  - Displays validation errors
  - Clears errors on input change

#### E. **App.jsx Updates**
- Wrapped app with `AuthProvider`
- Provides auth context to entire app

---

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Backend server running on `http://localhost:5001`
- MongoDB connection active

### Backend Setup

1. **Navigate to server directory:**
   ```powershell
   cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Create `.env` file** with:
   ```env
   PORT=5001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   API_VERSION=v1
   ```

4. **Start the server:**
   ```powershell
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

   ✅ **Server should be running at:** `http://localhost:5001`

### Frontend Setup

1. **Navigate to client directory:**
   ```powershell
   cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Client"
   ```

2. **Dependencies are already installed** (axios is included in package.json)

3. **Verify API config** in `Client/src/utils/apiConfig.js`:
   ```javascript
   export const API_BASE_URL = "http://localhost:5001/api";
   ```

4. **Start the frontend:**
   ```powershell
   npm run dev
   ```

   ✅ **Frontend should be running at:** `http://localhost:5173` or similar

---

## 📋 Usage Examples

### Using Auth in Components

```jsx
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const { user, login, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      navigate('/dashboard');
    } catch (error) {
      console.error(error.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  if (isAuthenticated) {
    return (
      <div>
        <p>Welcome, {user.name}!</p>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return <button onClick={handleLogin}>Login</button>;
}
```

### Creating Protected Routes

```jsx
// In App.jsx
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';

<Route 
  path="/dashboard" 
  element={<ProtectedRoute Component={Dashboard} />} 
/>

// For admin-only routes
<Route 
  path="/admin" 
  element={<ProtectedRoute Component={AdminPanel} requiredRoles="admin" />} 
/>
```

### Manual API Calls

```jsx
import authService from '../services/authService';

// Register
const result = await authService.register(
  'John Doe',
  'john@example.com',
  'password123',
  'password123',
  '1234567890'
);

// Login
const result = await authService.login(
  'john@example.com',
  'password123'
);

// Get stored user
const user = authService.getStoredUser();

// Get token
const token = authService.getToken();

// Check authentication
if (authService.isAuthenticated()) {
  // User is logged in
}
```

---

## 🔑 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new customer | ❌ No |
| POST | `/api/v1/auth/login` | Login user | ❌ No |
| POST | `/api/v1/auth/logout` | Logout user | ✅ Yes |
| GET | `/api/v1/auth/me` | Get current user profile | ✅ Yes |
| PUT | `/api/v1/auth/profile` | Update user profile | ✅ Yes |
| PUT | `/api/v1/auth/change-password` | Change password | ✅ Yes |
| POST | `/api/v1/auth/forgot-password` | Request password reset | ❌ No |
| PUT | `/api/v1/auth/reset-password/:token` | Reset password with token | ❌ No |
| GET | `/api/v1/auth/verify-email/:token` | Verify email address | ❌ No |
| POST | `/api/v1/auth/resend-verification` | Resend verification email | ✅ Yes |

---

## 📝 Request/Response Format

### Register Request
```json
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "1234567890"
}
```

### Register Response (Success)
```json
{
  "status": "success",
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "phone": "1234567890",
      "avatar": null,
      "isEmailVerified": false,
      "mustChangePassword": false
    }
  }
}
```

### Login Response (Success)
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "phone": "1234567890",
      "avatar": null,
      "isEmailVerified": true,
      "mustChangePassword": false
    }
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Invalid credentials",
  "statusCode": 401
}
```

---

## 🛡️ Security Features

✅ **Token Management:**
- JWT tokens stored in localStorage
- Auto-injected in Authorization header
- Auto-cleared on logout
- Automatically redirects to login on 401

✅ **Rate Limiting:**
- Auth endpoints rate-limited to prevent brute force
- Built into backend

✅ **Input Validation:**
- Frontend form validation (email, password strength)
- Backend validation with Joi schema

✅ **HTTPS/Cookies:**
- Cookies set as httpOnly in production
- Secure flag for HTTPS environments

---

## 🔧 Troubleshooting

### ❌ "Cannot read properties of undefined (reading '_handleError')"
**Cause:** Using `this._handleError` instead of `authService._handleError`
**Status:** ✅ **FIXED** in current implementation

### ❌ "net::ERR_CONNECTION_REFUSED"
**Cause:** Backend server not running
**Solution:** Start backend server with `npm start`

### ❌ "CORS error"
**Cause:** CORS not properly configured
**Solution:** Check `Server/src/config/cors.js` includes frontend origin

### ❌ "Token not included in requests"
**Cause:** Token not in localStorage
**Solution:** Ensure user is logged in and token is persisted

### ❌ "401 Unauthorized"
**Cause:** Invalid/expired token
**Solution:** Auto-redirects to login, user needs to re-authenticate

---

## 🧪 Testing Steps

### Manual Testing Flow

1. **Start both servers:**
   ```powershell
   # Terminal 1 - Backend
   cd Server
   npm start
   
   # Terminal 2 - Frontend
   cd Client
   npm run dev
   ```

2. **Test Registration:**
   - Go to `http://localhost:5173/login`
   - Click "Register" tab
   - Fill in all fields
   - Click "Create Account"
   - Check for success/error messages

3. **Test Login:**
   - Use registered email/password
   - Should redirect to home page
   - User should be visible in localStorage

4. **Test Protected Routes:**
   - Try accessing protected pages without auth
   - Should redirect to login

5. **Test Logout:**
   - Click logout
   - Should clear token/user
   - Redirect to home

---

## 📦 File Structure

```
Trip-Sky-Way/
├── Client/
│   ├── src/
│   │   ├── services/
│   │   │   └── authService.js          ✨ NEW - Auth API client
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx         ✨ NEW - Auth global state
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx      ✨ NEW - Protected route wrapper
│   │   ├── pages/
│   │   │   └── Login.jsx               ✏️  UPDATED - Backend integration
│   │   ├── utils/
│   │   │   └── apiConfig.js            (Existing)
│   │   └── App.jsx                     ✏️  UPDATED - Added AuthProvider
│   └── package.json
│
└── Server/
    ├── src/
    │   ├── controllers/
    │   │   └── auth.controller.js      (Existing)
    │   ├── routes/
    │   │   └── auth.routes.js          (Existing)
    │   ├── middleware/
    │   │   └── auth.js                 (Existing)
    │   ├── validators/
    │   │   └── auth.validator.js       (Existing)
    │   └── models/
    │       └── user.model.js           (Existing)
    └── .env
```

---

## 🎯 Next Steps

1. ✅ Test the complete flow
2. ✅ Verify email functionality (if email service is configured)
3. ✅ Add password reset page
4. ✅ Add email verification page
5. ✅ Add user profile page
6. ✅ Implement remember me functionality
7. ✅ Add two-factor authentication (optional)

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Check network tab to see API responses
4. Review server logs for backend errors

---

**Last Updated:** November 12, 2025
**Version:** 1.0
