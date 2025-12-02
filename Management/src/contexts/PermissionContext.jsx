import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const PermissionContext = createContext();

/**
 * Available permissions in the system
 */
export const PERMISSION_LIST = {
  MANAGE_USERS: 'manage_users',
  MANAGE_SALES_REPS: 'manage_sales_reps',
  MANAGE_VENDORS: 'manage_vendors',
  MANAGE_ADMINS: 'manage_admins',
  VIEW_REPORTS: 'view_reports',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_LEADS: 'manage_leads',
  MANAGE_PACKAGES: 'manage_packages',
};

/**
 * Permission metadata - describes what each permission allows
 */
export const PERMISSION_METADATA = {
  [PERMISSION_LIST.MANAGE_USERS]: {
    id: 'manage_users',
    label: 'Manage Website Users',
    category: 'Users',
    description: 'Create, edit, and manage customer accounts',
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
  [PERMISSION_LIST.MANAGE_ADMINS]: {
    id: 'manage_admins',
    label: 'Manage Admins',
    category: 'System',
    description: 'Create and manage administrator accounts',
  },
  [PERMISSION_LIST.VIEW_REPORTS]: {
    id: 'view_reports',
    label: 'View Reports',
    category: 'Analytics',
    description: 'Access business reports and analytics',
  },
  [PERMISSION_LIST.MANAGE_BILLING]: {
    id: 'manage_billing',
    label: 'Manage Billing',
    category: 'Finance',
    description: 'Handle billing and payment operations',
  },
  [PERMISSION_LIST.MANAGE_LEADS]: {
    id: 'manage_leads',
    label: 'Manage Leads',
    category: 'Sales',
    description: 'Manage sales leads and lead assignments',
  },
  [PERMISSION_LIST.MANAGE_PACKAGES]: {
    id: 'manage_packages',
    label: 'Manage Packages',
    category: 'Travel',
    description: 'Manage travel packages and itineraries',
  },
};

export const PermissionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

  /**
   * Fetch available permissions from backend
   */
  const fetchAvailablePermissions = useCallback(async () => {
    try {
      // Only fetch for admin and superAdmin users
      if (user?.role !== 'admin' && user?.role !== 'superAdmin') {
        return;
      }

      const response = await axios.get(`${API_URL}/admin/permissions/available`);
      if (response.data?.data?.permissions) {
        setAvailablePermissions(response.data.data.permissions);
      }
    } catch (error) {
      console.error('Failed to fetch available permissions:', error);
    }
  }, [API_URL, user?.role]);

  /**
   * Load user's permissions on mount or when user changes
   */
  useEffect(() => {
    if (isAuthenticated && user) {
      // If user has permissions, set them
      if (user.permissions && Array.isArray(user.permissions)) {
        setPermissions(user.permissions);
      } else {
        setPermissions([]);
      }

      // Fetch all available permissions
      fetchAvailablePermissions();
    } else {
      setPermissions([]);
    }
  }, [isAuthenticated, user, fetchAvailablePermissions]);

  /**
   * Check if user has a specific permission
   * @param {string} permissionId - The permission to check
   * @returns {boolean} True if user has the permission
   */
  const hasPermission = useCallback(
    (permissionId) => {
      // SuperAdmins have all permissions
      if (user?.role === 'superAdmin') {
        return true;
      }

      // Check if permission exists in user's permissions array
      return permissions.includes(permissionId);
    },
    [user, permissions]
  );

  /**
   * Check if user has ALL of the specified permissions
   * @param {string[]} permissionIds - Array of permissions to check
   * @returns {boolean} True if user has all permissions
   */
  const hasAllPermissions = useCallback(
    (permissionIds) => {
      if (!Array.isArray(permissionIds)) {
        return false;
      }

      // SuperAdmins have all permissions
      if (user?.role === 'superAdmin') {
        return true;
      }

      return permissionIds.every((perm) => permissions.includes(perm));
    },
    [user, permissions]
  );

  /**
   * Check if user has ANY of the specified permissions
   * @param {string[]} permissionIds - Array of permissions to check
   * @returns {boolean} True if user has any of the permissions
   */
  const hasAnyPermission = useCallback(
    (permissionIds) => {
      if (!Array.isArray(permissionIds)) {
        return false;
      }

      // SuperAdmins have all permissions
      if (user?.role === 'superAdmin') {
        return true;
      }

      return permissionIds.some((perm) => permissions.includes(perm));
    },
    [user, permissions]
  );

  /**
   * Get user's accessible roles based on permissions
   * @returns {string[]} Array of role names user can manage
   */
  const getAccessibleRoles = useCallback(() => {
    // SuperAdmins can manage all roles
    if (user?.role === 'superAdmin') {
      return ['customer', 'salesRep', 'vendor', 'admin'];
    }

    const roles = [];
    if (hasPermission(PERMISSION_LIST.MANAGE_USERS)) roles.push('customer');
    if (hasPermission(PERMISSION_LIST.MANAGE_SALES_REPS)) roles.push('salesRep');
    if (hasPermission(PERMISSION_LIST.MANAGE_VENDORS)) roles.push('vendor');
    if (hasPermission(PERMISSION_LIST.MANAGE_ADMINS)) roles.push('admin');

    return roles;
  }, [user, hasPermission]);

  /**
   * Check if user can manage a specific role
   * @param {string} roleName - The role to check (customer, salesRep, vendor, admin)
   * @returns {boolean} True if user can manage this role
   */
  const canManageRole = useCallback(
    (roleName) => {
      const rolePermissionMap = {
        customer: PERMISSION_LIST.MANAGE_USERS,
        salesRep: PERMISSION_LIST.MANAGE_SALES_REPS,
        vendor: PERMISSION_LIST.MANAGE_VENDORS,
        admin: PERMISSION_LIST.MANAGE_ADMINS,
      };

      const requiredPermission = rolePermissionMap[roleName];
      return requiredPermission ? hasPermission(requiredPermission) : false;
    },
    [hasPermission]
  );

  /**
   * Get human-readable label for a permission
   * @param {string} permissionId - The permission ID
   * @returns {string} The permission label
   */
  const getPermissionLabel = useCallback((permissionId) => {
    return PERMISSION_METADATA[permissionId]?.label || permissionId;
  }, []);

  /**
   * Get all accessible permissions (those the user has)
   * @returns {Array} Array of permission metadata objects
   */
  const getAccessiblePermissions = useCallback(() => {
    return permissions
      .map((permId) => PERMISSION_METADATA[permId])
      .filter(Boolean);
  }, [permissions]);

  const value = {
    // Data
    permissions,
    availablePermissions,
    loading,

    // Permission checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canManageRole,
    getAccessibleRoles,
    getPermissionLabel,
    getAccessiblePermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to use permission context
 */
export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};

export default PermissionContext;
