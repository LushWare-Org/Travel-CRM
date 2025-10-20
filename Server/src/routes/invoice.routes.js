import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Invoice routes
// router.get('/:id', protect, getInvoice);
// router.get('/:id/pdf', protect, downloadInvoicePDF);
// router.post('/', protect, authorize('admin', 'staff'), createInvoice);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Invoice routes - To be implemented' });
});

export default router;
