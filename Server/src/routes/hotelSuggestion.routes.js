import express from 'express';
import { protect } from '../middleware/auth.js';
import { suggestHotels } from '../controllers/hotelSuggestion.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/suggest', suggestHotels);

export default router;
