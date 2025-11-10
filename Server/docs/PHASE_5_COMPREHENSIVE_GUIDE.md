# Phase 5: Data Validation & Business Logic - Comprehensive Guide

## 🎯 Phase 5 Overview

Phase 5 focuses on **business logic enforcement** and **data validation** at the service layer. While Phase 4 secures your system, Phase 5 makes it **smart** by enforcing business rules.

---

## 🏗️ What Phase 5 Builds On

### Phase 1-4 Provides:
```
✅ Authentication (JWT tokens)
✅ Authorization (role-based access)
✅ Audit logging (track operations)
✅ Route validation (Joi schemas)
✅ Error handling (centralized)
```

### Phase 5 Adds:
```
🆕 Service layer validation
🆕 Business rule enforcement
🆕 State management
🆕 Intelligent duplicate handling
🆕 Role transition logic
```

---

## 📋 Phase 5: 4 Core Tasks

### Task 1: Comprehensive Input Validation & Sanitization 🔍

**Current State:**
```javascript
✅ Joi schema validation exists (email, phone, name, password)
⚠️ Basic validation only
❌ No cross-field validation
❌ No sanitization layer
❌ No business rule validation
❌ No async validation (checking uniqueness)
```

**What Task 1 Adds:**

**1. ValidationService Utility**
```javascript
// New: utils/validationService.js

export class ValidationService {
  // Email validation
  validateEmail(email) {
    // ✓ Check format
    // ✓ Check not disposable domain
    // ✓ Return { valid, error, suggestion }
  }
  
  // Phone validation with formatting
  validatePhone(phone) {
    // ✓ Check format
    // ✓ Auto-format to standard
    // ✓ Detect country code
    // ✓ Return formatted phone
  }
  
  // Name validation
  validateName(name) {
    // ✓ Check length (2-50 chars)
    // ✓ Allow special chars in names (O'Brien)
    // ✓ Reject numbers-only
    // ✓ Trim whitespace
  }
  
  // Password strength checking
  validatePassword(password) {
    // ✓ Min 8 characters
    // ✓ Require uppercase
    // ✓ Require lowercase
    // ✓ Require number
    // ✓ Require special char
    // ✓ Check against common passwords
    // ✓ Return { strength, errors, suggestions }
  }
  
  // URL validation
  validateUrl(url) {
    // ✓ Check valid URL format
    // ✓ Check allowed protocols
    // ✓ Return normalized URL
  }
}
```

**2. DataSanitizer Utility**
```javascript
// New: utils/sanitizer.js

export class DataSanitizer {
  // Trim and normalize text
  sanitizeText(text) {
    return text.trim().replace(/\s+/g, ' ')
  }
  
  // Lowercase email
  sanitizeEmail(email) {
    return email.toLowerCase().trim()
  }
  
  // Format phone (remove non-digits)
  sanitizePhone(phone) {
    return phone.replace(/\D/g, '')
  }
  
  // Escape dangerous characters
  sanitizeHtml(html) {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
}
```

**3. Business Rule Validation**
```javascript
// In user.service.js or validation.service.js

async validateUserData(userData) {
  // 1. Validate each field
  this.validationService.validateEmail(userData.email)
  this.validationService.validatePhone(userData.phone)
  this.validationService.validateName(userData.name)
  this.validationService.validatePassword(userData.password)
  
  // 2. Sanitize fields
  userData.email = this.sanitizer.sanitizeEmail(userData.email)
  userData.name = this.sanitizer.sanitizeText(userData.name)
  userData.phone = this.sanitizer.sanitizePhone(userData.phone)
  
  // 3. Business rules
  await this.checkEmailUnique(userData.email)
  await this.checkPhoneUnique(userData.phone)
  this.validateRole(userData.role)
  
  // 4. Cross-field validation
  if (userData.password !== userData.confirmPassword) {
    throw new Error('Passwords do not match')
  }
  
  return userData // Cleaned and validated
}
```

**Time Estimate:** 45-60 minutes  
**Files:** ~250 lines total  
**Complexity:** LOW-MEDIUM

---

### Task 2: Duplicate Email & Unique Field Checks 🔎

**Current State:**
```javascript
✅ MongoDB unique index on email
✅ Basic duplicate error handling
❌ No pre-check before save
❌ No helpful error messages
❌ No duplicate resolution
❌ No email suggestion
```

**What Task 2 Adds:**

