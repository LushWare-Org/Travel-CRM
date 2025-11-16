/**
 * User Management Types and Enums
 */

export const USER_ROLES = {
  ADMIN: 'Admin',
  SALES_REP: 'Sales Rep',
  ACCOUNTANT: 'Accountant'
};

export const VENDOR_TYPES = {
  HOTEL: 'Hotel',
  TRAVEL_AGENT: 'Travel Agent',
  RESORT: 'Resort',
  RESTAURANT: 'Restaurant',
  CAR_RENTAL: 'Car Rental',
  TOUR_OPERATOR: 'Tour Operator',
  AIRLINE: 'Airline',
  OTHER: 'Other'
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

export const ADMIN_PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_SALES_REPS: 'manage_sales_reps',
  MANAGE_VENDORS: 'manage_vendors',
  VIEW_REPORTS: 'view_reports',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_ADMINS: 'manage_admins',
  SYSTEM_SETTINGS: 'system_settings',
  AUDIT_LOG: 'audit_log'
};

export const VENDOR_VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
};
