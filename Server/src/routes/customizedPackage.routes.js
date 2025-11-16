import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createWebsiteCustomizedPackage,
  getCustomizedPackageById,
  updateCustomizedPackage,
} from '../controllers/customizedPackage.controller.js';

const router = express.Router();

// Public endpoint for website customization requests
router.post('/website', createWebsiteCustomizedPackage);

// All other routes require authentication
router.use(protect);

router
  .route('/:id')
  .get(authorize('admin', 'salesRep'), getCustomizedPackageById)
  .put(authorize('admin', 'salesRep'), updateCustomizedPackage);

export default router;
