import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getLeadAnalyticsOverview, getBillingAnalyticsOverview, getPackageAnalyticsOverview, getUserAnalyticsOverview } from '../controllers/analytics.controller.js';

const router = express.Router();

// Lead analytics overview
router.get('/leads/overview', protect, authorize('admin', 'salesRep'), getLeadAnalyticsOverview);
router.get('/billing/overview', protect, authorize('admin', 'salesRep'), getBillingAnalyticsOverview);

// Package analytics overview
router.get('/packages/overview', protect, authorize('admin', 'salesRep'), getPackageAnalyticsOverview);

// User analytics overview
router.get('/users/overview', protect, authorize('admin'), getUserAnalyticsOverview);

export default router;


