import express from 'express';
import {
  createOrUpdateManualItinerary,
  getManualItineraryByLead,
  deleteManualItinerary,
} from '../controllers/manualItinerary.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create or update manual itinerary for a lead
router.post('/lead/:leadId', authorize('admin', 'salesRep'), createOrUpdateManualItinerary);
router.put('/lead/:leadId', authorize('admin', 'salesRep'), createOrUpdateManualItinerary);

// Get manual itinerary by lead ID
router.get('/lead/:leadId', authorize('admin', 'salesRep'), getManualItineraryByLead);

// Delete manual itinerary
router.delete('/:id', authorize('admin', 'salesRep'), deleteManualItinerary);

export default router;

