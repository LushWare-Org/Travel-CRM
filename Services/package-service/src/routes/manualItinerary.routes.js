import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as manualItineraryController from '../controllers/manualItinerary.controller.js';

const router = Router();

router.post('/website', manualItineraryController.createWebsiteManualItinerary);
router.get('/my-requests', requireAuth, manualItineraryController.getUserManualItineraries);
router.post('/lead/:leadId', requireAuth, authorize('admin', 'salesRep'), manualItineraryController.createOrUpdateManualItinerary);
router.put('/lead/:leadId', requireAuth, authorize('admin', 'salesRep'), manualItineraryController.createOrUpdateManualItinerary);
router.get('/lead/:leadId', requireAuth, authorize('admin', 'salesRep'), manualItineraryController.getManualItineraryByLead);
router.delete('/:id', requireAuth, authorize('admin', 'salesRep'), manualItineraryController.deleteManualItinerary);

export default router;
