/**
 * Upload Routes
 * Routes for image upload operations
 */

import express from 'express';
import * as uploadController from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

// Protect all routes (require authentication)
router.use(protect);

/**
 * @route   POST /api/v1/upload/single
 * @desc    Upload single image
 * @access  Private
 */
router.post('/single', uploadSingle('image'), uploadController.uploadSingle);

/**
 * @route   POST /api/v1/upload/multiple
 * @desc    Upload multiple images (max 10)
 * @access  Private
 */
router.post(
  '/multiple',
  uploadMultiple('images', 10),
  uploadController.uploadMultiple,
);

/**
 * @route   POST /api/v1/upload/package
 * @desc    Upload package images with optimizations
 * @access  Private
 */
router.post(
  '/package',
  uploadMultiple('images', 10),
  uploadController.uploadPackageImages,
);

/**
 * @route   POST /api/v1/upload/itinerary
 * @desc    Upload itinerary images with optimizations
 * @access  Private
 */
router.post(
  '/itinerary',
  uploadMultiple('images', 10),
  uploadController.uploadItineraryImages,
);

/**
 * @route   POST /api/v1/upload/profile
 * @desc    Upload profile image
 * @access  Private
 */
router.post(
  '/profile',
  uploadSingle('image'),
  uploadController.uploadProfileImage,
);

/**
 * @route   DELETE /api/v1/upload?publicId=folder/image
 * @desc    Delete single image (using query param to support IDs with slashes)
 * @access  Private
 */
router.delete('/', uploadController.deleteImage);

/**
 * @route   POST /api/v1/upload/delete-multiple
 * @desc    Delete multiple images
 * @access  Private
 */
router.post('/delete-multiple', uploadController.deleteMultipleImages);

/**
 * @route   GET /api/v1/upload/optimize
 * @desc    Get optimized image URL
 * @access  Public
 */
router.get('/optimize', uploadController.getOptimizedUrl);

export default router;
