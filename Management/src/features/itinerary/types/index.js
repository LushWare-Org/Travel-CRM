/**
 * Type definitions and constants for the Package feature.
 * Aligned with package-service relational schema.
 */

// Enums are owned by @travel-crm/constants — re-exported here so existing
// importers keep working with a single source of truth.
export {
  TRANSPORT_MODE,
  PRICING_MODEL,
  ROUTE_TYPE,
} from '@travel-crm/constants';

export const PACKAGE_CATEGORY = {
  HONEYMOON: 'HONEYMOON',
  COUPLE: 'COUPLE',
  FAMILY: 'FAMILY',
  GROUP: 'GROUP',
  WILD_SAFARI: 'WILD_SAFARI',
};

export const MARGIN_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
};

export const PLACE_TYPE = {
  CITY: 'CITY',
  ATTRACTION: 'ATTRACTION',
  REGION: 'REGION',
  AIRPORT: 'AIRPORT',
};

// Legacy display-friendly category labels (mapped to enum values)
export const CATEGORY_OPTIONS = [
  { value: 'HONEYMOON', label: 'Honeymoon' },
  { value: 'COUPLE', label: 'Couple' },
  { value: 'FAMILY', label: 'Family' },
  { value: 'GROUP', label: 'Group' },
  { value: 'WILD_SAFARI', label: 'Wild Safari' },
];

// Transport display labels
export const TRANSPORT_OPTIONS = [
  { value: 'CAR', label: 'Car', icon: '🚗' },
  { value: 'VAN', label: 'Van', icon: '🚐' },
  { value: 'FLIGHT', label: 'Flight', icon: '✈️' },
  { value: 'TRAIN', label: 'Train', icon: '🚂' },
  { value: 'BOAT', label: 'Boat', icon: '⛵' },
];

// Relational day shape matching backend ItineraryDay + junctions
export const createDefaultDay = (dayNumber = 1) => ({
  dayNumber,
  title: '',
  description: '',
  meals: { breakfast: true, lunch: false, dinner: true },
  // Cost fields — source of truth for the pricing engine. The `meals`
  // booleans above mirror these for the legacy toggle UI (kept in sync).
  breakfastCount: 1,
  lunchCount: 0,
  dinnerCount: 1,
  mealPriceOverride: null,
  places: [],
  activities: [],
  // Per-activity cost data keyed by activity name so the display-name based
  // ActivitySelector keeps working while costs live alongside it.
  activityCosts: {},
  locations: [],
  // Each day books its own per-night stay for now (see tech-debt note in the
  // ItineraryEditor accommodation costs subsection).
  accommodation: {
    name: '',
    type: '',
    rating: 0,
    address: '',
    contactNumber: '',
    hotelId: null,
    hotelImage: null,
    roomType: null,
    boardType: null,
    totalAmount: null,
    currency: 'USD',
    refundable: null,
  },
  images: [],
  notes: '',
  transports: [],
  // Per-day flights selected via the Flight Booking section. Each flight may
  // carry a client-side id used to link it to its FLIGHT transport row.
  flights: [],
});

// Default place entry
export const createDefaultPlace = (orderIndex = 0) => ({
  placeId: null,
  customName: '',
  orderIndex,
});

// Default activity entry
export const createDefaultActivity = (orderIndex = 0) => ({
  activityId: null,
  name: '',
  defaultCost: 0,
  costOverride: null,
  orderIndex,
});

export const PACKAGE_DEFAULTS = {
  images: [],
  coverImage: null,
  inclusions: [],
  exclusions: [],
  termsAndConditions: '',
  itineraryDays: [],
  bookings: 0,
  rating: 0,
  numReviews: 0,
  views: 0,
  isActive: true,
  isFeatured: false,
  defaultMarginType: 'PERCENTAGE',
  defaultMarginInput: 20,
  currency: 'USD',
};

// New package blueprint
export const createDefaultPackage = (overrides = {}) => ({
  title: '',
  description: '',
  destination: '',
  durationDays: 1,
  category: PACKAGE_CATEGORY.FAMILY,
  basePrice: 0,
  ...PACKAGE_DEFAULTS,
  ...overrides,
});

// Legacy compat helpers (deprecated — use new field names directly)
export const LEGACY_CATEGORY_MAP = {
  adventure: 'FAMILY', budget: 'FAMILY', luxury: 'FAMILY',
  religious: 'FAMILY', wildlife: 'WILD_SAFARI', beach: 'FAMILY',
  heritage: 'FAMILY', other: 'FAMILY', honeymoon: 'HONEYMOON',
  couple: 'COUPLE', family: 'FAMILY', group: 'GROUP',
  'wild safari': 'WILD_SAFARI',
};

export const mapLegacyCategory = (cat) => LEGACY_CATEGORY_MAP[cat?.toLowerCase()] || 'FAMILY';
