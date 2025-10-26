import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Itinerary routes
// router.get('/:packageId', getItinerary);
// router.post('/', protect, authorize('admin', 'staff'), createItinerary);
// router.put('/:id', protect, authorize('admin', 'staff'), updateItinerary);
// router.get('/:id/pdf', downloadItineraryPDF);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Itinerary routes - To be implemented' });
});

export default router;
