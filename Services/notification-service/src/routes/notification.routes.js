import { Router } from 'express';
import { getNotifications, markAsRead, sendEmail } from '../controllers/notification.controller.js';

const router = Router();

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

// Service-to-service (token-authenticated, not user auth)
const internalTokenAuth = (req, res, next) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== process.env.INTERNAL_EVENTS_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};
router.post('/internal/email', internalTokenAuth, sendEmail);

export default router;
