# Architecture & Component Relationships

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB BROWSER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            React Application (Port 3000)                │   │
│  │  ┌─────────────┐   ┌──────────────┐   ┌────────────┐   │   │
│  │  │  Login Page │   │   Dashboard  │   │  Sidebar   │   │   │
│  │  │             │   │              │   │            │   │   │
│  │  │  • Form UI  │──▶│ • Protected  │◀──│ • Logout   │   │   │
│  │  │  • Validate │   │   Route      │   │ • Profile  │   │   │
│  │  │  • Submit   │   │              │   │            │   │   │
│  │  └─────────────┘   └──────────────┘   └────────────┘   │   │
│  │         ▲                  ▲                             │   │
│  │         │                  │                             │   │
│  │         └──────────────────┴─────────────────┐          │   │
│  │                                              │          │   │
│  │         ┌──────────────────────────────────┐│          │   │
│  │         │     AuthContext Provider         ││          │   │
│  │         │  (Global Auth State Management)  ││          │   │
│  │         │                                  ││          │   │
│  │         │  • user (User object)            ││          │   │
│  │         │  • token (JWT)                   ││          │   │
│  │         │  • isAuthenticated (boolean)     ││          │   │
│  │         │  • loading (boolean)             ││          │   │
│  │         │                                  ││          │   │
│  │         │  Methods:                        ││          │   │
│  │         │  • login()                       ││          │   │
│  │         │  • logout()                      ││          │   │
│  │         │  • updateProfile()               ││          │   │
│  │         │  • changePassword()              ││          │   │
│  │         │  • hasRole()                     ││          │   │
│  │         └──────────────────────────────────┘│          │   │
│  │                                              │          │   │
│  │         ┌───────────────────────────────────┘          │   │
│  │         │                                               │   │
│  │         ▼                                               │   │
│  │   ┌─────────────────┐                                   │   │
│  │   │   localStorage  │                                   │   │
│  │   │                 │                                   │   │
│  │   │  • token (JWT)  │                                   │   │
│  │   │  • user (JSON)  │                                   │   │
│  │   └─────────────────┘                                   │   │
│  │                                                          │   │
│  │         ┌──────────────────────────────────────┐        │   │
│  │         │        axios Instance                │        │   │
│  │         │  (HTTP Client)                       │        │   │
│  │         │                                      │        │   │
│  │         │  Default Header:                     │        │   │
│  │         │  Authorization: Bearer <token>      │        │   │
│  │         └──────────────────────────────────────┘        │   │
│  │                      │                                   │   │
│  │                      │ HTTP(S)                           │   │
│  │                      ▼                                   │   │
│  └──────────────────────┼────────────────────────────────────┘  │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         ▼                                         │
│              Backend API Server (Port 5000)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           Express.js Application                          │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Routes (auth.routes.js)                │  │  │
│  │  │  POST   /auth/login                                 │  │  │
│  │  │  POST   /auth/logout                                │  │  │
│  │  │  GET    /auth/me                    [protected]     │  │  │
│  │  │  PUT    /auth/profile               [protected]     │  │  │
│  │  │  PUT    /auth/change-password       [protected]     │  │  │
│  │  │  POST   /auth/forgot-password                       │  │  │
│  │  │  PUT    /auth/reset-password/:token                 │  │  │
│  │  │  GET    /auth/verify-email/:token                   │  │  │
│  │  │  POST   /auth/resend-verification   [protected]     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │         Controllers (auth.controller.js)            │  │  │
│  │  │  • login()              - Validate & issue token    │  │  │
│  │  │  • logout()             - Clear session             │  │  │
│  │  │  • getMe()              - Return user data          │  │  │
│  │  │  • updateProfile()      - Update user info          │  │  │
│  │  │  • changePassword()     - Update password           │  │  │
│  │  │  • forgotPassword()     - Send reset email          │  │  │
│  │  │  • resetPassword()      - Reset with token          │  │  │
│  │  │  • verifyEmail()        - Mark email verified       │  │  │
│  │  │  • resendVerification() - Send verification email   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │         Middleware (auth.js)                        │  │  │
│  │  │  • JWT verification                                 │  │  │
│  │  │  • Token extraction                                 │  │  │
│  │  │  • User population                                  │  │  │
│  │  │  • Access control                                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │       Data Models (user.model.js)                   │  │  │
│  │  │  • name                                             │  │  │
│  │  │  • email (unique)                                   │  │  │
│  │  │  • password (hashed)                                │  │  │
│  │  │  • role (admin, salesRep, vendor, customer)         │  │  │
│  │  │  • isEmailVerified                                  │  │  │
│  │  │  • isActive                                         │  │  │
│  │  │  • tokens (reset, verification)                     │  │  │
│  │  │  • timestamps (created, updated, lastLogin)         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │          Database (MongoDB)                         │  │  │
│  │  │  • users collection                                 │  │  │
│  │  │  • Indexes on email, role                           │  │  │
│  │  │  • TTL on verification tokens                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagrams

