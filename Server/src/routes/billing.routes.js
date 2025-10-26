import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as billingController from '../controllers/billing.controller.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', protect, authorize('admin', 'staff', 'manager'), billingController.getDashboardStats);

// Summary for lead
router.get('/summary/lead/:leadId', protect, billingController.getLeadBillingSummary);

// Financial reports
router.get('/reports/financial', protect, authorize('admin', 'accountant', 'manager'), billingController.getFinancialReports);

// Aging report
router.get('/reports/aging', protect, authorize('admin', 'accountant', 'manager'), billingController.getAgingReport);

// Payment method breakdown
router.get('/reports/payment-methods', protect, authorize('admin', 'accountant', 'manager'), billingController.getPaymentMethodBreakdown);

// Revenue trends
router.get('/reports/revenue-trends', protect, authorize('admin', 'accountant', 'manager'), billingController.getRevenueTrends);

// Top customers
router.get('/reports/top-customers', protect, authorize('admin', 'accountant', 'manager'), billingController.getTopCustomers);

// Export billing data
router.get('/export', protect, authorize('admin', 'accountant'), billingController.exportBillingData);

export default router;
