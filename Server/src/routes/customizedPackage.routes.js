import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getCustomizedPackageById } from '../controllers/customizedPackage.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get customized package by ID
router.get('/:id', authorize('admin', 'salesRep'), getCustomizedPackageById);

export default router;

