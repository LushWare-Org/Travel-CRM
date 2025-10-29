import express from 'express';
import {
  createLead,
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addRemark,
  getLeadRemarks,
  assignLead,
  unassignLead,
  getLeadsByStatus,
  getMyLeads,
  getLeadStats,
  searchLeads,
} from '../controllers/lead.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Lead routes
router.route('/').post(authorize('admin', 'salesRep'), createLead).get(authorize('admin', 'salesRep'), getLeads);

router
  .route('/:id')
  .get(authorize('admin', 'salesRep'), getLead)
  .put(authorize('admin', 'salesRep'), updateLead)
  .delete(authorize('admin'), deleteLead);

// Remarks routes
router.route('/:id/remarks').post(authorize('admin', 'salesRep'), addRemark).get(authorize('admin', 'salesRep'), getLeadRemarks);

// Assignment routes
router.route('/:id/assign').patch(authorize('admin'), assignLead);
router.route('/:id/unassign').patch(authorize('admin'), unassignLead);

// Status routes
router.route('/status/:status').get(authorize('admin', 'salesRep'), getLeadsByStatus);

// My leads (assigned to current user)
router.route('/my-leads').get(authorize('salesRep'), getMyLeads);

// Stats (admin only)
router.route('/stats').get(authorize('admin'), getLeadStats);

// Search
router.route('/search').get(authorize('admin', 'salesRep'), searchLeads);

export default router;
