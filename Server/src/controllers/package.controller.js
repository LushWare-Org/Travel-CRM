/**
 * Package Controller
 * Handles all package-related HTTP requests
 * Implements proper error handling and response formatting
 */

import { validationResult } from 'express-validator';
import packageService from '../services/package.service.js';
import AppError from '../utils/appError.js';
import asyncHandler from '../utils/asyncHandler.js';
import logger from '../config/logger.js';

/**
 * Create a new package
 * POST /api/packages
 */
export const createPackage = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const packageData = req.body;
  const userId = req.user._id;

  // Debug logging for images and days
  console.log('[Package Controller] Creating package');
  console.log('[Package Controller] Images received:', packageData.images);
  console.log('[Package Controller] Images count:', packageData.images?.length || 0);
  console.log('[Package Controller] Days received:', packageData.days);
  console.log('[Package Controller] Days count:', packageData.days?.length || 0);
  if (packageData.days && packageData.days.length > 0) {
    console.log('[Package Controller] First day sample:', JSON.stringify(packageData.days[0], null, 2));
  }

  const newPackage = await packageService.createPackage(packageData, userId);

  console.log('[Package Controller] Package created with images:', newPackage.images);
  console.log('[Package Controller] Saved images count:', newPackage.images?.length || 0);
  console.log('[Package Controller] Package itinerary ID:', newPackage.itinerary);

  res.status(201).json({
    success: true,
    message: 'Package created successfully',
    data: newPackage,
  });
});

/**
 * Get all packages with filtering and pagination
 * GET /api/packages
 * 
 * For public (unauthenticated) requests: Only published packages are returned
 * For salesReps: Only published packages are returned
 * For admins/staff: All packages (or filtered by status param) are returned
 */
export const getPackages = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const query = req.query;
  
  // For public (unauthenticated) requests, only return published packages
  if (!req.user && !query.status) {
    query.status = 'published';
  }
  
  // If user is a salesRep and no explicit status is provided, filter to published only
  if (req.user && req.user.role === 'salesRep' && !query.status) {
    query.status = 'published';
  }

  const result = await packageService.getPackages(query);

  res.status(200).json({
    success: true,
    message: 'Packages retrieved successfully',
    data: result.packages,
    pagination: result.pagination,
  });
});

/**
 * Get a single package by ID
 * GET /api/packages/:id
 */
export const getPackageById = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const pkg = await packageService.getPackageById(id);

  res.status(200).json({
    success: true,
    message: 'Package retrieved successfully',
    data: pkg,
  });
});

/**
 * Update a package
 * PUT /api/packages/:id
 */
export const updatePackage = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const userId = req.user._id;
  const updateData = req.body;

  // Debug logging for images
  console.log('[Package Controller] Updating package:', id);
  console.log('[Package Controller] Images received:', updateData.images);
  console.log('[Package Controller] Images count:', updateData.images?.length || 0);

  const updatedPackage = await packageService.updatePackage(id, updateData, userId);

  console.log('[Package Controller] Package updated with images:', updatedPackage.images);
  console.log('[Package Controller] Saved images count:', updatedPackage.images?.length || 0);

  res.status(200).json({
    success: true,
    message: 'Package updated successfully',
    data: updatedPackage,
  });
});

/**
 * Delete a package
 * DELETE /api/packages/:id
 */
export const deletePackage = asyncHandler(async (req, res, next) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const userId = req.user._id;

  const deletedPackage = await packageService.deletePackage(id, userId);

  res.status(200).json({
    success: true,
    message: 'Package deleted successfully',
    data: deletedPackage,
  });
});

/**
 * Get featured packages
 * GET /api/packages/featured/all
 */
export const getFeaturedPackages = asyncHandler(async (req, res, next) => {
  const limit = req.query.limit || 6;
  const packages = await packageService.getFeaturedPackages(limit);

  res.status(200).json({
    success: true,
    message: 'Featured packages retrieved successfully',
    data: packages,
  });
});

/**
 * Get package statistics
 * GET /api/packages/stats/all
 */
export const getPackageStats = asyncHandler(async (req, res, next) => {
  const stats = await packageService.getPackageStats();

  res.status(200).json({
    success: true,
    message: 'Package statistics retrieved successfully',
    data: stats,
  });
});

/**
 * Search packages
 * GET /api/packages/search/query
 */
export const searchPackages = asyncHandler(async (req, res, next) => {
  const { query } = req.query;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required',
    });
  }

  const packages = await packageService.searchPackages(query);

  res.status(200).json({
    success: true,
    message: 'Search results retrieved successfully',
    data: packages,
  });
});

/**
 * Get packages by category
 * GET /api/packages/category/:category
 */
export const getPackagesByCategory = asyncHandler(async (req, res, next) => {
  const { category } = req.params;
  const limit = req.query.limit || 10;

  const packages = await packageService.getPackagesByCategory(category, limit);

  res.status(200).json({
    success: true,
    message: `Packages in ${category} category retrieved successfully`,
    data: packages,
  });
});

/**
 * Increment package bookings (used when booking is created)
 * POST /api/packages/:id/increment-bookings
 */
export const incrementBookings = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const pkg = await packageService.incrementBookings(id);

  res.status(200).json({
    success: true,
    message: 'Package bookings incremented successfully',
    data: pkg,
  });
});

/**
 * Update package rating (used when review is created/updated)
 * POST /api/packages/:id/update-rating
 */
export const updatePackageRating = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { rating, reviewCount } = req.body;

  if (!rating || !reviewCount) {
    return res.status(400).json({
      success: false,
      message: 'Rating and review count are required',
    });
  }

  const pkg = await packageService.updatePackageRating(id, rating, reviewCount);

  res.status(200).json({
    success: true,
    message: 'Package rating updated successfully',
    data: pkg,
  });
});
