import express from 'express';
import { extractUser, requireAuth, authorize } from '../middleware/auth.js';
import {
  getVacancies, getAdminVacancies, createVacancy,
  getVacancyById, updateVacancy, deleteVacancy,
} from '../controllers/vacancy.controller.js';

const router = express.Router();
router.use(extractUser);

router.get('/', getVacancies);

router.use(requireAuth, authorize('admin', 'superAdmin'));

// Registered BELOW the admin gate on purpose: above it only extractUser ran, so
// any authenticated caller could read the admin vacancy list. Keep this order.
router.get('/admin/all', getAdminVacancies);
router.post('/', createVacancy);
router.get('/:id', getVacancyById);
router.patch('/:id', updateVacancy);
router.delete('/:id', deleteVacancy);

export default router;
