import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';
import {
  serializePackage,
  serializePackageList,
  buildCreateData,
  buildUpdateData,
  recomputeBasePrice,
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
  let data = buildCreateData(req.body, req.user.id);

  // Hybrid pricing: auto-compute basePrice if not explicitly provided
  if (req.body.basePrice === undefined && req.body.itineraryDays?.length) {
    const itinDays = data.itineraryDays.create;
    const activityItems = itinDays.flatMap((d) =>
      (d.activities?.create || []).map((a) => ({
        defaultCost: a.costOverride ?? 0,
        costOverride: a.costOverride,
      }))
    );
    const transportItems = itinDays.flatMap((d) =>
      (d.transports?.create || []).map((t) => ({
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm,
      }))
    );
    const mealDays = itinDays.map((d) => ({
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

  let data = buildUpdateData(req.body);

  // Hybrid pricing: recompute if itineraryDays changed and no basePrice override provided
  if (req.body.itineraryDays !== undefined && req.body.basePrice === undefined) {
    const itinDays = data.itineraryDays.create;
    const activityItems = itinDays.flatMap((d) =>
      (d.activities?.create || []).map((a) => ({
        defaultCost: a.costOverride ?? 0,
        costOverride: a.costOverride,
      }))
    );
    const transportItems = itinDays.flatMap((d) =>
      (d.transports?.create || []).map((t) => ({
        pricingModel: t.pricingModel,
        unitCost: t.unitCost,
        distanceKm: t.distanceKm,
      }))
    );
    const mealDays = itinDays.map((d) => ({
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
