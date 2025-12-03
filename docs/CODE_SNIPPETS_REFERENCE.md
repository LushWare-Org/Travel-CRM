# Code Snippets Reference - Permission Implementation

## Quick Copy-Paste Reference

### 1. Backend Permission Check Helper

**File**: `Server/src/controllers/admin.controller.js` (Lines 12-40)

```javascript
/**
 * Check if admin has permission to manage a specific role
 * @param {Object} requestingAdmin - The admin making the request
 * @param {String} targetRole - The role being managed (admin, vendor, salesRep)
 * @throws {AppError} If admin lacks permission
 */
const checkAdminPermissionForRole = (requestingAdmin, targetRole) => {
  // SuperAdmin has all permissions
  if (requestingAdmin.role === 'superAdmin') {
    return;
  }

  // If admin has granular permissions, check them
  if (requestingAdmin.role === 'admin' && requestingAdmin.permissions && requestingAdmin.permissions.length > 0) {
    const permissionMap = {
      admin: 'manage_admins',
      vendor: 'manage_vendors',
      salesRep: 'manage_sales_reps',
      customer: 'manage_users',
    };

    const requiredPermission = permissionMap[targetRole];
    if (requiredPermission && !requestingAdmin.permissions.includes(requiredPermission)) {
      logger.warn(
        `Unauthorized action attempt: ${requestingAdmin.email} lacks '${requiredPermission}' permission to manage ${targetRole}`,
      );
      throw new AppError(
        `You do not have permission to manage ${targetRole} accounts. Required permission: ${requiredPermission}`,
        403,
      );
    }
  }
};
```

**Usage in createStaff endpoint**:
```javascript
export const createStaff = asyncHandler(async (req, res, next) => {
  const { name, email, phone, role, permissions } = req.body;

  // Validate role
  if (!['salesRep', 'vendor', 'admin'].includes(role)) {
    throw new AppError('Invalid role...', 400);
  }

  // ✅ PERMISSION CHECK HERE - THE BUG FIX
  checkAdminPermissionForRole(req.user, role);

  // Rest of function...
});
```

### 2. Frontend Permission Context Hook

**File**: `Management/src/contexts/PermissionContext.jsx`

```javascript
/**
 * Hook to access permission context
 * Usage: const permission = usePermission();
 */
export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within PermissionProvider');
  }
  return context;
};

// Key methods available:
// permission.hasPermission('manage_admins') → boolean
// permission.canManageRole('admin') → boolean
// permission.getAccessibleRoles() → ['admin', 'vendor']
```

### 3. Permission Context Provider Setup

**File**: `Management/src/main.jsx`

```jsx
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import App from './App';

function Root() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </AuthProvider>
  );
}

export default Root;
```

### 4. Using Permissions in Components

**File**: `Management/src/features/user-management/components/AdminManagement/AdminManagement.jsx`

```jsx
import { usePermission } from '../../../../contexts/PermissionContext';
import { getAccessibleTabs, getPermissionDeniedMessage } from '../../utils/permissionUtils';
import PermissionDeniedView from '../Common/PermissionDeniedView';

const AdminManagement = () => {
  const permission = usePermission();
  const canManageAdmins = permission.hasPermission('manage_admins');

  const handleAddAdmin = async () => {
    // ✅ Check permission before trying to create
    if (!canManageAdmins) {
      const errorMsg = getPermissionDeniedMessage('create', 'admin accounts');
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    // Proceed with admin creation...
  };

  return (
    <div className="space-y-6">
      {!loading && (
        <>
          {/* ✅ Show PermissionDeniedView if user lacks permission */}
          {!canManageAdmins ? (
            <PermissionDeniedView
              section="Admin Management"
              requiredPermission="manage_admins"
              message="You need manage_admins permission to create and manage administrator accounts"
            />
          ) : (
            <>
              {/* Table and controls only show if user has permission */}
              {/* ... admin table ... */}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AdminManagement;
```

### 5. Tab Filtering Utility

**File**: `Management/src/features/user-management/utils/permissionUtils.js`

