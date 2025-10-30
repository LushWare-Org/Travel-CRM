/**
 * Upload Controller
 * Handles image upload requests
 */

import * as cloudinaryService from '../services/cloudinary.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/appError.js';

/**
 * Upload single image
 * @route POST /api/v1/upload/single
 * @access Private
 */
export const uploadSingle = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const preset = req.body.preset || 'default';
  const result = await cloudinaryService.uploadWithPreset(req.file.path, preset);

  res.status(200).json({
    status: 'success',
    data: {
      image: result,
    },
  });
});

/**
 * Upload multiple images
 * @route POST /api/v1/upload/multiple
 * @access Private
 */
export const uploadMultiple = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  const preset = req.body.preset || 'default';
  const filePaths = req.files.map((file) => file.path);

  const results = await Promise.all(
    filePaths.map((filePath) =>
      cloudinaryService.uploadWithPreset(filePath, preset)
    )
  );

  res.status(200).json({
    status: 'success',
    data: {
      images: results,
      count: results.length,
    },
  });
});

/**
 * Upload package images
 * @route POST /api/v1/upload/package
 * @access Private
 */
export const uploadPackageImages = asyncHandler(async (req, res, next) => {
  console.log('[Upload Controller] Package images upload request received');
  console.log('[Upload Controller] Files:', req.files?.length || 0);
  console.log('[Upload Controller] Body:', req.body);

  if (!req.files || req.files.length === 0) {
    console.log('[Upload Controller] No files uploaded');
    return next(new AppError('Please upload at least one image', 400));
  }

  const filePaths = req.files.map((file) => {
    console.log('[Upload Controller] File path:', file.path);
    return file.path;
  });

  try {
    const results = await Promise.all(
      filePaths.map((filePath) =>
        cloudinaryService.uploadWithPreset(filePath, 'package')
      )
    );

    console.log('[Upload Controller] Upload successful, count:', results.length);

    res.status(200).json({
      status: 'success',
      data: {
        images: results,
        count: results.length,
      },
    });
  } catch (error) {
    console.error('[Upload Controller] Upload failed:', error);
    return next(error);
  }
});

/**
 * Upload itinerary images
 * @route POST /api/v1/upload/itinerary
 * @access Private
 */
export const uploadItineraryImages = asyncHandler(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError('Please upload at least one image', 400));
  }

  const filePaths = req.files.map((file) => file.path);
  const results = await Promise.all(
    filePaths.map((filePath) =>
      cloudinaryService.uploadWithPreset(filePath, 'itinerary')
    )
  );

  res.status(200).json({
    status: 'success',
    data: {
      images: results,
      count: results.length,
    },
  });
});

/**
 * Upload profile image
 * @route POST /api/v1/upload/profile
 * @access Private
 */
export const uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const result = await cloudinaryService.uploadWithPreset(
    req.file.path,
    'profile'
  );

  res.status(200).json({
    status: 'success',
    data: {
      image: result,
    },
  });
});

/**
 * Delete image
 * @route DELETE /api/v1/upload/:publicId
 * @access Private
 */
export const deleteImage = asyncHandler(async (req, res, next) => {
  const { publicId } = req.params;

  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  // Decode the public ID (it might be URL encoded)
  const decodedPublicId = decodeURIComponent(publicId);

  await cloudinaryService.deleteImage(decodedPublicId);

  res.status(200).json({
    status: 'success',
    message: 'Image deleted successfully',
  });
});

/**
 * Delete multiple images
 * @route POST /api/v1/upload/delete-multiple
 * @access Private
 */
export const deleteMultipleImages = asyncHandler(async (req, res, next) => {
  const { publicIds } = req.body;

  if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
    return next(new AppError('Please provide an array of public IDs', 400));
  }

  await cloudinaryService.deleteMultipleImages(publicIds);

  res.status(200).json({
    status: 'success',
    message: 'Images deleted successfully',
    count: publicIds.length,
  });
});

/**
 * Get optimized image URL
 * @route GET /api/v1/upload/optimize
 * @access Public
 */
export const getOptimizedUrl = asyncHandler(async (req, res, next) => {
  const { publicId, width, height, quality, format } = req.query;

  if (!publicId) {
    return next(new AppError('Public ID is required', 400));
  }

  const url = cloudinaryService.getOptimizedImageUrl(publicId, {
    width: width ? parseInt(width, 10) : undefined,
    height: height ? parseInt(height, 10) : undefined,
    quality: quality || 'auto',
    format: format || 'auto',
  });

  res.status(200).json({
    status: 'success',
    data: {
      url,
    },
  });
});

export default {
  uploadSingle,
  uploadMultiple,
  uploadPackageImages,
  uploadItineraryImages,
  uploadProfileImage,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
};
