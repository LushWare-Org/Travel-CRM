/**
 * DEPRECATED - Analytics Controllers
 * 
 * This file has been refactored into modular controllers for better organization.
 * Please use the following controllers instead:
 * 
 * - leadAnalytics.controller.js
 *   - getLeadAnalyticsOverview()
 * 
 * - billingAnalytics.controller.js
 *   - getBillingAnalyticsOverview()
 * 
 * - userAnalytics.controller.js
 *   - getUserAnalyticsOverview()
 *   - getSalesRepPerformanceAnalytics()
 * 
 * All shared utilities have been moved to utils/analyticsUtils.js
 * 
 * Migration complete as of November 10, 2025
 */

// Re-export for backward compatibility (if needed)
export { getLeadAnalyticsOverview } from './leadAnalytics.controller.js';
export { getBillingAnalyticsOverview } from './billingAnalytics.controller.js';
export { getUserAnalyticsOverview, getSalesRepPerformanceAnalytics } from './userAnalytics.controller.js';


