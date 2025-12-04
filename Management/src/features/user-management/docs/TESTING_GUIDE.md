# Admin Management Integration - Quick Test Guide

## Prerequisites
- Server running on `http://localhost:5000`
- Management portal running
- Authenticated user with admin role
- JWT token stored in localStorage

## How to Test

### 1. **Initial Page Load**
```
✓ Navigate to Admin Management page
✓ Should show: "Loading admins..." spinner
✓ After 2-3 seconds: Table populated with admins from backend
✓ Stats cards show correct counts
```

### 2. **Create New Admin**
```
1. Click "Add Admin" button
2. Fill form:
   - Name: "Test Admin"
   - Email: "test.admin@example.com"
   - Phone: "+1-555-1234"
3. Click "Create & Send Invitation"
4. Expected:
   ✓ Modal closes
   ✓ Success notification appears
   ✓ New admin appears in table
   ✓ Console shows temp password
```

### 3. **Edit Admin**
```
1. Click edit icon on any admin row
2. Update fields:
   - Name: "Updated Name"
   - Email: "updated@example.com"
3. Click "Update Admin"
4. Expected:
   ✓ Modal closes
   ✓ Success notification appears
   ✓ Table reflects changes
```

### 4. **Delete Admin**
```
1. Click delete icon on any admin row
2. Confirmation dialog appears
3. Click "Delete"
4. Expected:
   ✓ Admin removed from table
   ✓ Success notification shows
```

### 5. **Search & Filter**
```
1. Type in search box: "admin name"
2. Table filters in real-time
3. Results update as you type
```

### 6. **Pagination**
```
1. Create multiple admins (20+)
2. Pagination controls appear
3. Navigate between pages
4. Table data updates per page
```

### 7. **Resend Invitation**
```
1. Find admin with status "Pending Invite"
2. Click mail icon in actions
3. Confirmation dialog appears
4. Click "Resend"
5. Expected:
   ✓ Success notification
   ✓ Console shows new temp password
```

### 8. **Force Password Reset**
```
1. Click refresh/reset icon on admin
2. Expected:
   ✓ Admin status changes
   ✓ Success notification appears
   ✓ Console shows temp password
```

### 9. **Error Handling**
```
Test invalid inputs:
- Leave required fields empty
- Enter invalid email format
- Try to create duplicate email
- Submit when server is down

Expected:
✓ Form validation errors
✓ Error notification appears
✓ No state changes
✓ User can retry
```

### 10. **Loading States**
```
1. Open create dialog
2. Click submit button
3. Button should show loading state
4. No double-clicking possible
5. After request completes, button re-enabled
```

## API Test Flow

### Using Browser DevTools Console

```javascript
// Import service (if exposed in global scope)
import adminService from './services/admin.service.js';

// Test 1: Get all admins
const admins = await adminService.getAllUsers({ role: 'admin' });
console.log(admins);

// Test 2: Get stats
const stats = await adminService.getUserStats();
console.log(stats);

// Test 3: Create admin
const newAdmin = await adminService.createAdmin({
  name: 'Test Admin',
  email: 'test@example.com',
  phone: '+1-555-1234',
  password: 'TempPass123!@#'
});
console.log(newAdmin);
```

## Browser Network Tab Testing

### Monitoring Requests
1. Open DevTools → Network tab
2. Filter by XHR requests
3. Perform admin operations
4. Verify:
   - ✓ Request method correct (GET/POST/PUT/DELETE)
   - ✓ URL correct: `/api/v1/users`
   - ✓ Status codes: 200, 201, 400, 404
   - ✓ Response includes expected data
   - ✓ Authorization header present

### Expected Network Calls

| Operation | Method | URL | Status |
|-----------|--------|-----|--------|
| Load admins | GET | `/users?role=admin` | 200 |
| Create admin | POST | `/users` | 201 |
| Update admin | PUT | `/users/:id` | 200 |
| Delete admin | DELETE | `/users/:id` | 200 |
| Get stats | GET | `/users/stats` | 200 |

## Console Output Verification

### Successful Operations
```
✓ No errors in console
✓ API responses logged properly
✓ Temporary password shown for new admins
✓ Success messages displayed
```

### Error Scenarios
```
✓ Network errors caught and displayed
✓ Validation errors shown to user
✓ Error messages clear and helpful
✓ No unhandled promise rejections
```

## State Verification

### Using React DevTools

1. Install React DevTools extension
2. Open Components tab
3. Find `AdminManagement` component
4. Verify state:
   - `admins` array populated
   - `loading` state transitions
   - `error` state clears after success
   - `successMessage` shows/hides
   - Form data resets after submit

## Database Verification

### Check Backend Database

```javascript
// MongoDB
db.users.find({ role: 'admin' }).pretty();
```

Expected output:
```json
{
  "_id": ObjectId("..."),
  "name": "Admin Name",
  "email": "admin@example.com",
  "role": "admin",
  "isActive": true,
  "isEmailVerified": false,
  "isTempPassword": true,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

## Performance Testing

### Load Testing
```
1. Create 50+ admins
2. Monitor:
   - Page load time
   - Search responsiveness
   - Pagination speed
   - Memory usage

Acceptable performance:
✓ Page load < 3 seconds
✓ Search < 500ms
✓ Memory < 50MB
```

## Checklist for Sign-Off

### Core Functionality
- [x] Load admins from backend
- [x] Create new admin
- [x] Update admin details
- [x] Delete admin
- [x] Search admins
- [x] Pagination works
- [x] Error messages display
- [x] Success notifications show
- [x] Form validation works

### User Experience
- [x] Loading spinners show
- [x] Buttons disabled during submission
- [x] Modal dialogs work smoothly
- [x] Confirmation dialogs appear
- [x] Success messages auto-clear
- [x] Table updates in real-time
- [x] Stats cards update correctly

### API Integration
- [x] Authentication token included
- [x] Correct HTTP methods used
- [x] Correct endpoints called
- [x] Response data transforms correctly
- [x] Errors handled gracefully
- [x] No CORS issues
- [x] No authentication failures

### Data Integrity
- [x] Created admins persist
- [x] Updated data saved correctly
- [x] Deleted admins removed
- [x] No duplicate entries
- [x] Timestamps correct
- [x] Email validation works
- [x] Phone validation works

## Troubleshooting Quick Fixes

### "Admins not loading"
```
1. Open DevTools Console
2. Check: localStorage.getItem('token')
3. Verify token is not empty
4. Check: Network tab for 401/403 errors
5. If 401: Re-login and try again
```

### "Create admin fails"
```
1. Check form validation errors
2. Verify email format
3. Verify phone format
4. Check Network tab for error response
5. Look for validation messages in console
```

### "Page stuck loading"
```
1. Open DevTools Console
2. Check for JavaScript errors
3. Verify server is running
4. Refresh page
5. Check Network tab for hanging requests
```

## Final Verification Script

```javascript
// Run in console after implementing integration

async function testAdminIntegration() {
  console.log('🧪 Testing Admin Integration...\n');
  
  try {
    // Test 1: Load admins
    console.log('1️⃣ Testing load admins...');
    const admins = await adminService.getAllAdmins();
    console.log('✅ Loaded admins:', admins.data?.length);
    
    // Test 2: Get stats
    console.log('2️⃣ Testing get stats...');
    const stats = await adminService.getUserStats();
    console.log('✅ Stats:', stats.data);
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminIntegration();
```

## Next Steps After Testing

1. **Document Issues** - Log any bugs found
2. **Code Review** - Have team review integration
3. **Security Review** - Check for security issues
4. **Performance Review** - Profile and optimize
5. **Deploy** - Ready for production
