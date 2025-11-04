# Sales Rep Management - Full Stack Integration Guide

## 🎯 Overview
Complete MERN stack integration of Sales Rep Management following industry best practices. This guide documents the architecture, implementation, and testing procedures.

---

## 📋 Architecture Overview

### Tech Stack
- **Backend**: Express.js, MongoDB (Mongoose), Node.js
- **Frontend**: React, Axios, React Router, React Hot Toast
- **Authentication**: JWT with role-based access control (RBAC)
- **Validation**: Joi (backend), client-side validation (frontend)
- **Email Service**: NodeMailer integration for credential delivery

### API Specification
**Base URL**: `http://localhost:5000/api/v1/sales-reps`

---

## 🔧 Backend Implementation

### 1. Routes (`/Server/src/routes/salesRep.routes.js`)

#### Endpoint Summary
```
GET    /                          # Get all sales reps (with filtering/pagination)
POST   /                          # Create new sales rep
GET    /stats                     # Get sales rep statistics
GET    /:id                       # Get single sales rep
GET    /:id/performance           # Get sales rep performance metrics
PUT    /:id                       # Update sales rep details
PATCH  /:id/commission            # Update commission rate
PATCH  /:id/toggle-status        # Toggle active status
POST   /:id/reset-password       # Force password reset
DELETE /:id                       # Delete sales rep permanently
```

#### Authentication & Authorization
- **All routes protected**: `protect` middleware (JWT verification)
- **All routes admin-only**: `authorize('admin')` middleware
- **Input validation**: `validateRequest` middleware with Joi schemas

### 2. Validators (`/Server/src/validators/salesRep.validator.js`)

#### Validation Schemas

**createSalesRepSchema**
```javascript
{
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address'
  }),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Phone number must be exactly 10 digits'
  }),
  commissionRate: Joi.number().min(0).max(100).default(10)
}
```

**updateSalesRepSchema** (same fields, all optional)

**updateCommissionSchema**
```javascript
{
  commissionRate: Joi.number().min(0).max(100).required()
}
```

**Query Parameters** (for GET /)
- `page` (default: 1) - pagination page
- `limit` (default: 10, max: 100) - items per page
- `sort` (default: '-createdAt') - sort field
- `search` - search by name, email, or phone
- `isActive` - filter by active status
- `isEmailVerified` - filter by verification status

### 3. Controller (`/Server/src/controllers/salesRep.controller.js`)

#### Key Functions

**getAllSalesReps()**
- Implements advanced filtering (role, isActive, isEmailVerified)
- Full-text search on name, email, phone
- Sorting and pagination with metadata
- Returns optimized data using `.lean()`

**createSalesRep()**
- Validates phone format (10 digits)
- Checks email uniqueness
- Validates commission rate (0-100)
- Generates temporary 12-character password with all character types
- Sends invitation email via emailService
- Returns created sales rep with all fields

**updateSalesRep()**
- Validates all update fields
- Checks email uniqueness if email is being updated
- Updates only provided fields
- Returns updated sales rep

**resetSalesRepPassword()**
- Generates new temporary password
- Sends password reset email
- Updates password reset flags in database
- Logs audit trail

**toggleSalesRepStatus()**
- Soft-delete via isActive flag
- Preserves historical data
- Logs status changes

**deleteSalesRep()**
- Hard delete with audit warning
- Logs deletion for compliance

**getSalesRepStats()**
- Returns aggregate statistics:
  - `total` - total sales reps
  - `active` - active sales reps
  - `inactive` - deactivated sales reps
  - `verified` - email-verified sales reps

#### Error Handling
All functions use consistent error handling:
```javascript
try {
  // Operation
  logger.info('Operation successful');
  res.status(200).json({
    status: 'success',
    data: result,
    message: 'Operation completed'
  });
} catch (error) {
  throw new AppError(error.message, 500);
}
```

### 4. Server Integration (`/Server/src/server.js`)

```javascript
// Import
import salesRepRoutes from './routes/salesRep.routes.js';

// Register
app.use(`/api/${API_VERSION}/sales-reps`, salesRepRoutes);
```

---

## 💻 Frontend Implementation

### 1. Service Layer (`/Management/src/services/salesRep.service.js`)

