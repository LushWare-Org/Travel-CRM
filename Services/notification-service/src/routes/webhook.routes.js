import { Router } from 'express';
import { verifyWebhook, handleLeadWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.get('/facebook', verifyWebhook);
router.post('/facebook', handleLeadWebhook);

export default router;
