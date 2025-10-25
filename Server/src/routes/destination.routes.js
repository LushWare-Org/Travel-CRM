import express from 'express';
import { getDestinations, getDestination } from '../controllers/destination.controller.js';

const router = express.Router();

// Destination routes
router.get('/', getDestinations);
router.get('/:id', getDestination);

export default router;
