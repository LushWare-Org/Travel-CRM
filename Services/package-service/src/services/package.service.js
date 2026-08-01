import slugify from 'slugify';
import { calculateBasePrice } from '../../../shared/pricing-engine/src/index.js';

// ── Include helpers ───────────────────────────────────────────

export function buildInclude() {
  return {
    images: { orderBy: { orderIndex: 'asc' } },
    itineraryDays: {
      orderBy: { dayNumber: 'asc' },
      include: {
        places: { orderBy: { orderIndex: 'asc' }, include: { place: true } },
        activities: { orderBy: { orderIndex: 'asc' }, include: { activity: true } },
        transports: true,
      },
    },
    reviews: { orderBy: { createdAt: 'desc' }, take: 10 },
  };
}

// ── Serialize ─────────────────────────────────────────────────

export function serializePackage(pkg) {
  if (!pkg) return null;

  const itineraryDays = (pkg.itineraryDays || []).map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    breakfastCount: day.breakfastCount,
    lunchCount: day.lunchCount,
    dinnerCount: day.dinnerCount,
    mealPriceOverride: day.mealPriceOverride ? Number(day.mealPriceOverride) : null,
    places: (day.places || []).map((dp) => ({
      id: dp.id,
      placeId: dp.placeId,
      place: dp.place ? { id: dp.place.id, name: dp.place.name, type: dp.place.type } : null,
      customName: dp.customName,
      orderIndex: dp.orderIndex,
    })),
    activities: (day.activities || []).map((da) => ({
      id: da.id,
      activityId: da.activityId,
      activity: da.activity ? { id: da.activity.id, name: da.activity.name, description: da.activity.description, defaultCost: Number(da.activity.defaultCost) } : null,
      costOverride: da.costOverride ? Number(da.costOverride) : null,
      orderIndex: da.orderIndex,
    })),
    transports: (day.transports || []).map((dt) => ({
      id: dt.id,
      routeType: dt.routeType,
      transportMode: dt.transportMode,
      pricingModel: dt.pricingModel,
      unitCost: Number(dt.unitCost),
      distanceKm: dt.distanceKm ? Number(dt.distanceKm) : null,
      originPlaceId: dt.originPlaceId,
      destinationPlaceId: dt.destinationPlaceId,
    })),
  }));

  const basePrice = Number(pkg.basePrice);
  const defaultMarginInput = Number(pkg.defaultMarginInput);

  return {
    id: pkg.id,
    title: pkg.title,
    slug: pkg.slug,
    description: pkg.description,
    destination: pkg.destination,
    durationDays: pkg.durationDays,
    category: pkg.category,
    coverImage: pkg.coverImage,
    inclusions: pkg.inclusions,
    exclusions: pkg.exclusions,
    termsAndConditions: pkg.termsAndConditions,
    basePrice,
    defaultMarginType: pkg.defaultMarginType,
    defaultMarginInput,
    currency: pkg.currency,
    isActive: pkg.isActive,
    isFeatured: pkg.isFeatured,
    rating: pkg.rating,
    numReviews: pkg.numReviews,
    views: pkg.views,
    bookings: pkg.bookings,
    createdBy: pkg.createdBy,
    images: (pkg.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
      orderIndex: img.orderIndex,
    })),
    itineraryDays,
    reviews: (pkg.reviews || []).map((r) => ({
      id: r.id,
      authorId: r.authorId,
      name: r.name,
      email: r.email,
      rating: r.rating,
      comment: r.comment,
      isApproved: r.isApproved,
      helpful: r.helpful,
      createdAt: r.createdAt,
    })),
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}

export function serializePackageList(pkg) {
  if (!pkg) return null;
  return {
    id: pkg.id,
    title: pkg.title,
    slug: pkg.slug,
    description: pkg.description,
    destination: pkg.destination,
    durationDays: pkg.durationDays,
    category: pkg.category,
    coverImage: pkg.coverImage,
    basePrice: Number(pkg.basePrice),
    defaultMarginType: pkg.defaultMarginType,
    defaultMarginInput: Number(pkg.defaultMarginInput),
    currency: pkg.currency,
    isActive: pkg.isActive,
    isFeatured: pkg.isFeatured,
    rating: pkg.rating,
    numReviews: pkg.numReviews,
    views: pkg.views,
    bookings: pkg.bookings,
    images: (pkg.images || []).slice(0, 1).map((img) => ({ url: img.url })),
    createdAt: pkg.createdAt,
  };
}

// ── Deserialize (API payload → Prisma create/update data) ─────

