# Sales Rep Package Viewing Feature

## Overview
Sales Representatives can now access the Package Management section in the admin panel with read-only access. They can only view and download published packages as PDFs. All editing, creation, deletion, and duplication functionality is restricted.

## Implementation Details

### Backend Changes

#### 1. **Package Routes** (`Server/src/routes/package.routes.js`)
- Added new protected route: `GET /api/v1/packages/protected/all`
- This route requires authentication and automatically filters published packages for salesReps
- All other routes remain unchanged with existing authorization rules

#### 2. **Package Controller** (`Server/src/controllers/package.controller.js`)
- Modified `getPackages` handler to automatically filter to published packages when:
  - User is authenticated (has `req.user`)
  - User role is `salesRep`
  - No explicit status filter is provided in query parameters
- Admins and other roles see all packages based on their permission level

### Frontend Changes

#### 1. **PackageCard Component** (`Management/src/features/itinerary/components/PackageCard.jsx`)
- Imported `useAuth` hook to get current user information
- Conditionally renders buttons based on user role:
  - **Always visible**: View, Download PDF buttons
  - **Hidden for salesReps**: Edit, Duplicate buttons
  - **Hidden for non-admins**: Delete button
- SalesReps can only view package details and download PDFs

#### 2. **PageHeader Component** (`Management/src/features/itinerary/components/PageHeader.jsx`)
- Imported `useAuth` hook
- Conditionally renders "New Package" button (hidden for salesReps)
- Updates header description for salesReps: "View published packages and download itineraries"
- Admins/staff see: "Create, edit, and manage travel packages with detailed itineraries"

#### 3. **ItineraryGenerationContainer** (`Management/src/features/itinerary/containers/ItineraryGenerationContainer.jsx`)
- Imported `useAuth` hook
- Added `isSalesRep` flag to track role
- Updated `useEffect` to call protected API endpoint for salesReps
- Modified handlers to prevent salesReps from:
  - Creating new packages (`handleNewPackageDialogOpen`)
  - Editing packages (`handleEditPackage`)
  - Duplicating packages (`handleDuplicatePackage`)
- Each restricted action shows a SweetAlert notification explaining the access restriction

#### 4. **API Service** (`Management/src/features/itinerary/services/apiService.js`)
- Added new method: `getPackagesProtected()`
- Calls the protected endpoint `/packages/protected/all`
- Used by the container when user is a salesRep

#### 5. **Sidebar Component** (`Management/src/pages/Sidebar.jsx`)
- Updated Packages navigation item to allow both admin and salesRep roles
- Changed from permission-based access to role-based access
- SalesReps can now see and access the Packages menu item

## Feature Behavior

### What SalesReps Can Do
✅ View the Package Management page
✅ See published packages in the list
✅ Search and filter packages
✅ View package details (status, price, duration, accommodations, etc.)
✅ Download package itineraries as PDF
✅ View package statistics for published packages only

### What SalesReps Cannot Do
❌ Create new packages
❌ Edit existing packages
❌ Delete packages
❌ Duplicate packages
❌ Change package status
❌ View draft or archived packages

### What Admins/Staff Can Do
✅ All of the above plus:
✅ Create new packages
✅ Edit packages
✅ Duplicate packages
✅ Delete packages (admin only)
✅ View all packages regardless of status
✅ Change package status

## Testing Guide

### Test as SalesRep

1. **Login as a Sales Representative**
   - Use a salesRep account credentials
   - Verify the user role shows as "salesRep" in the user menu

2. **Navigate to Packages**
   - Click "Packages" in the sidebar
   - Verify the page loads with header: "View published packages and download itineraries"
   - Verify "New Package" button is NOT visible

3. **Check Package List**
   - Verify only published packages are shown
   - Draft and archived packages should NOT appear
   - Verify package cards display correctly

4. **Test View Button**
   - Click "View" on any package
   - Verify package details modal opens
   - Check all details are displayed correctly

5. **Test Download PDF**
   - Click "Download PDF" on a package
   - Verify PDF preview opens
   - Verify PDF can be downloaded successfully

6. **Test Restricted Actions**
   - Try clicking "Edit" button (should NOT exist)
   - Try clicking "Delete" button (should NOT exist)
   - Try clicking "Duplicate" button (should NOT exist)
   - Try clicking "New Package" (should NOT exist)

### Test as Admin

1. **Login as Admin**
   - Use an admin account
   - Verify all buttons appear on package cards (View, Edit, Download PDF, Duplicate, Delete)
   - Verify "New Package" button is visible

2. **Verify All Packages Visible**
   - Verify draft, published, and archived packages are all shown
   - Verify status filter works correctly

3. **Test Edit/Create/Delete**
   - Create a new package
   - Edit an existing package
   - Delete a package
   - Verify all actions work normally

## Security Notes

- Authorization is enforced at both backend and frontend
- Backend checks user role and filters data server-side (primary security)
- Frontend UI hides buttons as a convenience (secondary UX enhancement)
- SalesReps cannot bypass restrictions by modifying localStorage or network requests
- API routes enforce proper authorization middleware

## Future Enhancements

Potential improvements for future iterations:
1. Add read-only view for package customization (for lead-based packages)
2. Export packages to different formats (CSV, Excel)
3. Add bulk operations for salesReps (e.g., bulk download multiple PDFs)
4. Track which salesReps downloaded which packages for analytics
5. Allow salesReps to add notes/comments to packages

## Files Modified

### Backend
- `Server/src/routes/package.routes.js`
- `Server/src/controllers/package.controller.js`

### Frontend
- `Management/src/features/itinerary/components/PackageCard.jsx`
- `Management/src/features/itinerary/components/PageHeader.jsx`
- `Management/src/features/itinerary/containers/ItineraryGenerationContainer.jsx`
- `Management/src/features/itinerary/services/apiService.js`
- `Management/src/pages/Sidebar.jsx`

## Rollback Instructions

If you need to revert these changes:
1. Restore the original files from git using `git checkout`
2. Remove the `getPackagesProtected` method from API service
3. Remove the protected route from package routes
4. Remove role-based filtering from package controller
5. Revert sidebar navigation items to permission-based access
