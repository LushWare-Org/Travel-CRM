import { body, param, query } from 'express-validator';

export const createPackageValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .withMessage('Package name must not exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 0, max: 2000 })
    .withMessage('Description must not exceed 2000 characters'),

  body('destination')
    .optional()
    .trim()
    .isLength({ min: 0, max: 100 })
    .withMessage('Destination must not exceed 100 characters'),

  body('duration')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Duration must be between 0 and 365 days'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('category')
    .optional()
    .isIn([
      'honeymoon',
      'couple',
      'family',
      'group',
      'wild safari',
    ])
    .withMessage('Invalid category'),

  body('packageType')
    .optional()
    .isIn(['Standard', 'Deluxe', 'Luxury', 'Premium'])
    .withMessage('Invalid package type'),

  body('maxGroupSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum group size must be between 1 and 1000'),

  body('inclusions')
    .optional()
    .isArray()
    .withMessage('Inclusions must be an array'),

  body('inclusions.*')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Each inclusion must be between 2 and 200 characters'),

  body('exclusions')
    .optional()
    .isArray()
    .withMessage('Exclusions must be an array'),

  body('exclusions.*')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Each exclusion must be between 2 and 200 characters'),

  body('highlights')
    .optional()
    .isArray()
    .withMessage('Highlights must be an array'),

  body('highlights.*')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Each highlight must be between 2 and 200 characters'),

  body('terms')
    .optional()
    .isArray()
    .withMessage('Terms must be an array'),

  body('terms.*')
    .trim()
    .isLength({ min: 2, max: 500 })
    .withMessage('Each term must be between 2 and 500 characters'),

  body('availableFrom')
    .optional()
    .isISO8601()
    .withMessage('Available from must be a valid date'),

  body('availableTo')
    .optional()
    .isISO8601()
    .withMessage('Available to must be a valid date')
    .custom((value, { req }) => {
      if (req.body.availableFrom && new Date(value) < new Date(req.body.availableFrom)) {
        throw new Error('Available to date must be after available from date');
      }
      return true;
    }),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
];

export const updatePackageValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid package ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Package name must be between 3 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('destination')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Destination must be between 2 and 100 characters'),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('category')
    .optional()
    .isIn([
      'honeymoon',
      'couple',
      'family',
      'group',
      'wild safari',
    ])
    .withMessage('Invalid category'),

  body('packageType')
    .optional()
    .isIn(['Standard', 'Deluxe', 'Luxury', 'Premium'])
    .withMessage('Invalid package type'),

  body('maxGroupSize')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Maximum group size must be between 1 and 1000'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),

  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),
];

export const packageIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid package ID'),
];

export const getPackagesValidator = [
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('category')
    .optional()
    .isIn([
      'honeymoon',
      'couple',
      'family',
      'group',
      'wild safari',
    ])
    .withMessage('Invalid category'),

  query('packageType')
    .optional()
    .isIn(['Standard', 'Deluxe', 'Luxury', 'Premium'])
    .withMessage('Invalid package type'),

  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number'),

  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number')
    .custom((value, { req }) => {
      if (req.query.minPrice && parseFloat(value) < parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than or equal to minimum price');
      }
      return true;
    }),

  query('minDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum duration must be at least 1'),

  query('maxDuration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Maximum duration must be at least 1')
    .custom((value, { req }) => {
      if (req.query.minDuration && parseInt(value) < parseInt(req.query.minDuration)) {
        throw new Error('Maximum duration must be greater than or equal to minimum duration');
      }
      return true;
    }),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean value'),

  query('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be a boolean value'),

  query('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Status must be draft, published, or archived'),

  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'duration', 'rating', 'bookings', 'createdAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];
