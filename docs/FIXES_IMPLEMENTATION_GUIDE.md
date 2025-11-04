# Implementation Guide: Fix All Errors

## Overview
This guide provides step-by-step fixes for all identified errors.

---

## FIX #1: Update API Service to Handle Undefined Parameters ✅

**File:** `Management/src/services/api.js`  
**Issue:** Undefined values are serialized as string `"undefined"` in query params

### Change
Update the `get()` method to filter out undefined values:

```javascript
// GET request
async get(endpoint, params = {}) {
  // Filter out undefined values to prevent 'search=undefined' in query string
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined && value !== null && value !== '')
  );
  
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return this.fetch(url);
}
```

---

## FIX #2: Update Admin Service to Use Correct Endpoint ✅

**File:** `Management/src/services/admin.service.js`  
**Issue:** Using `/users` instead of `/admin/users` for admin operations

### Change - Multiple Locations

```javascript
// Line ~241 - getAllAdmins() method
async getAllAdmins(params = {}) {
  try {
    const response = await this.api.get('/admin/users', params);  // ← Changed from '/users'
    return response;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw error;
  }
}

// Line ~60-65 - getAllUsers() method (if it exists, update to use correct endpoint)
async getAllUsers(params = {}) {
  try {
    const response = await this.api.get('/admin/users', params);  // ← Should be '/admin/users' for admin context
    return response;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

// Check all other methods that call admin endpoints and ensure they use '/admin/*'
```

---

## FIX #3: Improve API Error Handling ✅

**File:** `Management/src/services/api.js`  
**Issue:** JSON parsing errors mask the real server error

### Change
Add better error detection:

```javascript
async fetch(endpoint, options = {}) {
  const url = `${this.baseURL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...this.getAuthHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    // Get content type to determine how to parse response
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Response is HTML (probably error page)
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}`);
      }
      data = { message: text };
    }

    if (!response.ok) {
      let errorMessage = data.message || data.error?.message || `HTTP error! status: ${response.status}`;
      
      if (data.error?.errors && Array.isArray(data.error.errors)) {
        const validationErrors = data.error.errors.map(err => `${err.field}: ${err.message}`).join('; ');
        errorMessage = `${errorMessage} - ${validationErrors}`;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## FIX #4: Fix SalesRepManagement Query Parameters ✅

**File:** `Management/src/features/user-management/components/SalesRepManagement/SalesRepManagement.jsx`  
**Issue:** Passing `search: undefined` in query params

### Change - Line ~73
```javascript
// ❌ OLD
const response = await salesRepService.getAllSalesReps({
  page: currentPage,
  limit: ITEMS_PER_PAGE,
  search: searchTerm || undefined,  // ← Problem!
  sort: '-createdAt'
});

// ✅ NEW
const response = await salesRepService.getAllSalesReps({
  page: currentPage,
  limit: ITEMS_PER_PAGE,
  ...(searchTerm ? { search: searchTerm } : {}),  // Only include if exists
  sort: '-createdAt'
});
```

Or simpler approach:
```javascript
const params = {
  page: currentPage,
  limit: ITEMS_PER_PAGE,
  sort: '-createdAt'
};

if (searchTerm) {
  params.search = searchTerm;
}

const response = await salesRepService.getAllSalesReps(params);
```

---

## FIX #5: Fix AdminManagement Query Parameters ✅

**File:** `Management/src/features/user-management/components/AdminManagement/AdminManagement.jsx`  
**Issue:** Similar issue with undefined parameters

### Change - Line ~55
```javascript
// ❌ OLD
const response = await adminService.getAllAdmins({
  limit: 100,
  page: 1,
  sort: '-createdAt'
  // (may have other undefined params)
});

// ✅ NEW
const params = {
  limit: 100,
  page: 1,
  sort: '-createdAt'
};

// Only add optional parameters if they have values
if (searchTerm) {
  params.search = searchTerm;
}

const response = await adminService.getAllAdmins(params);
```

---

## FIX #6: Update Sales Rep Service Endpoint ✅

**File:** `Management/src/services/salesRep.service.js`  
**Issue:** Verify endpoint is correct (should be `/sales-reps`)

### Check - Line ~32
```javascript
async getAllSalesReps(params = {}) {
  try {
    const response = await this.api.get(this.endpoint, params);  // this.endpoint = '/sales-reps'
    return response;
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    throw this.handleError(error);
  }
}
```

This looks correct - the endpoint should be `/sales-reps` which matches the server route.

---

## FIX #7: Check Backend Validation Schema ⚠️

**File:** `Server/src/validators/user.validator.js`  
**Issue:** May be rejecting valid query parameters

### Check
Ensure the `userQuerySchema` validator allows:
- `page` (number)
- `limit` (number)
- `sort` (string like "-createdAt")
- `search` (string)
- `role` (string like "admin")
- `isActive` (boolean)
- `isEmailVerified` (boolean)

If the schema is too restrictive, it will cause 400/500 errors.

---

## FIX #8: Verify Authorization Middleware ⚠️

**File:** `Server/src/routes/admin.routes.js` and `Server/src/routes/user.routes.js`  
**Issue:** Make sure non-admin users get 403, not 500

### Check
```javascript
// admin.routes.js should return 403 for non-admins
router.use(authorize('admin'));  // This should throw 403, not 500

// user.routes.js should also require admin for certain operations
router.use(authorize('admin'));  // Line should be present for admin-only routes
```

---

## IMPLEMENTATION ORDER

1. **First:** Fix `api.js` parameter filtering (prevents malformed queries)
2. **Second:** Fix `api.js` error handling (better debugging)
3. **Third:** Fix `admin.service.js` endpoint paths (use `/admin/users`)
4. **Fourth:** Fix component query parameters (don't pass undefined)
5. **Fifth:** Verify backend schemas and middleware (may need backend fixes)

---

## VERIFICATION CHECKLIST

After implementing all fixes:

- [ ] Admin page loads successfully
- [ ] Sales rep page loads successfully
- [ ] API requests are made to correct endpoints
- [ ] Query strings don't contain `search=undefined`
- [ ] Error messages are descriptive and helpful
- [ ] No 500 errors when loading data
- [ ] Browser console shows no errors
- [ ] Data displays correctly in tables

---

## Testing Commands

### Test Admin Endpoint
```bash
curl http://localhost:5000/api/v1/admin/users?role=admin&limit=10&page=1
```

### Test Sales Rep Endpoint
```bash
curl http://localhost:5000/api/v1/sales-reps?page=1&limit=10&sort=-createdAt
```

### Check for Undefined Params
Open browser DevTools Network tab and check query strings in requests. Should NOT contain `search=undefined` or similar.
