import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery, overviewQuerySchema } from '../validators/analytics.validators.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();
const validateOverviewQuery = validateQuery(overviewQuerySchema);

router.get('/leads/overview', requireAuth, authorize('admin', 'salesRep'), validateOverviewQuery, analyticsController.getLeadAnalyticsOverview);
router.post('/leads/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/billing/overview', requireAuth, authorize('admin', 'salesRep'), validateOverviewQuery, analyticsController.getBillingAnalyticsOverview);
router.post('/billing/export-pdf', requireAuth, authorize('admin', 'salesRep'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/packages/overview', requireAuth, authorize('admin'), validateOverviewQuery, analyticsController.getPackageAnalyticsOverview);
router.post('/packages/export-pdf', requireAuth, authorize('admin'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/users/overview', requireAuth, authorize('admin'), validateOverviewQuery, analyticsController.getUserAnalyticsOverview);
router.post('/users/export-pdf', requireAuth, authorize('admin'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/website/overview', requireAuth, authorize('admin'), validateOverviewQuery, analyticsController.getWebsiteAnalyticsOverview);
router.post('/website/export-pdf', requireAuth, authorize('admin'), (req, res) => res.json({ success: true, message: 'PDF export not yet implemented' }));

router.get('/salesreps/me/performance', requireAuth, authorize('salesRep'), validateOverviewQuery, analyticsController.getSalesRepPersonalPerformance);
router.get('/salesreps/performance', requireAuth, authorize('admin'), validateOverviewQuery, analyticsController.getAllSalesRepsPerformance);

export default router;
