import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { createPackageSchema, updatePackageSchema, packageIdParamSchema } from '../validators/package.schema.js';
import * as packageController from '../controllers/package.controller.js';
import {
  generateAIPackage,
  generateContentFromTitle,
  generateAndSaveAIContent,
  previewAIContent,
} from '../controllers/aiPackage.controller.js';
import { downloadAIPdf } from '../controllers/aiPdf.controller.js';

const router = Router();

// ── Public: static sub-paths must come before /:id ───────────────────────────
router.get('/featured/all',       packageController.getFeaturedPackages);
router.get('/stats/all',          packageController.getPackageStats);
router.get('/search/query',       packageController.searchPackages);
router.get('/category/:category', packageController.getPackagesByCategory);
router.get('/ai-status',          packageController.getAIStatus);

// ── Protected: admin-only multi-segment paths (before /:id catch-all) ────────
router.get('/protected/all', requireAuth, packageController.getPackages);

// ── Public: list and single-package view ─────────────────────────────────────
router.get('/', packageController.getPackages);
router.get('/:id', validateParams(packageIdParamSchema), packageController.getPackageById);

// ── AI: full-package generation ───────────────────────────────────────────────
router.post('/generate-ai',         requireAuth, authorize('admin', 'staff'), generateAIPackage);
router.post('/generate-from-title', requireAuth, authorize('admin', 'staff'), generateContentFromTitle);

// ── Package CRUD ──────────────────────────────────────────────────────────────
router.post('/',      requireAuth, authorize('admin', 'staff'), validateBody(createPackageSchema), packageController.createPackage);
router.put('/:id',    requireAuth, authorize('admin', 'staff'), validateParams(packageIdParamSchema), validateBody(updatePackageSchema), packageController.updatePackage);
router.delete('/:id', requireAuth, authorize('admin'),          validateParams(packageIdParamSchema), packageController.deletePackage);

// ── Per-package AI operations (two-segment paths — no conflict with /:id) ─────
router.post('/:id/generate-ai-content', requireAuth, authorize('admin', 'staff'), generateAndSaveAIContent);
router.get('/:id/preview-ai-content',   requireAuth, authorize('admin', 'staff'), previewAIContent);
router.get('/:id/ai-pdf',               requireAuth,                               downloadAIPdf);

// ── Misc per-package updates ──────────────────────────────────────────────────
router.post('/:id/increment-bookings', requireAuth, validateParams(packageIdParamSchema), packageController.incrementBookings);
router.post('/:id/update-rating',      requireAuth, validateParams(packageIdParamSchema), packageController.updatePackageRating);

export default router;
