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
  setLeadItinerary,
  getLeadItinerary,
  downloadLeadItineraryPDF,
  createWebsiteContactLead,
} from '../controllers/lead.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route (no authentication required)
router.post('/website-contact', createWebsiteContactLead);

// All routes below require authentication
router.use(protect);

// Lead routes
router.route('/').post(authorize('admin', 'salesRep'), createLead).get(authorize('admin', 'salesRep'), getLeads);

// Static paths MUST be above /:id
// Search
router.route('/search').get(authorize('admin', 'salesRep'), searchLeads);

// My leads (assigned to current user)
router.route('/my-leads').get(authorize('salesRep'), getMyLeads);

// Stats
router.route('/stats').get(authorize('admin', 'salesRep'), getLeadStats);

// Status routes
router.route('/status/:status').get(authorize('admin', 'salesRep'), getLeadsByStatus);

// Parameterized tracking routes below:
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

// Itinerary routes
router.route('/:id/itinerary')
  .get(authorize('admin', 'salesRep'), getLeadItinerary)
  .put(authorize('admin', 'salesRep'), setLeadItinerary);

router.route('/:id/itinerary/pdf')
  .get(authorize('admin', 'salesRep'), downloadLeadItineraryPDF);

export default router;
