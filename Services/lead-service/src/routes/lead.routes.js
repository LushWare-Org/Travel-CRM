import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  createLead, getLeads, getLead, updateLead, deleteLead,
  addRemark, getLeadRemarks, assignLead, unassignLead,
  getLeadsByStatus, getMyLeads, getLeadStats, searchLeads,
  setLeadItinerary, getLeadItinerary, downloadLeadItineraryPDF,
  createWebsiteContactLead,
} from '../controllers/lead.controller.js';

const router = express.Router();
router.use(extractUser);

// Public
router.post('/website-contact', createWebsiteContactLead);

// Protected
router.use(requireAuth);
router.route('/').post(authorize('admin', 'salesRep'), createLead).get(authorize('admin', 'salesRep'), getLeads);
router.get('/search', authorize('admin', 'salesRep'), searchLeads);
router.get('/my-leads', authorize('salesRep'), getMyLeads);
router.get('/stats', authorize('admin', 'salesRep'), getLeadStats);
router.get('/status/:status', authorize('admin', 'salesRep'), getLeadsByStatus);
router.route('/:id').get(authorize('admin', 'salesRep'), getLead).put(authorize('admin', 'salesRep'), updateLead).delete(authorize('admin'), deleteLead);
router.route('/:id/remarks').post(authorize('admin', 'salesRep'), addRemark).get(authorize('admin', 'salesRep'), getLeadRemarks);
router.patch('/:id/assign', authorize('admin'), assignLead);
router.patch('/:id/unassign', authorize('admin'), unassignLead);
router.route('/:id/itinerary').get(authorize('admin', 'salesRep'), getLeadItinerary).put(authorize('admin', 'salesRep'), setLeadItinerary);
router.get('/:id/itinerary/pdf', authorize('admin', 'salesRep'), downloadLeadItineraryPDF);

// Pricing sub-routes (mergeParams: true handles :id from parent)
import pricingRoutes from './pricing.routes.js';
router.use('/:id/pricing', pricingRoutes);

export default router;
