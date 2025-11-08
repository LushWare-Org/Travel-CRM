import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getCustomizedPackageById,
  updateCustomizedPackage,
} from '../controllers/customizedPackage.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get customized package by ID
router
  .route('/:id')
  .get(authorize('admin', 'salesRep'), getCustomizedPackageById)
  .put(authorize('admin', 'salesRep'), updateCustomizedPackage);

export default router;

