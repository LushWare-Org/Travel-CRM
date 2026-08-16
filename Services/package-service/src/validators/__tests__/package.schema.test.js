import { describe, it, expect } from 'vitest';
import {
  createPackageSchema,
  updatePackageSchema,
  packageIdParamSchema,
  packageImageParamSchema,
  packageCoverParamSchema,
  setPackageCoverSchema,
  listPackagesQuerySchema,
  createPlaceSchema,
  createActivitySchema,
  generateAIPackageSchema,
  generateFromTitleSchema,
} from '../package.schema.js';

const UUID_1 = 'b0000000-0000-4000-8000-000000000001';
const UUID_2 = 'b0000000-0000-4000-8000-000000000002';

const validPackage = {
  title: '7-Day Alps Adventure',
  description: 'An amazing adventure through the Alps',
  destination: 'Switzerland',
  durationDays: 7,
  category: 'FAMILY',
  itineraryDays: [
    {
      dayNumber: 1,
      title: 'Arrival',
      breakfastCount: 0,
      lunchCount: 0,
      dinnerCount: 1,
      places: [{ customName: 'Zurich Airport', orderIndex: 0 }],
      activities: [{ name: 'Airport Pickup', defaultCost: 0, orderIndex: 0 }],
      transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'CAR', pricingModel: 'PER_VEHICLE', unitCost: 150 }],
    },
  ],
};

