const { User, WatchHistory, Watchlist, Settings } = require('../models');
const { ApiError, ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { clearRateLimitCache } = require('../middlewares/rateLimiter');

/**
 * Admin Controller
 * Handles all admin-related operations
 */

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 * @access Admin only
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  // Get user statistics
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const premiumUsers = await User.countDocuments({ role: 'premium' });
  const verifiedUsers = await User.countDocuments({ isEmailVerified: true });

  // Get users registered in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsersThisMonth = await User.countDocuments({
    createdAt: { $gte: thirtyDaysAgo }
  });

  // Get watch statistics
  const totalWatchHistory = await WatchHistory.countDocuments();
  const completedWatches = await WatchHistory.countDocuments({ isCompleted: true });

  // Get watchlist statistics
  const totalWatchlistItems = await Watchlist.countDocuments();

  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentWatches = await WatchHistory.countDocuments({
    updatedAt: { $gte: sevenDaysAgo }
  });

  // Get user growth data for chart (last 12 months)
  const userGrowth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);

  // Get top content by watch count
  const topContent = await WatchHistory.aggregate([
    {
      $group: {
        _id: { tmdbId: '$tmdbId', mediaType: '$mediaType', title: '$title' },
        totalWatches: { $sum: '$watchCount' },
        uniqueViewers: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        _id: 0,
        tmdbId: '$_id.tmdbId',
        mediaType: '$_id.mediaType',
        title: '$_id.title',
        totalWatches: 1,
        uniqueViewers: { $size: '$uniqueViewers' }
      }
    },
    { $sort: { totalWatches: -1 } },
    { $limit: 10 }
  ]);

  // Get media type distribution
  const mediaDistribution = await WatchHistory.aggregate([
    {
      $group: {
        _id: '$mediaType',
        count: { $sum: 1 }
      }
    }
  ]);

  ApiResponse.success(res, {
    users: {
      total: totalUsers,
      active: activeUsers,
      premium: premiumUsers,
      verified: verifiedUsers,
      newThisMonth: newUsersThisMonth
    },
    content: {
      totalWatched: totalWatchHistory,
      completedWatches,
      totalWatchlistItems,
      recentActivity: recentWatches
    },
    charts: {
      userGrowth,
      topContent,
      mediaDistribution
    }
  }, 'Dashboard statistics retrieved successfully');
});

/**
 * Get all users with pagination
 * @route GET /api/admin/users
 * @access Admin only
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || '';
  const role = req.query.role || '';
  const status = req.query.status || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  // Build filter query
  const filter = {};
  
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } }
    ];
  }

  if (role && ['user', 'premium', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  const skip = (page - 1) * limit;

  const [users, totalCount] = await Promise.all([
    User.find(filter)
      .select('-refreshTokens -passwordResetToken -passwordResetExpires')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ]);

  // Add watch stats to each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const [watchCount, watchlistCount] = await Promise.all([
        WatchHistory.countDocuments({ user: user._id }),
        Watchlist.countDocuments({ user: user._id })
      ]);
      return {
        ...user,
        stats: {
          watchCount,
          watchlistCount
        }
      };
    })
  );

  ApiResponse.success(res, {
    users: usersWithStats,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    }
  }, 'Users retrieved successfully');
});

/**
 * Get single user details
 * @route GET /api/admin/users/:id
 * @access Admin only
 */
const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id)
    .select('-refreshTokens -passwordResetToken -passwordResetExpires')
    .lean();

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Get user's watch history
  const watchHistory = await WatchHistory.find({ user: id })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  // Get user's watchlist
  const watchlist = await Watchlist.find({ user: id })
    .sort({ addedAt: -1 })
    .limit(20)
    .lean();

  // Get user statistics
  const stats = {
    totalWatched: await WatchHistory.countDocuments({ user: id }),
    completedWatches: await WatchHistory.countDocuments({ user: id, isCompleted: true }),
    watchlistSize: await Watchlist.countDocuments({ user: id }),
    totalWatchTime: await WatchHistory.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: null, total: { $sum: '$currentTime' } } }
    ])
  };

  ApiResponse.success(res, {
    user,
    watchHistory,
    watchlist,
    stats: {
      ...stats,
      totalWatchTime: stats.totalWatchTime[0]?.total || 0
    }
  }, 'User details retrieved successfully');
});

