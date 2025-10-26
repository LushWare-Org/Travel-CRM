import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Booking routes
// router.post('/', protect, createBooking);
// router.get('/', protect, getBookings);
// router.get('/:id', protect, getBooking);
// router.patch('/:id/cancel', protect, cancelBooking);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Booking routes - To be implemented' });
});

export default router;
