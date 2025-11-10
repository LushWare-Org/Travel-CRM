import { body, param, query } from 'express-validator';

/**
 * Validation rules for creating itinerary
 */
export const createItineraryValidation = [
  body('package')
    .notEmpty()
    .withMessage('Package ID is required')
    .isMongoId()
    .withMessage('Invalid package ID'),

  body('days')
    .isArray({ min: 1 })
    .withMessage('At least one day is required'),

  body('days.*.dayNumber')
    .notEmpty()
    .withMessage('Day number is required')
    .isInt({ min: 1 })
    .withMessage('Day number must be a positive integer'),

  body('days.*.title')
    .notEmpty()
    .withMessage('Day title is required')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Day title must be between 3 and 200 characters'),

  body('days.*.description')
    .notEmpty()
    .withMessage('Day description is required')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Day description must be between 10 and 2000 characters'),

  body('days.*.activities')
    .optional()
    .isArray()
    .withMessage('Activities must be an array'),

  body('days.*.activities.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Each activity must be between 2 and 200 characters'),

  body('days.*.accommodation.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Accommodation name must be between 2 and 200 characters'),

  body('days.*.accommodation.type')
    .optional()
    .isIn(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'])
    .withMessage('Invalid accommodation type'),

  body('days.*.accommodation.rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Accommodation rating must be between 0 and 5'),

  body('days.*.meals.breakfast')
    .optional()
    .isBoolean()
    .withMessage('Breakfast must be a boolean value'),

  body('days.*.meals.lunch')
    .optional()
    .isBoolean()
    .withMessage('Lunch must be a boolean value'),

  body('days.*.meals.dinner')
    .optional()
    .isBoolean()
    .withMessage('Dinner must be a boolean value'),

  body('days.*.transport')
    .optional()
    .isIn(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'])
    .withMessage('Invalid transport type'),

  body('days.*.places')
    .optional()
    .isArray()
    .withMessage('Places must be an array'),

  body('days.*.places.*.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Place name must be between 2 and 200 characters'),

  body('days.*.places.*.description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Place description must not exceed 1000 characters'),

  body('days.*.places.*.duration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Duration must not exceed 50 characters'),
];

/**
 * Validation rules for updating itinerary
 */
export const updateItineraryValidation = [
  param('id')
    .notEmpty()
    .withMessage('Itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid itinerary ID'),

  body('days')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one day is required'),

  body('days.*.dayNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Day number must be a positive integer'),

  body('days.*.title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Day title must be between 3 and 200 characters'),

  body('days.*.description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Day description must be between 10 and 2000 characters'),

  body('days.*.activities')
    .optional()
    .isArray()
    .withMessage('Activities must be an array'),

  body('days.*.accommodation.type')
    .optional()
    .isIn(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'])
    .withMessage('Invalid accommodation type'),

  body('days.*.transport')
    .optional()
    .isIn(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'])
    .withMessage('Invalid transport type'),
];

/**
 * Validation rules for adding a day
 */
export const addDayValidation = [
  param('id')
    .notEmpty()
    .withMessage('Itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid itinerary ID'),

  body('dayNumber')
    .notEmpty()
    .withMessage('Day number is required')
    .isInt({ min: 1 })
    .withMessage('Day number must be a positive integer'),

  body('title')
    .notEmpty()
    .withMessage('Day title is required')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Day title must be between 3 and 200 characters'),

  body('description')
    .notEmpty()
    .withMessage('Day description is required')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Day description must be between 10 and 2000 characters'),

  body('activities')
    .optional()
    .isArray()
    .withMessage('Activities must be an array'),

  body('accommodation.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Accommodation name must be between 2 and 200 characters'),

  body('accommodation.type')
    .optional()
    .isIn(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'])
    .withMessage('Invalid accommodation type'),

  body('accommodation.rating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Accommodation rating must be between 0 and 5'),

  body('meals.breakfast')
    .optional()
    .isBoolean()
    .withMessage('Breakfast must be a boolean value'),

  body('meals.lunch')
    .optional()
    .isBoolean()
    .withMessage('Lunch must be a boolean value'),

  body('meals.dinner')
    .optional()
    .isBoolean()
    .withMessage('Dinner must be a boolean value'),

  body('transport')
    .optional()
    .isIn(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'])
    .withMessage('Invalid transport type'),

  body('places')
    .optional()
    .isArray()
    .withMessage('Places must be an array'),
];

/**
 * Validation rules for updating a specific day
 */
export const updateDayValidation = [
  param('id')
    .notEmpty()
    .withMessage('Itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid itinerary ID'),

  param('dayNumber')
    .notEmpty()
    .withMessage('Day number is required')
    .isInt({ min: 1 })
    .withMessage('Day number must be a positive integer'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Day title must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Day description must be between 10 and 2000 characters'),

  body('activities')
    .optional()
    .isArray()
    .withMessage('Activities must be an array'),

  body('accommodation.type')
    .optional()
    .isIn(['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'])
    .withMessage('Invalid accommodation type'),

  body('transport')
    .optional()
    .isIn(['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'])
    .withMessage('Invalid transport type'),
];

/**
 * Validation rules for deleting a day
 */
export const deleteDayValidation = [
  param('id')
    .notEmpty()
    .withMessage('Itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid itinerary ID'),

  param('dayNumber')
    .notEmpty()
    .withMessage('Day number is required')
    .isInt({ min: 1 })
    .withMessage('Day number must be a positive integer'),
];

/**
 * Validation rules for getting itinerary by ID
 */
export const getItineraryValidation = [
  param('id')
    .notEmpty()
    .withMessage('Itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid itinerary ID'),
];

/**
 * Validation rules for getting itinerary by package ID
 */
export const getItineraryByPackageValidation = [
  param('packageId')
    .notEmpty()
    .withMessage('Package ID is required')
    .isMongoId()
    .withMessage('Invalid package ID'),
];

/**
 * Validation rules for listing itineraries
 */
export const listItinerariesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),

  query('packageId')
    .optional()
    .isMongoId()
    .withMessage('Invalid package ID'),
];

/**
 * Validation rules for cloning itinerary
 */
export const cloneItineraryValidation = [
  param('id')
    .notEmpty()
    .withMessage('Source itinerary ID is required')
    .isMongoId()
    .withMessage('Invalid source itinerary ID'),

  body('targetPackageId')
    .notEmpty()
    .withMessage('Target package ID is required')
    .isMongoId()
    .withMessage('Invalid target package ID'),
];