/**
 * Update user
 * @route PUT /api/admin/users/:id
 * @access Admin only
 */
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role, isActive, isEmailVerified, username, email } = req.body;

  // Prevent admin from modifying themselves
  if (id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot modify your own admin account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Update allowed fields
  if (role && ['user', 'premium', 'admin'].includes(role)) {
    user.role = role;
  }
  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
  }
  if (typeof isEmailVerified === 'boolean') {
    user.isEmailVerified = isEmailVerified;
  }
  if (username) {
    user.username = username;
  }
  if (email) {
    // Check if email is already taken
    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      throw ApiError.badRequest('Email is already in use');
    }
    user.email = email;
  }

  await user.save();

  ApiResponse.success(res, user.toObject({ versionKey: false }), 'User updated successfully');
});

/**
 * Delete user
 * @route DELETE /api/admin/users/:id
 * @access Admin only
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Prevent admin from deleting themselves
  if (id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot delete your own account');
  }

  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Delete user's watch history and watchlist
  await Promise.all([
    WatchHistory.deleteMany({ user: id }),
    Watchlist.deleteMany({ user: id }),
    User.findByIdAndDelete(id)
  ]);

  ApiResponse.success(res, null, 'User and associated data deleted successfully');
});

/**
 * Bulk update users
 * @route POST /api/admin/users/bulk-update
 * @access Admin only
 */
const bulkUpdateUsers = asyncHandler(async (req, res) => {
  const { userIds, updates } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw ApiError.badRequest('User IDs are required');
  }

  // Prevent admin from modifying themselves
  if (userIds.includes(req.user._id.toString())) {
    throw ApiError.badRequest('You cannot modify your own admin account');
  }

  const allowedUpdates = {};
  if (updates.role && ['user', 'premium', 'admin'].includes(updates.role)) {
    allowedUpdates.role = updates.role;
  }
  if (typeof updates.isActive === 'boolean') {
    allowedUpdates.isActive = updates.isActive;
  }
  if (typeof updates.isEmailVerified === 'boolean') {
    allowedUpdates.isEmailVerified = updates.isEmailVerified;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw ApiError.badRequest('No valid updates provided');
  }

  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { $set: allowedUpdates }
  );

  ApiResponse.success(res, {
    modifiedCount: result.modifiedCount
  }, `${result.modifiedCount} users updated successfully`);
});

/**
 * Get system analytics
 * @route GET /api/admin/analytics
 * @access Admin only
 */
const getAnalytics = asyncHandler(async (req, res) => {
  const period = req.query.period || '30d';

  let startDate;
  switch (period) {
    case '7d':
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Daily active users
  const dailyActiveUsers = await WatchHistory.aggregate([
    { $match: { updatedAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$updatedAt' },
          month: { $month: '$updatedAt' },
          day: { $dayOfMonth: '$updatedAt' }
        },
        users: { $addToSet: '$user' }
      }
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        activeUsers: { $size: '$users' }
      }
    },
    { $sort: { date: 1 } }
  ]);

  // Watch activity by hour
  const watchByHour = await WatchHistory.aggregate([
    { $match: { updatedAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $hour: '$updatedAt' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Genre popularity (if available in data)
  const genrePopularity = await WatchHistory.aggregate([
    { $match: { updatedAt: { $gte: startDate } } },
    {
      $group: {
        _id: '$mediaType',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  // User retention (users who watched in first week vs still active)
  const registrations = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        registrations: '$count'
      }
    },
    { $sort: { date: 1 } }
  ]);

  ApiResponse.success(res, {
    period,
    dailyActiveUsers,
    watchByHour,
    genrePopularity,
    registrations
  }, 'Analytics retrieved successfully');
});

/**
 * Get recent activity logs
 * @route GET /api/admin/activity
 * @access Admin only
 */
const getRecentActivity = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;

  // Get recent watch activities
  const recentWatches = await WatchHistory.find()
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('user', 'username email avatar')
    .lean();

  // Get recent registrations
  const recentRegistrations = await User.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('username email avatar createdAt')
    .lean();

  ApiResponse.success(res, {
    recentWatches,
    recentRegistrations
  }, 'Recent activity retrieved successfully');
});

/**
 * Get rate limit settings
 * @route GET /api/admin/settings/rate-limits
 * @access Admin only
 */
const getRateLimitSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getRateLimitSettings();
  ApiResponse.success(res, settings, 'Rate limit settings retrieved successfully');
});

