import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  createLead, getLeads, getLead, updateLead, deleteLead,
  addRemark, getLeadRemarks, assignLead, unassignLead,
  getLeadsByStatus, getMyLeads, getLeadStats, searchLeads,
  setLeadItinerary, getLeadItinerary, downloadLeadItineraryPDF,
  createWebsiteContactLead,
  handleInternalEvent, draftLead, quoteLead,
  listOptionalFlights, addOptionalFlight, deleteOptionalFlight,
  updateLeadItinerary,
} from '../controllers/lead.controller.js';
import {
  getLeadPricing, calculatePricing, applyPricing,
} from '../controllers/pricing.controller.js';

const router = express.Router();
router.use(extractUser);

// Public
router.post('/website-contact', createWebsiteContactLead);

// Service-to-service webhooks (token-authenticated, not user auth)
router.post('/internal/events', (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_EVENTS_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}, handleInternalEvent);

// Protected
router.use(requireAuth);
router.route('/').post(authorize('admin', 'salesRep'), createLead).get(authorize('admin', 'salesRep'), getLeads);
router.get('/search', authorize('admin', 'salesRep'), searchLeads);
router.get('/my-leads', authorize('salesRep'), getMyLeads);
router.get('/stats', authorize('admin', 'salesRep'), getLeadStats);
router.get('/status/:status', authorize('admin', 'salesRep'), getLeadsByStatus);
router.route('/:id').get(authorize('admin', 'salesRep'), getLead).put(authorize('admin', 'salesRep'), updateLead).delete(authorize('admin'), deleteLead);
router.post('/:id/draft', authorize('admin', 'salesRep'), draftLead);
router.post('/:id/quote', authorize('admin', 'salesRep'), quoteLead);
router.put('/:id/itinerary', authorize('admin', 'salesRep'), updateLeadItinerary);
router.route('/:id/remarks').post(authorize('admin', 'salesRep'), addRemark).get(authorize('admin', 'salesRep'), getLeadRemarks);
router.patch('/:id/assign', authorize('admin'), assignLead);
router.patch('/:id/unassign', authorize('admin'), unassignLead);
router.route('/:id/itinerary').get(authorize('admin', 'salesRep'), getLeadItinerary).put(authorize('admin', 'salesRep'), setLeadItinerary);
router.get('/:id/itinerary/pdf', authorize('admin', 'salesRep'), downloadLeadItineraryPDF);
router.route('/:id/flights').get(authorize('admin', 'salesRep'), listOptionalFlights).post(authorize('admin', 'salesRep'), addOptionalFlight);
router.delete('/:id/flights/:flightId', authorize('admin', 'salesRep'), deleteOptionalFlight);
router.get('/:id/pricing', authorize('admin', 'salesRep'), getLeadPricing);
router.post('/:id/pricing/calculate', authorize('admin', 'salesRep'), calculatePricing);
router.post('/:id/pricing/apply', authorize('admin', 'salesRep'), applyPricing);
router.put('/:id/pricing', authorize('admin', 'salesRep'), applyPricing);

export default router;