### Login Flow
```
┌─────────────┐
│   User      │
│ Opens App   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  AuthProvider.useEffect()       │
│  Check localStorage for token   │
└──────┬──────────────────────────┘
       │
       ▼
   ┌───────────────┐
   │ Has Valid     │
   │ Token?        │
   └───┬───────┬───┘
       │       │
    YES│       │NO
       │       ▼
       │   Redirect to
       │   /login page
       │
       ▼
┌──────────────────────────────┐
│  User sees Login Form        │
│  - Email input               │
│  - Password input            │
│  - Submit button             │
└──────┬───────────────────────┘
       │
       │ User enters credentials
       │ and clicks Submit
       │
       ▼
┌──────────────────────────────┐
│  Frontend Validates:         │
│  - Email format              │
│  - Password length (6+)      │
│  - Both fields required      │
└──────┬───────────────────────┘
       │
       │ Validation passes
       │
       ▼
┌──────────────────────────────┐
│  axios.post(                 │
│   /auth/login,               │
│   { email, password }        │
│  )                           │
└──────┬───────────────────────┘
       │
       │ HTTP POST
       │
       ▼
┌──────────────────────────────┐
│  Backend:                    │
│  auth.controller.login()     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Check if user exists        │
│  Check if password correct   │
│  Check if account active     │
└──────┬───────────────────────┘
       │
       ▼
   ┌───────────────┐
   │ Credentials   │
   │ Valid?        │
   └───┬───────┬───┘
       │       │
    YES│       │NO
       │       ▼
       │   Return 401
       │   Error message
       │
       ▼
┌──────────────────────────────┐
│  Generate JWT token          │
│  Set last login time         │
│  Return user data + token    │
└──────┬───────────────────────┘
       │
       │ HTTP 200
       │
       ▼
┌──────────────────────────────┐
│  Frontend receives:          │
│  - token (JWT)               │
│  - user object               │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Save in:                    │
│  - localStorage              │
│  - AuthContext state         │
│  - axios default headers     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│  Display success toast       │
│  Redirect to /dashboard      │
│  Show user in sidebar        │
└──────────────────────────────┘
```

### Protected Route Access
```
┌──────────────────┐
│  User visits:    │
│  /dashboard      │
│  /leads          │
│  /billing        │
│  etc.            │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ ProtectedRoute Component     │
│ Checks Auth Status           │
└────────┬─────────────────────┘
         │
         ▼
     ┌─────────────┐
     │ Loading?    │
     └─┬───────┬───┘
       │       │
      YES      NO
       │       │
       │       ▼
       │   ┌──────────────────┐
       │   │ isAuthenticated? │
       │   └─┬────────┬───────┘
       │    YES       NO
       │     │         │
       ▼     │         ▼
    Loading  │     Redirect to
    Spinner  │     /login
             │
             ▼
         ┌───────────────┐
         │ RequiredRole? │
         └─┬───────┬─────┘
          YES     NO
           │       │
           │       ▼
           │   Render
           │   Component
           │   (Access Granted)
           │
           ▼
       ┌──────────────────┐
       │ hasRole?         │
       └─┬────────┬───────┘
        YES       NO
         │        │
         │        ▼
         │    Show:
         │    Access Denied
         │    Message
         │
         ▼
     Render
     Component
     (Access Granted)
```

### Logout Flow
```
┌─────────────────┐
│  User clicks    │
│  "Logout"       │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│  setIsLoggingOut     │
│  (true)              │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  axios.post(         │
│   /auth/logout       │
│  )                   │
└────────┬─────────────┘
         │
         │ HTTP POST with token
         │
         ▼
┌──────────────────────┐
│  Backend:            │
│  - Clear session     │
│  - Return success    │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Frontend:           │
│  - Remove from       │
│    localStorage      │
│  - Clear state       │
│  - Clear axios       │
│    headers           │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Show success toast  │
│  Redirect to /login  │
└──────────────────────┘
```

