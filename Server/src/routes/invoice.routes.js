import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as invoiceController from '../controllers/invoice.controller.js';

const router = express.Router();

// Statistics and reports (place before :id routes)
router.get('/stats', protect, authorize('admin', 'salesRep'), invoiceController.getInvoiceStats);
router.get('/overdue', protect, authorize('admin', 'salesRep'), invoiceController.getOverdueInvoices);

// Get all invoices
router.get('/', protect, invoiceController.getAllInvoices);

// Get invoices by lead
router.get('/lead/:leadId', protect, invoiceController.getInvoiceByLeadId);

// Get invoice by ID
router.get('/:id', protect, invoiceController.getInvoiceById);

// Create invoice
router.post('/', protect, authorize('admin', 'salesRep'), invoiceController.createInvoice);

// Update invoice
router.put('/:id', protect, authorize('admin', 'salesRep'), invoiceController.updateInvoice);

// Cancel invoice
router.put('/:id/cancel', protect, authorize('admin'), invoiceController.cancelInvoice);

// Send invoice
router.post('/:id/send', protect, authorize('admin', 'salesRep'), invoiceController.sendInvoice);

// Mark as viewed (can be public with token)
router.post('/:id/viewed', invoiceController.markInvoiceViewed);

// Send payment reminder
router.post('/:id/remind', protect, authorize('admin', 'salesRep'), invoiceController.sendPaymentReminder);

// Download PDF
router.get('/:id/pdf', protect, invoiceController.downloadInvoicePDF);

export default router;
