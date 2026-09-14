import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import { listCallsForLead } from '../controllers/call.controller.js';

const router = express.Router();

router.use(extractUser, requireAuth);

router.get('/leads/:leadId/calls', authorize('admin', 'salesRep', 'superAdmin'), listCallsForLead);

export default router;
