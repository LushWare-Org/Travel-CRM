import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createReview,
  getPackageReviews,
  getReviewStats,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';

const router = express.Router();

router.get('/package/:id', getPackageReviews);
router.get('/package/:id/stats', getReviewStats);
router.post('/package/:id', createReview);

router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

export default router;
