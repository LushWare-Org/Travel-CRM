import asyncHandler from 'express-async-handler';
import Review from '../models/review.model.js';
import Package from '../models/package.model.js';

export const createReview = asyncHandler(async (req, res) => {
  const { id: packageId } = req.params;
  const { name, email, rating, comment } = req.body;

  // Validate required fields
  if (!name || !rating || !comment) {
    res.status(400);
    throw new Error('Please provide name, rating, and comment');
  }

  if (rating < 1 || rating > 5) {
    res.status(400);
    throw new Error('Rating must be between 1 and 5');
  }

  const pkg = await Package.findById(packageId);
  if (!pkg) {
    res.status(404);
    throw new Error('Package not found');
  }

  // Create review
  const review = new Review({
    package: packageId,
    author: req.user?._id || null,
    name: name.trim(),
    email: email?.trim(),
    rating: Math.round(rating),
    comment: comment.trim(),
    isApproved: true,
  });

  await review.save();
  const allReviews = await Review.find({ package: packageId, isApproved: true });
  const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = (totalRating / allReviews.length).toFixed(1);

  pkg.rating = parseFloat(avgRating);
  pkg.numReviews = allReviews.length;
  await pkg.save();
  await review.populate('author', 'name');

  res.status(201).json({
    success: true,
    data: {
      id: review._id,
      user_name: review.name,
      rating: review.rating,
      comment: review.comment,
      created_at: review.createdAt,
      author: review.author,
    },
  });
});

export const getPackageReviews = asyncHandler(async (req, res) => {
  const { id: packageId } = req.params;
  const { limit = 10, page = 1 } = req.query;

  const pkg = await Package.findById(packageId);
  if (!pkg) {
    res.status(404);
    throw new Error('Package not found');
  }

  // Get reviews with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const reviews = await Review.find({ package: packageId, isApproved: true })
    .populate('author', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const totalReviews = await Review.countDocuments({
    package: packageId,
    isApproved: true,
  });

  const formattedReviews = reviews.map((review) => ({
    id: review._id,
    user_name: review.name,
    rating: review.rating,
    comment: review.comment,
    created_at: review.createdAt,
    author: review.author,
  }));

  res.status(200).json({
    success: true,
    data: formattedReviews,
    pagination: {
      total: totalReviews,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(totalReviews / parseInt(limit)),
    },
  });
});

export const getReviewStats = asyncHandler(async (req, res) => {
  const { id: packageId } = req.params;

  const pkg = await Package.findById(packageId);
  if (!pkg) {
    res.status(404);
    throw new Error('Package not found');
  }

  const reviews = await Review.find({ package: packageId, isApproved: true });

  const stats = {
    totalReviews: reviews.length,
    avgRating: reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : 0,
    distribution: {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    },
  };

  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const updateReview = asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;
  const { rating, comment } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check authorization
  if (review.author?.toString() !== req.user?._id?.toString() && req.user?.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to update this review');
  }

  if (rating) {
    if (rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating must be between 1 and 5');
    }
    review.rating = Math.round(rating);
  }

  if (comment) {
    review.comment = comment.trim();
  }

  await review.save();

  // Update package rating
  const packageId = review.package;
  const allReviews = await Review.find({ package: packageId, isApproved: true });
  const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = (totalRating / allReviews.length).toFixed(1);

  const pkg = await Package.findById(packageId);
  pkg.rating = parseFloat(avgRating);
  pkg.numReviews = allReviews.length;
  await pkg.save();

  res.status(200).json({
    success: true,
    data: review,
  });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const { id: reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check authorization
  if (review.author?.toString() !== req.user?._id?.toString() && req.user?.role !== 'admin') {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  const packageId = review.package;
  await Review.findByIdAndDelete(reviewId);

  // Update package rating
  const allReviews = await Review.find({ package: packageId, isApproved: true });
  const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = allReviews.length > 0 ? (totalRating / allReviews.length).toFixed(1) : 0;

  const pkg = await Package.findById(packageId);
  pkg.rating = parseFloat(avgRating);
  pkg.numReviews = allReviews.length;
  await pkg.save();

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully',
  });
});
