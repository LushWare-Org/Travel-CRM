import { Router } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as cpController from '../controllers/customizedPackage.controller.js';

const router = Router();

router.post('/website', cpController.createWebsiteCustomizedPackage);
router.get('/my-requests', requireAuth, cpController.getUserCustomizedPackages);
router.get('/:id', requireAuth, authorize('admin', 'salesRep'), cpController.getCustomizedPackageById);
router.put('/:id', requireAuth, authorize('admin', 'salesRep'), cpController.updateCustomizedPackage);

export default router;
