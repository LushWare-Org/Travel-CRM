import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

const computeMeta = (days) => {
  let totalActivities = 0, totalLocations = 0, totalPlaces = 0;
  let breakfastCount = 0, lunchCount = 0, dinnerCount = 0;
  for (const d of days) {
    totalActivities += (d.activities || []).length;
    totalLocations += (d.locations || []).length;
    totalPlaces += (d.places || []).length;
    if (d.meals?.breakfast) breakfastCount++;
    if (d.meals?.lunch) lunchCount++;
    if (d.meals?.dinner) dinnerCount++;
  }
  return { metaTotalActivities: totalActivities, metaTotalLocations: totalLocations, metaTotalPlaces: totalPlaces, metaBreakfastCount: breakfastCount, metaLunchCount: lunchCount, metaDinnerCount: dinnerCount };
};

export const getDropdownOptions = asyncHandler(async (req, res) => {
  const packages = await prisma.package.findMany({ select: { id: true, name: true }, where: { isActive: true }, orderBy: { name: 'asc' } });
  res.json({ success: true, data: { packages } });
});

export const getItineraries = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { ...(status && { status }) };
  const [data, total] = await Promise.all([
    prisma.itinerary.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit) }),
    prisma.itinerary.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getItinerary = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  res.json({ success: true, data: it });
});

export const getItineraryByPackage = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findFirst({ where: { packageId: req.params.packageId } });
  if (!it) throw new AppError('Itinerary not found for this package', 404);
  res.json({ success: true, data: it });
});

export const createItinerary = asyncHandler(async (req, res) => {
  const { days = [], packageId, status = 'draft' } = req.body;
  const meta = computeMeta(days);
  const it = await prisma.itinerary.create({
    data: { days, packageId, status, ...meta, createdById: req.user.id },
  });
  res.status(201).json({ success: true, data: it });
});

export const updateItinerary = asyncHandler(async (req, res) => {
  const existing = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Itinerary not found', 404);
  const { days, ...rest } = req.body;
  const meta = days ? computeMeta(days) : {};
  const it = await prisma.itinerary.update({
    where: { id: req.params.id },
    data: { ...rest, ...(days && { days }), ...meta, metaLastModifiedById: req.user.id },
  });
  res.json({ success: true, data: it });
});

export const deleteItinerary = asyncHandler(async (req, res) => {
  const existing = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Itinerary not found', 404);
  await prisma.itinerary.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Itinerary deleted' });
});

export const addDay = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  const days = Array.isArray(it.days) ? [...it.days, req.body] : [req.body];
  const meta = computeMeta(days);
  const updated = await prisma.itinerary.update({
    where: { id: req.params.id },
    data: { days, ...meta, metaLastModifiedById: req.user.id },
  });
  res.json({ success: true, data: updated });
});

export const updateDay = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  const dayNumber = Number(req.params.dayNumber);
  const days = Array.isArray(it.days) ? it.days.map((d) => (d.dayNumber === dayNumber ? { ...d, ...req.body } : d)) : [];
  const meta = computeMeta(days);
  const updated = await prisma.itinerary.update({
    where: { id: req.params.id },
    data: { days, ...meta, metaLastModifiedById: req.user.id },
  });
  res.json({ success: true, data: updated });
});

export const deleteDay = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  const dayNumber = Number(req.params.dayNumber);
  const days = Array.isArray(it.days) ? it.days.filter((d) => d.dayNumber !== dayNumber) : [];
  const meta = computeMeta(days);
  const updated = await prisma.itinerary.update({
    where: { id: req.params.id },
    data: { days, ...meta, metaLastModifiedById: req.user.id },
  });
  res.json({ success: true, data: updated });
});

export const previewItinerary = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  res.json({ success: true, data: it });
});

export const downloadItineraryPDF = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  res.json({ success: true, message: 'PDF generation not yet implemented', data: it });
});

export const cloneItinerary = asyncHandler(async (req, res) => {
  const it = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
  if (!it) throw new AppError('Itinerary not found', 404);
  const { targetPackageId } = req.body;
  const cloned = await prisma.itinerary.create({
    data: {
      days: it.days,
      packageId: targetPackageId || it.packageId,
      status: 'draft',
      version: 1,
      createdById: req.user.id,
      metaTotalActivities: it.metaTotalActivities,
      metaTotalLocations: it.metaTotalLocations,
      metaTotalPlaces: it.metaTotalPlaces,
      metaBreakfastCount: it.metaBreakfastCount,
      metaLunchCount: it.metaLunchCount,
      metaDinnerCount: it.metaDinnerCount,
    },
  });
  res.status(201).json({ success: true, data: cloned });
});
