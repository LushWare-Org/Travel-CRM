import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  createWebsiteManualItinerary,
  fetchMyManualItineraries,
  getManualItineraryByLead,
  upsertManualItineraryForLead,
  deleteManualItinerary,
} from '../controllers/manualItinerary.controller.js';

const router = express.Router();
router.use(extractUser);

// Public
router.post('/website', createWebsiteManualItinerary);

// Protected
router.use(requireAuth);
router.get('/my-requests', fetchMyManualItineraries);
router.get('/lead/:leadId', authorize('admin', 'salesRep'), getManualItineraryByLead);
router.post('/lead/:leadId', authorize('admin', 'salesRep'), upsertManualItineraryForLead);
router.put('/lead/:leadId', authorize('admin', 'salesRep'), upsertManualItineraryForLead);
router.delete('/:id', authorize('admin', 'salesRep'), deleteManualItinerary);

export default router;
