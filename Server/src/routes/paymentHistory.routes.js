import express from 'express';
import { protect } from '../middleware/auth.js';
import * as paymentHistoryController from '../controllers/paymentHistory.controller.js';

const router = express.Router();

// Get all payment history
router.get('/', protect, paymentHistoryController.getAllPaymentHistory);

// Get payment history by lead
router.get('/lead/:leadId', protect, paymentHistoryController.getPaymentHistoryByLeadId);

// Download list PDF (must be before :id routes)
router.get('/pdf/list', protect, paymentHistoryController.downloadPaymentHistoryListPDF);

// Download single PDF (must be before :id route)
router.get('/:id/pdf', protect, paymentHistoryController.downloadPaymentHistoryPDF);

// Get payment history by ID
router.get('/:id', protect, paymentHistoryController.getPaymentHistoryById);

export default router;

