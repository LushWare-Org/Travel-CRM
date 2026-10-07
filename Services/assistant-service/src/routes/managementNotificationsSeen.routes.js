import express from 'express';
import { ManagementNotificationsSeenRequest } from '@travel-crm/contracts';
import { extractUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateManagementNotifications } from '../notifications/notifications.controller.js';

const router = express.Router();

router.post(
  '/',
  extractUser,
  requireAuth,
  validateBody(ManagementNotificationsSeenRequest),
  updateManagementNotifications,
);

export default router;
