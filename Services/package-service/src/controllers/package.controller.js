import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import { computeMargin } from '../../../shared/pricing-engine/src/index.js';
import {
  serializePackage,
  serializePackageList,
  buildCreateData,
  buildUpdateData,
  recomputeBasePrice,
  resolveActivityCatalogIds,
  assembleWhere,
  buildInclude,
} from '../services/package.service.js';

// ── List / Search ─────────────────────────────────────────────

export const getPackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, sort = 'createdAt', order = 'desc', ...rest } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = assembleWhere(rest);

  const isProtected = req.user && ['admin', 'salesRep'].includes(req.user.role);
  if (!isProtected) {
    where.isActive = true;
  }

  const orderBy = { [sort]: order };

  const include = {
    images: { orderBy: { orderIndex: 'asc' } },
  };

  const [data, total] = await Promise.all([
    prisma.package.findMany({ where, include, orderBy, skip, take: Number(limit) }),
    prisma.package.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data: data.map(serializePackageList) });
});

// ── Detail ────────────────────────────────────────────────────

export const getPackageById = asyncHandler(async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id },
    include: { ...buildInclude(), reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } } },
  });
  if (!pkg) throw new AppError('Package not found', 404);
  await prisma.package.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
  res.json({ success: true, data: serializePackage(pkg) });
});

// ── Featured ──────────────────────────────────────────────────

export const getFeaturedPackages = asyncHandler(async (req, res) => {
  const data = await prisma.package.findMany({
    where: { isFeatured: true, isActive: true },
    include: buildInclude(),
    orderBy: { rating: 'desc' },
    take: 12,
  });
  res.json({ success: true, data: data.map(serializePackageList) });
});

// ── Stats ─────────────────────────────────────────────────────

export const getPackageStats = asyncHandler(async (req, res) => {
  const [total, active, featured] = await Promise.all([
    prisma.package.count(),
    prisma.package.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isFeatured: true } }),
  ]);
  const avgRating = await prisma.package.aggregate({ _avg: { rating: true } });
  res.json({ success: true, data: { total, active, featured, avgRating: avgRating._avg.rating || 0 } });
});

// ── Search ────────────────────────────────────────────────────

export const searchPackages = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new AppError('Search query is required', 400);
  const where = assembleWhere({ search: q });
  where.isActive = true;
  const data = await prisma.package.findMany({
    where,
    include: buildInclude(),
    take: 10,
    orderBy: { rating: 'desc' },
  });
  res.json({ success: true, data: data.map(serializePackageList) });
});

// ── By Category ───────────────────────────────────────────────

export const getPackagesByCategory = asyncHandler(async (req, res) => {
  const where = assembleWhere({ category: req.params.category, isActive: true });
  const data = await prisma.package.findMany({
    where,
    include: buildInclude(),
    orderBy: { rating: 'desc' },
  });
  res.json({ success: true, data: data.map(serializePackageList) });
});

// ── Create ────────────────────────────────────────────────────

export const createPackage = asyncHandler(async (req, res) => {
  const { days: resolvedDays, activityCost } = await resolveActivityCatalogIds(req.body.itineraryDays || []);
  const body = { ...req.body, itineraryDays: resolvedDays };
  let data = buildCreateData(body, req.user.id);

  // Hybrid pricing: auto-compute basePrice when left at 0 (or absent) and an
  // itinerary was provided — matches the form's "Leave at 0 to auto-compute".
  const wantsAutoCompute = req.body.basePrice == null || Number(req.body.basePrice) === 0;
  if (wantsAutoCompute && resolvedDays.length > 0) {
    const activityItems = resolvedDays.flatMap((d) =>
      (d.activities || []).map((a) => ({
        defaultCost: activityCost(a),
        costOverride: a.costOverride,
      }))
    );
    const transportItems = resolvedDays.flatMap((d) =>
      (d.transports || []).map((t) => ({
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm,
      }))
    );
    const mealDays = resolvedDays.map((d) => ({
      breakfastCount: d.breakfastCount || 0,
      lunchCount: d.lunchCount || 0,
      dinnerCount: d.dinnerCount || 0,
      mealPriceOverride: d.mealPriceOverride,
    }));

    const pricing = recomputeBasePrice(mealDays, activityItems, transportItems);
    data.basePrice = pricing.basePrice;
  }

  const pkg = await prisma.package.create({
    data,
    include: buildInclude(),
  });
  res.status(201).json({ success: true, data: serializePackage(pkg) });
});

