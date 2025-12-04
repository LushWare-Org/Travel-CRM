# Website Users Management - Implementation Guide

## Overview

This document explains how the Website Users Management feature has been built and integrated between the backend and frontend.

## Architecture

### Components

#### 1. Backend (Server)
- **File**: `/Server/src/routes/user.routes.js`
- **Controller**: `/Server/src/controllers/user.controller.js`
- **Model**: `/Server/src/models/user.model.js`
- **Validator**: `/Server/src/validators/user.validator.js`

**API Endpoints** (All require Admin authentication):
```
GET    /api/v1/users                    - Get all users with pagination & filters
POST   /api/v1/users                    - Create new user
GET    /api/v1/users/:id                - Get single user
PUT    /api/v1/users/:id                - Update user details
PUT    /api/v1/users/:id/change-password - Update user password
DELETE /api/v1/users/:id                - Delete user permanently
PATCH  /api/v1/users/:id/toggle-status  - Toggle user active status
PATCH  /api/v1/users/:id/role           - Assign/update user role
GET    /api/v1/users/role/:role         - Get users by role
GET    /api/v1/users/stats              - Get user statistics
GET    /api/v1/users/profile/me         - Get current user profile
```

#### 2. Frontend Services
- **Main Service**: `/Management/src/services/websiteUser.service.js`
- **API Client**: `/Management/src/services/api.js`

**WebsiteUserService Methods**:
```javascript
// User Management
getAllUsers(params)          - Fetch users with pagination & filters
getUserById(userId)          - Get single user
createUser(userData)         - Create new user
updateUser(userId, data)     - Update user details
deleteUser(userId)           - Delete user permanently
toggleUserStatus(userId, isActive) - Toggle user status
getUserStats()              - Get user statistics
searchUsers(params)          - Search users

// Utilities
formatDate(date)             - Format date for display
formatCurrency(amount)       - Format currency for display
transformUserData(apiUser)   - Transform API data to frontend format
validateUserData(userData)   - Validate user form data
```

#### 3. Frontend Hooks
- **Custom Hook**: `/Management/src/features/user-management/hooks/useWebsiteUsers.js`

**Hook Features**:
- Automatic data fetching on mount
- Loading and error state management
- Pagination support
- Search and filtering
- CRUD operations (Create, Read, Update, Delete)
- Local state synchronization

**Hook Methods**:
```javascript
const {
  users,                    // Array of users
  loading,                  // Loading state
  error,                    // Error message
  pagination,               // Pagination info
  filters,                  // Current filters
  fetchUsers,              // Manual fetch
  createUser,              // Create new user
  updateUser,              // Update user
  deleteUser,              // Delete user
  toggleUserStatus,        // Toggle status
  searchUsers,             // Search users
  changePage,              // Change page
  updateFilters,           // Update filters
  clearError,              // Clear error
} = useWebsiteUsers();
```

#### 4. Frontend Components
- **Main Component**: `/Management/src/features/user-management/components/WebsiteUsersManagement/WebsiteUsersManagement.jsx`
- **Table Component**: `/Management/src/features/user-management/components/WebsiteUsersManagement/WebsiteUsersTable.jsx`

**Features**:
- Display paginated user list
- Add new users with form validation
- Edit existing users
- Delete users with confirmation
- Toggle user active/inactive status
- Real-time search and filtering
- Statistics dashboard (total, active, inactive, revenue, bookings, avg spent)
- Loading states and error handling

## Data Flow

```
User Action (Frontend)
        ↓
Component Handler (WebsiteUsersManagement.jsx)
        ↓
Custom Hook (useWebsiteUsers)
        ↓
Service Method (websiteUserService)
        ↓
API Client (api.js)
        ↓
HTTP Request (Fetch API)
        ↓
Backend Route (user.routes.js)
        ↓
Auth Middleware (protect, authorize)
        ↓
Controller (user.controller.js)
        ↓
Database (MongoDB User Model)
        ↓
Response back to Frontend
        ↓
Hook updates state
        ↓
Component re-renders with new data
```

## Usage Example

### In a Component

```jsx
import useWebsiteUsers from '../hooks/useWebsiteUsers';

function MyComponent() {
  const {
    users,
    loading,
    error,
    pagination,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    searchUsers,
    changePage,
    clearError,
  } = useWebsiteUsers();

  // Create new user
  const handleCreateUser = async () => {
    try {
      await createUser({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        password: 'SecurePass123',
        status: 'active',
      });
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  // Update user
  const handleUpdateUser = async (userId) => {
    try {
      await updateUser(userId, {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '9876543210',
        status: 'active',
      });
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    try {
      await deleteUser(userId);
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // Toggle status
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await toggleUserStatus(userId, currentStatus);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Search users
  const handleSearch = async (searchTerm) => {
    try {
      await searchUsers(searchTerm);
    } catch (err) {
      console.error('Failed to search:', err);
    }
  };

  // Change page
  const handlePageChange = async (page) => {
    try {
      await changePage(page);
    } catch (err) {
      console.error('Failed to change page:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Website Users ({pagination.totalUsers})</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            {user.name} ({user.email})
            <button onClick={() => handleUpdateUser(user.id)}>Edit</button>
            <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
            <button onClick={() => handleToggleStatus(user.id, user.status)}>
              Toggle Status
            </button>
          </li>
        ))}
      </ul>
      
      <div>
        Page {pagination.currentPage} of {pagination.totalPages}
        <button 
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevPage}
        >
          Previous
        </button>
        <button 
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default MyComponent;
```

