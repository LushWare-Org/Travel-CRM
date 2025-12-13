import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword,
  resetTempPassword,
  verifyEmail,
  resendVerification,
  updateProfile,
  sendOtp,
  verifyOtp,
  resendOtp,
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../config/rateLimiter.js';
import { validate } from '../middleware/validator.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../validators/auth.validator.js';

const router = express.Router();

// Public routes (with rate limiting)
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/resend-otp', authLimiter, resendOtp);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.put('/reset-password/:token', authLimiter, validate(resetPasswordSchema), resetPassword);
router.post('/reset-temp-password', authLimiter, resetTempPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes (require authentication)
router.use(protect);

router.get('/me', getMe);
router.post('/logout', logout);
router.put('/change-password', validate(changePasswordSchema), changePassword);
router.post('/resend-verification', resendVerification);
router.put('/profile', validate(updateProfileSchema), updateProfile);

export default router;
