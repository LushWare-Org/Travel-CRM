/**
 * Type definitions for Itinerary feature
 * This file contains all TypeScript-like type definitions and constants
 */

export const PACKAGE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export const PACKAGE_CATEGORY = {
  HONEYMOON: 'Honeymoon',
  FAMILY: 'Family',
  ADVENTURE: 'Adventure',
  CORPORATE: 'Corporate',
};

export const PACKAGE_REGION = {
  EUROPE: 'Europe',
  ASIA: 'Asia',
  MIDDLE_EAST: 'Middle East',
  AMERICAS: 'Americas',
  AFRICA: 'Africa',
};

export const PACKAGE_DEFAULTS = {
  status: PACKAGE_STATUS.DRAFT,
  itinerary: {
    first_day: '',
    middle_days: {},
    last_day: '',
  },
  itineraryTitles: {
    first_day: '',
    middle_days: {},
    last_day: '',
  },
  images: [],
  bookings: 0,
  rating: 0,
  reviews: 0,
};

/**
 * Default package structure
 */
export const createDefaultPackage = (overrides = {}) => ({
  id: null,
  name: '',
  description: '',
  duration: '',
  price: '',
  category: '',
  region: '',
  destinations: [],
  activities: [],
  accommodation: '',
  transport: '',
  ...PACKAGE_DEFAULTS,
  createdDate: new Date().toISOString().split('T')[0],
  updatedDate: new Date().toISOString().split('T')[0],
  ...overrides,
});