export function buildCreateData(body, userId) {
  const slug = body.slug || slugify(body.title, { lower: true, strict: true });

  return {
    title: body.title,
    slug,
    description: body.description,
    destination: body.destination,
    durationDays: body.durationDays,
    category: body.category,
    coverImage: body.coverImage,
    inclusions: body.inclusions ?? [],
    exclusions: body.exclusions ?? [],
    termsAndConditions: body.termsAndConditions,
    basePrice: body.basePrice ?? 0,
    defaultMarginType: body.defaultMarginType ?? 'PERCENTAGE',
    defaultMarginInput: body.defaultMarginInput ?? 0,
    currency: body.currency ?? 'USD',
    isActive: body.isActive ?? true,
    isFeatured: body.isFeatured ?? false,
    createdBy: userId,
    images: {
      create: (body.images || []).map((img, i) => ({
        url: img.url,
        altText: img.altText,
        orderIndex: img.orderIndex ?? i,
      })),
    },
    itineraryDays: {
      create: buildItineraryDaysData(body.itineraryDays || []),
    },
  };
}

export function buildUpdateData(body) {
  const data = {};

  const scalarFields = [
    'title', 'slug', 'description', 'destination', 'durationDays', 'category',
    'coverImage', 'inclusions', 'exclusions', 'termsAndConditions',
    'basePrice', 'defaultMarginType', 'defaultMarginInput', 'currency',
    'isActive', 'isFeatured',
  ];

  for (const field of scalarFields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  if (body.slug === undefined && body.title !== undefined) {
    data.slug = slugify(body.title, { lower: true, strict: true });
  }

  if (body.images !== undefined) {
    data.images = {
      deleteMany: {},
      create: (body.images || []).map((img, i) => ({
        url: img.url,
        altText: img.altText,
        orderIndex: img.orderIndex ?? i,
      })),
    };
  }

  if (body.itineraryDays !== undefined) {
    data.itineraryDays = {
      deleteMany: {},
      create: buildItineraryDaysData(body.itineraryDays),
    };
  }

  return data;
}

// ── Day data builder ───────────────────────────────────────────

function buildItineraryDaysData(days) {
  return days.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    description: day.description,
    breakfastCount: day.breakfastCount ?? 0,
    lunchCount: day.lunchCount ?? 0,
    dinnerCount: day.dinnerCount ?? 0,
    mealPriceOverride: day.mealPriceOverride ?? null,
    places: {
      create: (day.places || []).map((p, i) => ({
        placeId: p.placeId || undefined,
        customName: !p.placeId ? (p.customName || undefined) : undefined,
        orderIndex: p.orderIndex ?? i,
      })),
    },
    activities: {
      create: (day.activities || []).map((a, i) => ({
        activityId: a.activityId,
        costOverride: a.costOverride ?? null,
        orderIndex: a.orderIndex ?? i,
      })),
    },
    transports: {
      create: (day.transports || []).map((t) => ({
        routeType: t.routeType,
        transportMode: t.transportMode,
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm ?? null,
        originPlaceId: t.originPlaceId ?? null,
        destinationPlaceId: t.destinationPlaceId ?? null,
      })),
    },
  }));
}

// ── Pricing ────────────────────────────────────────────────────

export function recomputeBasePrice(days, activities, transports, options = {}) {
  const mealDays = days.map((day) => ({
    breakfastCount: day.breakfastCount,
    lunchCount: day.lunchCount,
    dinnerCount: day.dinnerCount,
    mealPriceOverride: day.mealPriceOverride,
  }));

  const actRows = activities.map((a) => ({
    defaultCost: a.costOverride ?? a.defaultCost ?? (a.activity?.defaultCost ?? 0),
    costOverride: a.costOverride,
  }));

  const transportRows = transports.map((t) => ({
    pricingModel: t.pricingModel,
    unitCost: t.unitCost,
    distanceKm: t.distanceKm,
  }));

  return calculateBasePrice({
    days: mealDays,
    activities: actRows,
    transports: transportRows,
    groupSize: options.groupSize,
    mealCostPerPerson: options.mealCostPerPerson,
  });
}

// ── Query builder ──────────────────────────────────────────────

export function assembleWhere(query) {
  const where = {};

  if (query.isActive !== undefined) where.isActive = query.isActive;
  if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;
  if (query.category) where.category = query.category;

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
      { destination: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.basePrice = {};
    if (query.minPrice !== undefined) where.basePrice.gte = query.minPrice;
    if (query.maxPrice !== undefined) where.basePrice.lte = query.maxPrice;
  }

  return where;
}
