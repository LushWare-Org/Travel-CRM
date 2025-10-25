import express from 'express';
import { createLead } from '../controllers/lead.controller.js';

const router = express.Router();

// Lead routes
router.post('/', createLead);

export default router;
