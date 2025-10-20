import express from 'express';
// Controllers will be implemented later
// import { register, login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
// import { authLimiter } from '../config/rateLimiter.js';

const router = express.Router();

// Authentication routes
// router.post('/register', authLimiter, register);
// router.post('/login', authLimiter, login);
// router.post('/logout', logout);
// router.post('/forgot-password', forgotPassword);
// router.put('/reset-password/:token', resetPassword);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes - To be implemented' });
});

export default router;