```javascript
/**
 * Get only the tabs the user has permission to access
 */
export const getAccessibleTabs = (permissionContext) => {
  const allTabs = [
    {
      id: 'website-users',
      label: 'Website Users',
      requiredPermission: 'manage_users',
      component: WebsiteUsersManagement,
    },
    {
      id: 'admins',
      label: 'Manage Admins',
      requiredPermission: 'manage_admins',
      component: AdminManagement,
    },
    {
      id: 'sales-reps',
      label: 'Sales Representatives',
      requiredPermission: 'manage_sales_reps',
      component: SalesRepManagement,
    },
    {
      id: 'vendors',
      label: 'Vendor Partners',
      requiredPermission: 'manage_vendors',
      component: VendorManagement,
    },
  ];

  return allTabs.filter((tab) => permissionContext.hasPermission(tab.requiredPermission));
};

/**
 * Check if user can perform action on a specific role
 */
export const canPerformActionOnRole = (permissionContext, targetRole, action = 'manage') => {
  const permissionMap = {
    admin: 'manage_admins',
    vendor: 'manage_vendors',
    salesRep: 'manage_sales_reps',
    customer: 'manage_users',
  };

  const requiredPermission = permissionMap[targetRole];
  return requiredPermission && permissionContext.hasPermission(requiredPermission);
};

/**
 * Get user-friendly error message for permission denial
 */
export const getPermissionDeniedMessage = (action, roleLabel) => {
  const actionLabels = {
    create: 'create',
    edit: 'edit',
    delete: 'delete',
    manage: 'manage',
    view: 'view',
  };

  const verb = actionLabels[action] || action;
  return `You do not have permission to ${verb} ${roleLabel}. Contact your administrator to request access.`;
};
```

### 6. Permission Denied View Component

**File**: `Management/src/features/user-management/components/Common/PermissionDeniedView.jsx`

```jsx
import { Lock, ArrowLeft, MessageSquare } from 'lucide-react';

export const PermissionDeniedView = ({
  section = 'This Section',
  requiredPermission = 'unknown_permission',
  message = null,
}) => {
  const handleRequestAccess = () => {
    const template = `Hello Admin,\n\nI would like to request access to the "${section}" section in the management panel.\n\nRequired permission: ${requiredPermission}\n\nThank you.`;
    navigator.clipboard.writeText(template);
    alert('Access request template copied to clipboard!');
  };

  return (
    <div className="flex items-center justify-center min-h-96 bg-gray-50 rounded-lg border-2 border-red-200 p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse bg-red-500 opacity-20 rounded-full blur-md"></div>
            <Lock className="text-red-600 w-16 h-16 relative" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h3>
        <p className="text-gray-600 mb-4">
          {message || `You don't have permission to access the ${section} section.`}
        </p>

        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Required permission:</strong>
          </p>
          <code className="text-sm text-red-600 font-mono">{requiredPermission}</code>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/admin/dashboard"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Dashboard
          </a>

          <button
            onClick={handleRequestAccess}
            className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
          >
            <MessageSquare className="w-4 h-4" />
            Request Access
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Contact your administrator if you believe you should have access to this section.
        </p>
      </div>
    </div>
  );
};

export default PermissionDeniedView;
```

### 7. UserManagementPage Tab Filtering

**File**: `Management/src/features/user-management/UserManagementPage.jsx`

```jsx
import { usePermission } from '../../../contexts/PermissionContext';
import { getAccessibleTabs } from './utils/permissionUtils';
import PermissionDeniedView from './components/Common/PermissionDeniedView';

const UserManagementPage = () => {
  const permission = usePermission();
  const [activeTab, setActiveTab] = useState(null);

  // Get only tabs user has permission to access
  const accessibleTabs = useMemo(() => {
    return getAccessibleTabs(permission);
  }, [permission]);

  // Set initial tab to first accessible tab
  useEffect(() => {
    if (accessibleTabs.length > 0 && !activeTab) {
      setActiveTab(accessibleTabs[0].id);
    }
  }, [accessibleTabs, activeTab]);

  // If user has no accessible tabs, show permission denied view
  if (accessibleTabs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <PermissionDeniedView
          section="User Management"
          message="You don't have permission to access any user management sections."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Render only accessible tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {accessibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render active tab component */}
      {accessibleTabs.find((tab) => tab.id === activeTab)?.component}
    </div>
  );
};
```

### 8. Complete Permission List Constants

**File**: `Management/src/contexts/PermissionContext.jsx`

```javascript
export const PERMISSION_LIST = {
  MANAGE_USERS: 'manage_users',           // Create/edit customer accounts
  MANAGE_SALES_REPS: 'manage_sales_reps', // Manage sales team
  MANAGE_VENDORS: 'manage_vendors',       // Manage vendor partnerships
  MANAGE_ADMINS: 'manage_admins',         // Create/manage admin accounts
  VIEW_REPORTS: 'view_reports',           // Access analytics
  MANAGE_BILLING: 'manage_billing',       // Handle billing operations
  SYSTEM_SETTINGS: 'system_settings',     // Configure system-wide settings
  AUDIT_LOG: 'audit_log',                 // View audit logs
};

