import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { suggestHotels } from '../controllers/hotelSuggestion.controller.js';

const router = Router();

router.post('/suggest', requireAuth, suggestHotels);

export default router;
