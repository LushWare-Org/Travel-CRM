# Frontend Integration Guide for Admin Permissions

## 🎯 Quick Start

This guide shows you how to integrate the admin permissions system into the AdminManagement component.

---

## 📦 What's Already Done (Backend)

✅ Database schema updated with `permissions` field  
✅ API endpoints created for permission management  
✅ Validation schemas implemented  
✅ RBAC middleware enhanced  
✅ Frontend service methods added  

---

## 🔧 Frontend Updates Needed

### 1. Update AdminManagement Component

#### Add Permission State to Form Data

The `formData` state already includes `permissions`, so you're good to go!

```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  permissions: [],  // ✅ Already there!
  twoFactorEnabled: false
});
```

#### Update `handleAddAdmin` Function

Replace the createAdmin call to include permissions:

```javascript
const handleAddAdmin = async () => {
  // ... validation code ...

  try {
    setIsSubmitting(true);
    
    const adminData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: 'admin',  // ← Add this
      permissions: formData.permissions  // ← Add this
    };

    const response = await adminService.createAdmin(adminData);
    
    if (response.status === 'success') {
      setSuccessMessage('Admin created successfully!');
      setShowNewAdminDialog(false);
      resetForm();
      loadAdmins();
    }
  } catch (error) {
    console.error('Error creating admin:', error);
    setError(error.response?.data?.message || 'Failed to create admin');
  } finally {
    setIsSubmitting(false);
  }
};
```

#### Update `handleEditAdmin` Function

Add permission update logic:

```javascript
const handleEditAdmin = async () => {
  try {
    setIsSubmitting(true);
    
    // Update basic info
    const updateData = {
      name: formData.name,
      phone: formData.phone,
    };
    
    await adminService.updateAdmin(selectedAdmin.id, updateData);
    
    // Update permissions separately
    await adminService.updateAdminPermissions(
      selectedAdmin.id, 
      formData.permissions
    );
    
    setSuccessMessage('Admin updated successfully!');
    setShowEditAdminDialog(false);
    resetForm();
    loadAdmins();
  } catch (error) {
    console.error('Error updating admin:', error);
    setError(error.response?.data?.message || 'Failed to update admin');
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 2. Add Permission Selection UI

Add this component inside the `UserFormDialog` for both Add and Edit dialogs:

```jsx
{/* Permissions Section */}
<FormGroup 
  label="Permissions" 
  helperText="Select the permissions this admin should have"
>
  <div className="space-y-2 max-h-60 overflow-y-auto">
    {ADMIN_PERMISSIONS_LIST.map((permission) => (
      <label 
        key={permission.id} 
        className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-200"
      >
        <input
          type="checkbox"
          checked={formData.permissions.includes(permission.id)}
          onChange={() => togglePermission(permission.id)}
          className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
        />
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">
            {permission.label}
          </div>
          <div className="text-xs text-gray-500">
            {permission.category}
          </div>
        </div>
      </label>
    ))}
  </div>
</FormGroup>
```

The `togglePermission` function is already implemented in your component! ✅

---

### 3. Display Permissions in Admin Table

Update the `AdminTable` component to show permission count:

```jsx
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex items-center gap-2">
    <Shield className="w-4 h-4 text-purple-600" />
    <span className="text-sm text-gray-600">
      {admin.permissions?.length || 0} permissions
    </span>
  </div>
