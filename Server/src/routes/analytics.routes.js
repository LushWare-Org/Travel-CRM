import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getLeadAnalyticsOverview } from '../controllers/leadAnalytics.controller.js';
import { getBillingAnalyticsOverview } from '../controllers/billingAnalytics.controller.js';
import {
  getUserAnalyticsOverview,
  getSalesRepPerformanceAnalytics,
} from '../controllers/userAnalytics.controller.js';
import {
  getItineraryAnalyticsOverview,
  getMostInquired,
  getDestinationPerformance,
  getActivityPreferences,
  getHotelPreferences,
  getTrends,
  getCompletionStats,
  getComprehensiveAnalytics,
} from '../controllers/itineraryAnalytics.controller.js';

const router = express.Router();

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);

// Billing analytics overview
router.get('/billing/overview', protect, authorize('admin', 'salesRep'), getBillingAnalyticsOverview);

// User management analytics overview
router.get('/users/overview', protect, authorize('admin'), getUserAnalyticsOverview);

// Sales rep performance analytics
router.get('/sales-reps/performance', protect, authorize('admin'), getSalesRepPerformanceAnalytics);

/**
 * Itinerary Analytics Routes
 */

// Get comprehensive itinerary analytics (all data at once)
router.get(
  '/itineraries',
  getComprehensiveAnalytics,
);

// Get itinerary analytics overview
router.get(
  '/itineraries/overview',
  getItineraryAnalyticsOverview,
);

// Get most inquired itineraries
router.get(
  '/itineraries/most-inquired',
  getMostInquired,
);

// Get destination performance
router.get(
  '/itineraries/destination-performance',
  getDestinationPerformance,
);

// Get activity preferences
router.get(
  '/itineraries/activity-preferences',
  getActivityPreferences,
);

// Get hotel preferences
router.get(
  '/itineraries/hotel-preferences',
  getHotelPreferences,
);

// Get trend data
router.get(
  '/itineraries/trends',
  getTrends,
);

// Get completion statistics
router.get(
  '/itineraries/completion-stats',
  getCompletionStats,
);

export default router;


