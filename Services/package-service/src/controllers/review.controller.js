import prisma from '../db/client.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

export const getPackageReviews = asyncHandler(async (req, res) => {
  const data = await prisma.review.findMany({
    where: { packageId: req.params.id, isApproved: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data });
});

export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await prisma.review.aggregate({
    where: { packageId: req.params.id, isApproved: true },
    _avg: { rating: true },
    _count: { id: true },
  });
  res.json({ success: true, data: { avgRating: stats._avg.rating || 0, count: stats._count.id || 0 } });
});

export const createReview = asyncHandler(async (req, res) => {
  const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
  if (!pkg) throw new AppError('Package not found', 404);

  const review = await prisma.review.create({
    data: {
      ...req.body,
      packageId: req.params.id,
      authorId: req.user?.id || null,
    },
  });

  // Recalculate package rating
  const stats = await prisma.review.aggregate({
    where: { packageId: req.params.id, isApproved: true },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.package.update({
    where: { id: req.params.id },
    data: { rating: stats._avg.rating || 0, numReviews: stats._count.id || 0 },
  });

  res.status(201).json({ success: true, data: review });
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw new AppError('Review not found', 404);
  if (review.authorId !== req.user.id && !req.user.isSuperAdmin && req.user.role !== 'admin')
    throw new AppError('Not authorized to update this review', 403);

  const updated = await prisma.review.update({ where: { id: req.params.id }, data: req.body });
  res.json({ success: true, data: updated });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } });
  if (!review) throw new AppError('Review not found', 404);
  if (review.authorId !== req.user.id && !req.user.isSuperAdmin && req.user.role !== 'admin')
    throw new AppError('Not authorized to delete this review', 403);

  await prisma.review.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Review deleted' });
});
