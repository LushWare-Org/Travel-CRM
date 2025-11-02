# Phase 3: User Roles & Permissions - Task Breakdown

## 🎯 Phase 3 Overview

Implement specialized management endpoints for each user role type. This phase extends Phase 2's generic user management with role-specific functionality, dashboards, and advanced features.

---

## 📋 Phase 3 Task List (5 Core Tasks)

### Task 1: Admin User Management Endpoints ⚙️
**Status:** Not Started  
**Priority:** 🔴 HIGH

**Objective:** Create specialized admin endpoints for administrative functions

**What will be implemented:**
- `GET /api/v1/users/role-group/admin` - Get all admin users
- `POST /api/v1/users/admin/bulk-create` - Bulk create admin users
- `POST /api/v1/users/admin/assign-permissions` - Assign custom permissions
- `GET /api/v1/users/admin/activity-log` - View admin activity log
- `GET /api/v1/users/admin/dashboard` - Admin dashboard stats
- Enhanced error handling for admin operations

**Files to Create/Modify:**
- `controllers/admin.controller.js` (NEW)
- `routes/admin.routes.js` (NEW)
- `validators/admin.validator.js` (NEW)
- `models/permission.model.js` (NEW - Optional)

**Dependencies:**
- User model (existing)
- RBAC middleware (existing)
- Auth middleware (existing)

**Estimated Complexity:** Medium (40-50 lines per endpoint)

---

### Task 2: Sales Rep User Management Endpoints 📊
**Status:** Not Started  
**Priority:** 🟡 MEDIUM

**Objective:** Create endpoints for managing Sales Rep users and their activities

**What will be implemented:**
- `GET /api/v1/users/role-group/salesrep` - Get all sales reps
- `POST /api/v1/users/salesrep/assign-territory` - Assign territory to sales rep
- `GET /api/v1/users/salesrep/:id/performance` - Sales rep performance metrics
- `GET /api/v1/users/salesrep/:id/customers` - Sales rep's assigned customers
- `PUT /api/v1/users/salesrep/:id/territory` - Update territory assignment
- `GET /api/v1/users/salesrep/statistics` - Bulk sales rep statistics

**Files to Create/Modify:**
- `controllers/salesrep.controller.js` (NEW)
- `routes/salesrep.routes.js` (NEW)
- `validators/salesrep.validator.js` (NEW)
- `models/territory.model.js` (NEW - Optional)

**Dependencies:**
- User model (existing)
- Customer references (may need to verify)
- Performance tracking system

**Estimated Complexity:** Medium (35-45 lines per endpoint)

---

### Task 3: Vendor User Management Endpoints 🏪
**Status:** Not Started  
**Priority:** 🟡 MEDIUM

**Objective:** Create endpoints for managing Vendor users and their store information

**What will be implemented:**
- `GET /api/v1/users/role-group/vendor` - Get all vendor users
- `POST /api/v1/users/vendor/register-store` - Register vendor store
- `GET /api/v1/users/vendor/:id/store-info` - Get vendor's store information
- `PUT /api/v1/users/vendor/:id/store-info` - Update store information
- `GET /api/v1/users/vendor/:id/inventory` - Vendor's inventory overview
- `GET /api/v1/users/vendor/:id/sales` - Vendor's sales metrics

**Files to Create/Modify:**
- `controllers/vendor.controller.js` (NEW)
- `routes/vendor.routes.js` (NEW)
- `validators/vendor.validator.js` (NEW)
- `models/vendor-store.model.js` (NEW - Optional)

**Dependencies:**
- User model (existing)
- Store/vendor data schema
- Sales tracking system

**Estimated Complexity:** Medium (35-45 lines per endpoint)

---

### Task 4: Website Users (Customers) Management Endpoints 👥
**Status:** Not Started  
**Priority:** 🟡 MEDIUM

**Objective:** Create endpoints for managing regular website users (customers)

