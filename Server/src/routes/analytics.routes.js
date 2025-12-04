import express from 'express';
import { protect, authorize, checkPermission } from '../middleware/auth.js';
import { getLeadAnalyticsOverview, getBillingAnalyticsOverview, getPackageAnalyticsOverview, getUserAnalyticsOverview, getSalesRepPersonalPerformance, getWebsiteAnalyticsOverview } from '../controllers/analytics.controller.js';

const router = express.Router();

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);
router.get('/billing/overview', protect, authorize('admin', 'salesRep'), checkPermission('manage_billing'), getBillingAnalyticsOverview);

// Package analytics overview
router.get('/packages/overview', protect, authorize('admin', 'salesRep'), getPackageAnalyticsOverview);

// User analytics overview
router.get('/users/overview', protect, authorize('admin'), checkPermission('view_reports'), getUserAnalyticsOverview);

// Website analytics overview
router.get('/website/overview', protect, authorize('admin', 'salesRep'), getWebsiteAnalyticsOverview);

// SalesRep personal performance analytics
router.get('/salesreps/me/performance', protect, authorize('salesRep'), getSalesRepPersonalPerformance);

export default router;


