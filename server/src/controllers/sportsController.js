const SportsEvent = require('../models/SportsEvent');
const { ApiError, ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Sports Controller
 * Handles all sports-related operations (Admin and Public)
 */

// ==================== ADMIN CONTROLLERS ====================

/**
 * Create a new sports event
 * @route POST /api/admin/sports
 * @access Admin only
 */
const createSportsEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    thumbnail,
    banner,
    category,
    team1,
    team2,
    isLive,
    status,
    scheduledAt,
    streamUrl,
    useProxy,
    drmEnabled,
    drmConfig,
    qualityOptions,
    venue,
    tournament,
    isActive,
    isFeatured,
    endedAt
  } = req.body;

  // Validate required fields
  if (!title || !description || !thumbnail || !scheduledAt || !streamUrl) {
    throw new ApiError(400, 'Missing required fields: title, description, thumbnail, scheduledAt, streamUrl');
  }

  const sportsEvent = await SportsEvent.create({
    title,
    description,
    thumbnail,
    banner: banner || null,
    category: category || 'other',
    team1: team1 || {},
    team2: team2 || {},
    isLive: isLive || false,
    status: status || 'upcoming',
    scheduledAt: new Date(scheduledAt),
    streamUrl,
    useProxy: useProxy || false,
    drmEnabled: drmEnabled || false,
    drmConfig: drmConfig || {},
    qualityOptions: qualityOptions || [],
    venue: venue || '',
    tournament: tournament || '',
    isActive: isActive !== false,
    isFeatured: isFeatured || false,
    endedAt: endedAt ? new Date(endedAt) : null,
    createdBy: req.user._id
  });

  ApiResponse.success(res, sportsEvent, 'Sports event created successfully', 201);
});

/**
 * Get all sports events (Admin)
 * @route GET /api/admin/sports
 * @access Admin only
 */
const getAllSportsEventsAdmin = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = {};

  if (category) {
    query.category = category;
  }

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tournament: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [events, totalCount] = await Promise.all([
    SportsEvent.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email'),
    SportsEvent.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  ApiResponse.success(res, {
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages,
      hasMore: parseInt(page) < totalPages
    }
  });
});

/**
 * Get single sports event by ID (Admin)
 * @route GET /api/admin/sports/:id
 * @access Admin only
 */
const getSportsEventByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await SportsEvent.findById(id)
    .populate('createdBy', 'username email')
    .populate('updatedBy', 'username email');

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  ApiResponse.success(res, event);
});

/**
 * Update sports event
 * @route PUT /api/admin/sports/:id
 * @access Admin only
 */
const updateSportsEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const event = await SportsEvent.findById(id);

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  // Fields that can be updated
  const allowedUpdates = [
    'title', 'description', 'thumbnail', 'banner', 'category',
    'team1', 'team2', 'isLive', 'status', 'scheduledAt', 'endedAt',
    'streamUrl', 'useProxy', 'drmEnabled', 'drmConfig', 'qualityOptions',
    'venue', 'tournament', 'isActive', 'isFeatured'
  ];

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'scheduledAt' || field === 'endedAt') {
        event[field] = updates[field] ? new Date(updates[field]) : null;
      } else {
        event[field] = updates[field];
      }
    }
  });

  event.updatedBy = req.user._id;
  await event.save();

  ApiResponse.success(res, event, 'Sports event updated successfully');
});

/**
 * Delete sports event
 * @route DELETE /api/admin/sports/:id
 * @access Admin only
 */
const deleteSportsEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await SportsEvent.findByIdAndDelete(id);

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  ApiResponse.success(res, null, 'Sports event deleted successfully');
});

/**
 * Toggle live status
 * @route PATCH /api/admin/sports/:id/toggle-live
 * @access Admin only
 */
const toggleLiveStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await SportsEvent.findById(id);

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  if (event.isLive) {
    await event.markAsEnded();
  } else {
    await event.markAsLive();
  }

  ApiResponse.success(res, event, `Event ${event.isLive ? 'is now live' : 'has ended'}`);
});

/**
 * Update scores
 * @route PATCH /api/admin/sports/:id/scores
 * @access Admin only
 */