**What will be implemented:**
- `GET /api/v1/users/role-group/customer` - Get all customer users
- `GET /api/v1/users/customer/:id/orders` - Customer's order history
- `GET /api/v1/users/customer/:id/preferences` - Customer preferences/settings
- `PUT /api/v1/users/customer/:id/preferences` - Update customer preferences
- `GET /api/v1/users/customer/:id/loyalty` - Customer loyalty points/info
- `POST /api/v1/users/customer/bulk-email` - Bulk email customers (admin only)

**Files to Create/Modify:**
- `controllers/customer.controller.js` (NEW)
- `routes/customer.routes.js` (NEW)
- `validators/customer.validator.js` (NEW)

**Dependencies:**
- User model (existing)
- Order system references
- Preferences schema

**Estimated Complexity:** Medium (30-40 lines per endpoint)

---

### Task 5: Role Assignment & Update Functionality 🔄
**Status:** Not Started  
**Priority:** 🔴 HIGH

**Objective:** Enhance role management with advanced assignment, validation, and transition logic

**What will be implemented:**
- `PATCH /api/v1/users/:id/change-role` - Change user role with transition logic
- `POST /api/v1/users/role-transition` - Bulk role transitions
- `GET /api/v1/users/:id/role-history` - User's role change history
- Role transition validation (prevent invalid transitions)
- Role-specific data cleanup/migration on role change
- Audit logging for all role changes
- Enhanced `assignUserRole()` function with pre/post role change hooks

**Files to Create/Modify:**
- `controllers/role.controller.js` (NEW)
- `routes/role.routes.js` (NEW)
- `validators/role.validator.js` (NEW)
- `utils/roleTransition.js` (NEW - Utility for role transitions)
- `models/role-history.model.js` (NEW - Optional)

**Dependencies:**
- User model (existing)
- Audit logging system
- RBAC middleware

**Estimated Complexity:** High (50-70 lines per endpoint)

---

## 📊 Phase 3 Statistics

| Metric | Value |
|--------|-------|
| **Total Endpoints** | 21+ |
| **New Controllers** | 5 |
| **New Routes Files** | 5 |
| **New Validators** | 5 |
| **Middleware Integration** | Existing RBAC |
| **Estimated Code** | 1,000-1,500 lines |
| **Documentation Files** | 2-3 |

---

## 🔐 Authorization Matrix for Phase 3

| Operation | Customer | SalesRep | Vendor | Admin |
|-----------|----------|----------|--------|-------|
| View own role info | ✅ | ✅ | ✅ | ✅ |
| View role group users | ❌ | ❌ | ❌ | ✅ |
| Assign roles | ❌ | ❌ | ❌ | ✅ |
| Bulk create users | ❌ | ❌ | ❌ | ✅ |
| View admin activity | ❌ | ❌ | ❌ | ✅ |
| Manage territories | ❌ | ❌ | ❌ | ✅ |
| Register store | ❌ | ❌ | ✅ | ✅ |
| View performance | ❌ | ✅ | ✅ | ✅ |
| View orders/history | ✅ | ✅ | ✅ | ✅ |
| Role transitions | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 Implementation Order (Recommended)

1. **First:** Task 5 (Role Assignment & Update) - Foundation for all role operations
2. **Second:** Task 1 (Admin Management) - Requires role assignment working
3. **Third:** Task 2 (Sales Rep Management) - Territory assignments depend on role system
4. **Fourth:** Task 3 (Vendor Management) - Store registration after roles stable
5. **Fifth:** Task 4 (Customer Management) - Simplest, can be done last

**Alternative Order (By Priority):**
1. Task 1 (Admin) - HIGH priority
2. Task 5 (Role Assignment) - HIGH priority
3. Task 2 (Sales Rep) - MEDIUM priority
4. Task 3 (Vendor) - MEDIUM priority
5. Task 4 (Customer) - MEDIUM priority

---

## 🛠️ Technical Approach

### Pattern to Follow:

