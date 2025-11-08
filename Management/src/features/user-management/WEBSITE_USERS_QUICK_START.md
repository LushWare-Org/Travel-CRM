# Website Users Management - Quick Start Guide

## What's Been Built

✅ **Backend API** - Complete user management endpoints
✅ **Frontend Service** - WebsiteUserService for API communication
✅ **Custom Hook** - useWebsiteUsers for state management
✅ **UI Components** - WebsiteUsersManagement with full CRUD functionality
✅ **Error Handling** - Comprehensive error handling and validation
✅ **Loading States** - UI feedback during API calls

## Quick Setup

### Step 1: Start the Backend Server
```bash
cd Server
npm install  # if not done already
npm start
```
Backend will run on `http://localhost:5000`

### Step 2: Start the Management Frontend
```bash
cd Management
npm install  # if not done already
npm run dev
```
Frontend will run on `http://localhost:5173` (or next available port)

### Step 3: Login to Management Dashboard
1. Navigate to Management app in your browser
2. Login with admin credentials
3. Navigate to "Website Users" section

## Features Available

### View Users
- See all website users (customers) in a table
- View user details: name, email, phone, booking count, total spent, join date, last login
- Statistics dashboard showing: total users, active/inactive count, total revenue, bookings, average spending

### Create Users
- Click "Add User" button
- Fill form with: name, email, phone, password
- User is created immediately and can access platform

### Update Users
- Click edit icon on any user row
- Update: name, email, phone, status
- Changes saved immediately

### Deactivate/Activate Users
- Click eye/eye-off icon to toggle status
- Deactivated users cannot access platform but data is preserved

### Delete Users
- Click delete icon on any user row
- Confirm deletion
- User and all data permanently removed

### Search & Filter
- Type in search field to filter by name, email, or phone
- Use status dropdown to filter active/inactive users
- Results update in real-time

### Pagination
- Navigate between pages using pagination controls
- Default 10 users per page
- Shows total user count and current page

## API Endpoints Used

All endpoints require admin authentication:

```
GET    /api/v1/users                    - List users
POST   /api/v1/users                    - Create user
GET    /api/v1/users/:id                - Get user
PUT    /api/v1/users/:id                - Update user
DELETE /api/v1/users/:id                - Delete user
PATCH  /api/v1/users/:id/toggle-status  - Toggle status
GET    /api/v1/users/stats              - Get statistics
```

## File Structure

```
New/Modified Files:

Management/
├── src/services/
│   ├── websiteUser.service.js          ✨ NEW
│   ├── api.js                          (updated)
│   └── index.js                        ✨ NEW
└── src/features/user-management/
    ├── hooks/
    │   ├── useWebsiteUsers.js          ✨ NEW
    │   └── index.js                    ✨ NEW
    ├── components/
    │   └── WebsiteUsersManagement/
    │       ├── WebsiteUsersManagement.jsx (updated)
    │       └── WebsiteUsersTable.jsx   (updated)
    └── WEBSITE_USERS_IMPLEMENTATION.md ✨ NEW
```

## Integration Points

### Service Integration
The `websiteUserService` connects to the backend:
```javascript
// API calls are handled by this service
websiteUserService.getAllUsers(filters)
websiteUserService.createUser(userData)
websiteUserService.updateUser(userId, data)
websiteUserService.deleteUser(userId)
websiteUserService.toggleUserStatus(userId, status)
```

### Hook Integration
The `useWebsiteUsers` hook manages state:
```javascript
const {
  users,              // Current users array
  loading,            // Loading state
  error,              // Error message
  pagination,         // Pagination info
  createUser,         // Create function
  updateUser,         // Update function
  deleteUser,         // Delete function
  toggleUserStatus,   // Toggle function
  searchUsers,        // Search function
  changePage,         // Pagination function
} = useWebsiteUsers();
```

### Component Integration
The component uses the hook:
```javascript
function WebsiteUsersManagement() {
  const {
    users,
    loading,
    error,
    // ... other hooks
  } = useWebsiteUsers();

  return (
    // UI that displays users and calls CRUD functions
  );
}
```

## Testing the Integration

### Test 1: Load Users
1. Navigate to Website Users page
2. Should see list of users loading
3. Stats should display

**Expected**: User data populated from backend

### Test 2: Create User
1. Click "Add User"
2. Fill form with test data
3. Click "Create User"
4. New user appears in list

**Expected**: New user added to database

### Test 3: Update User
1. Click edit icon on any user
2. Change name/email/phone
3. Click "Update User"
4. Changes reflected in table

**Expected**: User data updated in database

### Test 4: Delete User
1. Click delete icon
2. Confirm deletion
3. User disappears from list

**Expected**: User permanently removed from database

### Test 5: Search
1. Type in search field
2. List filters by name/email/phone

**Expected**: Real-time filtering works

### Test 6: Toggle Status
1. Click eye/eye-off icon
2. Status changes active ↔ inactive

**Expected**: User status toggled without deleting data

## Common Issues & Solutions

### Issue: "API not responding"
- Check backend is running on port 5000
- Verify `VITE_API_BASE_URL` environment variable

### Issue: "401 Unauthorized"
- Login with admin credentials first
- Check authentication token in browser storage

### Issue: "Import errors"
- Verify file paths in imports
- Run `npm install` in both directories

### Issue: "Users not loading"
- Check browser console for errors
- Verify backend is returning data
- Check network tab in DevTools

## Environment Variables

Add to `.env` in Management folder:
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Next Steps

1. ✅ Backend API is ready
2. ✅ Frontend service is built
3. ✅ Custom hook is implemented
4. ✅ UI components are integrated

**You can now**:
- Create/read/update/delete website users
- Search and filter users
- View user statistics
- Manage user status (active/inactive)

## Support

For detailed documentation, see:
- `WEBSITE_USERS_IMPLEMENTATION.md` - Full technical documentation
- Backend: `/Server/src/routes/user.routes.js` - API routes
- Frontend: `/Management/src/services/websiteUser.service.js` - Service methods

---

**Status**: ✅ Ready to Use
**Last Updated**: November 7, 2025
