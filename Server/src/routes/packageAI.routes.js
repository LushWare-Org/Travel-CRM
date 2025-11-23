/**
 * Package AI Routes
 * Routes for AI-related package operations
 */

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as packageAIController from '../controllers/packageAI.controller.js';

const router = express.Router();

// IMPORTANT: Static routes must come before parameterized routes
// Check AI service status (must be before /:id routes) - only requires auth, no role check
router.get(
  '/ai-status',
  protect,
  packageAIController.checkAIStatus
);

// All other routes require authentication
router.use(protect);

// Generate AI content from title only (no package ID needed) - must be before /:id routes
// Note: Using protect only (no role restriction) to allow all authenticated users
router.post(
  '/generate-from-title',
  packageAIController.generateFromTitle
);

// Generate AI content for a package
router.post(
  '/:id/generate-ai-content',
  authorize('admin', 'salesRep'),
  packageAIController.generateAIContent
);

// Preview AI content without saving
router.get(
  '/:id/preview-ai-content',
  authorize('admin', 'salesRep'),
  packageAIController.previewAIContent
);

// Generate and download AI PDF
router.get(
  '/:id/ai-pdf',
  authorize('admin', 'salesRep'),
  packageAIController.generateAIPDF
);

export default router;

