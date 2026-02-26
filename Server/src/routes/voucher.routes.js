import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as voucherController from '../controllers/voucher.controller.js';

const router = express.Router();

// Get all vouchers
router.get('/', protect, voucherController.getAllVouchers);

// Get vouchers by lead
router.get('/lead/:leadId', protect, voucherController.getVouchersByLeadId);

// Download PDF (must be before :id route)
router.get('/:id/pdf', protect, voucherController.downloadVoucherPDF);

// Get voucher by ID
router.get('/:id', protect, voucherController.getVoucherById);

// Create voucher
router.post('/', protect, authorize('admin', 'salesRep'), voucherController.createVoucher);

// Update voucher
router.put('/:id', protect, authorize('admin', 'salesRep'), voucherController.updateVoucher);

// Delete voucher
router.delete('/:id', protect, authorize('admin'), voucherController.deleteVoucher);

// Send voucher via email
router.post('/:id/send', protect, authorize('admin', 'salesRep'), voucherController.sendVoucherEmail);

// Mark as viewed (can be public with token)
router.post('/:id/viewed', voucherController.markVoucherViewed);

// Confirm voucher
router.post('/:id/confirm', protect, voucherController.confirmVoucher);

export default router;
