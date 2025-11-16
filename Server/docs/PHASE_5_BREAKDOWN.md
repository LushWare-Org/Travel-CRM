# Phase 5: Data Validation & Business Logic - Task Breakdown

## 🎯 Phase 5 Overview

Implement comprehensive data validation, business rule enforcement, and state management for the user management system. This phase bridges the gap between what's validated at the route level (Joi) and what's enforced at the business logic level (services).

**Key Principle:** Validation at multiple layers - schema validation → business logic validation → database constraints

---

## 📋 Phase 5 Task List (4 Core Tasks)

### Task 1: Comprehensive Input Validation & Sanitization ✔️
**Status:** Not Started  
**Priority:** 🔴 HIGH

**Objective:** Implement multi-layer validation for all user input

**Current State:**
```javascript
✅ Joi schema validation at route level
✅ Basic field validation (email, phone, name)
⚠️ No business logic validation layer
❌ No data sanitization
❌ No cross-field validation
❌ No business rule validation
```

**What will be implemented:**

1. **Create ValidationService utility**
   ```javascript
   // New: utils/validationService.js
   export class ValidationService {
     // Email validation with business rules
     validateEmail(email)
     
     // Phone validation with formatting
     validatePhone(phone)
     
     // Name validation and sanitization
     validateName(name)
     
     // Password strength checking
     validatePassword(password)
     
     // URL validation
     validateUrl(url)
     
     // Cross-field validation (e.g., password vs confirmPassword)
     validatePasswordMatch(password, confirmPassword)
   }
   ```

2. **Data Sanitization**
   - Trim whitespace from text fields
   - Lowercase emails
   - Remove special characters where appropriate
   - Escape dangerous characters
   - Validate and clean phone numbers

3. **Business Rule Validation**
   - Email must be unique across system
   - Phone must be unique (optional)
   - Name must not contain only numbers
   - Email must not be from disposable domains (optional)
   - Password must meet strength requirements

4. **Cross-Field Validation**
   - Password and confirmPassword match
   - Old password vs new password (not same)
   - Validation dependent on other fields

5. **Custom Validators**
   ```javascript
   // Validators that enforce business rules
   isEmailAvailable(email, excludeUserId)
   isPhoneAvailable(phone, excludeUserId)
   isValidRole(role)
   isValidStatus(status)
   ```

**Files to Create/Modify:**
- `utils/validationService.js` (NEW - 150 lines)
- `utils/sanitizer.js` (NEW - 100 lines)
- `services/user.service.js` (NEW - 200 lines)
- `validators/user.validator.js` (MODIFY - add cross-field validation)

**Dependencies:**
- User model (existing)
- Joi validator (existing)
- Logger (existing)

**Estimated Complexity:** Medium (200-250 lines)

---

### Task 2: Duplicate Email & Unique Field Checks 🔍
**Status:** Not Started  
**Priority:** 🔴 HIGH

**Objective:** Robust duplicate detection and handling for unique fields

**Current State:**
```javascript
✅ MongoDB unique index on email field
✅ Basic duplicate error handling
⚠️ No pre-emptive duplicate checking
❌ No duplicate resolution workflow
❌ No merge strategy for duplicates
```

**What will be implemented:**

1. **Pre-emptive Duplicate Checking**
   ```javascript
   // New endpoints for checking availability
   GET /api/v1/users/check/email?email=test@example.com
   GET /api/v1/users/check/phone?phone=1234567890
   
   // Returns: { available: true/false, suggestions: [...] }
   ```

2. **Intelligent Duplicate Handling**
   ```javascript
   // In createUser() - check before save
   const existingUser = await User.findOne({ email: email.toLowerCase() });
   if (existingUser) {
     if (existingUser.isActive) {
       throw error: "Email already registered"
     } else {
       // Offer options: reactivate, use different email, merge accounts
     }
   }
   ```

3. **Duplicate Email Suggestions**
   - Suggest similar emails if close match found
   - Handle typos (example: gmial.com → gmail.com)
   - Suggest available alternatives

