import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as packageController from '../controllers/package.controller.js';
import { generateAIPackage } from '../controllers/aiPackage.controller.js';

const router = Router();

// Public
router.get('/featured/all', packageController.getFeaturedPackages);
router.get('/stats/all', packageController.getPackageStats);
router.get('/search/query', packageController.searchPackages);
router.get('/category/:category', packageController.getPackagesByCategory);
router.get('/protected/all', requireAuth, packageController.getPackages);
router.get('/:id', packageController.getPackageById);
router.get('/', packageController.getPackages);

// Protected
router.post('/generate-ai', requireAuth, authorize('admin', 'staff'), generateAIPackage);
router.post('/', requireAuth, authorize('admin', 'staff'), packageController.createPackage);
router.put('/:id', requireAuth, authorize('admin', 'staff'), packageController.updatePackage);
router.delete('/:id', requireAuth, authorize('admin'), packageController.deletePackage);
router.post('/:id/increment-bookings', requireAuth, packageController.incrementBookings);
router.post('/:id/update-rating', requireAuth, packageController.updatePackageRating);

export default router;
