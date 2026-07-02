import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as itineraryController from '../controllers/itinerary.controller.js';

const router = Router();

// Public
router.get('/dropdown-options', itineraryController.getDropdownOptions);
router.get('/', itineraryController.getItineraries);
router.get('/package/:packageId', itineraryController.getItineraryByPackage);
router.get('/:id/preview', itineraryController.previewItinerary);
router.get('/:id/pdf', itineraryController.downloadItineraryPDF);
router.get('/:id', itineraryController.getItinerary);

// Protected
router.post('/', requireAuth, authorize('admin', 'salesRep'), itineraryController.createItinerary);
router.put('/:id', requireAuth, authorize('admin', 'salesRep'), itineraryController.updateItinerary);
router.delete('/:id', requireAuth, authorize('admin', 'salesRep'), itineraryController.deleteItinerary);
router.post('/:id/clone', requireAuth, authorize('admin', 'salesRep'), itineraryController.cloneItinerary);
router.post('/:id/days', requireAuth, authorize('admin', 'salesRep'), itineraryController.addDay);
router.put('/:id/days/:dayNumber', requireAuth, authorize('admin', 'salesRep'), itineraryController.updateDay);
router.delete('/:id/days/:dayNumber', requireAuth, authorize('admin', 'salesRep'), itineraryController.deleteDay);

export default router;
