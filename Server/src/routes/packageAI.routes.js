/**
 * Package AI Routes
 * Routes for AI-related package operations
 */

import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as packageAIController from '../controllers/packageAI.controller.js';
import { aiLimiter, apiLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// IMPORTANT: Static routes must come before parameterized routes
// Check AI service status (must be before /:id routes) - only requires auth, no role check
router.get(
  '/ai-status',
  protect,
  packageAIController.checkAIStatus
);

// Generate AI content from title only (no package ID needed) - must be before /:id routes
// Note: Using protect only (no role restriction) to allow all authenticated users
router.post(
  '/generate-from-title',
  protect,
  aiLimiter,
  packageAIController.generateFromTitle
);

// Generate AI content for a package
router.post(
  '/:id/generate-ai-content',
  protect,
  authorize('admin', 'salesRep'),
  aiLimiter,
  packageAIController.generateAIContent
);

// Preview AI content without saving
router.get(
  '/:id/preview-ai-content',
  protect,
  authorize('admin', 'salesRep'),
  apiLimiter,
  packageAIController.previewAIContent
);

// Generate and download AI PDF
router.get(
  '/:id/ai-pdf',
  protect,
  authorize('admin', 'salesRep'),
  apiLimiter,
  packageAIController.generateAIPDF
);

export default router;