## Setup Instructions

### 1. Backend Setup

1. Ensure server is running:
   ```bash
   cd Server
   npm start
   ```

2. The backend will be available at `http://localhost:5000/api/v1`

3. Verify the `/users` endpoints are accessible with admin authentication

### 2. Frontend Setup

1. Install dependencies:
   ```bash
   cd Management
   npm install
   ```

2. Set environment variables in `.env`:
   ```
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will be available at `http://localhost:5173`

### 3. Authentication

- All user management endpoints require authentication
- Admin role is required for most operations
- Token is stored in localStorage and automatically included in API requests

## Features

### 1. User Listing
- Display all website users (customer role)
- Pagination support (10 items per page by default)
- Sort by creation date, last login, etc.
- Advanced filtering by status, email verification

### 2. Search
- Real-time search by name, email, or phone
- Filters reset to first page on new search

### 3. User Statistics
- Total users count
- Active/inactive user count
- Total revenue from all users
- Total bookings
- Average spend per user

### 4. Create User
- Form validation (name, email, phone, password)
- Automatic email generation
- Configurable initial status
- Temporary password support for admin-created users

### 5. Update User
- Edit name, email, phone
- Change user status (active/inactive)
- Non-destructive updates

### 6. Delete User
- Permanent deletion with confirmation
- Removes all associated data

### 7. Toggle Status
- Quick toggle between active/inactive
- Non-destructive operation (soft delete alternative)

## Error Handling

### Frontend Error Handling
- API errors are caught and displayed to user
- Validation errors are shown before sending to server
- Network errors are handled gracefully
- Error messages can be dismissed

### Backend Error Handling
- Input validation with Joi schemas
- MongoDB duplicate key handling
- ObjectId format validation
- Authorization checks
- Detailed error responses

## Security

### Frontend
- Tokens stored securely in localStorage
- CORS-enabled requests with proper headers
- Input validation before API calls
- Authorization checks on component level

### Backend
- JWT authentication required
- Admin role authorization
- Input validation and sanitization
- MongoDB ObjectId validation
- Password hashing with bcrypt
- Email uniqueness validation

## Performance Considerations

1. **Pagination**: Limited to 10-100 items per page
2. **Lean Queries**: Uses MongoDB `.lean()` for read-only operations
3. **Field Selection**: Excludes sensitive fields (password, __v)
4. **Indexing**: Email field is indexed for faster searches
5. **Caching**: Could be added for frequently accessed data

## Troubleshooting

### Issue: "Import path not found"
**Solution**: Verify file paths in import statements. The service should be at:
```
/Management/src/services/websiteUser.service.js
```

### Issue: "401 Unauthorized"
**Solution**: Ensure you're logged in as an admin user. Token must be stored in localStorage.

### Issue: "Network error"
**Solution**: Verify backend is running and `VITE_API_BASE_URL` environment variable is set correctly.

### Issue: "Validation errors"
**Solution**: Check form data meets requirements:
- Name: 2-50 characters
- Email: Valid email format
- Phone: 10 digits
- Password: 6-128 characters

## Future Enhancements

1. **Batch Operations**: Delete/toggle status for multiple users
2. **Export**: Export user list as CSV/PDF
3. **Import**: Import users from CSV
4. **User Roles**: Create custom user roles and permissions
5. **Activity Logs**: Track user actions
6. **Advanced Filtering**: More filter options (registration date range, spending range)
7. **User Groups**: Organize users into groups
8. **Email Templates**: Customize user invitation emails
9. **Bulk Email**: Send emails to multiple users
10. **Analytics**: More detailed user analytics

## Files Structure

```
Management/
├── src/
│   ├── services/
│   │   ├── websiteUser.service.js      (Main service)
│   │   ├── api.js                      (API client)
│   │   └── index.js                    (Services index)
│   └── features/
│       └── user-management/
│           ├── hooks/
│           │   ├── useWebsiteUsers.js  (Custom hook)
│           │   └── index.js            (Hooks index)
│           └── components/
│               └── WebsiteUsersManagement/
│                   ├── WebsiteUsersManagement.jsx
│                   ├── WebsiteUsersTable.jsx
│                   └── index.js

Server/
├── src/
│   ├── routes/
│   │   └── user.routes.js              (API routes)
│   ├── controllers/
│   │   └── user.controller.js          (Business logic)
│   ├── models/
│   │   └── user.model.js               (MongoDB schema)
│   └── validators/
│       └── user.validator.js           (Input validation)
```

## Testing

To test the implementation:

1. **Login as Admin**
   - Navigate to Management dashboard
   - Login with admin credentials

2. **Create User**
   - Click "Add User" button
   - Fill form with valid data
   - Click "Create User"
   - Verify user appears in list

3. **Edit User**
   - Click edit icon on user row
   - Modify details
   - Click "Update User"
   - Verify changes are reflected

4. **Toggle Status**
   - Click eye/eye-off icon on user row
   - Verify status changes to inactive/active

5. **Delete User**
   - Click delete icon on user row
   - Confirm deletion
   - Verify user is removed from list

6. **Search**
   - Type in search field
   - Verify list filters in real-time

7. **Pagination**
   - Navigate between pages
   - Verify correct users are displayed

## Support

For issues or questions, refer to:
- Backend API documentation: `/Server/README.md`
- Frontend documentation: `/Management/README.md`
- Code comments in service files

---

**Last Updated**: November 7, 2025
**Version**: 1.0.0