const updateScores = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { team1Score, team2Score } = req.body;

  const event = await SportsEvent.findById(id);

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  if (team1Score !== undefined) {
    event.team1.score = team1Score;
  }
  if (team2Score !== undefined) {
    event.team2.score = team2Score;
  }

  event.updatedBy = req.user._id;
  await event.save();

  ApiResponse.success(res, event, 'Scores updated successfully');
});

/**
 * Bulk update events status
 * @route POST /api/admin/sports/bulk-update
 * @access Admin only
 */
const bulkUpdateSportsEvents = asyncHandler(async (req, res) => {
  const { eventIds, updates } = req.body;

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new ApiError(400, 'Event IDs array is required');
  }

  const allowedUpdates = ['isActive', 'isFeatured', 'status'];
  const sanitizedUpdates = {};
  
  for (const key of Object.keys(updates)) {
    if (allowedUpdates.includes(key)) {
      sanitizedUpdates[key] = updates[key];
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    throw new ApiError(400, 'No valid updates provided');
  }

  sanitizedUpdates.updatedBy = req.user._id;

  const result = await SportsEvent.updateMany(
    { _id: { $in: eventIds } },
    { $set: sanitizedUpdates }
  );

  ApiResponse.success(res, { modifiedCount: result.modifiedCount }, 'Events updated successfully');
});

/**
 * Get sports dashboard stats
 * @route GET /api/admin/sports/stats
 * @access Admin only
 */
const getSportsStats = asyncHandler(async (req, res) => {
  const [
    totalEvents,
    liveEvents,
    upcomingEvents,
    endedEvents,
    categoryStats,
    totalViews
  ] = await Promise.all([
    SportsEvent.countDocuments(),
    SportsEvent.countDocuments({ status: 'live', isLive: true }),
    SportsEvent.countDocuments({ status: 'upcoming' }),
    SportsEvent.countDocuments({ status: 'ended' }),
    SportsEvent.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    SportsEvent.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
    ])
  ]);

  ApiResponse.success(res, {
    totalEvents,
    liveEvents,
    upcomingEvents,
    endedEvents,
    categoryStats,
    totalViews: totalViews[0]?.totalViews || 0
  });
});

// ==================== PUBLIC CONTROLLERS ====================

/**
 * Get all active sports events (Public)
 * @route GET /api/sports
 * @access Public
 */
const getAllSportsEvents = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status,
    featured
  } = req.query;

  // Build query - only active events, exclude cancelled and ended
  const query = { 
    isActive: true,
    status: { $nin: ['cancelled', 'ended'] }
  };

  if (category) {
    query.category = category;
  }

  if (status) {
    // Only allow filtering by live or upcoming
    if (['live', 'upcoming'].includes(status)) {
      query.status = status;
    }
  }

  if (featured === 'true') {
    query.isFeatured = true;
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [events, totalCount] = await Promise.all([
    SportsEvent.find(query)
      .select('-drmConfig -streamUrl -createdBy -updatedBy') // Hide sensitive data
      .sort({ isLive: -1, isFeatured: -1, scheduledAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    SportsEvent.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  ApiResponse.success(res, {
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages,
      hasMore: parseInt(page) < totalPages
    }
  });
});

/**
 * Get live events (Public)
 * @route GET /api/sports/live
 * @access Public
 */
const getLiveEvents = asyncHandler(async (req, res) => {
  // Auto-end events whose endedAt has passed
  const now = new Date();
  await SportsEvent.updateMany(
    { status: 'live', isLive: true, endedAt: { $ne: null, $lte: now } },
    { $set: { status: 'ended', isLive: false } }
  );

  const events = await SportsEvent.find({
    isLive: true,
    status: 'live',
    isActive: true
  })
  .select('-drmConfig -streamUrl -createdBy -updatedBy')
  .sort({ viewCount: -1, scheduledAt: -1 });

  ApiResponse.success(res, events);
});

/**
 * Get upcoming events (Public)
 * @route GET /api/sports/upcoming
 * @access Public
 */
const getUpcomingEvents = asyncHandler(async (req, res) => {
  const { limit = 10, category } = req.query;
  const now = new Date();

  const query = {
    status: 'upcoming',
    scheduledAt: { $gt: now },
    isActive: true
  };

  if (category) {
    query.category = category;
  }

  const events = await SportsEvent.find(query)
    .select('-drmConfig -streamUrl -createdBy -updatedBy')
    .sort({ scheduledAt: 1 })
    .limit(parseInt(limit));

  ApiResponse.success(res, events);
});

/**
 * Get featured events (Public)
 * @route GET /api/sports/featured
 * @access Public
 */
const getFeaturedEvents = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const events = await SportsEvent.find({
    isFeatured: true,
    isActive: true
  })
  .select('-drmConfig -streamUrl -createdBy -updatedBy')
  .sort({ isLive: -1, scheduledAt: -1 })
  .limit(parseInt(limit));

  ApiResponse.success(res, events);
});

