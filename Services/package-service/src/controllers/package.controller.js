import slugify from 'slugify';
import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

const packageInclude = {
  images: { orderBy: { order: 'asc' } },
  reviews: { where: { isApproved: true }, take: 5, orderBy: { createdAt: 'desc' } },
  itinerary: true,
};

const buildPackageWhere = (query) => {
  const { category, destination, minPrice, maxPrice, isActive, status, isFeatured, search } = query;
  const where = {};
  if (category) where.category = category;
  if (destination) where.destination = { contains: destination, mode: 'insensitive' };
  if (minPrice || maxPrice) where.price = { ...(minPrice && { gte: Number(minPrice) }), ...(maxPrice && { lte: Number(maxPrice) }) };
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (status) where.status = status;
  if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } },
    { destination: { contains: search, mode: 'insensitive' } },
  ];
  return where;
};

export const getPackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, sort = '-createdAt', ...rest } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = buildPackageWhere(rest);

  const isProtected = req.user && ['admin', 'salesRep'].includes(req.user.role);
  if (!isProtected) {
    where.isActive = true;
    where.status = 'published';
  }

  const orderBy = sort.startsWith('-')
    ? { [sort.slice(1)]: 'desc' }
    : { [sort]: 'asc' };

  const [data, total] = await Promise.all([
    prisma.package.findMany({ where, include: packageInclude, orderBy, skip, take: Number(limit) }),
    prisma.package.count({ where }),
  ]);
  res.json({ success: true, count: data.length, total, data });
});

export const getPackageById = asyncHandler(async (req, res) => {
  const pkg = await prisma.package.findUnique({
    where: { id: req.params.id },
    include: { ...packageInclude, reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' } } },
  });
  if (!pkg) throw new AppError('Package not found', 404);
  await prisma.package.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
  res.json({ success: true, data: pkg });
});

export const getFeaturedPackages = asyncHandler(async (req, res) => {
  const data = await prisma.package.findMany({
    where: { isFeatured: true, isActive: true, status: 'published' },
    include: packageInclude,
    orderBy: { rating: 'desc' },
    take: 12,
  });
  res.json({ success: true, data });
});

export const getPackageStats = asyncHandler(async (req, res) => {
  const [total, active, featured, published] = await Promise.all([
    prisma.package.count(),
    prisma.package.count({ where: { isActive: true } }),
    prisma.package.count({ where: { isFeatured: true } }),
    prisma.package.count({ where: { status: 'published' } }),
  ]);
  const avgRating = await prisma.package.aggregate({ _avg: { rating: true } });
  res.json({ success: true, data: { total, active, featured, published, avgRating: avgRating._avg.rating || 0 } });
});

export const searchPackages = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;
  if (!q) throw new AppError('Search query is required', 400);
  const data = await prisma.package.findMany({
    where: {
      isActive: true, status: 'published',
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: packageInclude,
    take: Number(limit),
    orderBy: { rating: 'desc' },
  });
  res.json({ success: true, data });
});

export const getPackagesByCategory = asyncHandler(async (req, res) => {
  const data = await prisma.package.findMany({
    where: { category: req.params.category, isActive: true, status: 'published' },
    include: packageInclude,
    orderBy: { rating: 'desc' },
  });
  res.json({ success: true, data });
});

export const createPackage = asyncHandler(async (req, res) => {
  const { images = [], ...body } = req.body;
  if (body.name && !body.slug) {
    body.slug = slugify(body.name, { lower: true, strict: true });
  }
  body.createdById = req.user.id;

  const pkg = await prisma.package.create({
    data: {
      ...body,
      images: { create: images.map((img, idx) => ({ ...img, order: idx })) },
    },
    include: packageInclude,
  });
  res.status(201).json({ success: true, data: pkg });
});

export const updatePackage = asyncHandler(async (req, res) => {
  const existing = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Package not found', 404);

  const { images, ...body } = req.body;
  if (body.name && body.name !== existing.name && !body.slug) {
    body.slug = slugify(body.name, { lower: true, strict: true });
  }

  const data = { ...body };
  if (images) {
    await prisma.packageImage.deleteMany({ where: { packageId: req.params.id } });
    data.images = { create: images.map((img, idx) => ({ ...img, order: idx })) };
  }

  const pkg = await prisma.package.update({ where: { id: req.params.id }, data, include: packageInclude });
  res.json({ success: true, data: pkg });
});

export const deletePackage = asyncHandler(async (req, res) => {
  const existing = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Package not found', 404);
  await prisma.package.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Package deleted' });
});

export const incrementBookings = asyncHandler(async (req, res) => {
  const pkg = await prisma.package.update({
    where: { id: req.params.id },
    data: { bookings: { increment: 1 } },
  });
  res.json({ success: true, data: pkg });
});

export const updatePackageRating = asyncHandler(async (req, res) => {
  const { rating, numReviews } = req.body;
  const pkg = await prisma.package.update({
    where: { id: req.params.id },
    data: { ...(rating !== undefined && { rating }), ...(numReviews !== undefined && { numReviews }) },
  });
  res.json({ success: true, data: pkg });
});
