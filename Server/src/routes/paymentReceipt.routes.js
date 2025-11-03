import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as paymentReceiptController from '../controllers/paymentReceipt.controller.js';

const router = express.Router();

// Statistics (place before :id routes)
router.get('/stats', protect, authorize('admin', 'salesRep'), paymentReceiptController.getPaymentReceiptStats);

// Get all payment receipts
router.get('/', protect, paymentReceiptController.getAllPaymentReceipts);

// Get payment receipts by lead
router.get('/lead/:leadId', protect, paymentReceiptController.getPaymentReceiptsByLeadId);

// Get payment receipts by invoice
router.get('/invoice/:invoiceId', protect, paymentReceiptController.getPaymentReceiptsByInvoiceId);

// Download PDF (must be before :id route)
router.get('/:id/pdf', protect, paymentReceiptController.downloadPaymentReceiptPDF);

// Get payment receipt by ID
router.get('/:id', protect, paymentReceiptController.getPaymentReceiptById);

// Create payment receipt (record payment)
router.post('/', protect, authorize('admin', 'salesRep'), paymentReceiptController.createPaymentReceipt);

// Update payment receipt
router.put('/:id', protect, authorize('admin'), paymentReceiptController.updatePaymentReceipt);

// Cancel payment receipt
router.put('/:id/cancel', protect, authorize('admin'), paymentReceiptController.cancelPaymentReceipt);

// Verify payment receipt
router.put('/:id/verify', protect, authorize('admin'), paymentReceiptController.verifyPaymentReceipt);

// Reconcile payment receipt
router.put('/:id/reconcile', protect, authorize('admin'), paymentReceiptController.reconcilePaymentReceipt);

// Send payment receipt
router.post('/:id/send', protect, authorize('admin', 'salesRep'), paymentReceiptController.sendPaymentReceipt);

export default router;
