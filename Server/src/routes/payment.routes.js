import express from 'express';
// import { protect } from '../middleware/auth.js';
// Controllers will be implemented later

const router = express.Router();

// Payment routes
// router.post('/stripe/create-checkout-session', protect, createStripeCheckout);
// router.post('/stripe/webhook', handleStripeWebhook);
// router.post('/razorpay/create-order', protect, createRazorpayOrder);
// router.post('/razorpay/verify', protect, verifyRazorpayPayment);

// Placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'Payment routes - To be implemented' });
});

export default router;
