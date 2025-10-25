import express from 'express';

const router = express.Router();

// Payment routes removed as requested
router.get('/', (req, res) => {
  res.json({ message: 'Payment routes removed' });
});

export default router;
