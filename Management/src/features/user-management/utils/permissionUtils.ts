/**
 * Permission Utility Functions
 * Helpers for permission checking in components
 */

import { PERMISSION_LIST } from '../../../contexts/PermissionContext';

export interface PermissionContextLike {
  hasPermission: (permission: string) => boolean;
}

export interface AccessibleTab {
  id: string;
  label: string;
  role: string;
  requiredPermission: string;
  icon: string;
  color: string;
}

/**
 * Get tab configuration for user management based on user role/permissions
 * Returns only tabs the user has permission to access
 */
export const getAccessibleTabs = (
  permissionContext: PermissionContextLike | null | undefined
): AccessibleTab[] => {
  if (!permissionContext) return [];

  const allTabs: AccessibleTab[] = [
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
  return allTabs.filter((tab) => permissionContext.hasPermission(tab.requiredPermission));
};

/**
 * Check if user has permission to perform an action on a role
 */
export const canPerformActionOnRole = (
  permissionContext: PermissionContextLike | null | undefined,
  targetRole: string,
  action: string
): boolean => {
  if (!permissionContext) return false;

  // Map target role to required permission
  const rolePermissionMap: Record<string, string> = {
    admin: PERMISSION_LIST.MANAGE_ADMINS,
    salesRep: PERMISSION_LIST.MANAGE_SALES_REPS,
    vendor: PERMISSION_LIST.MANAGE_VENDORS,
    customer: PERMISSION_LIST.MANAGE_USERS,
  };

  const requiredPermission = rolePermissionMap[targetRole];
  return requiredPermission ? permissionContext.hasPermission(requiredPermission) : false;
};

/**
 * Get a permission-denied error message
 */
export const getPermissionDeniedMessage = (action: string, roleLabel = 'this resource'): string => {
  const actions: Record<string, string> = {
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
 */
export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Admin',
    salesRep: 'Sales Representative',
    vendor: 'Vendor',
    customer: 'Website User',
  };
  return labels[role] || role;
};

/**
 * Get role plural form for messages
 */
export const getRolePluralLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Admins',
    salesRep: 'Sales Representatives',
    vendor: 'Vendors',
    customer: 'Website Users',
  };
  return labels[role] || `${role}s`;
};

/**
 * Create a section/tab that's disabled due to lack of permissions
 */
export const getDisabledTabInfo = (tabLabel: string, requiredPermission: string) => {
  return {
    disabled: true,
    message: `Access to "${tabLabel}" requires the "${requiredPermission}" permission.`,
  };
};

export interface AdminCapabilities {
  canManageUsers: boolean;
  canManageSalesReps: boolean;
  canManageVendors: boolean;
  canManageAdmins: boolean;
  canViewReports: boolean;
  canManageBilling: boolean;
  canManageLeads: boolean;
  canManagePackages: boolean;
}

/**
 * Check if user can perform basic admin operations
 */
export const getAdminCapabilities = (
  permissionContext: PermissionContextLike | null | undefined
): AdminCapabilities => {
  if (!permissionContext) {
    return {
      canManageUsers: false,
      canManageSalesReps: false,
      canManageVendors: false,
      canManageAdmins: false,
      canViewReports: false,
      canManageBilling: false,
      canManageLeads: false,
      canManagePackages: false,
    };
  }

  return {
    canManageUsers: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_USERS),
    canManageSalesReps: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_SALES_REPS),
    canManageVendors: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_VENDORS),
    canManageAdmins: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_ADMINS),
    canViewReports: permissionContext.hasPermission(PERMISSION_LIST.VIEW_REPORTS),
    canManageBilling: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_BILLING),
    canManageLeads: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_LEADS),
    canManagePackages: permissionContext.hasPermission(PERMISSION_LIST.MANAGE_PACKAGES),
  };
};

/**
 * Get the count of accessible management sections
 */
export const getAccessibleSectionCount = (
  permissionContext: PermissionContextLike | null | undefined
): number => {
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
