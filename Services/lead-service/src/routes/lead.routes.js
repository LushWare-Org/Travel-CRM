import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  createLead, getLeads, getLead, updateLead, deleteLead,
  addRemark, getLeadRemarks, assignLead, unassignLead,
  getLeadsByStatus, getMyLeads, getLeadStats, searchLeads,
  downloadLeadItineraryPDF,
  createWebsiteContactLead,
  handleInternalEvent, draftLead,
} from '../controllers/lead.controller.js';
import {
  listPackageSelections, getPackageSelection, createPackageSelection, updatePackageSelection, deletePackageSelection,
  updateSelectionItinerary, refreshPackageSelection, quotePackageSelection,
  getSelectionPricing, calculateSelectionPricing, applySelectionPricing,
  listSelectionFlights, addSelectionFlight, deleteSelectionFlight,
} from '../controllers/lead-package-selection.controller.js';
import { previewPricing } from '../controllers/pricing.controller.js';

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
router.post('/pricing/preview', authorize('admin', 'salesRep'), previewPricing);
router.route('/').post(authorize('admin', 'salesRep'), createLead).get(authorize('admin', 'salesRep'), getLeads);
router.get('/search', authorize('admin', 'salesRep'), searchLeads);
router.get('/my-leads', authorize('salesRep'), getMyLeads);
router.get('/stats', authorize('admin', 'salesRep'), getLeadStats);
router.get('/status/:status', authorize('admin', 'salesRep'), getLeadsByStatus);
router.route('/:id').get(authorize('admin', 'salesRep'), getLead).put(authorize('admin', 'salesRep'), updateLead).delete(authorize('admin'), deleteLead);
router.post('/:id/draft', authorize('admin', 'salesRep'), draftLead);
router.route('/:id/remarks').post(authorize('admin', 'salesRep'), addRemark).get(authorize('admin', 'salesRep'), getLeadRemarks);
router.patch('/:id/assign', authorize('admin'), assignLead);
router.patch('/:id/unassign', authorize('admin'), unassignLead);
router.get('/:id/itinerary/pdf', authorize('admin', 'salesRep'), downloadLeadItineraryPDF);

// Per-package selections — a lead can hold many packages (plus one manual
// slot) at once; each owns its own itinerary/cost-lines/pricing/quote state.
router.route('/:id/packages')
  .get(authorize('admin', 'salesRep'), listPackageSelections)
  .post(authorize('admin', 'salesRep'), createPackageSelection);
router.route('/:id/packages/:selectionId')
  .get(authorize('admin', 'salesRep'), getPackageSelection)
  .patch(authorize('admin', 'salesRep'), updatePackageSelection)
  .delete(authorize('admin', 'salesRep'), deletePackageSelection);
router.put('/:id/packages/:selectionId/itinerary', authorize('admin', 'salesRep'), updateSelectionItinerary);
router.post('/:id/packages/:selectionId/refresh', authorize('admin', 'salesRep'), refreshPackageSelection);
router.post('/:id/packages/:selectionId/quote', authorize('admin', 'salesRep'), quotePackageSelection);
router.get('/:id/packages/:selectionId/pricing', authorize('admin', 'salesRep'), getSelectionPricing);
router.post('/:id/packages/:selectionId/pricing/calculate', authorize('admin', 'salesRep'), calculateSelectionPricing);
router.post('/:id/packages/:selectionId/pricing/apply', authorize('admin', 'salesRep'), applySelectionPricing);
router.route('/:id/packages/:selectionId/flights')
  .get(authorize('admin', 'salesRep'), listSelectionFlights)
  .post(authorize('admin', 'salesRep'), addSelectionFlight);
router.delete('/:id/packages/:selectionId/flights/:flightId', authorize('admin', 'salesRep'), deleteSelectionFlight);

export default router;
