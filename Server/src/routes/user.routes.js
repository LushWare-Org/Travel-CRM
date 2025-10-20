import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// User routes
// router.get('/profile', protect, getProfile);
// router.put('/profile', protect, updateProfile);
// router.get('/', protect, authorize('admin'), getAllUsers);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'User routes - To be implemented' });
});

export default router;