**1. Pre-emptive Duplicate Checking**
```javascript
// Before saving user to database:
async createUser(userData) {
  // Check if email already exists
  const existing = await User.findOne({ 
    email: userData.email.toLowerCase() 
  })
  
  if (existing) {
    if (existing.isActive) {
      // Email actively in use
      throw new AppError('Email already registered', 409)
    } else {
      // Offer reactivation option
      throw new AppError(
        'Email exists but account inactive. Reactivate?',
        409,
        { suggestion: 'reactivate', userId: existing._id }
      )
    }
  }
  
  // Safe to create new user
  return await User.create(userData)
}
```

**2. Availability Check Endpoints**
```javascript
// New endpoints for frontend

GET /api/v1/users/check/email?email=test@example.com
Response: { available: false, inUse: true, suggestion: 'reactivate' }

GET /api/v1/users/check/phone?phone=1234567890
Response: { available: true }

GET /api/v1/users/suggest/email?email=gmial.com
Response: { 
  suggestions: ['gmail.com', 'yahoo.com', 'outlook.com'],
  closestMatch: 'gmail.com'
}
```

**3. Fuzzy Matching for Similar Emails**
```javascript
// Detect common typos:
gmial.com → gmail.com
gmai.com → gmail.com
gogle.com → google.com

// Uses Levenshtein distance algorithm
// Suggests alternatives with high confidence
```

**4. DuplicateDetector Service**
```javascript
// New: utils/duplicateDetector.js

export class DuplicateDetector {
  // Check if email exists
  async findDuplicateEmail(email, excludeUserId) {
    return User.findOne({
      email: email.toLowerCase(),
      _id: { $ne: excludeUserId }
    })
  }
  
  // Find similar emails
  findSimilarEmails(email) {
    // Typo detection
    // Returns matches and scores
  }
  
  // Generate alternatives
  suggestEmailAlternatives(email) {
    // gmail.com, yahoo.com, outlook.com
    // Returns list of common alternatives
  }
}
```

**Time Estimate:** 45-60 minutes  
**Files:** ~200 lines total  
**Complexity:** MEDIUM

---

### Task 3: Status Transition State Management 🔄

**Current State:**
```javascript
✅ isActive boolean field
✅ toggleUserStatus() function
⚠️ Very basic (only two states)
❌ No transition rules
❌ No transition history
❌ No guard conditions
```

**What Task 3 Adds:**

**1. Multi-State System**
```javascript
// User statuses:
const UserStatus = {
  PENDING: 'pending',        // Awaiting email verification
  ACTIVE: 'active',          // Normal active user
  INACTIVE: 'inactive',      // Deactivated/archived
  SUSPENDED: 'suspended',    // Temporarily blocked
  RESTRICTED: 'restricted',  // Limited access
  DELETED: 'deleted'         // Soft-deleted
}

// Valid transitions:
PENDING  → ACTIVE (after email verification)
PENDING  → DELETED (expire after 24h)
ACTIVE   → INACTIVE (user or admin deactivates)
ACTIVE   → SUSPENDED (admin only)
ACTIVE   → DELETED (admin, irreversible)
INACTIVE → ACTIVE (reactivate)
SUSPENDED → ACTIVE (admin only)
RESTRICTED → ACTIVE (admin)
```

**2. Status Transition Service**
```javascript
// New: utils/statusTransition.js

export class StatusTransitionManager {
  // Check if transition allowed
  canTransition(currentStatus, newStatus, userRole) {
    // Validates against rules
    // Returns { allowed, reason, guards }
  }
  
  // Get available transitions for user
  getAvailableTransitions(user) {
    // Returns next valid states for this user
    // Considers user role, account status, etc.
  }
  
  // Execute transition with guards
  async executeTransition(user, newStatus, metadata) {
    // 1. Validate transition allowed
    // 2. Run pre-transition hooks
    // 3. Update status
    // 4. Record transition
    // 5. Run post-transition hooks (email, audit)
    // 6. Return updated user
  }
}
```

**3. Transition Guard Logic**
```javascript
// Guards prevent invalid transitions:

// Cannot transition last active admin
const isLastAdmin = await User.countDocuments({
  role: 'admin',
  isActive: true
}) === 1
if (isLastAdmin) {
  throw new AppError('Cannot suspend last admin', 403)
}

// Cannot transition own status (unless admin)
if (user._id.equals(performedBy) && performedBy.role !== 'admin') {
  throw new AppError('Cannot change your own status', 403)
}

// Reason required for suspension
if (newStatus === 'suspended' && !metadata.reason) {
  throw new AppError('Reason required for suspension', 400)
}
```

