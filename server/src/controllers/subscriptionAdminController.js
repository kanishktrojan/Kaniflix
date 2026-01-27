const { SubscriptionPlan, UserSubscription, CouponCode, RedeemCode, User } = require('../models');
const { ApiResponse, ApiError } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Subscription Admin Controller
 * Handles admin operations for subscription plans and coupons
 */
const subscriptionAdminController = {
  // ==================== SUBSCRIPTION PLANS ====================

  /**
   * Get all subscription plans
   * GET /api/admin/subscriptions/plans
   */
  getAllPlans: asyncHandler(async (req, res) => {
    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1 });
    
    // Get subscriber count for each plan
    const planStats = await Promise.all(plans.map(async (plan) => {
      const subscriberCount = await UserSubscription.countDocuments({ 
        plan: plan._id,
        status: { $in: ['active', 'trial'] }
      });
      return {
        ...plan.toJSON(),
        subscriberCount
      };
    }));

    ApiResponse.success(res, planStats);
  }),

  /**
   * Create a subscription plan
   * POST /api/admin/subscriptions/plans
   */
  createPlan: asyncHandler(async (req, res) => {
    const plan = await SubscriptionPlan.create(req.body);
    ApiResponse.created(res, plan, 'Subscription plan created successfully');
  }),

  /**
   * Update a subscription plan
   * PUT /api/admin/subscriptions/plans/:id
   */
  updatePlan: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!plan) {
      throw ApiError.notFound('Subscription plan not found');
    }

    ApiResponse.success(res, plan, 'Subscription plan updated successfully');
  }),

  /**
   * Delete a subscription plan
   * DELETE /api/admin/subscriptions/plans/:id
   */
  deletePlan: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if any users have this plan
    const subscriberCount = await UserSubscription.countDocuments({ plan: id });
    if (subscriberCount > 0) {
      throw ApiError.badRequest(`Cannot delete plan with ${subscriberCount} active subscribers`);
    }

    const plan = await SubscriptionPlan.findByIdAndDelete(id);
    
    if (!plan) {
      throw ApiError.notFound('Subscription plan not found');
    }

    ApiResponse.success(res, null, 'Subscription plan deleted successfully');
  }),

  /**
   * Get subscription statistics
   * GET /api/admin/subscriptions/stats
   */
  getSubscriptionStats: asyncHandler(async (req, res) => {
    const [totalUsers, activeSubscriptions, planDistribution, revenueByPlan] = await Promise.all([
      User.countDocuments({ isActive: true }),
      UserSubscription.countDocuments({ status: { $in: ['active', 'trial'] } }),
      UserSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        { $group: { _id: '$plan', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: '_id',
            foreignField: '_id',
            as: 'planDetails'
          }
        },
        { $unwind: '$planDetails' },
        { $project: { name: '$planDetails.name', count: 1 } }
      ]),
      UserSubscription.aggregate([
        { $match: { status: { $in: ['active', 'trial'] } } },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'plan',
            foreignField: '_id',
            as: 'planDetails'
          }
        },
        { $unwind: '$planDetails' },
        {
          $group: {
            _id: '$planDetails.name',
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$billingCycle', 'monthly'] },
                  '$planDetails.price.monthly',
                  { $divide: ['$planDetails.price.yearly', 12] }
                ]
              }
            },
            subscribers: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      overview: {
        totalUsers,
        activeSubscriptions,
        conversionRate: totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(1) : 0
      },
      planDistribution,
      revenueByPlan,
      totalMonthlyRevenue: revenueByPlan.reduce((acc, plan) => acc + plan.monthlyRevenue, 0)
    };

    ApiResponse.success(res, stats);
  }),

  // ==================== COUPON CODES ====================

  /**
   * Get all coupon codes
   * GET /api/admin/subscriptions/coupons
   */
  getAllCoupons: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, search } = req.query;

    const query = {};
    
    if (status === 'active') {
      query.isActive = true;
      query.validUntil = { $gt: new Date() };
    } else if (status === 'expired') {
      query.validUntil = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    const [coupons, total] = await Promise.all([
      CouponCode.find(query)
        .populate('applicablePlans', 'name displayName')
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      CouponCode.countDocuments(query)
    ]);

    ApiResponse.success(res, {
      coupons,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }),

  /**
   * Create a coupon code
   * POST /api/admin/subscriptions/coupons
   */
  createCoupon: asyncHandler(async (req, res) => {
    const couponData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate discount value for percentage type
    if (req.body.discountType === 'percentage' && req.body.discountValue > 100) {
      throw ApiError.badRequest('Percentage discount cannot exceed 100%');
    }

    const coupon = await CouponCode.create(couponData);
    ApiResponse.created(res, coupon, 'Coupon code created successfully');
  }),

  /**
   * Update a coupon code
   * PUT /api/admin/subscriptions/coupons/:id
   */
  updateCoupon: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Don't allow changing the code
    delete req.body.code;

    const coupon = await CouponCode.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!coupon) {
      throw ApiError.notFound('Coupon code not found');
    }

    ApiResponse.success(res, coupon, 'Coupon code updated successfully');
  }),

  /**
   * Delete a coupon code
   * DELETE /api/admin/subscriptions/coupons/:id
   */
  deleteCoupon: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const coupon = await CouponCode.findByIdAndDelete(id);
    
    if (!coupon) {
      throw ApiError.notFound('Coupon code not found');
    }

    ApiResponse.success(res, null, 'Coupon code deleted successfully');
  }),

  /**
   * Get coupon usage details
   * GET /api/admin/subscriptions/coupons/:id/usage
   */
  getCouponUsage: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const coupon = await CouponCode.findById(id)
      .populate({
        path: 'usedBy.user',
        select: 'username email avatar'
      });

    if (!coupon) {
      throw ApiError.notFound('Coupon code not found');
    }

    ApiResponse.success(res, {
      code: coupon.code,
      totalUses: coupon.currentUses,
      maxUses: coupon.maxUses,
      usageHistory: coupon.usedBy
    });
  }),

  /**
   * Generate bulk coupon codes
   * POST /api/admin/subscriptions/coupons/bulk
   */
  bulkCreateCoupons: asyncHandler(async (req, res) => {
    const { count, prefix, ...couponTemplate } = req.body;

    if (!count || count < 1 || count > 100) {
      throw ApiError.badRequest('Count must be between 1 and 100');
    }

    const coupons = [];
    for (let i = 0; i < count; i++) {
      const uniqueCode = `${prefix || 'KANI'}${Date.now().toString(36).toUpperCase()}${i.toString(36).toUpperCase()}`;
      coupons.push({
        ...couponTemplate,
        code: uniqueCode,
        createdBy: req.user._id
      });
    }

    const createdCoupons = await CouponCode.insertMany(coupons);
    ApiResponse.created(res, {
      count: createdCoupons.length,
      codes: createdCoupons.map(c => c.code)
    }, `${createdCoupons.length} coupon codes created successfully`);
  }),

  // ==================== USER SUBSCRIPTIONS ====================

  /**
   * Get user subscription by user ID
   * GET /api/admin/subscriptions/users/:userId
   */
  getUserSubscription: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const subscription = await UserSubscription.findOne({ user: userId })
      .populate('plan')
      .populate('user', 'username email avatar');

    if (!subscription) {
      // Return user with no subscription
      const user = await User.findById(userId).select('username email avatar');
      return ApiResponse.success(res, { user, subscription: null });
    }

    ApiResponse.success(res, subscription);
  }),

  /**
   * Update user subscription (admin override)
   * PUT /api/admin/subscriptions/users/:userId
   */
  updateUserSubscription: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { planId, status, billingCycle, extendDays } = req.body;

    let subscription = await UserSubscription.findOne({ user: userId });

    if (!subscription) {
      // Create new subscription
      const plan = await SubscriptionPlan.findById(planId);
      if (!plan) {
        throw ApiError.notFound('Subscription plan not found');
      }

      subscription = await UserSubscription.create({
        user: userId,
        plan: planId,
        status: status || 'active',
        billingCycle: billingCycle || 'monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    } else {
      // Update existing subscription
      if (planId) subscription.plan = planId;
      if (status) subscription.status = status;
      if (billingCycle) subscription.billingCycle = billingCycle;
      
      if (extendDays) {
        subscription.currentPeriodEnd = new Date(
          subscription.currentPeriodEnd.getTime() + extendDays * 24 * 60 * 60 * 1000
        );
      }

      await subscription.save();
    }

    // Update user role based on plan
    const plan = await SubscriptionPlan.findById(subscription.plan);
    if (plan) {
      const role = plan.name === 'Free' ? 'user' : 'premium';
      await User.findByIdAndUpdate(userId, { role });
    }

    const updatedSubscription = await UserSubscription.findById(subscription._id)
      .populate('plan')
      .populate('user', 'username email avatar');

    ApiResponse.success(res, updatedSubscription, 'User subscription updated successfully');
  }),

  /**
   * Cancel user subscription
   * DELETE /api/admin/subscriptions/users/:userId
   */
  cancelUserSubscription: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { immediate = false } = req.body;

    const subscription = await UserSubscription.findOne({ user: userId });

    if (!subscription) {
      throw ApiError.notFound('User subscription not found');
    }

    if (immediate) {
      subscription.status = 'cancelled';
      subscription.currentPeriodEnd = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    await subscription.save();

    // Update user role
    await User.findByIdAndUpdate(userId, { role: 'user' });

    ApiResponse.success(res, subscription, immediate 
      ? 'Subscription cancelled immediately' 
      : 'Subscription will be cancelled at period end'
    );
  }),

  // ==================== REDEEM CODES (FREE SUBSCRIPTIONS) ====================

  /**
   * Get all redeem codes
   * GET /api/admin/subscriptions/redeem-codes
   */
  getAllRedeemCodes: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, search } = req.query;

    const query = {};
    
    if (status === 'active') {
      query.isActive = true;
      query.validUntil = { $gt: new Date() };
    } else if (status === 'expired') {
      query.validUntil = { $lt: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      query.code = { $regex: search, $options: 'i' };
    }

    const [redeemCodes, total] = await Promise.all([
      RedeemCode.find(query)
        .populate('plan', 'name displayName price')
        .populate('createdBy', 'username email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      RedeemCode.countDocuments(query)
    ]);

    ApiResponse.success(res, {
      redeemCodes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount: total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }),

  /**
   * Create a redeem code
   * POST /api/admin/subscriptions/redeem-codes
   */
  createRedeemCode: asyncHandler(async (req, res) => {
    const { code, description, plan, duration, validFrom, validUntil, maxUses, maxUsesPerUser } = req.body;

    // Validate plan exists
    const planDoc = await SubscriptionPlan.findById(plan);
    if (!planDoc) {
      throw ApiError.notFound('Selected subscription plan not found');
    }

    const redeemCodeData = {
      code: code.toUpperCase().trim(),
      description,
      plan,
      duration: {
        value: duration?.value || 1,
        unit: duration?.unit || 'month'
      },
      validFrom: validFrom || new Date(),
      validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
      maxUses: maxUses || null,
      maxUsesPerUser: maxUsesPerUser || 1,
      createdBy: req.user._id
    };

    const redeemCode = await RedeemCode.create(redeemCodeData);
    
    // Populate plan details for response
    await redeemCode.populate('plan', 'name displayName price');
    
    ApiResponse.created(res, redeemCode, 'Redeem code created successfully');
  }),

  /**
   * Update a redeem code
   * PUT /api/admin/subscriptions/redeem-codes/:id
   */
  updateRedeemCode: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { description, plan, duration, validFrom, validUntil, maxUses, maxUsesPerUser, isActive } = req.body;

    const redeemCode = await RedeemCode.findById(id);
    
    if (!redeemCode) {
      throw ApiError.notFound('Redeem code not found');
    }

    // If plan is being changed, validate it exists
    if (plan && plan !== redeemCode.plan.toString()) {
      const planDoc = await SubscriptionPlan.findById(plan);
      if (!planDoc) {
        throw ApiError.notFound('Selected subscription plan not found');
      }
      redeemCode.plan = plan;
    }

    if (description !== undefined) redeemCode.description = description;
    if (duration) {
      if (duration.value) redeemCode.duration.value = duration.value;
      if (duration.unit) redeemCode.duration.unit = duration.unit;
    }
    if (validFrom) redeemCode.validFrom = validFrom;
    if (validUntil) redeemCode.validUntil = validUntil;
    if (maxUses !== undefined) redeemCode.maxUses = maxUses;
    if (maxUsesPerUser !== undefined) redeemCode.maxUsesPerUser = maxUsesPerUser;
    if (isActive !== undefined) redeemCode.isActive = isActive;

    await redeemCode.save();
    await redeemCode.populate('plan', 'name displayName price');

    ApiResponse.success(res, redeemCode, 'Redeem code updated successfully');
  }),

  /**
   * Delete a redeem code
   * DELETE /api/admin/subscriptions/redeem-codes/:id
   */
  deleteRedeemCode: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const redeemCode = await RedeemCode.findByIdAndDelete(id);
    
    if (!redeemCode) {
      throw ApiError.notFound('Redeem code not found');
    }

    ApiResponse.success(res, null, 'Redeem code deleted successfully');
  }),

  /**
   * Get redeem code usage details
   * GET /api/admin/subscriptions/redeem-codes/:id/usage
   */
  getRedeemCodeUsage: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const redeemCode = await RedeemCode.findById(id)
      .populate('plan', 'name displayName')
      .populate({
        path: 'usedBy.user',
        select: 'username email avatar'
      });

    if (!redeemCode) {
      throw ApiError.notFound('Redeem code not found');
    }

    ApiResponse.success(res, {
      code: redeemCode.code,
      plan: redeemCode.plan,
      duration: redeemCode.duration,
      totalUses: redeemCode.currentUses,
      maxUses: redeemCode.maxUses,
      usageHistory: redeemCode.usedBy
    });
  }),

  /**
   * Generate bulk redeem codes
   * POST /api/admin/subscriptions/redeem-codes/bulk
   */
  bulkCreateRedeemCodes: asyncHandler(async (req, res) => {
    const { count, prefix, plan, duration, validFrom, validUntil, maxUsesPerUser, description } = req.body;

    if (!count || count < 1 || count > 100) {
      throw ApiError.badRequest('Count must be between 1 and 100');
    }

    if (!plan) {
      throw ApiError.badRequest('Subscription plan is required');
    }

    // Validate plan exists
    const planDoc = await SubscriptionPlan.findById(plan);
    if (!planDoc) {
      throw ApiError.notFound('Selected subscription plan not found');
    }

    const redeemCodes = [];
    for (let i = 0; i < count; i++) {
      const uniqueCode = `${prefix || 'FREE'}${Date.now().toString(36).toUpperCase()}${i.toString(36).toUpperCase()}`;
      redeemCodes.push({
        code: uniqueCode,
        description: description || `Bulk generated redeem code for ${planDoc.displayName}`,
        plan,
        duration: {
          value: duration?.value || 1,
          unit: duration?.unit || 'month'
        },
        validFrom: validFrom || new Date(),
        validUntil: validUntil || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        maxUses: 1, // Bulk codes are usually single-use
        maxUsesPerUser: maxUsesPerUser || 1,
        createdBy: req.user._id
      });
    }

    const createdCodes = await RedeemCode.insertMany(redeemCodes);
    ApiResponse.created(res, {
      count: createdCodes.length,
      plan: planDoc.displayName,
      duration: `${duration?.value || 1} ${duration?.unit || 'month'}(s)`,
      codes: createdCodes.map(c => c.code)
    }, `${createdCodes.length} redeem codes created successfully`);
  })
};

module.exports = subscriptionAdminController;