4. **Phone Unique Constraint** (Optional)
   - Add unique index on phone field
   - Handle phone duplicates same as email
   - Support phone number formatting variations

5. **Custom Duplicate Error Messages**
   ```javascript
   // Instead of: "E11000 duplicate key error"
   // Return: {
   //   status: 'error',
   //   message: 'Email already in use',
   //   suggestion: 'Email associated with inactive account. Reactivate?'
   // }
   ```

6. **Duplicate Detection Utility**
   ```javascript
   // New: utils/duplicateDetector.js
   findDuplicateEmails(email, excludeUserId)
   findDuplicatePhones(phone, excludeUserId)
   findSimilarEmails(email) // Fuzzy matching
   suggestAlternatives(email) // Generate suggestions
   ```

**Files to Create/Modify:**
- `utils/duplicateDetector.js` (NEW - 120 lines)
- `services/user.service.js` (MODIFY - add duplicate checks)
- `controllers/user.controller.js` (MODIFY - better error handling)
- `routes/user.routes.js` (ADD - check endpoints)
- `validators/user.validator.js` (MODIFY - add check schemas)

**Dependencies:**
- User model (existing)
- Validation service (from Task 1)
- Logger (existing)

**Estimated Complexity:** Medium (200-250 lines)

---

### Task 3: Status Transition State Management 🔄
**Status:** Not Started  
**Priority:** 🟡 MEDIUM-HIGH

**Objective:** Implement valid state transitions for user status

**Current State:**
```javascript
✅ isActive boolean field exists
✅ toggleUserStatus() function exists
⚠️ No state machine validation
❌ No transition rules enforced
❌ No status history tracking
❌ No transition guard logic
```

**What will be implemented:**

1. **User Status Enum with Valid Transitions**
   ```javascript
   // User statuses:
   // ACTIVE
   // INACTIVE (archived/deactivated)
   // PENDING (awaiting email verification)
   // SUSPENDED (by admin)
   // RESTRICTED (limited access)
   // DELETED (soft-deleted)
   
   // Valid transitions:
   // PENDING → ACTIVE (after email verification)
   // ACTIVE → INACTIVE (archive)
   // ACTIVE → SUSPENDED (admin only)
   // INACTIVE → ACTIVE (reactivate)
   // SUSPENDED → ACTIVE (admin only)
   // Any → DELETED (soft delete, admin only)
   ```

2. **State Transition Validator**
   ```javascript
   // New: utils/statusTransition.js
   export class StatusTransition {
     // Validate if transition is allowed
     isValidTransition(currentStatus, newStatus, userRole)
     
     // Get allowed transitions for status
     getAllowedTransitions(currentStatus, userRole)
     
     // Execute transition with hooks
     executeTransition(user, newStatus, reason, performedBy)
     
     // Get transition history
     getTransitionHistory(userId)
   }
   ```

3. **Transition Rules**
   ```javascript
   // Rules:
   - Only ACTIVE users can be SUSPENDED
   - SUSPENDED users cannot be reactivated by non-admins
   - PENDING users auto-expire after 24 hours
   - Cannot transition DELETED users (immutable)
   - Cannot transition last active admin
   - Non-admins cannot transition their own status
   - Reason required for SUSPENDED transition
   ```

4. **Transition Metadata Tracking**
   - Store previous status
   - Store reason for transition
   - Store who performed transition
   - Store timestamp
   - Store IP address
   - Store device info

5. **Transition Event Hooks**
   ```javascript
   // Pre-transition hooks:
   - Validate transition allowed
   - Check user permissions
   - Verify guard conditions
   
   // Post-transition hooks:
   - Send notification email
   - Log to audit trail
   - Clear sessions if deactivated
   - Trigger related updates
   ```

6. **Status Transition Endpoints**
   ```javascript
   // New endpoints:
   PATCH /api/v1/users/:id/status/activate
   PATCH /api/v1/users/:id/status/deactivate
   PATCH /api/v1/users/:id/status/suspend
   PATCH /api/v1/users/:id/status/unsuspend
   GET /api/v1/users/:id/status/history
   GET /api/v1/users/:id/status/transitions
   ```