</td>
```

---

### 4. Show Permissions in Admin Details Modal

Update `AdminDetailsModal.jsx`:

```jsx
<div className="p-6">
  <div className="grid grid-cols-2 gap-6">
    {/* ... existing fields ... */}
    
    <div className="col-span-2">
      <p className="text-xs text-gray-500 font-medium uppercase mb-2">
        Permissions
      </p>
      <div className="flex flex-wrap gap-2">
        {admin.permissions && admin.permissions.length > 0 ? (
          admin.permissions.map(permId => {
            const perm = ADMIN_PERMISSIONS_LIST.find(p => p.id === permId);
            return perm ? (
              <span 
                key={permId}
                className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
              >
                {perm.label}
              </span>
            ) : null;
          })
        ) : (
          <span className="text-sm text-gray-500">No permissions assigned</span>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## 📋 Complete Example: Updated Dialog Form

Here's a complete example of the form with permissions:

```jsx
<UserFormDialog
  isOpen={showNewAdminDialog}
  onClose={() => {
    setShowNewAdminDialog(false);
    resetForm();
  }}
  onSubmit={handleAddAdmin}
  title="Add New Administrator"
  submitLabel="Create Admin"
  isLoading={isSubmitting}
>
  <FormGroup label="Full Name" required error={formErrors.name}>
    <input
      type="text"
      value={formData.name}
      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      placeholder="John Doe"
    />
  </FormGroup>

  <FormGroup label="Email Address" required error={formErrors.email}>
    <input
      type="email"
      value={formData.email}
      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      placeholder="john@example.com"
    />
  </FormGroup>

  <FormGroup label="Phone Number" error={formErrors.phone}>
    <input
      type="tel"
      value={formData.phone}
      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      placeholder="1234567890"
    />
  </FormGroup>

  {/* Permissions Section */}
  <FormGroup 
    label="Permissions" 
    helperText="Select the permissions this admin should have"
  >
    <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
      {ADMIN_PERMISSIONS_LIST.map((permission) => (
        <label 
          key={permission.id} 
          className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
        >
          <input
            type="checkbox"
            checked={formData.permissions.includes(permission.id)}
            onChange={() => togglePermission(permission.id)}
            className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
          />
          <div className="flex-1">
            <div className="font-medium text-sm text-gray-900">
              {permission.label}
            </div>
            <div className="text-xs text-gray-500">
              {permission.category}
            </div>
          </div>
        </label>
      ))}
    </div>
  </FormGroup>
</UserFormDialog>
```

---

## 🧪 Testing Checklist

### Backend Testing

```bash
# 1. Start the server
cd Server
npm run dev

# 2. Test in Postman or similar tool
```

**Test Create Admin with Permissions:**
```http
POST http://localhost:5000/api/v1/admin/users
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Test Admin",
  "email": "testadmin@example.com",
  "phone": "1234567890",
  "role": "admin",
  "permissions": ["manage_users", "view_reports"]
}
```

**Test Get Permissions:**
```http
GET http://localhost:5000/api/v1/admin/users/:adminId/permissions
Authorization: Bearer YOUR_TOKEN_HERE
```

**Test Update Permissions:**
```http
PATCH http://localhost:5000/api/v1/admin/users/:adminId/permissions
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "permissions": ["manage_users", "manage_vendors", "view_reports"]
}
```

**Test Get Available Permissions:**
```http
GET http://localhost:5000/api/v1/admin/permissions/available
Authorization: Bearer YOUR_TOKEN_HERE
```

### Frontend Testing

1. **Start the frontend:**
   ```bash
   cd Management
   npm run dev
   ```

2. **Test workflows:**
   - ✅ Create new admin with permissions selected
   - ✅ Edit existing admin and update permissions
   - ✅ View admin details showing permissions
   - ✅ Verify permissions are saved to database
   - ✅ Check that permissions display correctly after reload

---

## 🐛 Common Issues & Solutions

### Issue: Permissions not showing in form
**Solution:** Make sure `ADMIN_PERMISSIONS_LIST` is imported:
```javascript
import { ADMIN_PERMISSIONS_LIST } from '../../utils/constants';
```

### Issue: Backend returns 400 "Invalid permission"
**Solution:** Check that permission IDs match exactly:
- Frontend: `'manage_users'`
- Backend: `'manage_users'` (underscore, not camelCase)

### Issue: Cannot update permissions
**Solution:** Make sure you're calling the correct service method:
```javascript
await adminService.updateAdminPermissions(adminId, permissions);
```

### Issue: Permissions not persisting
**Solution:** Verify the backend is saving correctly:
1. Check MongoDB Compass or use `db.users.find()`
2. Look for the `permissions` array field
3. Check server logs for validation errors

---

## 📚 Additional Resources

- [Full Implementation Guide](./ADMIN_PERMISSIONS_IMPLEMENTATION.md)
- [Backend API Documentation](./docs/API.md)
- [User Model Schema](./Server/src/models/user.model.js)
- [Admin Service](./Management/src/services/admin.service.js)

---

## ✅ Summary

You now have:
1. ✅ Complete backend implementation for permissions
2. ✅ API endpoints ready to use
3. ✅ Frontend service methods prepared
4. ✅ UI integration guide (this document)
5. ✅ Testing instructions

**Next step:** Update your `AdminManagement.jsx` component following the examples above!

---

**Questions?** Check the main implementation guide or review the code examples above.

**Last Updated:** November 4, 2025
