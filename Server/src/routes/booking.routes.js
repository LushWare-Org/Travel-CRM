import express from 'express';
import { createWebsiteBooking } from '../controllers/booking.controller.js';

const router = express.Router();

// Public booking endpoint for website enquiries
router.post('/website', createWebsiteBooking);

export default router;
