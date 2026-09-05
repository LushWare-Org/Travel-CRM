import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { recordEventSchema } from '../validators/assistant.schema.js';
import { recordEvent } from '../controllers/events.controller.js';

const router = express.Router();

// Mounted at /api/v1/assistant/events (see app.js) — this file defines the
// trailing '/', so the final public path is exactly /api/v1/assistant/events.
router.post('/', validateBody(recordEventSchema), recordEvent);

export default router;
