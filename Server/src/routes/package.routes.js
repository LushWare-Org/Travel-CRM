import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createPackage,
  getPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  getFeaturedPackages,
  getPackageStats,
  searchPackages,
  getPackagesByCategory,
  incrementBookings,
  updatePackageRating,
} from '../controllers/package.controller.js';
import {
  createPackageValidator,
  updatePackageValidator,
  packageIdValidator,
  getPackagesValidator,
} from '../validators/package.validator.js';

const router = express.Router();

/**
 * Public Routes
 */
// Get all packages with filtering and pagination
router.get('/', getPackagesValidator, getPackages);

// Get featured packages
router.get('/featured/all', getFeaturedPackages);

// Get package statistics
router.get('/stats/all', getPackageStats);

// Search packages
router.get('/search/query', searchPackages);

// Get packages by category
router.get('/category/:category', getPackagesByCategory);

// Get a specific package
router.get('/:id', packageIdValidator, getPackageById);

/**
 * Protected Routes (Require Authentication)
 */
// Create a new package
router.post('/', protect, authorize('admin', 'staff'), createPackageValidator, createPackage);

// Update a package
router.put('/:id', protect, authorize('admin', 'staff'), updatePackageValidator, updatePackage);

// Delete a package
router.delete('/:id', protect, authorize('admin'), packageIdValidator, deletePackage);

// Increment bookings for a package
router.post('/:id/increment-bookings', protect, incrementBookings);

// Update package rating
router.post('/:id/update-rating', protect, updatePackageRating);

export default router;
