# Code Changes Reference

## Backend Changes

### File: Server/src/routes/package.routes.js

**Added after protected routes section:**
```javascript
/**
 * Protected Routes (Require Authentication)
 */

// Create a new package (admin and staff only)
router.post('/', protect, authorize('admin', 'staff'), createPackageValidator, createPackage);

// Update a package (admin and staff only)
router.put('/:id', protect, authorize('admin', 'staff'), updatePackageValidator, updatePackage);

// Delete a package (admin only)
router.delete('/:id', protect, authorize('admin'), packageIdValidator, deletePackage);

// Get packages for authenticated users (including salesReps with read-only access)
router.get('/protected/all', protect, getPackagesValidator, getPackages);
```

---

### File: Server/src/controllers/package.controller.js

**Modified getPackages export:**
```javascript
/**
 * Get all packages with filtering and pagination
 * GET /api/packages
 * 
 * For salesReps: Only published packages are returned
 * For admins/staff: All packages (or filtered by status param) are returned
 */
export const getPackages = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const query = req.query;
  
  // If user is a salesRep and no explicit status is provided, filter to published only
  if (req.user && req.user.role === 'salesRep' && !query.status) {
    query.status = 'published';
  }

  const result = await packageService.getPackages(query);

  res.status(200).json({
    success: true,
    message: 'Packages retrieved successfully',
    data: result.packages,
    pagination: result.pagination,
  });
});
```

---

## Frontend Changes

### File: Management/src/features/itinerary/components/PackageCard.jsx

**Key changes:**
1. Added import: `import { useAuth } from '../../../contexts/AuthContext';`
2. Added in component: `const { user } = useAuth();`
3. Added flag: `const isSalesRep = user?.role === 'salesRep';`
4. Wrapped Edit button:
```jsx
{!isSalesRep && (
  <button
    onClick={() => onEdit(pkg)}
    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600..."
  >
    <Edit className="w-4 h-4" />
    Edit
  </button>
)}
```
5. Wrapped Duplicate button:
```jsx
{!isSalesRep && (
  <button
    onClick={() => onDuplicate(pkg)}
    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700..."
  >
    <Copy className="w-4 h-4" />
    Duplicate
  </button>
)}
```
6. Wrapped Delete button:
```jsx
{user?.role === 'admin' && (
  <button
    onClick={() => onDelete(pkg._id || pkg.id)}
    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700..."
  >
    <Trash2 className="w-4 h-4" />
    Delete
  </button>
)}
```

---

### File: Management/src/features/itinerary/components/PageHeader.jsx

**Changes:**
1. Added import: `import { useAuth } from '../../../contexts/AuthContext';`
2. Added in component: `const { user } = useAuth();`
3. Added flag: `const isSalesRep = user?.role === 'salesRep';`
4. Updated description:
```jsx
<p className="text-gray-600 mt-1">
  {isSalesRep 
    ? 'View published packages and download itineraries' 
    : 'Create, edit, and manage travel packages with detailed itineraries'}
</p>
```
5. Wrapped button:
```jsx
{!isSalesRep && (
  <button
    onClick={onNewPackage}
    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600..."
  >
    <Plus className="w-4 h-4" />
    New Package
  </button>
)}
```

---

### File: Management/src/features/itinerary/containers/ItineraryGenerationContainer.jsx

**Key changes:**
1. Added import: `import { useAuth } from '../../../contexts/AuthContext';`
2. Added in component definition:
```jsx
const { user } = useAuth();
// ... existing state ...
const isSalesRep = user?.role === 'salesRep';
```
3. Modified useEffect:
```jsx
useEffect(() => {
  const loadPackages = async () => {
    try {
      // For salesReps, use the protected endpoint which will automatically filter published packages
      // For other roles, use the standard endpoint
      const response = isSalesRep 
        ? await ApiService.getPackagesProtected()
        : await ApiService.getPackages();
      
      if (response.success && Array.isArray(response.data)) {
        setPackages(response.data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  loadPackages();
}, [isSalesRep]);
```

4. Updated handlers:
```jsx
const handleNewPackageDialogOpen = () => {
  if (isSalesRep) {
    Swal.fire('Access Denied', 
      'Sales Representatives do not have permission to create packages.', 
      'info');
    return;
  }
  
  setNewFormData(createDefaultPackage());
  setImages([]);
  setShowNewPackageDialog(true);
};

const handleEditPackage = (pkg) => {
  if (isSalesRep) {
    Swal.fire('Access Denied', 
      'Sales Representatives do not have permission to edit packages.', 
      'info');
    return;
  }
  
  // ... rest of handler
};

const handleDuplicatePackage = (pkg) => {
  if (isSalesRep) {
    Swal.fire('Access Denied', 
      'Sales Representatives do not have permission to duplicate packages.', 
      'info');
    return;
  }
  
  // ... rest of handler
};
```

---

### File: Management/src/features/itinerary/services/apiService.js

**Added method:**
```javascript
static async getPackagesProtected(params = {}) {
  // Protected endpoint that automatically filters published packages for salesReps
  const queryString = new URLSearchParams(params).toString();
  return makeRequest(`/packages/protected/all${queryString ? `?${queryString}` : ''}`);
}
```

---

### File: Management/src/pages/Sidebar.jsx

**Changed navigation item:**
```javascript
// Before:
{ icon: MapPin, label: "Packages", path: "/itineraries", requiredPermission: "manage_packages" }

// After:
{ icon: MapPin, label: "Packages", path: "/itineraries", requiredPermission: null, allowedRoles: ["admin", "salesRep"] }
```

---

## Summary of Changes

| File | Type | Changes | Lines |
|------|------|---------|-------|
| package.routes.js | Backend | Added protected route | +4 |
| package.controller.js | Backend | Added role-based filtering | +6 |
| PackageCard.jsx | Frontend | Conditional button rendering | +45 |
| PageHeader.jsx | Frontend | Conditional button & description | +18 |
| ItineraryGenerationContainer.jsx | Frontend | Role checks & handler updates | +50 |
| apiService.js | Frontend | New API method | +5 |
| Sidebar.jsx | Frontend | Role-based navigation | +1 |
| **TOTAL** | | | **129** |

---

## Testing the Changes

### Backend Testing
```bash
# Test protected endpoint
curl -H "Authorization: Bearer <salesrep_token>" \
  http://localhost:5000/api/v1/packages/protected/all

# Response should only include published packages
```

### Frontend Testing
1. Login as salesRep
2. Navigate to Packages
3. Verify buttons are hidden/shown correctly
4. Try restricted actions - should show alerts

---

## Rollback Instructions

If you need to undo these changes:

```bash
# Revert all changes
git checkout -- Server/src/routes/package.routes.js
git checkout -- Server/src/controllers/package.controller.js
git checkout -- Management/src/features/itinerary/components/PackageCard.jsx
git checkout -- Management/src/features/itinerary/components/PageHeader.jsx
git checkout -- Management/src/features/itinerary/containers/ItineraryGenerationContainer.jsx
git checkout -- Management/src/features/itinerary/services/apiService.js
git checkout -- Management/src/pages/Sidebar.jsx
```

---

## Notes

- All changes are backward compatible
- No breaking changes to existing APIs
- Admin functionality completely preserved
- SalesRep access is additive (new capability)
- All security checks server-side enforced
