import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Dashboard routes
// router.get('/stats', protect, authorize('admin', 'staff'), getDashboardStats);
// router.get('/analytics', protect, authorize('admin'), getAnalytics);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Dashboard routes - To be implemented' });
});

export default router;
