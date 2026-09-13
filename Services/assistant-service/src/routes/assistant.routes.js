import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { assistantTurnSchema } from '../validators/assistant.schema.js';
import { assistantTurn } from '../controllers/assistant.controller.js';

const router = express.Router();

// Mounted at /api/v1/assistant/turn (see app.js) — this file defines the
// trailing '/', so the final public path is exactly /api/v1/assistant/turn.
router.post('/', validateBody(assistantTurnSchema), assistantTurn);

export default router;
