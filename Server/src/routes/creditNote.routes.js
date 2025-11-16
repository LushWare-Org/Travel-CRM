import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as creditNoteController from '../controllers/creditNote.controller.js';

const router = express.Router();

// Statistics (place before :id routes)
router.get('/stats', protect, authorize('admin', 'salesRep'), creditNoteController.getCreditNoteStats);

// Get all credit notes
router.get('/', protect, creditNoteController.getAllCreditNotes);

// Get credit notes by lead
router.get('/lead/:leadId', protect, creditNoteController.getCreditNoteByLeadId);

// Get credit notes by invoice
router.get('/invoice/:invoiceId', protect, creditNoteController.getCreditNoteByInvoiceId);

// Get credit note by ID
router.get('/:id', protect, creditNoteController.getCreditNoteById);

// Create credit note
router.post('/', protect, authorize('admin', 'salesRep'), creditNoteController.createCreditNote);

// Update credit note
router.put('/:id', protect, authorize('admin'), creditNoteController.updateCreditNote);

// Issue credit note
router.put('/:id/issue', protect, authorize('admin'), creditNoteController.issueCreditNote);

// Approve credit note
router.put('/:id/approve', protect, authorize('admin'), creditNoteController.approveCreditNote);

// Reject credit note
router.put('/:id/reject', protect, authorize('admin'), creditNoteController.rejectCreditNote);

// Apply credit note to invoice
router.put('/:id/apply', protect, authorize('admin', 'salesRep'), creditNoteController.applyCreditNote);

// Process refund
router.put('/:id/refund', protect, authorize('admin'), creditNoteController.processCreditNoteRefund);

// Generate voucher
router.post('/:id/voucher', protect, authorize('admin', 'salesRep'), creditNoteController.generateVoucherFromCreditNote);

// Cancel credit note
router.put('/:id/cancel', protect, authorize('admin'), creditNoteController.cancelCreditNote);

// Send credit note
router.post('/:id/send', protect, authorize('admin', 'salesRep'), creditNoteController.sendCreditNote);

export default router;
