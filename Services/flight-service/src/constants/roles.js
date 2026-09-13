/**
 * User role constants used across the flight service.
 * Mirrors the crm_users."UserRole" PostgreSQL enum.
 * @module constants/roles
 */

/** @type {'salesRep'} */
export const SALES_REP = 'salesRep';

/** @type {'admin'} */
export const ADMIN = 'admin';

/** @type {'superAdmin'} */
export const SUPER_ADMIN = 'superAdmin';

/** @type {'vendor'} */
export const VENDOR = 'vendor';

/** @type {'customer'} */
export const CUSTOMER = 'customer';

/**
 * Roles authorised to access flight endpoints.
 * @type {string[]}
 */
export const FLIGHT_AUTHORISED_ROLES = [SALES_REP, ADMIN, SUPER_ADMIN];

/**
 * Roles whose bookings have per-user scoping applied.
 * Sales reps see only their own bookings; admins and superAdmins see all.
 * @type {string[]}
 */
export const SCOPED_ROLES = [SALES_REP];
