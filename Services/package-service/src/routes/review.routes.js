import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

router.get('/package/:id', reviewController.getPackageReviews);
router.get('/package/:id/stats', reviewController.getReviewStats);
router.post('/package/:id', reviewController.createReview);
router.put('/:id', requireAuth, reviewController.updateReview);
router.delete('/:id', requireAuth, reviewController.deleteReview);

export default router;
