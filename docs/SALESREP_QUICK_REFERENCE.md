# Sales Rep Package Access - Quick Reference

## Summary
Sales Representatives now have **read-only access** to published packages in the admin panel. They can view package details and download PDFs, but cannot create, edit, delete, or duplicate packages.

## Key Changes

### 🔒 Backend
1. **New Protected Route**: `GET /api/v1/packages/protected/all`
   - Automatically filters published packages for salesReps
   - Requires authentication

2. **Controller Enhancement**: Automatic status filtering for salesReps
   - When salesRep requests packages, backend adds `status: 'published'` filter
   - Prevents access to draft/archived packages

### 🎨 Frontend UI Updates

#### PackageCard Component
```jsx
// Now conditionally renders buttons:
<View />        // ✅ Always visible
<Download />    // ✅ Always visible
<Edit />        // ❌ Hidden for salesReps
<Duplicate />   // ❌ Hidden for salesReps
<Delete />      // ❌ Hidden for non-admins
```

#### PageHeader Component
```jsx
// "New Package" button is hidden for salesReps
// Description changes based on user role:
// - SalesReps: "View published packages and download itineraries"
// - Admins: "Create, edit, and manage travel packages..."
```

#### ItineraryGenerationContainer
```jsx
// Handlers prevent salesReps from:
- handleNewPackageDialogOpen() → Shows permission alert
- handleEditPackage() → Shows permission alert
- handleDuplicatePackage() → Shows permission alert
```

#### Sidebar Navigation
```jsx
// Updated to allow salesReps:
{ icon: MapPin, label: "Packages", path: "/itineraries", allowedRoles: ["admin", "salesRep"] }
```

## User Experience

### 👤 When SalesRep Logs In

**Dashboard View:**
- Sidebar shows "Packages" menu (enabled)

**Packages Page:**
- Header: "View published packages and download itineraries"
- No "New Package" button
- Package cards show: View, Download PDF buttons only
- Only published packages displayed

**User Actions:**
- Can view all published package details
- Can download packages as PDFs
- Cannot edit, delete, or duplicate
- Clicking restricted buttons shows: "Sales Representatives do not have permission to [action]"

### 👨‍💼 When Admin Logs In

**Unchanged Experience:**
- All original functionality works
- Can create, edit, delete, duplicate packages
- Can see all packages (draft, published, archived)
- All buttons visible and functional

## Testing Checklist

- [ ] Login as salesRep
- [ ] Verify "Packages" in sidebar is enabled
- [ ] Verify "New Package" button is NOT visible
- [ ] Verify only published packages shown
- [ ] Verify "View" button works
- [ ] Verify "Download PDF" button works
- [ ] Verify "Edit" button does NOT exist
- [ ] Verify "Delete" button does NOT exist
- [ ] Verify "Duplicate" button does NOT exist
- [ ] Login as admin
- [ ] Verify all buttons work normally
- [ ] Verify all packages visible (draft, published, archived)

## API Endpoints

### Public (No Auth Required)
```
GET /api/v1/packages              - Get packages (no auth)
GET /api/v1/packages/:id          - Get single package
GET /api/v1/packages/featured/all - Get featured packages
GET /api/v1/packages/stats/all    - Get stats
```

### Protected (Auth Required)
```
GET /api/v1/packages/protected/all - Get packages (for authenticated users)
                                      Auto-filters published for salesReps
POST /api/v1/packages              - Create (admin/staff only)
PUT /api/v1/packages/:id           - Update (admin/staff only)
DELETE /api/v1/packages/:id        - Delete (admin only)
```

## Files Changed

```
Server/
  src/routes/
    └── package.routes.js (updated)
  src/controllers/
    └── package.controller.js (updated)

Management/
  src/features/itinerary/
    components/
      ├── PackageCard.jsx (updated)
      ├── PageHeader.jsx (updated)
      └── services/
          └── apiService.js (updated)
    containers/
      └── ItineraryGenerationContainer.jsx (updated)
  src/pages/
    └── Sidebar.jsx (updated)
```

## Security Layer

✅ **Server-Side**: Role-based filtering in controller (primary)
✅ **Client-Side**: UI buttons hidden based on role (secondary)
❌ **Cannot Bypass**: API calls without proper role will be rejected by server

## Future Enhancements

- Custom PDF exports with salesRep-specific branding
- Package comparison tool for multiple packages
- Bulk PDF download functionality
- Audit log of packages viewed/downloaded
- Integration with lead-to-package assignment workflow
