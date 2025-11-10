import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getLeadAnalyticsOverview,
  getBillingAnalyticsOverview,
  getUserAnalyticsOverview,
  getSalesRepPerformanceAnalytics,
} from '../controllers/analytics.controller.js';

const router = express.Router();

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);

// Billing analytics overview
router.get('/billing/overview', protect, authorize('admin', 'salesRep'), getBillingAnalyticsOverview);

// User management analytics overview
router.get('/users/overview', protect, authorize('admin'), getUserAnalyticsOverview);

// Sales rep performance analytics
router.get('/sales-reps/performance', protect, authorize('admin'), getSalesRepPerformanceAnalytics);

export default router;


