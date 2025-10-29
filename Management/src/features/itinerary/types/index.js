/**
 * Type definitions for Itinerary feature
 * This file contains all TypeScript-like type definitions and constants
 * Aligned with backend Mongoose models
 */

export const PACKAGE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const PACKAGE_CATEGORY = {
  HONEYMOON: 'honeymoon',
  FAMILY: 'family',
  ADVENTURE: 'adventure',
  BUDGET: 'budget',
  LUXURY: 'luxury',
  RELIGIOUS: 'religious',
  WILDLIFE: 'wildlife',
  BEACH: 'beach',
  HERITAGE: 'heritage',
  OTHER: 'other',
};

export const DIFFICULTY_LEVEL = {
  EASY: 'easy',
  MODERATE: 'moderate',
  DIFFICULT: 'difficult',
};

export const ACCOMMODATION_TYPES = {
  HOTEL: 'hotel',
  RESORT: 'resort',
  GUESTHOUSE: 'guesthouse',
  HOMESTAY: 'homestay',
  CAMP: 'camp',
  OTHER: 'other',
};

export const TRANSPORT_TYPES = {
  FLIGHT: 'flight',
  TRAIN: 'train',
  BUS: 'bus',
  CAR: 'car',
  BOAT: 'boat',
  WALK: 'walk',
  OTHER: 'other',
};

// Default day structure matching backend
export const createDefaultDay = (dayNumber = 1) => ({
  dayNumber,
  title: '',
  description: '',
  activities: [],
  accommodation: {
    name: '',
    type: '',
    rating: 0,
    address: '',
    contactNumber: '',
  },
  meals: {
    breakfast: false,
    lunch: false,
    dinner: false,
  },
  transport: '',
  places: [],
  images: [],
  notes: '',
});

export const PACKAGE_DEFAULTS = {
  status: PACKAGE_STATUS.DRAFT,
  images: [],
  coverImage: null,
  inclusions: [],
  exclusions: [],
  highlights: [],
  terms: [],
  days: [],
  bookings: 0,
  rating: 0,
  numReviews: 0,
  views: 0,
  isActive: true,
  isFeatured: false,
};

/**
 * Default package structure aligned with backend Package model
 */
export const createDefaultPackage = (overrides = {}) => ({
  _id: null,
  name: '',
  description: '',
  destination: '', // Backend requires this, not "region"
  duration: 1,
  price: 0, // Must be a number, not a string
  maxGroupSize: 10,
  difficulty: DIFFICULTY_LEVEL.MODERATE,
  category: PACKAGE_CATEGORY.OTHER,
  ...PACKAGE_DEFAULTS,
  createdDate: new Date().toISOString().split('T')[0],
  updatedDate: new Date().toISOString().split('T')[0],
  ...overrides,
});
