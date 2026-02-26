import express from 'express';
import {
  createOrUpdateManualItinerary,
  getManualItineraryByLead,
  deleteManualItinerary,
  createWebsiteManualItinerary,
  getUserManualItineraries,
} from '../controllers/manualItinerary.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route (no authentication required)
router.post('/website', createWebsiteManualItinerary);

// All routes below require authentication
router.use(protect);
router.get('/my-requests', getUserManualItineraries);

// Create or update manual itinerary for a lead
router.post('/lead/:leadId', authorize('admin', 'salesRep'), createOrUpdateManualItinerary);
router.put('/lead/:leadId', authorize('admin', 'salesRep'), createOrUpdateManualItinerary);

// Get manual itinerary by lead ID
router.get('/lead/:leadId', authorize('admin', 'salesRep'), getManualItineraryByLead);

// Delete manual itinerary
router.delete('/:id', authorize('admin', 'salesRep'), deleteManualItinerary);

export default router;
