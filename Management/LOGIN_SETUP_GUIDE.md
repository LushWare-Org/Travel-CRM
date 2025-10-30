# Management Portal Login Setup Guide

## Overview
A complete authentication system has been implemented for the Management Portal with:
- **Login Page** - Professional login UI with validation
- **Auth Context** - Global authentication state management
- **Protected Routes** - Route protection based on authentication
- **Backend Integration** - Connected to Express backend API
- **Logout Functionality** - Clean session management

## 📁 Files Created/Modified

### New Files Created:
1. **`src/contexts/AuthContext.jsx`** - Authentication context provider with hooks
2. **`src/pages/Login.jsx`** - Professional login page component
3. **`src/components/ProtectedRoute.jsx`** - Protected route wrapper for auth-only pages

### Modified Files:
1. **`src/App.jsx`** - Updated routing to include login and auth protection
2. **`src/main.jsx`** - Wrapped app with AuthProvider
3. **`src/pages/Sidebar.jsx`** - Added logout button and user info display
4. **`package.json`** - Removed 'wouter' dependency (replaced with react-router-dom)
5. **`.env`** - Added API URL configuration
6. **`vite.config.js`** - Updated environment variable handling

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- MongoDB running locally or connection string configured
- Backend server running on `http://localhost:5000`

### 1. Backend Setup

#### Create Admin User
```powershell
cd Server
npm run seed:admin
```

Or manually:
```powershell
node src/scripts/createAdmin.js
```

Default credentials will be created (check .env for customization):
- **Email**: `admin@tripskyway.com`
- **Password**: `Admin@123456`

#### Environment Variables (Server/.env)
```env
MONGODB_URI=mongodb://localhost:27017/tripskyway
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7
BCRYPT_ROUNDS=12
ADMIN_EMAIL=admin@tripskyway.com
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME=System Administrator
ADMIN_PHONE=1234567890
NODE_ENV=development
```

#### Start Backend Server
```powershell
cd Server
npm install
npm run dev
```

### 2. Management Frontend Setup

#### Install Dependencies
```powershell
cd Management
npm install
```

#### Environment Variables (Management/.env)
```env
VITE_API_URL=http://localhost:5000/api/v1
REACT_APP_API_URL=http://localhost:5000/api/v1
VITE_USE_API=true
REACT_APP_ENV=development
```

#### Start Development Server
```powershell
npm run dev
```

The app will open at `http://localhost:3000`

## 🔐 Authentication Flow

### Login Process
1. User navigates to `/login` page
2. Enters email and password
3. Frontend validates input
4. Sends credentials to backend: `POST /api/v1/auth/login`
5. Backend validates and returns JWT token
6. Token stored in `localStorage`
7. User redirected to dashboard

### Protected Routes
- Any route except `/login` requires authentication
- Unauthenticated users redirected to login page
- Role-based access control ready for implementation

### Logout Process
1. User clicks logout button in sidebar
2. Frontend calls `POST /api/v1/auth/logout`
3. Token cleared from localStorage
4. User redirected to login page

## 🧪 Test Credentials

### Default Admin User
```
Email: admin@tripskyway.com
Password: Admin@123456
Role: admin
```

### Test with curl
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tripskyway.com","password":"Admin@123456"}'

# Get current user (with token)
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 📝 API Endpoints Used

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login user |
| POST | `/auth/logout` | Logout user |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/change-password` | Change password |
| POST | `/auth/forgot-password` | Request password reset |
| PUT | `/auth/reset-password/:token` | Reset password |
| GET | `/auth/verify-email/:token` | Verify email |
| POST | `/auth/resend-verification` | Resend verification email |

## 🎨 UI Features

### Login Page
- Professional gradient background
- Email and password fields with validation
- Show/hide password toggle
- Loading state with spinner
- Error toast notifications
- Success toast notifications
- Test credentials display box

### Sidebar Updates
- User profile section showing name and role
- Logout button with confirmation
- Current user display
- Responsive design

### Error Handling
- Form validation (email format, password length)
- Backend error messages displayed as toast notifications
- Network error handling
- Expired token handling

## 🔧 Customization

### Change API URL
Edit `Management/.env`:
```env
VITE_API_URL=https://your-api-domain.com/api/v1
```

### Create Additional Admin/Staff Users
Use the backend's create staff endpoint or use the admin dashboard once it's built.

### Customize Login UI
Edit `src/pages/Login.jsx`:
- Modify colors in Tailwind classes
- Update logo/branding
- Add forgot password link
- Add sign up redirect

### Add Role-Based Routes
```jsx
<Route
  path="/admin-only"
  element={
    <ProtectedRoute requiredRoles={['admin']}>
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

## 🐛 Troubleshooting

### Login Not Working
1. ✅ Check if backend is running on port 5000
2. ✅ Verify MongoDB connection
3. ✅ Check `VITE_API_URL` in `.env`
4. ✅ Check browser console for errors

### CORS Errors
Ensure backend has CORS configured:
```javascript
// Server/src/config/cors.js
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
};
```

### Token Issues
1. Clear browser localStorage
2. Clear cookies
3. Restart both frontend and backend

### Database Issues
```powershell
# Reset and reseed admin
node src/scripts/createAdmin.js
```

## 📚 Additional Resources

### Backend Files
- `Server/src/controllers/auth.controller.js` - Auth logic
- `Server/src/routes/auth.routes.js` - Auth routes
- `Server/src/validators/auth.validator.js` - Input validation
- `Server/src/middleware/auth.js` - JWT verification

### Frontend Files
- `Management/src/contexts/AuthContext.jsx` - State management
- `Management/src/pages/Login.jsx` - Login UI
- `Management/src/App.jsx` - Routing configuration

## 🎯 Next Steps

1. ✅ Test login functionality
2. ✅ Create additional test users (salesRep, vendor)
3. ✅ Implement forgot password flow
4. ✅ Add role-based dashboard features
5. ✅ Implement email verification
6. ✅ Add 2FA (optional)
7. ✅ Build admin user management panel

## 📞 Support

For issues or questions about the authentication system, check:
- Browser console for errors
- Server logs
- Network tab in DevTools
- Backend error responses

---

**Created**: October 29, 2025
**Status**: Ready for Testing
