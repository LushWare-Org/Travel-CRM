import { z } from 'zod';

// ─── Shared sub-schemas ────────────────────────────────────────

const marginType = z.enum(['PERCENTAGE', 'FIXED']);
const packageCategory = z.enum(['HONEYMOON', 'COUPLE', 'FAMILY', 'GROUP', 'WILD_SAFARI']);
const placeType = z.enum(['CITY', 'ATTRACTION', 'REGION', 'AIRPORT']);
const routeType = z.enum(['DAILY_ROUTING', 'POINT_TO_POINT']);
const transportMode = z.enum(['FLIGHT', 'CAR', 'TRAIN', 'BOAT', 'VAN']);
const pricingModel = z.enum(['PER_KM', 'PER_PERSON', 'PER_VEHICLE']);

const decimal = () => z.coerce.number();

const imageSchema = z.object({
  url: z.string().min(1, 'Image URL is required'),
  altText: z.string().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

// ─── Day sub-schemas ───────────────────────────────────────────

const dayPlace = z.object({
  placeId: z.string().uuid().optional(),
  customName: z.string().optional(),
  orderIndex: z.number().int().min(0).default(0),
}).refine((d) => d.placeId || d.customName, {
  message: 'At least one of placeId or customName is required',
});

const dayActivity = z.object({
  activityId: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  defaultCost: decimal().optional(),
  costOverride: decimal().optional(),
  orderIndex: z.number().int().min(0).default(0),
}).refine((d) => d.activityId || d.name, {
  message: 'At least one of activityId or name is required',
});

const dayTransport = z.object({
  routeType: routeType,
  transportMode: transportMode,
  pricingModel: pricingModel,
  unitCost: decimal().min(0),
  distanceKm: z.number().min(0).optional().nullable(),
  originPlaceId: z.string().uuid().optional().nullable(),
  destinationPlaceId: z.string().uuid().optional().nullable(),
}).superRefine((t, ctx) => {
  if (t.routeType === 'POINT_TO_POINT') {
    if (!t.originPlaceId) {
      ctx.addIssue({ code: 'custom', message: 'originPlaceId is required for POINT_TO_POINT', path: ['originPlaceId'] });
    }
    if (!t.destinationPlaceId) {
      ctx.addIssue({ code: 'custom', message: 'destinationPlaceId is required for POINT_TO_POINT', path: ['destinationPlaceId'] });
    }
  }
  if (t.pricingModel === 'PER_KM' && (t.distanceKm == null || t.distanceKm <= 0)) {
    ctx.addIssue({ code: 'custom', message: 'distanceKm is required for PER_KM pricing', path: ['distanceKm'] });
  }
});

const itineraryDay = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  breakfastCount: z.number().int().min(0).default(0),
  lunchCount: z.number().int().min(0).default(0),
  dinnerCount: z.number().int().min(0).default(0),
  mealPriceOverride: decimal().min(0).optional().nullable(),
  places: z.array(dayPlace).optional().default([]),
  activities: z.array(dayActivity).optional().default([]),
  transports: z.array(dayTransport).optional().default([]),
});

// ─── Package schemas ───────────────────────────────────────────

export const createPackageSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  destination: z.string().max(255).optional(),
  durationDays: z.number().int().positive(),
  category: packageCategory,
  coverImage: z.string().max(500).optional(),
  inclusions: z.array(z.string()).optional().default([]),
  exclusions: z.array(z.string()).optional().default([]),
  termsAndConditions: z.string().max(10000).optional(),
  basePrice: decimal().min(0).optional(),
  defaultMarginType: marginType.default('PERCENTAGE'),
  defaultMarginInput: decimal().min(0).default(0),
  currency: z.string().length(3).default('USD'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  images: z.array(imageSchema).optional().default([]),
  itineraryDays: z.array(itineraryDay).optional().default([]),
});

export const updatePackageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  destination: z.string().max(255).optional(),
  durationDays: z.number().int().positive().optional(),
  category: packageCategory.optional(),
  coverImage: z.string().max(500).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  termsAndConditions: z.string().max(10000).optional(),
  basePrice: decimal().min(0).optional(),
  defaultMarginType: marginType.optional(),
  defaultMarginInput: decimal().min(0).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(imageSchema).optional(),
  itineraryDays: z.array(itineraryDay).optional(),
});

export const packageIdParamSchema = z.object({
  id: z.string().uuid('Invalid package ID'),
});

export const listPackagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.string().optional(),
  category: packageCategory.optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['createdAt', 'basePrice', 'rating', 'bookings', 'title']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─── Place / Activity sub-schemas ─────────────────────────────

export const createPlaceSchema = z.object({
  name: z.string().min(1).max(255),
  type: placeType,
  defaultCost: decimal().min(0).optional().nullable(),
});

export const updatePlaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: placeType.optional(),
  defaultCost: decimal().min(0).optional().nullable(),
});

export const createActivitySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  defaultCost: decimal().min(0),
  vendorId: z.string().uuid().optional().nullable(),
});

export const updateActivitySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  defaultCost: decimal().min(0).optional(),
  vendorId: z.string().uuid().optional().nullable(),
});