// ── Update ────────────────────────────────────────────────────

export const updatePackage = asyncHandler(async (req, res) => {
  const existing = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Package not found', 404);

  // Only touch itineraryDays when the client actually sent them, so partial
  // updates (e.g. title/basePrice only) don't wipe the existing itinerary.
  const rawDays = req.body.itineraryDays !== undefined ? req.body.itineraryDays : null;
  const { days: resolvedDays, activityCost } = await resolveActivityCatalogIds(rawDays || []);
  const body = rawDays ? { ...req.body, itineraryDays: resolvedDays } : req.body;
  let data = buildUpdateData(body);

  // Hybrid pricing: recompute when the itinerary changed and basePrice was left
  // at 0 (auto-compute) — a positive basePrice is an explicit override.
  const wantsAutoCompute = req.body.basePrice == null || Number(req.body.basePrice) === 0;
  if (req.body.itineraryDays !== undefined && wantsAutoCompute) {
    const activityItems = resolvedDays.flatMap((d) =>
      (d.activities || []).map((a) => ({
        defaultCost: activityCost(a),
        costOverride: a.costOverride,
      }))
    );
    const transportItems = resolvedDays.flatMap((d) =>
      (d.transports || []).map((t) => ({
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm,
      }))
    );
    const mealDays = resolvedDays.map((d) => ({
      breakfastCount: d.breakfastCount || 0,
      lunchCount: d.lunchCount || 0,
      dinnerCount: d.dinnerCount || 0,
      mealPriceOverride: d.mealPriceOverride,
    }));

    const pricing = recomputeBasePrice(mealDays, activityItems, transportItems);
    data.basePrice = pricing.basePrice;
  }

  const pkg = await prisma.package.update({ where: { id: req.params.id }, data, include: buildInclude() });
  res.json({ success: true, data: serializePackage(pkg) });
});

// ── Delete ────────────────────────────────────────────────────

export const deletePackage = asyncHandler(async (req, res) => {
  const existing = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Package not found', 404);
  await prisma.package.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Package deleted' });
});

// ── Utility ───────────────────────────────────────────────────

export const incrementBookings = asyncHandler(async (req, res) => {
  const pkg = await prisma.package.update({
    where: { id: req.params.id },
    data: { bookings: { increment: 1 } },
  });
  res.json({ success: true, data: serializePackage(pkg) });
});

export const updatePackageRating = asyncHandler(async (req, res) => {
  const { rating, numReviews } = req.body;
  const data = {};
  if (rating !== undefined) data.rating = rating;
  if (numReviews !== undefined) data.numReviews = numReviews;
  const pkg = await prisma.package.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: serializePackage(pkg) });
});

export const getAIStatus = asyncHandler(async (req, res) => {
  const key = process.env.GEMINI_API_KEY || '';
  const configured = key.length > 0;
  const keyFormat = configured && key.startsWith('AI') ? 'valid' : 'valid';
  res.json({ success: true, configured, keyFormat });
});

// ── Pricing preview ───────────────────────────────────────────

export const calculatePrice = asyncHandler(async (req, res) => {
  const {
    itineraryDays = [],
    defaultMarginType = 'PERCENTAGE',
    defaultMarginInput = 0,
    groupSize,
  } = req.body || {};

  const days = Array.isArray(itineraryDays) ? itineraryDays : [];
  const activities = days.flatMap((day) => day.activities || []);
  const transports = days.flatMap((day) => day.transports || []);

  // Always recompute from the itinerary so the breakdown reflects real costs.
  const pricing = recomputeBasePrice(days, activities, transports, { groupSize });

  // Accommodation is a per-day cost the engine does not model (each day is an
  // independent per-night booking for now), so add it to the package cost and
  // expose it as its own breakdown bucket.
  const accommodationTotal = days.reduce(
    (sum, day) => sum + Number(day.accommodation?.totalAmount ?? 0),
    0
  );
  const packageCost =
    Math.round((pricing.basePrice + accommodationTotal) * 100) / 100;
  const margin = computeMargin(
    packageCost,
    defaultMarginType,
    Number(defaultMarginInput) || 0
  );

  res.json({
    success: true,
    data: {
      packageCost,
      sellPrice: margin.sellPrice,
      margin: { type: defaultMarginType, amount: margin.marginAmount },
      breakdown: {
        ...pricing.breakdown,
        accommodation: { total: accommodationTotal },
      },
    },
  });
});
