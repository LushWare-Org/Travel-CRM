import express from 'express';
import { protect, authorize, checkPermission } from '../middleware/auth.js';
import {
  getLeadAnalyticsOverview, getBillingAnalyticsOverview, getPackageAnalyticsOverview, getUserAnalyticsOverview, getSalesRepPersonalPerformance, getWebsiteAnalyticsOverview,
} from '../controllers/analytics.controller.js';
import {
  exportLeadAnalyticsPDF, exportBillingAnalyticsPDF, exportUserAnalyticsPDF, exportPackageAnalyticsPDF, exportWebsiteAnalyticsPDF,
} from '../controllers/analyticsPDFExport.controller.js';
import { apiLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all analytics routes
router.use(apiLimiter);

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);
router.post('/leads/export-pdf', protect, authorize('admin', 'salesRep'), exportLeadAnalyticsPDF);

router.get('/billing/overview', protect, authorize('admin', 'salesRep'), checkPermission('manage_billing'), getBillingAnalyticsOverview);
router.post('/billing/export-pdf', protect, authorize('admin', 'salesRep'), checkPermission('manage_billing'), exportBillingAnalyticsPDF);

// Package analytics overview
router.get('/packages/overview', protect, authorize('admin', 'salesRep'), getPackageAnalyticsOverview);
router.post('/packages/export-pdf', protect, authorize('admin', 'salesRep'), exportPackageAnalyticsPDF);

// User analytics overview
router.get('/users/overview', protect, authorize('admin'), checkPermission('view_reports'), getUserAnalyticsOverview);
router.post('/users/export-pdf', protect, authorize('admin'), checkPermission('view_reports'), exportUserAnalyticsPDF);

// Website analytics overview
router.get('/website/overview', protect, authorize('admin', 'salesRep'), getWebsiteAnalyticsOverview);
router.post('/website/export-pdf', protect, authorize('admin', 'salesRep'), exportWebsiteAnalyticsPDF);

// SalesRep personal performance analytics
router.get('/salesreps/me/performance', protect, authorize('salesRep'), getSalesRepPersonalPerformance);

export default router;