/**
 * Update rate limit settings
 * @route PUT /api/admin/settings/rate-limits
 * @access Admin only
 */
const updateRateLimitSettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  
  // Validate the structure of updates
  const validCategories = ['general', 'auth', 'search', 'stream', 'sports'];
  const validFields = ['enabled', 'windowMs', 'maxRequests', 'skipPremium', 'skipAdmin'];
  
  for (const category of Object.keys(updates)) {
    if (!validCategories.includes(category)) {
      throw ApiError.badRequest(`Invalid category: ${category}`);
    }
    
    if (typeof updates[category] === 'object') {
      for (const field of Object.keys(updates[category])) {
        if (!validFields.includes(field)) {
          throw ApiError.badRequest(`Invalid field: ${field} in category ${category}`);
        }
      }
      
      // Validate field types
      const catUpdate = updates[category];
      if (catUpdate.enabled !== undefined && typeof catUpdate.enabled !== 'boolean') {
        throw ApiError.badRequest('enabled must be a boolean');
      }
      if (catUpdate.windowMs !== undefined && (typeof catUpdate.windowMs !== 'number' || catUpdate.windowMs < 1000)) {
        throw ApiError.badRequest('windowMs must be a number >= 1000 (1 second)');
      }
      if (catUpdate.maxRequests !== undefined && (typeof catUpdate.maxRequests !== 'number' || catUpdate.maxRequests < 1)) {
        throw ApiError.badRequest('maxRequests must be a number >= 1');
      }
      if (catUpdate.skipPremium !== undefined && typeof catUpdate.skipPremium !== 'boolean') {
        throw ApiError.badRequest('skipPremium must be a boolean');
      }
      if (catUpdate.skipAdmin !== undefined && typeof catUpdate.skipAdmin !== 'boolean') {
        throw ApiError.badRequest('skipAdmin must be a boolean');
      }
    }
  }
  
  const updatedSettings = await Settings.updateRateLimitSettings(updates, req.user._id);
  
  // Clear the rate limit cache so new settings take effect immediately
  clearRateLimitCache();
  
  ApiResponse.success(res, updatedSettings.value, 'Rate limit settings updated successfully');
});

/**
 * Reset rate limit settings to defaults
 * @route POST /api/admin/settings/rate-limits/reset
 * @access Admin only
 */
const resetRateLimitSettings = asyncHandler(async (req, res) => {
  const { DEFAULT_RATE_LIMIT_SETTINGS } = require('../models/Settings');
  
  await Settings.setSetting(
    'rate_limits',
    DEFAULT_RATE_LIMIT_SETTINGS,
    'rate_limiting',
    'API rate limiting configuration',
    req.user._id
  );
  
  // Clear the rate limit cache
  clearRateLimitCache();
  
  ApiResponse.success(res, DEFAULT_RATE_LIMIT_SETTINGS, 'Rate limit settings reset to defaults');
});

module.exports = {
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
  getAnalytics,
  getRecentActivity,
  getRateLimitSettings,
  updateRateLimitSettings,
  resetRateLimitSettings
};
