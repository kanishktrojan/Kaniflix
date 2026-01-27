const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
const { SubscriptionPlan, UserSubscription, CouponCode, User, RedeemCode } = require('../models');
const { ApiResponse, ApiError } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Lazy initialize Razorpay (only when credentials are available)
let razorpay = null;

const getRazorpay = () => {
  if (!razorpay) {
    if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
      throw ApiError.internal('Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    }
    razorpay = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

/**
 * Payment Controller
 * Handles Razorpay payment integration for subscriptions
 */
const paymentController = {
  /**
   * Get all available subscription plans
   * GET /api/payments/plans
   */
  getPlans: asyncHandler(async (req, res) => {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    ApiResponse.success(res, plans);
  }),

  /**
   * Validate a coupon code before checkout
   * POST /api/payments/validate-coupon
   */
  validateCoupon: asyncHandler(async (req, res) => {
    const { code, planId, billingCycle } = req.body;

    if (!code) {
      throw ApiError.badRequest('Coupon code is required');
    }

    // Find the coupon
    const coupon = await CouponCode.findValidByCode(code);
    if (!coupon) {
      throw ApiError.notFound('Invalid or expired coupon code');
    }

    // Check if user can use this coupon
    const canUse = await coupon.canBeUsedBy(req.user._id);
    if (!canUse.valid) {
      throw ApiError.badRequest(canUse.reason);
    }

    // Check if coupon applies to selected plan
    if (coupon.applicablePlans.length > 0 && planId) {
      const isApplicable = coupon.applicablePlans.some(
        p => p.toString() === planId
      );
      if (!isApplicable) {
        throw ApiError.badRequest('This coupon is not valid for the selected plan');
      }
    }

    // Get plan to calculate discount
    let discountAmount = 0;
    let originalPrice = 0;
    let finalPrice = 0;

    if (planId) {
      const plan = await SubscriptionPlan.findById(planId);
      if (plan) {
        originalPrice = plan.price[billingCycle || 'monthly'];
        discountAmount = coupon.calculateDiscount(originalPrice);
        finalPrice = Math.max(0, originalPrice - discountAmount);
      }
    }

    ApiResponse.success(res, {
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discount: {
        originalPrice,
        discountAmount,
        finalPrice,
      },
    });
  }),

  /**
   * Create a Razorpay order for subscription
   * POST /api/payments/create-order
   */
  createOrder: asyncHandler(async (req, res) => {
    const { planId, billingCycle = 'monthly', couponCode } = req.body;

    if (!planId) {
      throw ApiError.badRequest('Plan ID is required');
    }

    // Get the plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      throw ApiError.notFound('Plan not found or inactive');
    }

    // Calculate price
    let amount = plan.price[billingCycle];
    let appliedCoupon = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await CouponCode.findValidByCode(couponCode);
      if (coupon) {
        const canUse = await coupon.canBeUsedBy(req.user._id);
        if (canUse.valid) {
          // Check plan applicability
          if (coupon.applicablePlans.length === 0 || 
              coupon.applicablePlans.some(p => p.toString() === planId)) {
            const discountAmount = coupon.calculateDiscount(amount);
            amount = Math.max(0, amount - discountAmount);
            appliedCoupon = {
              code: coupon.code,
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              discountAmount,
            };
          }
        }
      }
    }

    // If amount is 0 (100% discount or free plan), activate directly
    if (amount === 0) {
      const subscription = await activateSubscription(
        req.user._id,
        plan,
        billingCycle,
        appliedCoupon,
        null // No payment
      );

      return ApiResponse.success(res, {
        success: true,
        freeActivation: true,
        subscription,
        message: 'Subscription activated successfully!',
      });
    }

    // Convert to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    let order;
    try {
      // Receipt max 40 chars: use shorter format
      const shortUserId = req.user._id.toString().slice(-8);
      const shortTimestamp = Date.now().toString(36);
      const receipt = `kf_${shortUserId}_${shortTimestamp}`;
      
      // Razorpay test mode only supports INR
      const currency = 'INR';
      
      order = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency,
        receipt,
        notes: {
          userId: req.user._id.toString(),
          planId: plan._id.toString(),
          planName: plan.name,
          billingCycle,
          couponCode: appliedCoupon?.code || null,
        },
      });
    } catch (razorpayError) {
      console.error('Razorpay order creation error:', razorpayError);
      throw ApiError.internal(
        razorpayError.error?.description || 
        razorpayError.message || 
        'Failed to create payment order. Please try again.'
      );
    }

    ApiResponse.success(res, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: {
        id: plan._id,
        name: plan.displayName,
        originalPrice: plan.price[billingCycle],
        finalPrice: amount,
      },
      appliedCoupon,
      razorpayKeyId: config.RAZORPAY_KEY_ID,
    });
  }),

  /**
   * Verify payment and activate subscription
   * POST /api/payments/verify
   */
  verifyPayment: asyncHandler(async (req, res) => {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      billingCycle = 'monthly',
      couponCode,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw ApiError.badRequest('Payment verification failed');
    }

    // Get payment details from Razorpay
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    
    if (payment.status !== 'captured') {
      throw ApiError.badRequest('Payment not captured');
    }

    // Get plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      throw ApiError.notFound('Plan not found');
    }

    // Process coupon if used
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await CouponCode.findValidByCode(couponCode);
      if (coupon) {
        const discountAmount = coupon.calculateDiscount(plan.price[billingCycle]);
        appliedCoupon = {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount,
        };
        // Mark coupon as used
        await coupon.markUsed(req.user._id);
      }
    }

    // Activate subscription
    const subscription = await activateSubscription(
      req.user._id,
      plan,
      billingCycle,
      appliedCoupon,
      {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        method: payment.method,
        card: payment.card ? {
          last4: payment.card.last4,
          network: payment.card.network,
        } : null,
      }
    );

    ApiResponse.success(res, {
      success: true,
      message: 'Payment successful! Your subscription is now active.',
      subscription,
    });
  }),

  /**
   * Razorpay webhook handler
   * POST /api/payments/webhook
   */
  webhook: asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = config.RAZORPAY_WEBHOOK_SECRET;

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      throw ApiError.badRequest('Invalid webhook signature');
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'payment.captured':
        console.log('Payment captured:', payload.payment.entity.id);
        break;

      case 'payment.failed':
        console.log('Payment failed:', payload.payment.entity.id);
        // Could send email notification here
        break;

      case 'subscription.cancelled':
        // Handle subscription cancellation from Razorpay
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  }),

  /**
   * Get current subscription status
   * GET /api/payments/subscription
   */
  getSubscription: asyncHandler(async (req, res) => {
    const subscription = await UserSubscription.findOne({ user: req.user._id })
      .populate('plan')
      .lean();

    if (!subscription) {
      return ApiResponse.success(res, {
        hasSubscription: false,
        subscription: null,
      });
    }

    ApiResponse.success(res, {
      hasSubscription: true,
      subscription: {
        ...subscription,
        isExpired: new Date(subscription.currentPeriodEnd) < new Date(),
        daysRemaining: Math.max(0, Math.ceil(
          (new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)
        )),
      },
    });
  }),

  /**
   * Cancel subscription
   * POST /api/payments/cancel
   */
  cancelSubscription: asyncHandler(async (req, res) => {
    const subscription = await UserSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      throw ApiError.notFound('No active subscription found');
    }

    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    await subscription.save();

    ApiResponse.success(res, {
      message: 'Subscription will be cancelled at the end of the billing period',
      cancelAt: subscription.currentPeriodEnd,
    });
  }),

  /**
   * Get payment history
   * GET /api/payments/history
   */
  getPaymentHistory: asyncHandler(async (req, res) => {
    const subscription = await UserSubscription.findOne({ user: req.user._id });

    if (!subscription) {
      return ApiResponse.success(res, { payments: [] });
    }

    ApiResponse.success(res, {
      payments: subscription.paymentHistory || [],
    });
  }),
};

