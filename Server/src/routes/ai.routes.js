import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  recommendPackages,
  comparePackages,
  generateDocuments,
  getAgentStatus,
  overrideAgent,
  getAgentLogs,
  getEventQueue,
  publishEvent,
  submitFollowUpFeedback,
} from '../controllers/ai.controller.js';

const router = express.Router();

router.use(protect);

router.post('/recommend-packages', authorize('admin', 'salesRep'), recommendPackages);
router.post('/compare-packages', authorize('admin', 'salesRep'), comparePackages);
router.post('/generate-documents', authorize('admin', 'salesRep'), generateDocuments);
router.post('/followup-feedback', authorize('admin', 'salesRep'), submitFollowUpFeedback);

router.get('/agents/status', authorize('admin'), getAgentStatus);
router.post('/agents/override', authorize('admin'), overrideAgent);
router.get('/logs', authorize('admin'), getAgentLogs);
router.get('/events', authorize('admin'), getEventQueue);
router.post('/events/publish', authorize('admin'), publishEvent);

export default router;
