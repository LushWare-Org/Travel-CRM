import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { generateAIPackage } from '../controllers/aiPackageGeneration.controller.js';
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
// Get featured packages
router.get('/featured/all', getFeaturedPackages);

// Get package statistics
router.get('/stats/all', getPackageStats);

// Search packages
router.get('/search/query', searchPackages);

// Get packages by category
router.get('/category/:category', getPackagesByCategory);

/**
 * Protected Routes (Require Authentication)
 * Must be defined BEFORE the generic /:id route
 */

// Get packages for authenticated users (including salesReps with read-only access)
// SuperAdmins and admins with manage_packages permission can see all packages
// SalesReps automatically see only published packages
router.get('/protected/all', protect, getPackagesValidator, getPackages);

/**
 * Individual Package Routes
 */

// Get a specific package
router.get('/:id', packageIdValidator, getPackageById);

// Get all packages with filtering and pagination (public endpoint)
router.get('/', getPackagesValidator, getPackages);

/**
 * Protected Routes (Admin/Staff only)
 */

// Generate AI package (admin and staff only)
router.post('/generate-ai', protect, authorize('admin', 'staff'), generateAIPackage);

// Create a new package (admin and staff only)
router.post('/', protect, authorize('admin', 'staff'), createPackageValidator, createPackage);

// Update a package (admin and staff only)
router.put('/:id', protect, authorize('admin', 'staff'), updatePackageValidator, updatePackage);

// Delete a package (admin only)
router.delete('/:id', protect, authorize('admin'), packageIdValidator, deletePackage);

// Increment bookings for a package
router.post('/:id/increment-bookings', protect, incrementBookings);

// Update package rating
router.post('/:id/update-rating', protect, updatePackageRating);

export default router;
