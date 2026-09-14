import express from 'express';
import { requireRetellSignature } from '../middleware/retellSignature.js';
import { handleInboundCall, handlePostCall } from '../controllers/webhook.controller.js';

const router = express.Router();

router.post('/inbound', requireRetellSignature, handleInboundCall);
router.post('/post-call', requireRetellSignature, handlePostCall);

export default router;
