const {
  User,
  DeviceSession,
  UserSubscription,
  SubscriptionPlan,
  CouponCode,
  RedeemCode
} = require('../models');
const { ApiResponse, ApiError } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const bcrypt = require('bcryptjs');

const profileController = {
  /**
   * Redeem a redeem code (separate from coupon)
   * POST /api/profile/redeem-code
   */
  redeemRedeemCode: asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) {
      throw ApiError.badRequest('Redeem code is required');
    }

    // Find valid redeem code
    const redeemCode = await RedeemCode.findValidByCode(code);
    if (!redeemCode) {
      throw ApiError.notFound('Invalid or expired redeem code');
    }

    // Check if user can use this code
    const canUse = await redeemCode.canBeUsedBy(req.user._id);
    if (!canUse.valid) {
      throw ApiError.badRequest(canUse.reason);
    }

    // Find or create user subscription for the plan
    let subscription = await UserSubscription.findOne({ user: req.user._id });
    const now = new Date();
    const newPeriodEnd = redeemCode.calculateEndDate(now);

    if (!subscription) {
      // Create new subscription for user
      subscription = new UserSubscription({
        user: req.user._id,
        plan: redeemCode.plan._id,
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        paymentMethod: { type: 'none' }
      });
    } else {
      // Extend/replace subscription for the plan
      subscription.plan = redeemCode.plan._id;
      subscription.status = 'active';
      subscription.billingCycle = 'monthly';
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = newPeriodEnd;
      subscription.paymentMethod = { type: 'none' };
    }
    await subscription.save();

    // Mark code as used
    await redeemCode.markUsed(req.user._id, subscription._id);

    ApiResponse.success(res, {
      message: 'Redeem code applied successfully',
      plan: redeemCode.plan.displayName || redeemCode.plan.name,
      duration: redeemCode.duration,
      subscription: {
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        plan: subscription.plan
      }
    });
  }),

  /**
   * Get complete profile with all settings
   * GET /api/profile
   */
  getProfile: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
      .select('-refreshTokens -password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Get subscription info
    const subscription = await UserSubscription.findOne({ user: req.user._id })
      .populate('plan');

    // Get active device count
    const deviceCount = await DeviceSession.countDocuments({ user: req.user._id });

    ApiResponse.success(res, {
      user,
      subscription,
      deviceCount
    });
  }),

  /**
   * Update profile information
   * PATCH /api/profile
   */
  updateProfile: asyncHandler(async (req, res) => {
    const allowedFields = ['username', 'avatar', 'profile'];
    const updates = {};

    // Filter only allowed fields
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    // Check username uniqueness if being updated
    if (updates.username) {
      const existingUser = await User.findOne({ 
        username: updates.username,
        _id: { $ne: req.user._id }
      });
      if (existingUser) {
        throw ApiError.conflict('Username already taken');
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-refreshTokens -password');

    ApiResponse.success(res, user, 'Profile updated successfully');
  }),

  /**
   * Update user preferences
   * PATCH /api/profile/preferences
   */
  updatePreferences: asyncHandler(async (req, res) => {
    const { preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences } },
      { new: true, runValidators: true }
    ).select('-refreshTokens -password');

    ApiResponse.success(res, user.preferences, 'Preferences updated successfully');
  }),

  /**
   * Update notification settings
   * PATCH /api/profile/notifications
   */
  updateNotifications: asyncHandler(async (req, res) => {
    const { notifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { notifications } },
      { new: true, runValidators: true }
    ).select('-refreshTokens -password');

    ApiResponse.success(res, user.notifications, 'Notification settings updated successfully');
  }),

  /**
   * Change password
   * POST /api/profile/change-password
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw ApiError.badRequest('New password must be at least 8 characters');
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Invalidate all refresh tokens (force re-login on all devices)
    user.refreshTokens = [];
    await user.save();

    // Clear all device sessions except current
    await DeviceSession.deleteMany({ 
      user: req.user._id,
      isCurrentDevice: false 
    });

    ApiResponse.success(res, null, 'Password changed successfully. Please log in again on other devices.');
  }),

  /**
   * Get all active device sessions
   * GET /api/profile/devices
   */
  getDevices: asyncHandler(async (req, res) => {
    const devices = await DeviceSession.find({ user: req.user._id })
      .select('-refreshToken')
      .sort({ lastActiveAt: -1 });

    ApiResponse.success(res, devices);
  }),

  /**
   * Logout from a specific device
   * DELETE /api/profile/devices/:deviceId
   */
  logoutDevice: asyncHandler(async (req, res) => {
    const { deviceId } = req.params;

    const device = await DeviceSession.findOne({
      _id: deviceId,
      user: req.user._id
    });

    if (!device) {
      throw ApiError.notFound('Device session not found');
    }

    // Remove device session
    await DeviceSession.deleteOne({ _id: deviceId });

    // Remove associated refresh token from user
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: { token: device.refreshToken } }
    });

    ApiResponse.success(res, null, 'Device logged out successfully');
  }),

  /**
   * Logout from all devices except current
   * POST /api/profile/devices/logout-all
   */
  logoutAllDevices: asyncHandler(async (req, res) => {
    const currentDeviceId = req.headers['x-device-id'];

    // Remove all device sessions except current
    await DeviceSession.deleteMany({
      user: req.user._id,
      deviceId: { $ne: currentDeviceId }
    });

    // Clear all refresh tokens except current
    const user = await User.findById(req.user._id);
    const currentToken = user.refreshTokens.find(t => t.userAgent === req.headers['user-agent']);
    
    user.refreshTokens = currentToken ? [currentToken] : [];
    await user.save();

    ApiResponse.success(res, null, 'Logged out from all other devices');
  }),

  /**
   * Get subscription details
   * GET /api/profile/subscription
   */
  getSubscription: asyncHandler(async (req, res) => {
    const subscription = await UserSubscription.findOne({ user: req.user._id })
      .populate('plan');

    // Get all available plans
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1 });

    ApiResponse.success(res, {
      current: subscription,
      availablePlans: plans
    });
  }),

  /**
   * Redeem a coupon code
   * POST /api/profile/redeem-coupon
   */
  redeemCoupon: asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
      throw ApiError.badRequest('Coupon code is required');
    }

    // Find valid coupon
    const coupon = await CouponCode.findValidByCode(code);
    
    if (!coupon) {
      throw ApiError.notFound('Invalid or expired coupon code');
    }

    // Check if user can use this coupon
    const canUse = await coupon.canBeUsedBy(req.user._id);
    if (!canUse.valid) {
      throw ApiError.badRequest(canUse.reason);
    }

    // Get user's current subscription
    let subscription = await UserSubscription.findOne({ user: req.user._id })
      .populate('plan');

    if (!subscription) {
      throw ApiError.badRequest('You need an active subscription to apply a coupon');
    }

    // Calculate discount
    const currentPlanPrice = subscription.plan.price[subscription.billingCycle];
    const discountAmount = coupon.calculateDiscount(currentPlanPrice);

    // Apply coupon to subscription
    subscription.appliedCoupon = {
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
      appliedAt: new Date(),
      expiresAt: coupon.discountType === 'free_month' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : subscription.currentPeriodEnd
    };
    await subscription.save();

    // Mark coupon as used
    await coupon.markUsed(req.user._id);

    ApiResponse.success(res, {
      message: 'Coupon applied successfully',
      discount: {
        code: coupon.code,
        type: coupon.discountType,
        value: coupon.discountValue,
        amount: discountAmount
      }
    });
  }),

  /**
   * Set/Update profile PIN
   * POST /api/profile/pin
   */
  setProfilePin: asyncHandler(async (req, res) => {
    const { pin, currentPin } = req.body;

    if (!pin || pin.length !== 4 || !/^\d+$/.test(pin)) {
      throw ApiError.badRequest('PIN must be exactly 4 digits');
    }

    const user = await User.findById(req.user._id).select('+profile.profileLock.pin');

    // If PIN already exists, verify current PIN
    if (user.profile?.profileLock?.enabled && user.profile?.profileLock?.pin) {
      if (!currentPin) {
        throw ApiError.badRequest('Current PIN is required');
      }
      const isMatch = await bcrypt.compare(currentPin, user.profile.profileLock.pin);
      if (!isMatch) {
        throw ApiError.badRequest('Current PIN is incorrect');
      }
    }

    // Hash and save new PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'profile.profileLock.enabled': true,
        'profile.profileLock.pin': hashedPin
      }
    });

    ApiResponse.success(res, null, 'Profile PIN set successfully');
  }),

  /**
   * Disable profile PIN
   * DELETE /api/profile/pin
   */
  removeProfilePin: asyncHandler(async (req, res) => {
    const { pin } = req.body;

    const user = await User.findById(req.user._id).select('+profile.profileLock.pin');

    if (!user.profile?.profileLock?.enabled) {
      throw ApiError.badRequest('Profile PIN is not enabled');
    }

    // Verify PIN
    const isMatch = await bcrypt.compare(pin, user.profile.profileLock.pin);
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect PIN');
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: {
        'profile.profileLock.enabled': false,
        'profile.profileLock.pin': null
      }
    });

    ApiResponse.success(res, null, 'Profile PIN disabled');
  }),

  /**
   * Verify profile PIN
   * POST /api/profile/pin/verify
   */
  verifyProfilePin: asyncHandler(async (req, res) => {
    const { pin } = req.body;

    const user = await User.findById(req.user._id).select('+profile.profileLock.pin');

    if (!user.profile?.profileLock?.enabled) {
      throw ApiError.badRequest('Profile PIN is not enabled');
    }

    const isMatch = await bcrypt.compare(pin, user.profile.profileLock.pin);
    
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect PIN');
    }

    ApiResponse.success(res, { verified: true });
  }),

  /**
   * Get watch statistics
   * GET /api/profile/stats
   */
  getStats: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    // Calculate stats from embedded watch history
    const watchHistory = user.watchHistory || [];
    const watchlist = user.watchlist || [];

    const stats = {
      totalWatched: watchHistory.length,
      totalWatchTime: watchHistory.reduce((acc, item) => acc + (item.currentTime || 0), 0),
      completedMovies: watchHistory.filter(h => h.mediaType === 'movie' && h.isCompleted).length,
      completedEpisodes: watchHistory.filter(h => h.mediaType === 'tv' && h.isCompleted).length,
      inProgress: watchHistory.filter(h => !h.isCompleted && h.progress > 0).length,
      watchlistSize: watchlist.length,
      movieWatchlistCount: watchlist.filter(w => w.mediaType === 'movie').length,
      tvWatchlistCount: watchlist.filter(w => w.mediaType === 'tv').length,
      // Genre breakdown (would need TMDB data for actual genres)
      memberSince: user.createdAt,
      lastActive: user.lastLogin || user.updatedAt
    };

    // Format watch time
    const hours = Math.floor(stats.totalWatchTime / 3600);
    const minutes = Math.floor((stats.totalWatchTime % 3600) / 60);
    stats.totalWatchTimeFormatted = `${hours}h ${minutes}m`;

    ApiResponse.success(res, stats);
  }),

  /**
   * Delete account
   * DELETE /api/profile
   */
  deleteAccount: asyncHandler(async (req, res) => {
    const { password, confirmDelete } = req.body;

    if (confirmDelete !== 'DELETE') {
      throw ApiError.badRequest('Please type DELETE to confirm');
    }

    // Verify password
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect password');
    }

    // Cancel subscription if exists
    await UserSubscription.deleteOne({ user: req.user._id });

    // Remove all device sessions
    await DeviceSession.deleteMany({ user: req.user._id });

    // Delete user account (this will cascade delete watch history, etc.)
    await User.findByIdAndDelete(req.user._id);

    ApiResponse.success(res, null, 'Account deleted successfully');
  }),

  /**
   * Upload/Update avatar
   * POST /api/profile/avatar
   */
  updateAvatar: asyncHandler(async (req, res) => {
    const { avatar } = req.body; // Base64 or URL

    if (!avatar) {
      throw ApiError.badRequest('Avatar is required');
    }

    // Validate URL or base64
    const isValidUrl = /^https?:\/\/.+/.test(avatar);
    const isBase64 = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/.test(avatar);

    if (!isValidUrl && !isBase64) {
      throw ApiError.badRequest('Invalid avatar format. Must be URL or base64 image.');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    ).select('-refreshTokens -password');

    ApiResponse.success(res, { avatar: user.avatar }, 'Avatar updated successfully');
  }),

  /**
   * Remove avatar
   * DELETE /api/profile/avatar
   */
  removeAvatar: asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { avatar: null });
    ApiResponse.success(res, null, 'Avatar removed successfully');
  })
};

module.exports = profileController;
