import express from 'express';
// import { protect, authorize } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Package routes
// router.get('/', getPackages);
// router.get('/:id', getPackage);
// router.post('/', protect, authorize('admin', 'staff'), createPackage);
// router.put('/:id', protect, authorize('admin', 'staff'), updatePackage);
// router.delete('/:id', protect, authorize('admin'), deletePackage);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Package routes - To be implemented' });
});

export default router;
