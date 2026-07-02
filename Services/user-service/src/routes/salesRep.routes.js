import express from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import {
  getAllSalesReps, getSalesRepById, createSalesRep, updateSalesRep, deleteSalesRep,
  getSalesRepStats, toggleSalesRepStatus, resetSalesRepPassword,
  getSalesRepPerformance, updateSalesRepCommission, getOnlineSalesReps,
} from '../controllers/salesRep.controller.js';

const router = express.Router();
router.use(requireAuth, authorize('admin'));

router.get('/', getAllSalesReps);
router.post('/', createSalesRep);
router.get('/stats', getSalesRepStats);
router.get('/online-status', getOnlineSalesReps);
router.get('/:id', getSalesRepById);
router.get('/:id/performance', getSalesRepPerformance);
router.put('/:id', updateSalesRep);
router.patch('/:id/commission', updateSalesRepCommission);
router.patch('/:id/toggle-status', toggleSalesRepStatus);
router.post('/:id/reset-password', resetSalesRepPassword);
router.delete('/:id', deleteSalesRep);

export default router;