export const PERMISSION_METADATA = {
  [PERMISSION_LIST.MANAGE_USERS]: {
    id: 'manage_users',
    label: 'Manage Website Users',
    category: 'Users',
    description: 'Create, edit, and manage customer accounts',
  },
  [PERMISSION_LIST.MANAGE_ADMINS]: {
    id: 'manage_admins',
    label: 'Manage Admins',
    category: 'System',
    description: 'Create and manage administrator accounts',
  },
  [PERMISSION_LIST.MANAGE_SALES_REPS]: {
    id: 'manage_sales_reps',
    label: 'Manage Sales Reps',
    category: 'Staff',
    description: 'Manage sales representatives and their assignments',
  },
  [PERMISSION_LIST.MANAGE_VENDORS]: {
    id: 'manage_vendors',
    label: 'Manage Vendors',
    category: 'Partners',
    description: 'Manage vendor partnerships and services',
  },
  [PERMISSION_LIST.VIEW_REPORTS]: {
    id: 'view_reports',
    label: 'View Reports',
    category: 'Analytics',
    description: 'Access reports and analytics',
  },
  [PERMISSION_LIST.MANAGE_BILLING]: {
    id: 'manage_billing',
    label: 'Manage Billing',
    category: 'Finance',
    description: 'Handle billing and payments',
  },
  [PERMISSION_LIST.SYSTEM_SETTINGS]: {
    id: 'system_settings',
    label: 'System Settings',
    category: 'System',
    description: 'Configure system-wide settings',
  },
  [PERMISSION_LIST.AUDIT_LOG]: {
    id: 'audit_log',
    label: 'Audit Logs',
    category: 'System',
    description: 'View audit logs',
  },
};
```

---

## Usage Examples

### Example 1: Checking Single Permission
```javascript
const permission = usePermission();

if (permission.hasPermission('manage_admins')) {
  // Show admin management section
}
```

### Example 2: Checking Multiple Permissions (AND)
```javascript
// User must have BOTH permissions
if (permission.hasAllPermissions(['manage_admins', 'audit_log'])) {
  // Show advanced admin features
}
```

### Example 3: Checking Multiple Permissions (OR)
```javascript
// User must have AT LEAST ONE permission
if (permission.hasAnyPermission(['manage_admins', 'manage_users', 'manage_sales_reps'])) {
  // Show user management section
}
```

### Example 4: Role-Based Check
```javascript
// Convenience method for role checks
if (permission.canManageRole('admin')) {
  // Can manage admin accounts
}
```

### Example 5: Get Accessible Sections
```javascript
const roles = permission.getAccessibleRoles(); // ['admin', 'vendor']
const perms = permission.getAccessiblePermissions(); // [metadata objects]
```

---

## Testing Snippets

### Manual Test in Browser Console
```javascript
// Check current user permissions
const user = JSON.parse(localStorage.getItem('user'));
console.log('User role:', user.role);
console.log('User permissions:', user.permissions);

// Check if user can manage admins
console.log('Can manage admins:', user.permissions?.includes('manage_admins'));
```

### API Test with cURL
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"pass"}' | jq -r '.token')

# Try to create admin (should fail if no manage_admins permission)
curl -X POST http://localhost:5000/api/admin/staff \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"New Admin",
    "email":"newadmin@test.com",
    "role":"admin",
    "permissions":["manage_admins"]
  }'

# Expected response (if no permission):
# {
#   "message": "You do not have permission to manage admin accounts. Required permission: manage_admins",
#   "code": "PERMISSION_DENIED",
#   "statusCode": 403
# }
```

---

**Last Updated**: December 2, 2025
**Status**: Ready for Implementation
