import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import {
  getDropdownOptions,
  getItineraries,
  getItinerary,
  getItineraryByPackage,
  createItinerary,
  updateItinerary,
  addDay,
  updateDay,
  deleteDay,
  deleteItinerary,
  previewItinerary,
  downloadItineraryPDF,
  cloneItinerary,
} from '../controllers/itinerary.controller.js';
import {
  createItineraryValidation,
  updateItineraryValidation,
  addDayValidation,
  updateDayValidation,
  deleteDayValidation,
  getItineraryValidation,
  getItineraryByPackageValidation,
  listItinerariesValidation,
  cloneItineraryValidation,
} from '../validators/itinerary.validator.js';

const router = express.Router();

/**
 * Public Routes
 */

// Get dropdown options for forms
router.get('/dropdown-options', getDropdownOptions);

// Get all itineraries (with pagination and filters)
router.get(
  '/',
  validate(listItinerariesValidation),
  getItineraries
);

// Get single itinerary by ID
router.get(
  '/:id',
  validate(getItineraryValidation),
  getItinerary
);

// Get itinerary by package ID
router.get(
  '/package/:packageId',
  validate(getItineraryByPackageValidation),
  getItineraryByPackage
);

// Preview itinerary (formatted for display)
router.get(
  '/:id/preview',
  validate(getItineraryValidation),
  previewItinerary
);

// Download itinerary as PDF
router.get(
  '/:id/pdf',
  validate(getItineraryValidation),
  downloadItineraryPDF
);

/**
 * Protected Routes (Admin & Staff only)
 */

// Create new itinerary
router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  validate(createItineraryValidation),
  createItinerary
);

// Update itinerary
router.put(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  validate(updateItineraryValidation),
  updateItinerary
);

// Delete itinerary
router.delete(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  validate(getItineraryValidation),
  deleteItinerary
);

// Clone itinerary to another package
router.post(
  '/:id/clone',
  protect,
  authorize('admin', 'staff'),
  validate(cloneItineraryValidation),
  cloneItinerary
);

/**
 * Day Management Routes (Admin & Staff only)
 */

// Add new day to itinerary
router.post(
  '/:id/days',
  protect,
  authorize('admin', 'staff'),
  validate(addDayValidation),
  addDay
);

// Update specific day in itinerary
router.put(
  '/:id/days/:dayNumber',
  protect,
  authorize('admin', 'staff'),
  validate(updateDayValidation),
  updateDay
);

// Delete specific day from itinerary
router.delete(
  '/:id/days/:dayNumber',
  protect,
  authorize('admin', 'staff'),
  validate(deleteDayValidation),
  deleteDay
);

export default router;
