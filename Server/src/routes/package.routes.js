import express from 'express';
import {
  getPackages,
  getPackage,
  getPackagesByCategory,
  getFeaturedPackages,
  searchPackages
} from '../controllers/package.controller.js';
// import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getPackages);
router.get('/featured', getFeaturedPackages);
router.get('/search', searchPackages);
router.get('/category/:category', getPackagesByCategory);
router.get('/:id', getPackage);

// Protected routes (for admin/staff)
// router.post('/', protect, authorize('admin', 'staff'), createPackage);
// router.put('/:id', protect, authorize('admin', 'staff'), updatePackage);
// router.delete('/:id', protect, authorize('admin'), deletePackage);

export default router;