describe('createPackageSchema', () => {
  it('accepts a valid package', () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
  });

  it('applies defaults for missing optional fields', () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultMarginType).toBe('PERCENTAGE');
      expect(result.data.defaultMarginInput).toBe(0);
      expect(result.data.currency).toBe('USD');
      expect(result.data.isActive).toBe(true);
      expect(result.data.isFeatured).toBe(false);
      expect(result.data.inclusions).toEqual([]);
      expect(result.data.exclusions).toEqual([]);
      expect(result.data.images).toEqual([]);
    }
  });

  it('rejects missing title', () => {
    const { title, ...rest } = validPackage;
    const result = createPackageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 255 chars', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, title: 'x'.repeat(256) });
    expect(result.success).toBe(false);
  });

  it('rejects missing destination', () => {
    const { destination, ...rest } = validPackage;
    const result = createPackageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty destination', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, destination: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing durationDays', () => {
    const { durationDays, ...rest } = validPackage;
    const result = createPackageSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects durationDays <= 0', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, durationDays: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, category: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    for (const cat of ['HONEYMOON', 'COUPLE', 'FAMILY', 'GROUP', 'WILD_SAFARI']) {
      const result = createPackageSchema.safeParse({ ...validPackage, category: cat });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid currency length', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, currency: 'USDD' });
    expect(result.success).toBe(false);
  });

  it('rejects negative basePrice', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, basePrice: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts basePrice as string decimal', () => {
    const result = createPackageSchema.safeParse({ ...validPackage, basePrice: '1499.99' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe(1499.99);
  });

  it('rejects negative dayNumber', () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      itineraryDays: [{ ...validPackage.itineraryDays[0], dayNumber: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects day with neither placeId nor customName', () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      itineraryDays: [{ ...validPackage.itineraryDays[0], places: [{ orderIndex: 0 }] }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects day with neither activityId nor name', () => {
    const result = createPackageSchema.safeParse({
      ...validPackage,
      itineraryDays: [{ ...validPackage.itineraryDays[0], activities: [{ orderIndex: 0 }] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('updatePackageSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = updatePackageSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updatePackageSchema.safeParse({ title: 'Updated Title', isActive: false });
    expect(result.success).toBe(true);
  });

  it('rejects invalid field when present', () => {
    const result = updatePackageSchema.safeParse({ category: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('packageIdParamSchema', () => {
  it('accepts a valid ID string', () => {
    const result = packageIdParamSchema.safeParse({ id: UUID_1 });
    expect(result.success).toBe(true);
  });

  it('accepts non-UUID IDs (relaxed validation)', () => {
    const result = packageIdParamSchema.safeParse({ id: '1' });
    expect(result.success).toBe(true);
  });

  it('rejects empty ID', () => {
    const result = packageIdParamSchema.safeParse({ id: '' });
    expect(result.success).toBe(false);
  });
});

describe('listPackagesQuerySchema', () => {
  it('applies defaults for empty query', () => {
    const result = listPackagesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe('createdAt');
      expect(result.data.order).toBe('desc');
    }
  });

  it('coerces string numbers', () => {
    const result = listPackagesQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limit > 100', () => {
    const result = listPackagesQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });
});

describe('createPlaceSchema', () => {
  it('accepts a valid place', () => {
    const result = createPlaceSchema.safeParse({ name: 'Colombo', type: 'CITY' });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createPlaceSchema.safeParse({ type: 'CITY' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid type', () => {
    const result = createPlaceSchema.safeParse({ name: 'X', type: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('createActivitySchema', () => {
  it('accepts a valid activity', () => {
    const result = createActivitySchema.safeParse({
      name: 'Whale Watching',
      description: 'Boat tour',
      defaultCost: 85,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing defaultCost', () => {
    const result = createActivitySchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('rejects negative defaultCost', () => {
    const result = createActivitySchema.safeParse({ name: 'Test', defaultCost: -5 });
    expect(result.success).toBe(false);
  });

  it('defaults description to undefined', () => {
    const result = createActivitySchema.safeParse({ name: 'Test', defaultCost: 50 });
    expect(result.success).toBe(true);
  });
});

describe('transport validation', () => {
  it('rejects POINT_TO_POINT without originPlaceId', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        transports: [{
          routeType: 'POINT_TO_POINT',
          transportMode: 'FLIGHT',
          pricingModel: 'PER_PERSON',
          unitCost: 200,
          destinationPlaceId: UUID_1,
        }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
  });

  it('rejects PER_KM without distanceKm', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        transports: [{
          routeType: 'DAILY_ROUTING',
          transportMode: 'CAR',
          pricingModel: 'PER_KM',
          unitCost: 2,
        }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
  });

  it('accepts valid POINT_TO_POINT transport', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        transports: [{
          routeType: 'POINT_TO_POINT',
          transportMode: 'FLIGHT',
          pricingModel: 'PER_PERSON',
          unitCost: 200,
          originPlaceId: UUID_1,
          destinationPlaceId: UUID_2,
        }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it('accepts valid PER_KM transport', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        transports: [{
          routeType: 'DAILY_ROUTING',
          transportMode: 'CAR',
          pricingModel: 'PER_KM',
          unitCost: 2.5,
          distanceKm: 120,
        }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it('accepts BUS as a transport mode', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        transports: [{
          routeType: 'DAILY_ROUTING',
          transportMode: 'BUS',
          pricingModel: 'PER_PERSON',
          unitCost: 12,
        }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });
});

describe('image publicId + day images', () => {
  it('accepts a package image with a publicId', () => {
    const pkg = { ...validPackage, images: [{ url: 'a.jpg', publicId: 'travel-crm/packages/a' }] };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
  });

  it('accepts an itinerary day with images', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{
        ...validPackage.itineraryDays[0],
        images: [{ url: 'day1.jpg', publicId: 'travel-crm/itineraries/day1' }],
      }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(true);
    expect(result.data.itineraryDays[0].images).toEqual([
      { url: 'day1.jpg', publicId: 'travel-crm/itineraries/day1' },
    ]);
  });

  it('defaults itinerary day images to an empty array', () => {
    const result = createPackageSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
    expect(result.data.itineraryDays[0].images).toEqual([]);
  });

  it('rejects a day image with no url', () => {
    const pkg = {
      ...validPackage,
      itineraryDays: [{ ...validPackage.itineraryDays[0], images: [{ publicId: 'x' }] }],
    };
    const result = createPackageSchema.safeParse(pkg);
    expect(result.success).toBe(false);
  });
});

describe('packageImageParamSchema', () => {
  it('accepts packageId and imageId', () => {
    const result = packageImageParamSchema.safeParse({ packageId: 'pkg-1', imageId: 'img-1' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing imageId', () => {
    const result = packageImageParamSchema.safeParse({ packageId: 'pkg-1', imageId: '' });
    expect(result.success).toBe(false);
  });
});

describe('packageCoverParamSchema / setPackageCoverSchema', () => {
  it('accepts a valid packageId param', () => {
    expect(packageCoverParamSchema.safeParse({ packageId: 'pkg-1' }).success).toBe(true);
  });

  it('requires imageId in the body', () => {
    expect(setPackageCoverSchema.safeParse({}).success).toBe(false);
    expect(setPackageCoverSchema.safeParse({ imageId: 'img-1' }).success).toBe(true);
  });
});

describe('generateAIPackageSchema', () => {
  it('accepts the payload the Management AI dialog actually sends', () => {
    const result = generateAIPackageSchema.safeParse({
      destination: 'Bali',
      packageType: 'Deluxe',
      category: 'family',
      duration: 5,
      description: 'Include water sports, prefer beachside hotels',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing destination', () => {
    expect(generateAIPackageSchema.safeParse({ duration: 5 }).success).toBe(false);
  });

  it('rejects duration above the sanity cap', () => {
    expect(generateAIPackageSchema.safeParse({ destination: 'Bali', duration: 365 }).success).toBe(false);
  });

  it('rejects a zero or negative duration', () => {
    expect(generateAIPackageSchema.safeParse({ destination: 'Bali', duration: 0 }).success).toBe(false);
  });

  it('coerces a numeric-string duration, matching how it arrives over JSON from the form', () => {
    const result = generateAIPackageSchema.safeParse({ destination: 'Bali', duration: '5' });
    expect(result.success).toBe(true);
    expect(result.data.duration).toBe(5);
  });
});

describe('generateFromTitleSchema', () => {
  it('accepts a title-only payload', () => {
    expect(generateFromTitleSchema.safeParse({ title: 'Kandy Getaway' }).success).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(generateFromTitleSchema.safeParse({ title: '' }).success).toBe(false);
  });
});
