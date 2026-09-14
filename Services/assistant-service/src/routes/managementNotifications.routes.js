import express from 'express';
import { ManagementNotificationsRequest } from '@travel-crm/contracts';
import { extractUser, requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getManagementNotifications } from '../notifications/notifications.controller.js';

const router = express.Router();

router.post(
  '/',
  extractUser,
  requireAuth,
  validateBody(ManagementNotificationsRequest),
  getManagementNotifications,
);

export default router;
