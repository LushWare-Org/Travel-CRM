import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  createWebsiteCustomizedPackage,
  fetchMyCustomizedPackages,
  getCustomizedPackageById,
  updateCustomizedPackage,
} from '../controllers/customizedPackage.controller.js';

const router = express.Router();
router.use(extractUser);

// Public
router.post('/website', createWebsiteCustomizedPackage);

// Protected
router.use(requireAuth);
router.get('/my-requests', fetchMyCustomizedPackages);
router.get('/:id', authorize('admin', 'salesRep'), getCustomizedPackageById);
router.put('/:id', authorize('admin', 'salesRep'), updateCustomizedPackage);

export default router;