**4. Status History Tracking**
```javascript
// New: models/status-history.model.js
{
  _id: ObjectId,
  user: ObjectId,
  fromStatus: 'active',
  toStatus: 'inactive',
  reason: 'User requested deactivation',
  performedBy: ObjectId,
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  metadata: {},
  timestamp: Date
}

// Query transition history
GET /api/v1/users/:id/status/history
Response: [ { from, to, reason, date, by }, ... ]
```

**5. Transition Endpoints**
```javascript
PATCH /api/v1/users/:id/status/activate
PATCH /api/v1/users/:id/status/deactivate
PATCH /api/v1/users/:id/status/suspend
PATCH /api/v1/users/:id/status/unsuspend
GET /api/v1/users/:id/status/history
```

**Time Estimate:** 60-75 minutes  
**Files:** ~350 lines total  
**Complexity:** MEDIUM-HIGH

---

### Task 4: Role Assignment Validation & Business Rules 🎭

**Current State:**
```javascript
✅ assignUserRole() function exists
✅ Role enum validation
⚠️ No role prerequisites
❌ No transition rules
❌ No data migration
❌ No role history
❌ No constraint checking
```

**What Task 4 Adds:**

**1. Role Hierarchy & Prerequisites**
```javascript
const RoleRequirements = {
  customer: {
    // No requirements
  },
  salesRep: {
    requirements: ['email_verified'],
    dataNeeded: ['territory', 'manager'],
    permissions: ['view_own_customers', 'report_sales']
  },
  vendor: {
    requirements: ['email_verified', 'phone_verified'],
    dataNeeded: ['store_name', 'tax_id', 'store_category'],
    permissions: ['manage_store', 'view_inventory']
  },
  admin: {
    requirements: ['email_verified', 'phone_verified', '2fa_enabled'],
    dataNeeded: [],
    permissions: ['full_access']
  }
}

// Before assigning vendor role:
async assignRole(user, newRole) {
  const requirements = RoleRequirements[newRole]
  
  // Check all requirements met
  for (const req of requirements.requirements) {
    const met = this.checkRequirement(user, req)
    if (!met) {
      throw new AppError(`Missing: ${req}`, 400)
    }
  }
  
  // Check data available
  for (const data of requirements.dataNeeded) {
    const exists = await this.checkData(user, data)
    if (!exists) {
      throw new AppError(`Must provide: ${data}`, 400)
    }
  }
}
```

**2. Role Transition Rules**
```javascript
// New: utils/roleTransition.js

export class RoleTransitionManager {
  // Valid role transitions
  const TRANSITIONS = {
    customer: ['salesRep', 'vendor'],
    salesRep: ['customer', 'vendor'],
    vendor: ['customer', 'salesRep'],
    admin: [] // Admin cannot change role
  }
  
  // Check if role change allowed
  isValidTransition(currentRole, newRole, performedByRole) {
    // Can only assign roles <= your role
    if (performedByRole !== 'admin') {
      throw new AppError('Only admins can assign roles', 403)
    }
    
    // Check transition valid
    if (!TRANSITIONS[currentRole].includes(newRole)) {
      throw new AppError('Invalid role transition', 400)
    }
    
    return true
  }
  
  // Get migration plan for role change
  getMigrationPlan(user, newRole) {
    const plan = {
      dataToArchive: [],
      dataToCreate: [],
      dataToUpdate: []
    }
    
    // If changing from salesRep to vendor
    if (user.role === 'salesRep' && newRole === 'vendor') {
      plan.dataToArchive.push('territory', 'sales_quota')
      plan.dataToCreate.push('store')
    }
    
    return plan
  }
}
```

**3. Role-Specific Data Validation**
```javascript
// Validate role-specific data requirements

async validateSalesRepData(data) {
  if (!data.territory) throw new Error('Territory required')
  if (!data.manager) throw new Error('Manager required')
  
  // Validate territory exists
  const territory = await Territory.findById(data.territory)
  if (!territory) throw new Error('Territory not found')
  
  // Validate manager is admin
  const manager = await User.findById(data.manager)
  if (manager.role !== 'admin') throw new Error('Manager must be admin')
}

async validateVendorData(data) {
  if (!data.storeName) throw new Error('Store name required')
  if (!data.taxId) throw new Error('Tax ID required')
  if (!data.category) throw new Error('Category required')
  
  // Validate tax ID format
  if (!this.validateTaxId(data.taxId)) {
    throw new Error('Invalid tax ID format')
  }
}
```

