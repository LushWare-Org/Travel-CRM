import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateParams, validateQuery, validateBody } from '../middleware/validate.js';
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';
import { publicIdParamSchema, deleteMultipleImagesSchema, optimizeQuerySchema } from '../validators/upload.schema.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = Router();

router.get('/optimize', validateQuery(optimizeQuerySchema), uploadController.getOptimizedUrl);
router.use(requireAuth);
router.post('/single', uploadSingle('image'), uploadController.uploadSingle);
router.post('/multiple', uploadMultiple('images', 10), uploadController.uploadMultiple);
router.post('/package', uploadMultiple('images', 10), uploadController.uploadPackageImages);
router.post('/itinerary', uploadMultiple('images', 10), uploadController.uploadItineraryImages);
router.post('/profile', uploadSingle('image'), uploadController.uploadProfileImage);
router.post('/delete-multiple', validateBody(deleteMultipleImagesSchema), uploadController.deleteMultipleImages);
router.delete('/:publicId', validateParams(publicIdParamSchema), uploadController.deleteImage);

export default router;
