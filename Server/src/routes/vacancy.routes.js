import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createVacancy,
  getVacancies,
  getVacancyById,
  updateVacancy,
  deleteVacancy,
  getAdminVacancies,
} from '../controllers/vacancy.controller.js';

const router = express.Router();
router.get('/', getVacancies);
router.get('/admin/all', getAdminVacancies);

router.use(protect, authorize('admin', 'superAdmin'));

router.post('/', createVacancy);
router.get('/:id', getVacancyById);
router.patch('/:id', updateVacancy);
router.delete('/:id', deleteVacancy);

export default router;