## 📦 Component Hierarchy

```
App (Routing)
├── Router
│   ├── /login → Login Component
│   │   ├── Form
│   │   │   ├── Email Input
│   │   │   ├── Password Input
│   │   │   └── Submit Button
│   │   └── Test Credentials Info
│   │
│   └── /dashboard & other routes
│       ├── Sidebar
│       │   ├── Navigation Items
│       │   ├── User Profile Section
│       │   │   ├── User Avatar/Name
│       │   │   └── User Role
│       │   └── Logout Button
│       │
│       └── Main Content
│           ├── Dashboard
│           ├── LeadManagement
│           ├── ItineraryGeneration
│           ├── BillingInvoicing
│           └── UserManagement
│
└── Toaster (React Hot Toast)
    └── Toast Notifications
```

## 🔗 Component Props & Context Usage

### AuthContext Provides
```javascript
{
  // State
  user: {
    id: string,
    name: string,
    email: string,
    role: 'admin' | 'salesRep' | 'vendor' | 'customer',
    phone: string,
    avatar: object | null,
    isEmailVerified: boolean,
    mustChangePassword: boolean
  } | null,
  
  loading: boolean,
  isAuthenticated: boolean,
  token: string | null,
  
  // Methods
  login: async (email: string, password: string) => Promise<boolean>,
  logout: async () => Promise<void>,
  updateProfile: async (profileData: object) => Promise<boolean>,
  changePassword: async (currentPassword: string, newPassword: string) => Promise<boolean>,
  hasRole: (role: string | string[]) => boolean
}
```

### Login Component Props
- No props (uses useAuth hook)

### ProtectedRoute Props
```javascript
{
  children: React.ReactNode,
  requiredRoles?: string | string[]  // Optional role check
}
```

### Sidebar Component Props
- No props (uses useAuth & useNavigate hooks)

## 📊 State Management Flow

```
App
  │
  ├── AuthProvider
  │   │
  │   ├── Initialize from localStorage
  │   │
  │   ├── Provide Context
  │   │   │
  │   │   ├── useAuth() in Login
  │   │   │   └── call login()
  │   │   │       └── update state
  │   │   │           └── re-render
  │   │   │
  │   │   └── useAuth() in Sidebar
  │   │       └── call logout()
  │   │           └── update state
  │   │               └── re-render
  │   │
  │   └── localStorage synchronization
  │       └── Persists state between sessions
  │
  └── Router
      └── Routes rendered based on auth state
```

## 🔐 Security Layer Flow

```
HTTP Request
    │
    ▼
CORS Check
    ├── Origin in whitelist?
    ├── Methods allowed?
    └── Headers allowed?
    │
    ▼
Rate Limiter (auth routes)
    ├── Max 5 requests per 15 min
    └── IP based throttling
    │
    ▼
Route Handler
    │
    ▼
Validator Middleware
    ├── Joi schema validation
    ├── Input sanitization
    └── Type checking
    │
    ▼
Auth Middleware (if protected)
    ├── Extract token from header
    ├── Verify JWT signature
    ├── Check token expiration
    ├── Get user from DB
    └── Attach to req.user
    │
    ▼
Controller
    ├── Business logic
    ├── Database queries
    └── Response formatting
    │
    ▼
Response
    └── Secure headers applied
```

## 💾 Data Persistence

```
Browser Session
└── localStorage
    ├── token (JWT)
    │   └── Sent with every API request
    │       └── In Authorization header
    │
    └── user (JSON)
        └── Display in UI
            └── Check user role
```

```
Server Session
└── Database (MongoDB)
    ├── User Document
    │   ├── Credentials (hashed)
    │   ├── Profile info
    │   ├── Email verification status
    │   ├── Password reset token
    │   └── Last login
    │
    └── Used for
        ├── Login validation
        ├── Profile updates
        ├── Email verification
        └── Password reset
```

## ✨ Summary

This architecture ensures:
- ✅ **Security** - JWT, bcrypt, validation at every layer
- ✅ **Performance** - Efficient state management, no unnecessary renders
- ✅ **Scalability** - Modular components, easy to extend
- ✅ **Maintainability** - Clear separation of concerns
- ✅ **User Experience** - Smooth flows, helpful error messages

---

**Diagram created**: October 29, 2025
**Version**: 1.0.0