/**
 * Get events by category (Public)
 * @route GET /api/sports/category/:category
 * @access Public
 */
const getEventsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [events, totalCount] = await Promise.all([
    SportsEvent.find({
      category,
      isActive: true,
      status: { $nin: ['cancelled', 'ended'] }
    })
    .select('-drmConfig -streamUrl -createdBy -updatedBy')
    .sort({ isLive: -1, scheduledAt: -1 })
    .skip(skip)
    .limit(parseInt(limit)),
    SportsEvent.countDocuments({ 
      category, 
      isActive: true,
      status: { $nin: ['cancelled', 'ended'] }
    })
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  ApiResponse.success(res, {
    events,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      totalCount,
      totalPages,
      hasMore: parseInt(page) < totalPages
    }
  });
});

/**
 * Get single sports event by ID (Public)
 * @route GET /api/sports/:id
 * @access Public
 */
const getSportsEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await SportsEvent.findOne({
    _id: id,
    isActive: true
  }).select('-createdBy -updatedBy');

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  ApiResponse.success(res, event);
});

/**
 * Get stream info (Authenticated)
 * @route GET /api/sports/:id/stream
 * @access Authenticated users only
 */
const getStreamInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await SportsEvent.findOne({
    _id: id,
    isActive: true
  });

  if (!event) {
    throw new ApiError(404, 'Sports event not found');
  }

  // Increment view count
  await event.incrementViewCount();

  // Return stream info with DRM config if enabled
  const streamInfo = {
    _id: event._id,
    title: event.title,
    streamUrl: event.streamUrl,
    useProxy: event.useProxy,
    drmEnabled: event.drmEnabled,
    qualityOptions: event.qualityOptions
  };

  if (event.drmEnabled && event.drmConfig) {
    streamInfo.drmConfig = event.drmConfig;
  }

  ApiResponse.success(res, streamInfo);
});

/**
 * Get categories list
 * @route GET /api/sports/categories
 * @access Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = [
    { id: 'cricket', name: 'Cricket', icon: '🏏' },
    { id: 'football', name: 'Football', icon: '⚽' },
    { id: 'basketball', name: 'Basketball', icon: '🏀' },
    { id: 'tennis', name: 'Tennis', icon: '🎾' },
    { id: 'hockey', name: 'Hockey', icon: '🏒' },
    { id: 'baseball', name: 'Baseball', icon: '⚾' },
    { id: 'motorsport', name: 'Motorsport', icon: '🏎️' },
    { id: 'mma', name: 'MMA', icon: '🥊' },
    { id: 'boxing', name: 'Boxing', icon: '🥊' },
    { id: 'wrestling', name: 'Wrestling', icon: '🤼' },
    { id: 'golf', name: 'Golf', icon: '⛳' },
    { id: 'esports', name: 'Esports', icon: '🎮' },
    { id: 'olympics', name: 'Olympics', icon: '🏅' },
    { id: 'other', name: 'Other', icon: '🏆' }
  ];

  // Get count for each category
  const categoryCounts = await SportsEvent.aggregate([
    { $match: { isActive: true, status: { $nin: ['cancelled', 'ended'] } } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const countsMap = categoryCounts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  const categoriesWithCount = categories.map(cat => ({
    ...cat,
    count: countsMap[cat.id] || 0
  }));

  ApiResponse.success(res, categoriesWithCount);
});

module.exports = {
  // Admin
  createSportsEvent,
  getAllSportsEventsAdmin,
  getSportsEventByIdAdmin,
  updateSportsEvent,
  deleteSportsEvent,
  toggleLiveStatus,
  updateScores,
  bulkUpdateSportsEvents,
  getSportsStats,
  // Public
  getAllSportsEvents,
  getLiveEvents,
  getUpcomingEvents,
  getFeaturedEvents,
  getEventsByCategory,
  getSportsEventById,
  getStreamInfo,
  getCategories
};