**4. Role Assignment Service**
```javascript
// Enhanced: services/user.service.js

async assignRole(userId, newRole, performedBy, reason) {
  // 1. Fetch user
  const user = await User.findById(userId)
  if (!user) throw new Error('User not found')
  
  // 2. Validate transition
  this.roleTransition.isValidTransition(
    user.role, newRole, performedBy.role
  )
  
  // 3. Check prerequisites
  await this.checkPrerequisites(user, newRole)
  
  // 4. Check guard conditions
  if (user.role === 'admin' && newRole !== 'admin') {
    // Check not last admin
    const adminCount = await User.countDocuments({
      role: 'admin', isActive: true
    })
    if (adminCount === 1) {
      throw new Error('Cannot remove last admin')
    }
  }
  
  // 5. Get migration plan
  const plan = this.roleTransition.getMigrationPlan(user, newRole)
  
  // 6. Execute migration
  await this.executeMigration(user, plan)
  
  // 7. Update role
  user.role = newRole
  user.updatedAt = new Date()
  await user.save()
  
  // 8. Record in history
  await RoleHistory.create({
    user: userId,
    fromRole: user.role,
    toRole: newRole,
    reason,
    performedBy,
    timestamp: new Date()
  })
  
  // 9. Log and audit
  logger.info(`Role changed: ${user.email} ${user.role} → ${newRole}`)
  await auditLogger.logRoleChange(user, newRole, performedBy, reason)
  
  return user
}
```

**5. Role Endpoint Validation**
```javascript
// Enhanced endpoints with validation:

PATCH /api/v1/users/:id/role
Body: { role: 'vendor', reason: 'Vendor registration approved' }

// Validates:
✓ Transition allowed
✓ Prerequisites met
✓ Data required for role available
✓ Not last admin
✓ Reason provided
✓ User authorized to perform

GET /api/v1/users/:id/role/permissions
Response: { 
  currentRole: 'salesRep',
  permissions: ['view_own_customers', 'report_sales'],
  availableRoles: ['customer', 'vendor'],
  prerequisites: {
    vendor: ['email_verified', 'phone_verified']
  }
}
```

**Time Estimate:** 75-90 minutes  
**Files:** ~450 lines total  
**Complexity:** HIGH

---

## 📊 Phase 5 Metrics

| Metric | Value |
|--------|-------|
| **New Services** | 5 |
| **New Utilities** | 5 |
| **New Models** | 3 |
| **New Endpoints** | 8 |
| **Total New Code** | ~1,500 lines |
| **Modified Existing** | ~300 lines |
| **Estimated Time** | 6-8 hours |
| **Complexity** | MEDIUM-HIGH |

---

## 🎯 Implementation Sequence

```
Task 1 (Validation) ........... 45-60 min
  ↓ (Provides utilities used by all others)
Task 2 (Duplicates) ........... 45-60 min
  ↓ (Uses validation from Task 1)
Task 3 (Status Transitions) ... 60-75 min
  ↓ (Independent, can start after Task 1)
Task 4 (Role Assignment) ...... 75-90 min
  ↓ (Uses Task 3 for status, Task 1 for validation)
  
Total: 225-285 minutes (3.75-4.75 hours)
```

---

## 🔒 Security Considerations

1. **Input Validation**
   - Always validate user input
   - Sanitize before storage
   - Escape output for safety

2. **Duplicate Detection**
   - Don't expose if email exists (timing attacks)
   - Use time-constant comparison
   - Rate limit duplicate checks

3. **Status Transitions**
   - Verify authorization for transition
   - Log all status changes
   - Prevent privilege escalation
   - Guard last admin

4. **Role Assignment**
   - Only admins can assign roles
   - Cannot assign above own role
   - Check prerequisites
   - Guard last admin

---

## 🧪 Testing Coverage

Each task includes tests for:

✅ **Happy Path**
- Valid input accepted
- Valid transitions allowed
- Rules enforced

✅ **Error Paths**
- Invalid input rejected
- Invalid transitions blocked
- Constraints checked

✅ **Security**
- Authorization verified
- Last admin protected
- Audit logged

✅ **Edge Cases**
- Empty input
- Special characters
- Boundary values
- Concurrent operations

---

## 📖 Documentation Included

Each task comes with:
- ✅ Code comments
- ✅ Endpoint documentation
- ✅ Example requests/responses
- ✅ Testing scenarios
- ✅ Integration guide

---

## 🚀 Next Steps

Ready to develop Phase 5?

**Choose a starting task:**
```
1️⃣  "Develop Phase 5 Task 1: Input Validation"
2️⃣  "Develop Phase 5 Task 2: Duplicate Email Checks"
3️⃣  "Develop Phase 5 Task 3: Status Transitions"
4️⃣  "Develop Phase 5 Task 4: Role Assignment"
```

---

*Phase 5 transforms your system from validating inputs to enforcing business logic! 💼✨*
