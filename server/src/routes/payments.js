const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validators');

/**
 * Payment Routes
 * Base path: /api/payments
 */

// Public routes (no auth required)
router.get('/plans', paymentController.getPlans);

// Webhook (no auth, but signature verified)
router.post('/webhook', 
  express.raw({ type: 'application/json' }),
  paymentController.webhook
);

// Protected routes (require authentication)
router.use(authenticate);

// Validate coupon
router.post('/validate-coupon',
  body('code').notEmpty().withMessage('Coupon code is required'),
  validate,
  paymentController.validateCoupon
);

// Create order
router.post('/create-order',
  body('planId').notEmpty().withMessage('Plan ID is required'),
  body('billingCycle').optional().isIn(['monthly', 'yearly']),
  validate,
  paymentController.createOrder
);

// Verify payment
router.post('/verify',
  body('razorpay_order_id').notEmpty().withMessage('Order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Signature is required'),
  body('planId').notEmpty().withMessage('Plan ID is required'),
  validate,
  paymentController.verifyPayment
);

// Get subscription status
router.get('/subscription', paymentController.getSubscription);

// Redeem promo code for free subscription
router.post('/redeem-code',
  body('code').notEmpty().withMessage('Redemption code is required'),
  body('planId').optional(),
  body('billingCycle').optional().isIn(['monthly', 'yearly']),
  validate,
  paymentController.redeemCode
);

// Cancel subscription
router.post('/cancel', paymentController.cancelSubscription);

// Payment history
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;