**Files to Create/Modify:**
- `utils/statusTransition.js` (NEW - 200 lines)
- `models/user.model.js` (MODIFY - add status field, metadata)
- `models/status-history.model.js` (NEW - 50 lines)
- `services/user.service.js` (MODIFY - add transition logic)
- `controllers/user.controller.js` (MODIFY - update toggleUserStatus)
- `validators/user.validator.js` (ADD - transition schemas)

**Dependencies:**
- User model (existing)
- Validation service (from Task 1)
- Logger (existing)

**Estimated Complexity:** Medium-High (300-400 lines)

---

### Task 4: Role Assignment Validation & Business Rules 🎭
**Status:** Not Started  
**Priority:** 🟡 MEDIUM-HIGH

**Objective:** Enforce business rules for role assignments and transitions

**Current State:**
```javascript
✅ assignUserRole() function exists
✅ Role enum validation (customer, salesRep, vendor, admin)
⚠️ No role transition rules
❌ No role prerequisite checks
❌ No role assignment constraints
❌ No role history tracking
❌ No role-specific data validation
```

**What will be implemented:**

1. **Role Hierarchy & Permissions Matrix**
   ```javascript
   // Role hierarchy (lower → higher privilege):
   customer → salesRep → vendor → admin
   
   // Permission matrix:
   CUSTOMER:
     - View own profile
     - Edit own profile
     - View own orders
     - Cannot manage users
   
   SALESREP:
     - All CUSTOMER permissions
     - Manage customers
     - View sales reports
     - Cannot manage admins
   
   VENDOR:
     - All CUSTOMER permissions
     - Manage store
     - View inventory
     - Cannot manage other roles
   
   ADMIN:
     - Full access
     - Manage all users
     - System administration
   ```

2. **Role Transition Rules**
   ```javascript
   // New: utils/roleTransition.js
   export class RoleTransition {
     // Validate if role change allowed
     isValidRoleChange(user, newRole, performedBy)
     
     // Check if user meets prerequisites for role
     hasRolePrerequisites(user, newRole)
     
     // Get data migration needed for role change
     getRoleMigrationPlan(user, newRole)
     
     // Execute role transition with data migration
     executeRoleTransition(user, newRole, performedBy, reason)
   }
   ```

3. **Role Assignment Constraints**
   ```javascript
   Rules:
   - Last admin cannot be demoted
   - Can only assign roles at or below your role
   - Non-admins cannot change roles
   - Role change requires reason
   - Cannot assign admin role without multi-factor
   - Sales rep requires territory assigned
   - Vendor requires store registered
   - Cannot assign role if account not verified
   ```

4. **Role-Specific Data Validation**
   ```javascript
   SALESREP requirements:
   - Territory must be assigned
   - Manager must be assigned
   - Sales quota may be set
   
   VENDOR requirements:
   - Store name required
   - Tax ID required
   - Store category required
   - Bank account details optional
   
   ADMIN requirements:
   - 2FA enabled required (optional)
   - Security questions configured
   - Admin agreement signed
   ```

5. **Role Change Data Migration**
   ```javascript
   // When transitioning roles, handle data:
   customer → salesRep:
     - Create territory assignment
     - Set manager
     - Initialize sales metrics
   
   salesRep → vendor:
     - Clear territory assignment
     - Create store assignment
     - Reset metrics
   
   vendor → customer:
     - Archive store
     - Clear inventory access
     - Cancel active orders
   ```

6. **Role Assignment Endpoints**
   ```javascript
   // Existing: PATCH /api/v1/users/:id/role
   // Enhanced with validation and data migration
   
   // New endpoints:
   POST /api/v1/users/:id/role/validate
   GET /api/v1/users/:id/role/permissions
   GET /api/v1/users/:id/role/history
   POST /api/v1/users/:id/role/prerequisites
   ```

