import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  applyForPosition, getCareerApplications, getApplicationDetails,
  updateApplicationStatus, getCareerStats, deleteApplication, searchApplications,
} from '../controllers/career.controller.js';

const router = express.Router();
router.use(extractUser);

router.post('/apply', applyForPosition);

router.use(requireAuth, authorize('admin', 'superAdmin'));
router.get('/submissions', getCareerApplications);
router.get('/submissions/search', searchApplications);
router.get('/stats', getCareerStats);
router.get('/submissions/:id', getApplicationDetails);
router.patch('/submissions/:id', updateApplicationStatus);
router.delete('/submissions/:id', deleteApplication);

export default router;
