/**
 * Permission Utility Functions
 * Helpers for permission checking in components
 */

import { PERMISSION_LIST } from '../../../contexts/PermissionContext';

/**
 * Get tab configuration for user management based on user role/permissions
 * Returns only tabs the user has permission to access
 * @param {Object} permissionContext - The permission context object from usePermission()
 * @returns {Array} Array of tab objects with id, label, and access info
 */
export const getAccessibleTabs = (permissionContext) => {
  if (!permissionContext) return [];

  const allTabs = [
    {
      id: 'admins',
      label: 'Manage Admins',
      role: 'admin',
      requiredPermission: PERMISSION_LIST.MANAGE_ADMINS,
      icon: 'Shield',
      color: 'purple',
    },
    {
      id: 'sales-reps',
      label: 'Sales Representatives',
      role: 'salesRep',
      requiredPermission: PERMISSION_LIST.MANAGE_SALES_REPS,
      icon: 'Users',
      color: 'blue',
    },
    {
      id: 'vendors',
      label: 'Vendor Partners',
      role: 'vendor',
      requiredPermission: PERMISSION_LIST.MANAGE_VENDORS,
      icon: 'Building2',
      color: 'amber',
    },
    {
      id: 'customers',
      label: 'Website Users',
      role: 'customer',
      requiredPermission: PERMISSION_LIST.MANAGE_USERS,
      icon: 'Users',
      color: 'green',
    },
  ];

  // Filter tabs based on user permissions
  return allTabs.filter((tab) =>
    permissionContext.hasPermission(tab.requiredPermission)
  );
};

/**
 * Check if user has permission to perform an action on a role
 * @param {Object} permissionContext - The permission context object
 * @param {string} targetRole - The role being managed (admin, salesRep, vendor, customer)
 * @param {string} action - The action (create, read, update, delete)
 * @returns {boolean} True if user can perform this action
 */
export const canPerformActionOnRole = (permissionContext, targetRole, action) => {
  if (!permissionContext) return false;

  // Map target role to required permission
  const rolePermissionMap = {
    admin: PERMISSION_LIST.MANAGE_ADMINS,
    salesRep: PERMISSION_LIST.MANAGE_SALES_REPS,
    vendor: PERMISSION_LIST.MANAGE_VENDORS,
    customer: PERMISSION_LIST.MANAGE_USERS,
  };

  const requiredPermission = rolePermissionMap[targetRole];
  return requiredPermission
    ? permissionContext.hasPermission(requiredPermission)
    : false;
};

/**
 * Get a permission-denied error message
 * @param {string} action - The action that was denied (e.g., 'create', 'manage', 'delete')
 * @param {string} roleLabel - The role being managed (e.g., 'Admin accounts')
 * @returns {string} User-friendly error message
 */
export const getPermissionDeniedMessage = (action, roleLabel = 'this resource') => {
  const actions = {
    create: `create ${roleLabel}`,
    update: `update ${roleLabel}`,
    delete: `delete ${roleLabel}`,
    manage: `manage ${roleLabel}`,
    view: `view ${roleLabel}`,
  };

  const actionText = actions[action] || `perform this action on ${roleLabel}`;
  return `You don't have permission to ${actionText}. Contact your administrator to request access.`;
};

/**
 * Get label for a role (formatted for display)
 * @param {string} role - The role identifier (admin, salesRep, vendor, customer)
 * @returns {string} User-friendly role label
 */
export const getRoleLabel = (role) => {
  const labels = {
    admin: 'Admin',
    salesRep: 'Sales Representative',
    vendor: 'Vendor',
    customer: 'Website User',
  };
  return labels[role] || role;
};

/**
 * Get role plural form for messages
 * @param {string} role - The role identifier
 * @returns {string} Plural role label
 */
export const getRolePluralLabel = (role) => {
  const labels = {
    admin: 'Admins',
    salesRep: 'Sales Representatives',
    vendor: 'Vendors',
    customer: 'Website Users',
  };
  return labels[role] || `${role}s`;
};

/**
 * Create a section/tab that's disabled due to lack of permissions
 * @param {string} tabLabel - The label of the tab
 * @param {string} requiredPermission - The permission needed (display only)
 * @returns {Object} Object with disabled flag and message
 */
export const getDisabledTabInfo = (tabLabel, requiredPermission) => {
  return {
    disabled: true,
    message: `Access to "${tabLabel}" requires the "${requiredPermission}" permission.`,
  };
};

/**
 * Check if user can perform basic admin operations
 * @param {Object} permissionContext - The permission context
 * @returns {Object} Object with boolean flags for each operation type
 */
export const getAdminCapabilities = (permissionContext) => {
  if (!permissionContext) {
    return {
      canManageUsers: false,
      canManageSalesReps: false,
      canManageVendors: false,
      canManageAdmins: false,
      canViewReports: false,
      canManageBilling: false,
      canManageSettings: false,
      canViewAuditLogs: false,
    };
  }

  return {
    canManageUsers: permissionContext.hasPermission(
      PERMISSION_LIST.MANAGE_USERS
    ),
    canManageSalesReps: permissionContext.hasPermission(
      PERMISSION_LIST.MANAGE_SALES_REPS
    ),
    canManageVendors: permissionContext.hasPermission(
      PERMISSION_LIST.MANAGE_VENDORS
    ),
    canManageAdmins: permissionContext.hasPermission(
      PERMISSION_LIST.MANAGE_ADMINS
    ),
    canViewReports: permissionContext.hasPermission(PERMISSION_LIST.VIEW_REPORTS),
    canManageBilling: permissionContext.hasPermission(
      PERMISSION_LIST.MANAGE_BILLING
    ),
    canManageSettings: permissionContext.hasPermission(
      PERMISSION_LIST.SYSTEM_SETTINGS
    ),
    canViewAuditLogs: permissionContext.hasPermission(PERMISSION_LIST.AUDIT_LOG),
  };
};

/**
 * Get the count of accessible management sections
 * @param {Object} permissionContext - The permission context
 * @returns {number} Number of sections user can access
 */
export const getAccessibleSectionCount = (permissionContext) => {
  if (!permissionContext) return 0;

  const capabilities = getAdminCapabilities(permissionContext);
  return Object.values(capabilities).filter((v) => v === true).length;
};

export default {
  getAccessibleTabs,
  canPerformActionOnRole,
  getPermissionDeniedMessage,
  getRoleLabel,
  getRolePluralLabel,
  getDisabledTabInfo,
  getAdminCapabilities,
  getAccessibleSectionCount,
};