**Files to Create/Modify:**
- `utils/roleTransition.js` (NEW - 250 lines)
- `utils/roleValidator.js` (NEW - 150 lines)
- `services/user.service.js` (MODIFY - add role logic)
- `controllers/user.controller.js` (MODIFY - enhance assignUserRole)
- `models/role-history.model.js` (NEW - 50 lines)
- `models/user-permissions.model.js` (NEW - optional, 60 lines)
- `validators/user.validator.js` (ADD - role transition schemas)

**Dependencies:**
- User model (existing)
- Validation service (from Task 1)
- Status transition (from Task 3)
- Logger (existing)

**Estimated Complexity:** Medium-High (400-500 lines)

---

## 📊 Phase 5 Statistics

| Metric | Value |
|--------|-------|
| **Total Endpoints** | 8 new |
| **New Files** | 10-12 |
| **Modified Files** | 8-10 |
| **New Lines of Code** | 1,500-2,000 |
| **Modified Lines** | 300-400 |
| **Total Code** | ~2,000 lines |
| **Documentation Files** | 2-3 |
| **Estimated Time** | 6-8 hours |

---

## 🎯 Implementation Order (Recommended)

1. **First:** Task 1 (Validation) - Foundation for all others
2. **Second:** Task 2 (Duplicate Checks) - Uses validation from Task 1
3. **Third:** Task 3 (Status Transitions) - State management
4. **Fourth:** Task 4 (Role Assignment) - Builds on all previous tasks

**Why this order:**
- Task 1 provides validation utilities used by Tasks 2-4
- Task 2 can be implemented independently after Task 1
- Task 3 uses basic validation from Task 1
- Task 4 can use both Task 3 (status) and validation from Task 1

---

## 🛠️ Technical Architecture

### Layered Validation Approach
```
                   REQUEST
                      ↓
         1. ROUTE VALIDATION (Joi)
            - Schema validation
            - Type checking
            - Format validation
                      ↓
         2. SANITIZATION (Task 1)
            - Trim whitespace
            - Lowercase emails
            - Escape characters
                      ↓
         3. BUSINESS LOGIC VALIDATION (Task 1-4)
            - Unique checks (Task 2)
            - Status rules (Task 3)
            - Role rules (Task 4)
            - Cross-field validation
                      ↓
         4. SERVICE LAYER (Tasks 1-4)
            - Execute business logic
            - Trigger hooks
            - Update related data
                      ↓
         5. DATABASE CONSTRAINTS
            - Unique indexes
            - NOT NULL constraints
            - Foreign key constraints
                      ↓
                  DATABASE
```

### Services Layer Structure
```
services/
├── user.service.js
│   ├── createUser(userData)
│   ├── updateUser(userId, updateData)
│   ├── deleteUser(userId)
│   ├── changeUserRole(userId, newRole)
│   ├── changeUserStatus(userId, newStatus)
│   └── validateUserData(userData)
├── validation.service.js
│   ├── validateEmail(email)
│   ├── validatePhone(phone)
│   ├── validatePassword(password)
│   └── validateName(name)
└── business-rules.service.js
    ├── checkDuplicates(field, value)
    ├── validateStatusTransition(current, new)
    ├── validateRoleAssignment(newRole)
    └── getMigrationPlan(currentRole, newRole)
```

---

## 📁 File Structure After Phase 5

```
Server/src/
├── services/
│   ├── user.service.js .................... (NEW - 200 lines)
│   ├── validation.service.js ............. (NEW - 150 lines)
│   └── business-rules.service.js ......... (NEW - 200 lines)
├── utils/
│   ├── validationService.js .............. (NEW - 150 lines)
│   ├── sanitizer.js ...................... (NEW - 100 lines)
│   ├── duplicateDetector.js .............. (NEW - 120 lines)
│   ├── statusTransition.js ............... (NEW - 200 lines)
│   └── roleTransition.js ................. (NEW - 250 lines)
├── models/
│   ├── user.model.js ..................... (MODIFY - add fields)
│   ├── status-history.model.js ........... (NEW - 50 lines)
│   ├── role-history.model.js ............. (NEW - 50 lines)
│   └── user-permissions.model.js ......... (NEW - 60 lines, optional)
├── controllers/
│   └── user.controller.js ................ (MODIFY - use services)
├── routes/
│   └── user.routes.js .................... (ADD - new endpoints)
└── validators/
    └── user.validator.js ................. (MODIFY - add schemas)
```

