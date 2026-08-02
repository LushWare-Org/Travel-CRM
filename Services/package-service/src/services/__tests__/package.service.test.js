import { describe, it, expect, vi } from 'vitest';
import {
  serializePackage,
  serializePackageList,
  buildCreateData,
  buildUpdateData,
  assembleWhere,
  recomputeBasePrice,
  buildInclude,
} from '../package.service.js';

// Mock the shared pricing engine
vi.mock('../../../../shared/pricing-engine/src/index.js', () => ({
  calculateBasePrice: vi.fn(({ days, activities, transports }) => ({
    basePrice: 560,
    breakdown: { meals: { total: 60 }, activities: { total: 200 }, transports: { total: 300 } },
  })),
  computeMargin: vi.fn((basePrice, marginType, marginValue) => {
    const marginAmount = marginType === 'FIXED' ? marginValue : basePrice * (marginValue / 100);
    return {
      basePrice,
      marginAmount: Math.round(marginAmount * 100) / 100,
      sellPrice: Math.round((basePrice + marginAmount) * 100) / 100,
    };
  }),
}));

const mockPkg = {
  id: 'pkg-1',
  title: 'Test Package',
  slug: 'test-package',
  description: 'A test',
  destination: 'Testland',
  durationDays: 3,
  category: 'FAMILY',
  coverImage: 'https://example.com/img.jpg',
  inclusions: ['Hotel', 'Meals'],
  exclusions: ['Flights'],
  termsAndConditions: 'Pay in full.',
  basePrice: 1500,
  defaultMarginType: 'PERCENTAGE',
  defaultMarginInput: 20,
  currency: 'USD',
  isActive: true,
  isFeatured: false,
  rating: 4.5,
  numReviews: 10,
  views: 100,
  bookings: 5,
  createdBy: 'user-1',
  images: [{ id: 'img-1', url: 'https://example.com/a.jpg', altText: 'View', orderIndex: 0 }],
  itineraryDays: [
    {
      dayNumber: 1,
      title: 'Day 1',
      description: 'Arrival',
      breakfastCount: 0,
      lunchCount: 0,
      dinnerCount: 1,
      mealPriceOverride: null,
      places: [{ id: 'dp-1', placeId: 'place-1', place: { id: 'place-1', name: 'City', type: 'CITY' }, customName: null, orderIndex: 0 }],
      activities: [{ id: 'da-1', activityId: 'act-1', activity: { id: 'act-1', name: 'Tour', description: 'City tour', defaultCost: 50 }, costOverride: null, orderIndex: 0 }],
      transports: [{ id: 'dt-1', routeType: 'DAILY_ROUTING', transportMode: 'CAR', pricingModel: 'PER_VEHICLE', unitCost: 80, distanceKm: null, originPlaceId: null, destinationPlaceId: null }],
      flights: [{ id: 'flight-1', origin: 'CMB', destination: 'DXB', cabinClass: 'Economy', airlinePreference: 'Emirates', totalAmount: 0 }],
    },
  ],
  reviews: [{ id: 'r-1', authorId: 'user-2', name: 'Alice', email: 'a@test.com', rating: 5, comment: 'Great!', isApproved: true, helpful: 3, createdAt: new Date('2025-01-01') }],
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

describe('serializePackage', () => {
  it('returns null for null input', () => {
    expect(serializePackage(null)).toBeNull();
  });

  it('serializes a full package with nested relations', () => {
    const result = serializePackage(mockPkg);
    expect(result.id).toBe('pkg-1');
    expect(result.title).toBe('Test Package');
    expect(result.basePrice).toBe(1500);
    expect(result.defaultMarginInput).toBe(20);
    expect(result.sellPrice).toBe(1800);
    expect(result.itineraryDays).toHaveLength(1);
    expect(result.itineraryDays[0].places[0].place.name).toBe('City');
    expect(result.itineraryDays[0].activities[0].activity.name).toBe('Tour');
    expect(result.itineraryDays[0].flights).toEqual([
      { id: 'flight-1', origin: 'CMB', destination: 'DXB', cabinClass: 'Economy', airlinePreference: 'Emirates', totalAmount: 0 },
    ]);
    expect(result.images).toHaveLength(1);
    expect(result.reviews).toHaveLength(1);
  });

  it('handles plain number basePrice and marginInput', () => {
    const result = serializePackage({
      ...mockPkg,
      basePrice: 999.99,
      defaultMarginInput: 15.5,
    });
    expect(result.basePrice).toBe(999.99);
    expect(result.defaultMarginInput).toBe(15.5);
    expect(result.sellPrice).toBe(1154.99);
  });

  it('applies a FIXED margin to sellPrice', () => {
    const result = serializePackage({
      ...mockPkg,
      basePrice: 1000,
      defaultMarginType: 'FIXED',
      defaultMarginInput: 150,
    });
    expect(result.sellPrice).toBe(1150);
  });

  it('handles missing optional relations', () => {
    const result = serializePackage({ ...mockPkg, itineraryDays: [], images: [], reviews: [] });
    expect(result.itineraryDays).toEqual([]);
    expect(result.images).toEqual([]);
  });
});

describe('serializePackageList', () => {
  it('serializes for list view', () => {
    const result = serializePackageList(mockPkg);
    expect(result.title).toBe('Test Package');
    expect(result.basePrice).toBe(1500);
    expect(result.sellPrice).toBe(1800);
    expect(result.images).toHaveLength(1);
    expect(result.itineraryDays).toBeUndefined();
    expect(result.reviews).toBeUndefined();
  });

  it('applies a FIXED margin to sellPrice in list view', () => {
    const result = serializePackageList({
      ...mockPkg,
      basePrice: 1000,
      defaultMarginType: 'FIXED',
      defaultMarginInput: 150,
    });
    expect(result.sellPrice).toBe(1150);
  });
});

describe('buildCreateData', () => {
  it('generates slug from title', () => {
    const data = buildCreateData({
      title: 'My Cool Package',
      durationDays: 5,
      category: 'FAMILY',
      itineraryDays: [],
    }, 'user-1');
    expect(data.slug).toBe('my-cool-package');
  });

  it('uses provided slug when given', () => {
    const data = buildCreateData({
      title: 'X',
      slug: 'custom-slug',
      durationDays: 3,
      category: 'HONEYMOON',
      itineraryDays: [],
    }, 'user-1');
    expect(data.slug).toBe('custom-slug');
  });

  it('applies defaults', () => {
    const data = buildCreateData({
      title: 'Pkg',
      durationDays: 2,
      category: 'GROUP',
      itineraryDays: [],
    }, 'user-1');
    expect(data.defaultMarginType).toBe('PERCENTAGE');
    expect(data.defaultMarginInput).toBe(0);
    expect(data.currency).toBe('USD');
    expect(data.isActive).toBe(true);
    expect(data.isFeatured).toBe(false);
    expect(data.inclusions).toEqual([]);
    expect(data.exclusions).toEqual([]);
  });

  it('creates nested itinerary day data', () => {
    const data = buildCreateData({
      title: 'Pkg',
      durationDays: 2,
      category: 'FAMILY',
      itineraryDays: [{
        dayNumber: 1,
        title: 'Day One',
        breakfastCount: 1,
        dinnerCount: 1,
        places: [{ placeId: 'place-1', orderIndex: 0 }],
        activities: [{ activityId: 'act-1', costOverride: 45, orderIndex: 0 }],
        transports: [{ routeType: 'DAILY_ROUTING', transportMode: 'CAR', pricingModel: 'PER_VEHICLE', unitCost: 100 }],
        flights: [{ id: 'flight-1', origin: 'CMB', destination: 'DXB', totalAmount: 0 }],
      }],
    }, 'user-1');

    const day = data.itineraryDays.create[0];
    expect(day.dayNumber).toBe(1);
    expect(day.title).toBe('Day One');
    expect(day.breakfastCount).toBe(1);
    expect(day.lunchCount).toBe(0);
    expect(day.places.create[0].placeId).toBe('place-1');
    expect(day.activities.create[0].costOverride).toBe(45);
    expect(day.transports.create[0].unitCost).toBe(100);
    expect(day.flights).toEqual([{ id: 'flight-1', origin: 'CMB', destination: 'DXB', totalAmount: 0 }]);
  });

  it('uses customName when placeId is missing', () => {
    const data = buildCreateData({
      title: 'Pkg',
      durationDays: 1,
      category: 'FAMILY',
      itineraryDays: [{ dayNumber: 1, places: [{ customName: 'Beach', orderIndex: 0 }] }],
    }, 'user-1');
    expect(data.itineraryDays.create[0].places.create[0].customName).toBe('Beach');
    expect(data.itineraryDays.create[0].places.create[0].placeId).toBeUndefined();
  });
});

describe('buildUpdateData', () => {
  it('returns only provided fields', () => {
    const data = buildUpdateData({ title: 'Updated Title', isActive: false });
    expect(data).toEqual({ title: 'Updated Title', slug: 'updated-title', isActive: false });
  });

  it('returns empty object for no changes', () => {
    const data = buildUpdateData({});
    expect(data).toEqual({});
  });

  it('regenerates slug when title changes without slug', () => {
    const data = buildUpdateData({ title: 'New Package Name' });
    expect(data.slug).toBe('new-package-name');
  });

  it('respects explicit slug override', () => {
    const data = buildUpdateData({ title: 'New', slug: 'my-slug' });
    expect(data.slug).toBe('my-slug');
  });

  it('rebuilds images with deleteMany + create', () => {
    const data = buildUpdateData({ images: [{ url: 'new.jpg', orderIndex: 0 }] });
    expect(data.images).toHaveProperty('deleteMany', {});
    expect(data.images.create).toHaveLength(1);
  });

  it('rebuilds itinerary days with deleteMany + create', () => {
    const data = buildUpdateData({
      itineraryDays: [{ dayNumber: 1, title: 'New Day' }],
    });
    expect(data.itineraryDays).toHaveProperty('deleteMany', {});
    expect(data.itineraryDays.create).toHaveLength(1);
  });
});

describe('assembleWhere', () => {
  it('returns empty where for no filters', () => {
    expect(assembleWhere({})).toEqual({});
  });

  it('filters by isActive', () => {
    expect(assembleWhere({ isActive: true })).toEqual({ isActive: true });
  });

  it('coerces string booleans from query strings to real booleans', () => {
    expect(assembleWhere({ isActive: 'true', isFeatured: 'false' })).toEqual({
      isActive: true,
      isFeatured: false,
    });
  });

  it('coerces mixed boolean representations', () => {
    expect(assembleWhere({ isActive: true, isFeatured: 'true' })).toEqual({
      isActive: true,
      isFeatured: true,
    });
  });

  it('filters by category', () => {
    expect(assembleWhere({ category: 'HONEYMOON' })).toEqual({ category: 'HONEYMOON' });
  });

  it('builds search OR clause', () => {
    const where = assembleWhere({ search: 'beach' });
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0].title.contains).toBe('beach');
  });

  it('filters by price range', () => {
    const where = assembleWhere({ minPrice: 100, maxPrice: 500 });
    expect(where.basePrice).toEqual({ gte: 100, lte: 500 });
  });

  it('parses string price filters into numbers', () => {
    const where = assembleWhere({ minPrice: '100', maxPrice: '500' });
    expect(where.basePrice).toEqual({ gte: 100, lte: 500 });
    expect(typeof where.basePrice.gte).toBe('number');
    expect(typeof where.basePrice.lte).toBe('number');
  });

  it('filters by min price only', () => {
    const where = assembleWhere({ minPrice: 100 });
    expect(where.basePrice).toEqual({ gte: 100 });
  });

  it('combines multiple filters', () => {
    const where = assembleWhere({ isActive: true, category: 'GROUP', search: 'europe' });
    expect(where.isActive).toBe(true);
    expect(where.category).toBe('GROUP');
    expect(where.OR).toHaveLength(3);
  });
});

describe('buildInclude', () => {
  it('includes all nested relations', () => {
    const include = buildInclude();
    expect(include.images).toBeDefined();
    expect(include.itineraryDays).toBeDefined();
    expect(include.itineraryDays.include.places).toBeDefined();
    expect(include.itineraryDays.include.activities).toBeDefined();
    expect(include.itineraryDays.include.transports).toBeDefined();
    expect(include.reviews).toBeDefined();
  });
});

describe('recomputeBasePrice', () => {
  it('calls shared pricing engine and returns result', () => {
    const result = recomputeBasePrice(
      [{ breakfastCount: 2, lunchCount: 1 }],
      [{ defaultCost: 100 }],
      [{ pricingModel: 'PER_VEHICLE', unitCost: 300 }],
    );
    expect(result.basePrice).toBe(560);
  });

  it('handles null costOverride by falling back to defaultCost', () => {
    const result = recomputeBasePrice(
      [{ breakfastCount: 0 }],
      [{ defaultCost: 200, costOverride: null }],
      [],
    );
    expect(result.basePrice).toBe(560);
  });
});
