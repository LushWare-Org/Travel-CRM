import express from 'express';
import { getItineraryByPackage } from '../controllers/itinerary.controller.js';

const router = express.Router();

// Itinerary routes
router.get('/:packageId', getItineraryByPackage);

export default router;