#### Core API Methods

```javascript
// CRUD Operations
getAllSalesReps(params)        // Get paginated list with filtering
getSalesRepById(id)            // Get single rep
createSalesRep(data)           // Create new rep
updateSalesRep(id, data)       // Update rep
deleteSalesRep(id)             // Delete rep

// Special Operations
toggleSalesRepStatus(id, isActive)    // Activate/deactivate
updateCommissionRate(id, rate)        // Update commission
resetSalesRepPassword(id)             // Force password reset
getSalesRepStats()                    // Get statistics
getSalesRepPerformance(id)            // Get performance metrics

// Utility Methods
validateSalesRepData(data)     // Client-side validation
formatDate(date)               // Format for display
formatDateTime(date)           // Format with time
calculateConversionRate(converted, assigned)  // Calculate %
handleError(error)             // Standardized error handling
```

#### Error Handling Strategy

Each method catches errors and returns standardized format:
```javascript
{
  status: 'error' | 'success',
  message: 'Technical message',
  userMessage: 'User-friendly message',
  details: { /* backend response */ }
}
```

Status-specific messages:
- **400**: "Invalid input. Please check your data."
- **401**: "Unauthorized. Please log in again."
- **403**: "You do not have permission to perform this action."
- **404**: "Sales representative not found."
- **409**: "This email is already in use."
- **500**: "Server error. Please try again later."

### 2. Component Implementation (`SalesRepManagement.jsx`)

#### State Management

```javascript
// Data State
const [salesReps, setSalesReps] = useState([])
const [stats, setStats] = useState({ total, active, totalLeads, totalEarnings, avgConversion })

// UI State
const [isLoading, setIsLoading] = useState(true)
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState('')

// Dialog State
const [showNewRepDialog, setShowNewRepDialog] = useState(false)
const [showEditRepDialog, setShowEditRepDialog] = useState(false)
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
const [showResendInviteConfirm, setShowResendInviteConfirm] = useState(false)
const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false)

// Form State
const [formData, setFormData] = useState({
  name: '', email: '', phone: '', commissionRate: 10, targetLeads: 50
})
```

#### Lifecycle

**Initial Load** (useEffect with empty dependency array)
```javascript
useEffect(() => {
  loadSalesReps()      // Load first page with pagination
  loadStats()          // Load statistics
}, [])
```

**Search/Pagination** (useEffect with [currentPage, searchTerm])
```javascript
useEffect(() => {
  if (salesReps.length > 0 || searchTerm) {
    loadSalesReps()    // Reload with new filters
  }
}, [currentPage, searchTerm])
```

#### Core Operations

**Create** 
```
Form Validation → API Call → Success Toast → Reload Data → Close Dialog
```

**Edit**
```
Open Dialog with Pre-filled Data → Form Validation → API Call → Success Toast → Reload Data
```

**Delete**
```
Show Confirmation → API Call → Success Toast → Reset Pagination → Reload Data
```

**Resend Invitation**
```
Show Confirmation → API Call (resetPassword) → Success Toast → Reload Data
```

**Password Reset**
```
Show Confirmation → API Call (resetPassword) → Success Toast → Reload Data
```

#### Loading States
- Global loader while fetching data
- Button disabled during submission
- Input fields disabled during submission
- Toasts for success/error feedback

---

## 🔌 API Integration Points

### Request/Response Flow

**Create Sales Rep**
```
Frontend                     Backend
   │                           │
   ├─ POST /sales-reps ───────>│
   │  {name, email, phone, commissionRate}
   │                           ├─ Validate input
   │                           ├─ Check email uniqueness
   │                           ├─ Generate temp password
   │                           ├─ Create user record
   │                           ├─ Send invitation email
   │                           │
   │<─ 201 Created ────────────┤
   │  {status: 'success', data: {user}}
   │
   ├─ Show success toast
   ├─ Reload data
   └─ Close dialog
```

**Get All Sales Reps**
```
Frontend                     Backend
   │                           │
   ├─ GET /sales-reps ────────>│
   │  ?page=1&limit=10&search=john
   │                           ├─ Parse query params
   │                           ├─ Apply filters
   │                           ├─ Execute search
   │                           ├─ Sort results
   │                           ├─ Paginate
   │                           │
   │<─ 200 OK ──────────────────┤
   │  {status: 'success', data: {
   │     reps: [...],
   │     pagination: {page, pages, limit, total}
   │  }}
   │
   └─ Update table with data
```

