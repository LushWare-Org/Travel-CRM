/**
 * User Management Constants
 */

// Real account-lifecycle states -> the 5 semantic tokens, grouped by meaning
// the same way LeadStatusBadge groups lead statuses (see DESIGN.md).
export const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-success/10 text-success',
  inactive: 'bg-destructive/10 text-destructive',
  invited: 'bg-warning/10 text-warning',
  suspended: 'bg-destructive/10 text-destructive',
  pending: 'bg-warning/10 text-warning',
};

// Categorical (non-state) - rotates the chart palette per DESIGN.md's Badge
// section, same pattern as features/career's position tags.
export const VENDOR_TYPE_COLORS: Record<string, string> = {
  hotel: 'bg-chart-1/10 text-chart-1',
  transport: 'bg-chart-2/10 text-chart-2',
  activity: 'bg-chart-3/10 text-chart-3',
  restaurant: 'bg-chart-4/10 text-chart-4',
  guide: 'bg-chart-5/10 text-chart-5',
  other: 'bg-muted text-muted-foreground',
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
  { id: 'manage_leads', label: 'Manage Leads', category: 'Sales' },
  { id: 'manage_packages', label: 'Manage Packages', category: 'Travel' },
];