```javascript
// File: controllers/role-group.controller.js
export const getRoleGroupUsers = asyncHandler(async (req, res, next) => {
  // 1. Validate role parameter
  // 2. Check authorization (admin only)
  // 3. Build filter with role
  // 4. Apply pagination, sorting, filtering
  // 5. Query database with lean()
  // 6. Format response with metadata
  // 7. Return with proper status codes
  // 8. Log operation
});

export const assignPermissions = asyncHandler(async (req, res, next) => {
  // 1. Validate input
  // 2. Check authorization (admin only)
  // 3. Verify role exists
  // 4. Update role-specific data
  // 5. Audit log
  // 6. Return confirmation
});
```

### Middleware Stack for Phase 3:
```
Request
  ↓
Route Validation
  ↓
JWT Authentication (protect)
  ↓
Authorization (authorize - admin only for most)
  ↓
RBAC Check (checkPermission)
  ↓
Input Validation (validateRequest)
  ↓
Business Logic (controller)
  ↓
Role-Specific Processing
  ↓
Database Operation
  ↓
Response Formatting
  ↓
Audit Logging
  ↓
JSON Response
```

---

## 📚 File Structure After Phase 3

```
Server/src/
├── controllers/
│   ├── user.controller.js           (Existing - Phase 1/2)
│   ├── admin.controller.js          (NEW - Task 1)
│   ├── salesrep.controller.js       (NEW - Task 2)
│   ├── vendor.controller.js         (NEW - Task 3)
│   ├── customer.controller.js       (NEW - Task 4)
│   └── role.controller.js           (NEW - Task 5)
├── routes/
│   ├── user.routes.js               (Existing)
│   ├── admin.routes.js              (NEW - Task 1)
│   ├── salesrep.routes.js           (NEW - Task 2)
│   ├── vendor.routes.js             (NEW - Task 3)
│   ├── customer.routes.js           (NEW - Task 4)
│   └── role.routes.js               (NEW - Task 5)
├── validators/
│   ├── user.validator.js            (Existing)
│   ├── admin.validator.js           (NEW - Task 1)
│   ├── salesrep.validator.js        (NEW - Task 2)
│   ├── vendor.validator.js          (NEW - Task 3)
│   ├── customer.validator.js        (NEW - Task 4)
│   └── role.validator.js            (NEW - Task 5)
├── utils/
│   └── roleTransition.js            (NEW - Task 5 - Optional)
├── models/
│   ├── user.model.js                (Existing)
│   ├── role-history.model.js        (NEW - Optional)
│   └── [other optional models]
└── middleware/
    └── rbac.js                      (Existing - Already configured)
```

---

## 🚀 Success Criteria

Each task will be considered complete when:

✅ All endpoints are implemented  
✅ All validators are in place  
✅ All authorization checks pass  
✅ Comprehensive error handling implemented  
✅ Audit logging for sensitive operations  
✅ Response formatting consistent  
✅ Documentation provided  
✅ Test examples included  

---

## 📝 Next Steps

When ready to proceed:

1. **Choose Task Order:** Follow recommended or alternative order
2. **Request Task:** Ask to "Develop Task X: [Task Name]"
3. **One Task at a Time:** I'll create:
   - Complete controller with all endpoints
   - Route definitions
   - Joi validators
   - Documentation
   - Testing examples

---

## 💡 Notes

- All Phase 3 endpoints require Admin authentication
- Built on top of Phase 1 & 2 infrastructure (auth, RBAC, validators)
- Follows MVC pattern established in Phase 1
- Uses same error handling, logging, and response formats
- Each role group can be developed independently after Task 5
- Optional models (territory, role-history, etc.) can be added as needed

---

## 🎯 Phase 3 Status

**Status:** 🟡 PLANNED  
**Expected Completion:** After all 5 tasks  
**Estimated Time per Task:** 30-45 minutes  
**Total Estimated Time:** 2.5-3.75 hours  

**Ready to start?** Pick a task number (1-5) and I'll break it down further!

---

*Phase 3 will give you complete role-based user management with specialized endpoints for each user type!*
