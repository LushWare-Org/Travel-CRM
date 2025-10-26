import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Lead routes
// router.post('/', createLead);
// router.get('/', protect, authorize('admin', 'staff'), getLeads);
// router.get('/:id', protect, authorize('admin', 'staff'), getLead);
// router.put('/:id', protect, authorize('admin', 'staff'), updateLead);
// router.patch('/:id/assign', protect, authorize('admin'), assignLead);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Lead routes - To be implemented' });
});

export default router;
