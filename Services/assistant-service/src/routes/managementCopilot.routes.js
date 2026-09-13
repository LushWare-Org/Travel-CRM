import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { extractUser, requireAuth } from '../middleware/auth.js';
import { ManagementAssistantTurnRequest } from '@travel-crm/contracts';
import { managementCopilotTurn } from '../controllers/managementCopilot.controller.js';

const router = express.Router();

// Mounted at /api/v1/assistant/management/turn (see app.js). Auth is scoped
// here — NOT global — because /assistant/turn and /assistant/events remain
// public/anonymous. The gateway verifies the JWT (this path is absent from
// PUBLIC_PATTERNS) and forwards x-user-*; extractUser+requireAuth trust those
// headers only because this service is gateway-only-internal.
router.post(
  '/',
  extractUser,
  requireAuth,
  validateBody(ManagementAssistantTurnRequest),
  managementCopilotTurn,
);

export default router;