---

## 🔄 Data Flow with Phase 5

```
POST /api/v1/users (Create User)
    ↓
1. Route Validation (Joi schema)
    ├─ Check required fields
    ├─ Check types
    └─ Check formats
    ↓
2. Sanitization
    ├─ Trim whitespace
    ├─ Lowercase email
    └─ Format phone
    ↓
3. Business Logic Validation
    ├─ Check email unique
    ├─ Check phone unique
    ├─ Validate role
    ├─ Validate password strength
    └─ Check role prerequisites
    ↓
4. Service Layer
    ├─ Create user record
    ├─ Hash password
    ├─ Send verification email
    └─ Log operation
    ↓
5. Database
    └─ Save user
    ↓
Response: 201 Created
```

---

## 🧪 Testing Scenarios

### Task 1 (Validation)
```bash
✓ Valid email accepted
✓ Invalid email rejected
✓ Weak password rejected
✓ Strong password accepted
✓ Whitespace trimmed
✓ Email lowercased
✓ Phone formatted correctly
```

### Task 2 (Duplicate Email)
```bash
✓ Duplicate email detected
✓ Similar email suggested
✓ Check endpoint returns availability
✓ Different users with same email blocked
✓ Case-insensitive duplicate check
✓ Reactivation offered for inactive accounts
```

### Task 3 (Status Transitions)
```bash
✓ Valid transition allowed
✓ Invalid transition blocked
✓ Transition recorded in history
✓ Notification sent on status change
✓ Last admin protection
✓ Status timeline retrievable
```

### Task 4 (Role Assignment)
```bash
✓ Valid role assignment allowed
✓ Invalid role assignment blocked
✓ Data migration executed
✓ Role history recorded
✓ Last admin protection
✓ Prerequisites validated
✓ Permissions updated
```

---

## 🔐 Security Considerations

1. **Validation Layer Security**
   - Validate all input (don't trust client)
   - Sanitize to prevent injection
   - Escape output for safety

2. **Duplicate Detection Security**
   - Don't expose if email exists (privacy)
   - Use time-constant comparison for emails
   - Rate limit duplicate checks

3. **Status Transition Security**
   - Verify user can perform transition
   - Log all status changes
   - Prevent unauthorized deactivations

4. **Role Assignment Security**
   - Only admins can assign roles
   - Cannot assign above own role
   - Last admin cannot be demoted
   - Verify admin authorization

---

## 📝 Next Steps

When ready to proceed:

1. **Choose Task Order:** Follow recommended or alternative order
2. **Request Task:** Ask to "Develop Phase 5 Task X: [Task Name]"
3. **One Task at a Time:** I'll create:
   - Complete services
   - Utility functions
   - Model updates
   - New endpoints
   - Documentation
   - Testing examples

---

## 💡 Key Design Principles for Phase 5

1. **Separation of Concerns** - Validation, business logic, data access separate
2. **Single Responsibility** - Each service has one job
3. **DRY (Don't Repeat Yourself)** - Reusable validation utilities
4. **Fail Fast** - Validate early, error immediately
5. **Clear Error Messages** - Tell user exactly what's wrong
6. **Audit Trail** - Log all important operations
7. **Extensible** - Easy to add new rules later
8. **Testable** - Services are unit testable

---

## 🎯 Phase 5 Status

**Status:** 🟡 READY FOR PLANNING  
**Foundation:** Phases 1-4 (mostly)  
**Complexity:** Medium-High  
**Impact:** Core business logic  
**Estimated Time:** 6-8 hours  

**This is where your business rules live! 💼**

---

*Phase 5 transforms your user management from generic CRUD to a robust business-logic-driven system!*