### Error Scenarios

**Duplicate Email**
```
Frontend → POST /sales-reps with existing email
           ↓
Backend  → Email uniqueness check fails
           ↓
Response → 409 Conflict
           {
             status: 'error',
             message: 'Email already exists',
             userMessage: 'This email is already in use.'
           }
           ↓
Frontend → Display: "This email is already in use."
```

**Invalid Phone**
```
Frontend → POST /sales-reps with invalid phone
           ↓
Backend  → Joi validation fails
           ↓
Response → 400 Bad Request
           {
             status: 'error',
             message: 'Phone number must be exactly 10 digits',
             details: { errors: [...] }
           }
           ↓
Frontend → Extract and display validation error
```

---

## ✅ Testing Procedures

### Unit Tests (Backend)

**Controller Tests**
```javascript
describe('Sales Rep Controller', () => {
  describe('createSalesRep', () => {
    it('should create sales rep with valid data', async () => {
      // Test valid creation
    })
    
    it('should reject duplicate email', async () => {
      // Test email uniqueness
    })
    
    it('should validate phone format', async () => {
      // Test 10-digit requirement
    })
    
    it('should validate commission rate (0-100)', async () => {
      // Test commission bounds
    })
    
    it('should send invitation email', async () => {
      // Test email service integration
    })
  })
  
  describe('getAllSalesReps', () => {
    it('should filter by isActive status', async () => { })
    it('should search by name/email/phone', async () => { })
    it('should paginate results', async () => { })
    it('should sort by specified field', async () => { })
  })
})
```

### Integration Tests (Frontend-Backend)

**Create Sales Rep Flow**
```javascript
test('Complete create sales rep flow', async () => {
  // 1. Open dialog
  // 2. Fill form with valid data
  // 3. Submit
  // 4. Verify API call
  // 5. Check success toast
  // 6. Verify table updates
  // 7. Close dialog
})
```

**Error Handling Flow**
```javascript
test('Handle duplicate email error', async () => {
  // 1. Try to create with existing email
  // 2. Verify error message
  // 3. Check form remains open
})
```

### Manual Testing Checklist

- [ ] **Create Sales Rep**
  - [ ] Valid data creates rep
  - [ ] Duplicate email rejected
  - [ ] Invalid phone rejected
  - [ ] Commission rate validated (0-100)
  - [ ] Invitation email sent
  - [ ] Table updates immediately

- [ ] **Edit Sales Rep**
  - [ ] Dialog opens with current data
  - [ ] Updates persist
  - [ ] Email uniqueness checked
  - [ ] Table reflects changes

- [ ] **Delete Sales Rep**
  - [ ] Confirmation dialog appears
  - [ ] Confirmed deletion works
  - [ ] Cancelled deletion doesn't delete
  - [ ] Table updates immediately

- [ ] **Password Reset**
  - [ ] Reset email sent
  - [ ] User receives email
  - [ ] New temporary password works

- [ ] **Search & Filter**
  - [ ] Search by name works
  - [ ] Search by email works
  - [ ] Filter by status works
  - [ ] Pagination works

- [ ] **Statistics**
  - [ ] Total count correct
  - [ ] Active count correct
  - [ ] Conversion rate accurate
  - [ ] Updates after changes

---

## 📊 Data Structures

### User Model (Backend)
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  role: 'salesRep',
  password: String,
  commissionRate: Number (0-100),
  
  // Account Status
  isActive: Boolean,
  isEmailVerified: Boolean,
  isTempPassword: Boolean,
  mustChangePassword: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  
  // Security
  passwordChangeRequiredAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}
