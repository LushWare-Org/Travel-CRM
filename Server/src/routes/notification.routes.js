import express from 'express';
// import { protect } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Notification routes
// router.get('/', protect, getNotifications);
// router.patch('/:id/read', protect, markAsRead);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Notification routes - To be implemented' });
});

export default router;
