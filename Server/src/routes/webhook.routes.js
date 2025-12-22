import express from 'express';
import {
  verifyWebhook,
  handleLeadWebhook,
} from '../controllers/facebookWebhook.controller.js';

const router = express.Router();

// Facebook webhook routes
// Note: These routes are public (no authentication) because Facebook calls them directly
// Security is handled via webhook signature verification

// GET: Webhook verification (Facebook sends this to verify your endpoint)
// Uses controller function to read verify token from environment variables
router.get('/facebook', verifyWebhook);

// POST: Receive lead data (Facebook sends this when a lead is generated)
router.post('/facebook', handleLeadWebhook);

export default router;