```

### API Response Format
```javascript
{
  status: 'success' | 'error',
  data: {
    // For single resource
    user: { ...userFields }
    
    // For list
    reps: [{ ...userFields }],
    pagination: {
      page: Number,
      pages: Number,
      limit: Number,
      total: Number
    }
    
    // For stats
    total: Number,
    active: Number,
    totalLeads: Number,
    avgConversion: Number
  },
  message: String
}
```

---

## 🔐 Security Features

### Authentication
- JWT tokens required for all endpoints
- Token validation via `protect` middleware
- Role-based authorization (admin-only)

### Password Security
- Temporary passwords: 12 characters minimum
- Requirements: uppercase, lowercase, numbers, symbols
- Expiration: 48 hours for temporary, 90 days for permanent
- Must reset on first login
- Hashed in database with bcrypt

### Data Validation
- Joi schema validation on all inputs
- Email uniqueness enforced
- Phone format enforced (10 digits)
- Commission rate bounded (0-100)

### Email Delivery
- Uses NodeMailer for sending credentials
- Fallback handling if email fails
- Audit logging of all email attempts

### Audit Trail
- All operations logged with timestamp
- User actions tracked
- Email sending logged
- Errors captured for debugging

---

## 🚀 Deployment Considerations

### Environment Variables (Backend)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

NODE_ENV=production
API_PORT=5000
API_VERSION=v1
```

### Environment Variables (Frontend)
```env
VITE_API_BASE_URL=https://api.tripskiway.com/api/v1
VITE_APP_NAME=Trip Sky Way
```

### Performance Optimizations
- Backend uses `.lean()` for read operations
- Pagination limits (default 10, max 100)
- Database indexes on frequently queried fields
- Email service runs asynchronously
- Frontend lazy loading for dialog components

### Monitoring
- Log all operations for audit trail
- Monitor email delivery success rate
- Track API response times
- Alert on high error rates

---

## 📝 Common Issues & Solutions

### Issue: Email Not Sending
**Solution**: Check emailService configuration and error logs
```
Backend: Check email service credentials
Logger: Search for email delivery errors
Email Service: Verify SMTP settings and authentication
```

### Issue: Duplicate Email Validation Fails
**Solution**: Database has existing record
```
Check: User collection for duplicate emails
Fix: Clean duplicate records or update logic
```

### Issue: Pagination Shows Wrong Total
**Solution**: Search query not returning all results
```
Check: Search filter implementation
Fix: Verify query parameters are passed correctly
```

### Issue: Commission Rate Not Updating
**Solution**: Validation might be rejecting value
```
Check: Value is between 0-100
Check: Type is number, not string
Check: Form sends correct field name
```

---

## 📚 Additional Resources

### Backend API Documentation
- Routes: `/Server/src/routes/salesRep.routes.js`
- Validators: `/Server/src/validators/salesRep.validator.js`
- Controller: `/Server/src/controllers/salesRep.controller.js`

### Frontend Code
- Service: `/Management/src/services/salesRep.service.js`
- Component: `/Management/src/features/user-management/components/SalesRepManagement/SalesRepManagement.jsx`
- Table: `/Management/src/features/user-management/components/SalesRepManagement/SalesRepTable.jsx`

### Related Documentation
- Admin Management: Similar pattern for admin management
- User Authentication: JWT flow and middleware
- Email Service: SendGrid/NodeMailer configuration
- Error Handling: AppError utility and error middleware

---

## ✨ Best Practices Implemented

### Backend
✅ RESTful API design
✅ Joi schema validation
✅ Comprehensive error handling
✅ Async/await with try-catch
✅ Logging for audit trail
✅ Input sanitization
✅ Database optimization (lean queries)
✅ Consistent response format
✅ Role-based access control
✅ Email service integration

### Frontend
✅ Custom API service layer
✅ React hooks for state management
✅ Loading states and error boundaries
✅ Form validation
✅ Toast notifications
✅ Proper cleanup (useEffect)
✅ Disabled states during submission
✅ User-friendly error messages
✅ Loading skeletons
✅ Pagination support

---

## 🎉 Summary

This Sales Rep Management system demonstrates a production-grade MERN implementation with:
- Robust backend API following RESTful conventions
- Comprehensive frontend integration with real-time data binding
- Industry-standard security practices
- Proper error handling and user feedback
- Scalable architecture ready for additional features

The system is ready for deployment and can be extended with:
- Performance metrics tracking (leads, conversions)
- Commission calculation and reporting
- Lead management integration
- Advanced analytics dashboards