/**
 * Helper function to activate a subscription
 */
async function activateSubscription(userId, plan, billingCycle, appliedCoupon, paymentInfo) {
  // Calculate period end date
  const periodStart = new Date();
  const periodEnd = new Date();
  
  if (billingCycle === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  // Check for existing subscription
  let subscription = await UserSubscription.findOne({ user: userId });

  if (subscription) {
    // Upgrade/renew existing subscription
    subscription.plan = plan._id;
    subscription.status = 'active';
    subscription.billingCycle = billingCycle;
    subscription.currentPeriodStart = periodStart;
    subscription.currentPeriodEnd = periodEnd;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null;
    
    if (appliedCoupon) {
      subscription.appliedCoupon = {
        code: appliedCoupon.code,
        discountAmount: appliedCoupon.discountAmount,
        discountType: appliedCoupon.discountType,
        appliedAt: new Date(),
      };
    }

    if (paymentInfo) {
      subscription.paymentMethod = {
        type: paymentInfo.method === 'card' ? 'card' : 
              paymentInfo.method === 'upi' ? 'upi' : 'other',
        last4: paymentInfo.card?.last4 || null,
        brand: paymentInfo.card?.network || null,
      };
      
      // Add to payment history
      if (!subscription.paymentHistory) {
        subscription.paymentHistory = [];
      }
      subscription.paymentHistory.push({
        razorpayPaymentId: paymentInfo.razorpayPaymentId,
        razorpayOrderId: paymentInfo.razorpayOrderId,
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        status: 'success',
        paidAt: new Date(),
      });
    }
  } else {
    // Create new subscription
    const subscriptionData = {
      user: userId,
      plan: plan._id,
      status: 'active',
      billingCycle,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    };

    if (appliedCoupon) {
      subscriptionData.appliedCoupon = {
        code: appliedCoupon.code,
        discountAmount: appliedCoupon.discountAmount,
        discountType: appliedCoupon.discountType,
        appliedAt: new Date(),
      };
    }

    if (paymentInfo) {
      subscriptionData.paymentMethod = {
        type: paymentInfo.method === 'card' ? 'card' : 
              paymentInfo.method === 'upi' ? 'upi' : 'other',
        last4: paymentInfo.card?.last4 || null,
        brand: paymentInfo.card?.network || null,
      };
      subscriptionData.paymentHistory = [{
        razorpayPaymentId: paymentInfo.razorpayPaymentId,
        razorpayOrderId: paymentInfo.razorpayOrderId,
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        status: 'success',
        paidAt: new Date(),
      }];
    }

    subscription = await UserSubscription.create(subscriptionData);
  }

  await subscription.save();

  // Update user's subscription reference
  await User.findByIdAndUpdate(userId, {
    'subscription.plan': plan.name,
    'subscription.status': 'active',
    'subscription.expiresAt': periodEnd,
  });

  return subscription.populate('plan');
}

/**
 * Redeem a promo code for free subscription
 * POST /api/payments/redeem-code
 */
paymentController.redeemCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    throw ApiError.badRequest('Redemption code is required');
  }

  // Find the redeem code (not coupon)
  const redeemCode = await RedeemCode.findValidByCode(code);
  if (!redeemCode) {
    throw ApiError.notFound('Invalid or expired redemption code');
  }

  // Check if user can use this code
  const canUse = await redeemCode.canBeUsedBy(req.user._id);
  if (!canUse.valid) {
    throw ApiError.badRequest(canUse.reason);
  }

  // Get the plan associated with this code
  const plan = redeemCode.plan;
  if (!plan || !plan.isActive) {
    throw ApiError.notFound('The plan associated with this code is no longer available');
  }

  // Calculate subscription period
  const periodStart = new Date();
  const periodEnd = redeemCode.calculateEndDate(periodStart);

  // Check for existing active subscription
  let subscription = await UserSubscription.findOne({
    user: req.user._id,
    status: 'active'
  });

  if (subscription) {
    // Extend existing subscription or upgrade
    subscription.plan = plan._id;
    subscription.currentPeriodEnd = periodEnd;
    subscription.appliedCoupon = {
      code: redeemCode.code,
      discountAmount: plan.price.monthly, // Full value
      discountType: 'free_subscription',
      appliedAt: new Date(),
    };
    await subscription.save();
  } else {
    // Create new subscription
    subscription = await UserSubscription.create({
      user: req.user._id,
      plan: plan._id,
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      appliedCoupon: {
        code: redeemCode.code,
        discountAmount: plan.price.monthly,
        discountType: 'free_subscription',
        appliedAt: new Date(),
      }
    });
  }

  // Mark code as used
  await redeemCode.markUsed(req.user._id, subscription._id);

  // Update user's subscription reference
  await User.findByIdAndUpdate(req.user._id, {
    'subscription.plan': plan.name,
    'subscription.status': 'active',
    'subscription.expiresAt': periodEnd,
  });

  // Populate plan details for response
  await subscription.populate('plan');

  ApiResponse.success(res, {
    success: true,
    requiresPayment: false,
    message: 'Code redeemed successfully! Your subscription is now active.',
    code: redeemCode.code,
    subscription: {
      id: subscription._id,
      plan: {
        id: plan._id,
        name: plan.displayName,
        tier: plan.name,
      },
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      features: plan.features,
      duration: {
        value: redeemCode.duration.value,
        unit: redeemCode.duration.unit
      }
    }
  });
});

module.exports = paymentController;
