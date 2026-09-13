import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { extractUser, requireAuth } from '../middleware/auth.js';
import { ManagementCopilotSeenRequest } from '@travel-crm/contracts';
import { managementCopilotSeen } from '../controllers/managementCopilot.controller.js';

const router = express.Router();

// Mounted at /api/v1/assistant/management/seen (see app.js). Same scoped auth
// chain as the turn route: the gateway verifies the JWT (this path is absent
// from PUBLIC_PATTERNS) and forwards x-user-*; extractUser+requireAuth trust
// those headers only because this service is gateway-only-internal. The body
// carries no client timestamp — the handler stamps server time.
router.post(
  '/',
  extractUser,
  requireAuth,
  validateBody(ManagementCopilotSeenRequest),
  managementCopilotSeen,
);

export default router;
