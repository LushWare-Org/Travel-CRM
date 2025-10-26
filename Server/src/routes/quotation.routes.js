import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as quotationController from '../controllers/quotation.controller.js';

const router = express.Router();

// Statistics (place before :id routes)
router.get('/stats', protect, authorize('admin', 'staff', 'manager'), quotationController.getQuotationStats);

// Get all quotations
router.get('/', protect, quotationController.getAllQuotations);

// Get quotations by lead
router.get('/lead/:leadId', protect, quotationController.getQuotationsByLeadId);

// Get quotation by ID
router.get('/:id', protect, quotationController.getQuotationById);

// Create quotation
router.post('/', protect, authorize('admin', 'staff'), quotationController.createQuotation);

// Update quotation
router.put('/:id', protect, authorize('admin', 'staff'), quotationController.updateQuotation);

// Delete quotation
router.delete('/:id', protect, authorize('admin'), quotationController.deleteQuotation);

// Send quotation
router.post('/:id/send', protect, authorize('admin', 'staff'), quotationController.sendQuotation);

// Mark as viewed (can be public with token)
router.post('/:id/viewed', quotationController.markQuotationViewed);

// Accept quotation
router.post('/:id/accept', protect, quotationController.acceptQuotation);

// Reject quotation
router.post('/:id/reject', protect, quotationController.rejectQuotation);

// Convert to invoice
router.post('/:id/convert', protect, authorize('admin', 'staff'), quotationController.convertQuotationToInvoice);

export default router;
