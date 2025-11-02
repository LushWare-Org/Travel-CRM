/**
 * User Management Constants
 */

export const ROLE_COLORS = {
  Admin: {
    badge: 'bg-purple-100 text-purple-800',
    tab: 'bg-purple-100 text-purple-800',
    button: 'bg-purple-600 hover:bg-purple-700'
  },
  'Sales Rep': {
    badge: 'bg-blue-100 text-blue-800',
    tab: 'bg-blue-100 text-blue-800',
    button: 'bg-blue-600 hover:bg-blue-700'
  },
  Accountant: {
    badge: 'bg-green-100 text-green-800',
    tab: 'bg-green-100 text-green-800',
    button: 'bg-green-600 hover:bg-green-700'
  }
};

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  pending: 'bg-yellow-100 text-yellow-800'
};

export const VENDOR_TYPE_COLORS = {
  Hotel: 'bg-indigo-100 text-indigo-800',
  'Travel Agent': 'bg-teal-100 text-teal-800',
  Resort: 'bg-cyan-100 text-cyan-800',
  Restaurant: 'bg-amber-100 text-amber-800',
  'Car Rental': 'bg-rose-100 text-rose-800',
  'Tour Operator': 'bg-lime-100 text-lime-800',
  Airline: 'bg-sky-100 text-sky-800',
  Other: 'bg-gray-100 text-gray-800'
};

export const VENDOR_VERIFICATION_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800'
};

export const PAGINATION_LIMIT = 10;

export const SEARCH_DEBOUNCE_TIME = 300;

export const DEFAULT_SORT_FIELD = 'createdAt';
export const DEFAULT_SORT_ORDER = 'desc';

export const ADMIN_PERMISSIONS_LIST = [
  { id: 'manage_users', label: 'Manage Website Users', category: 'Users' },
  { id: 'manage_sales_reps', label: 'Manage Sales Reps', category: 'Staff' },
  { id: 'manage_vendors', label: 'Manage Vendors', category: 'Partners' },
  { id: 'manage_admins', label: 'Manage Admins', category: 'System' },
  { id: 'view_reports', label: 'View Reports', category: 'Analytics' },
  { id: 'manage_billing', label: 'Manage Billing', category: 'Finance' },
  { id: 'system_settings', label: 'System Settings', category: 'System' },
  { id: 'audit_log', label: 'View Audit Logs', category: 'System' }
];
