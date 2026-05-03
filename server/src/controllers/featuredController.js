const FeaturedContent = require('../models/FeaturedContent');
const { ApiError, ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Featured Content Controller
 * Handles operations for featured/trending content
 */

// ==================== ADMIN CONTROLLERS ====================

/**
 * Create a new featured content item
 * @route POST /api/admin/featured
 * @access Admin only
 */
const createFeaturedContent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    contentType,
    genre,
    year,
    rating,
    duration,
    badgeLabel,
    placement,
    priorityOrder,
    status,
    scheduledAt,
    backdropImage,
    posterImage,
    streamUrl,
    trailerUrl,
    tmdbId
  } = req.body;

  if (!title || !description || !placement || !backdropImage || !posterImage || !streamUrl) {
    throw new ApiError(400, 'Missing required fields: title, description, placement, backdropImage, posterImage, streamUrl');
  }

  const featured = await FeaturedContent.create({
    title,
    description,
    contentType: contentType || 'movie',
    genre: genre || '',
    year: year || new Date().getFullYear(),
    rating: rating || '',
    duration: duration || '',
    badgeLabel: badgeLabel || '',
    placement,
    priorityOrder: priorityOrder || 0,
    status: status || 'active',
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    backdropImage,
    posterImage,
    streamUrl,
    trailerUrl: trailerUrl || '',
    tmdbId: tmdbId || '',
    createdBy: req.user._id
  });

  ApiResponse.success(res, featured, 'Featured content created successfully', 201);
});

/**
 * Get all featured content items (Admin)
 * @route GET /api/admin/featured
 * @access Admin only
 */
const getAllFeaturedContentAdmin = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    placement,
    status,
    search,
    sortBy = 'priorityOrder',
    sortOrder = 'desc'
  } = req.query;

  const query = {};

  if (placement) query.placement = placement;
  if (status) query.status = status;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [items, totalCount] = await Promise.all([
    FeaturedContent.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email'),
    FeaturedContent.countDocuments(query)
  ]);

  const totalPages = Math.ceil(totalCount / parseInt(limit));

  ApiResponse.success(res, {
    items,
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
 * Get single featured content item by ID (Admin)
 * @route GET /api/admin/featured/:id
 * @access Admin only
 */
const getFeaturedContentByIdAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await FeaturedContent.findById(id)
    .populate('createdBy', 'username email')
    .populate('updatedBy', 'username email');

  if (!item) {
    throw new ApiError(404, 'Featured content not found');
  }

  ApiResponse.success(res, item);
});

/**
 * Update featured content item
 * @route PUT /api/admin/featured/:id
 * @access Admin only
 */
const updateFeaturedContent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const item = await FeaturedContent.findById(id);

  if (!item) {
    throw new ApiError(404, 'Featured content not found');
  }

  const allowedUpdates = [
    'title', 'description', 'contentType', 'genre', 'year', 'rating', 'duration',
    'badgeLabel', 'placement', 'priorityOrder', 'status', 'scheduledAt',
    'backdropImage', 'posterImage', 'streamUrl', 'trailerUrl', 'tmdbId'
  ];

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      if (field === 'scheduledAt') {
        item[field] = updates[field] ? new Date(updates[field]) : null;
      } else {
        item[field] = updates[field];
      }
    }
  });

  item.updatedBy = req.user._id;
  await item.save();

  ApiResponse.success(res, item, 'Featured content updated successfully');
});

/**
 * Delete featured content item
 * @route DELETE /api/admin/featured/:id
 * @access Admin only
 */
const deleteFeaturedContent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await FeaturedContent.findByIdAndDelete(id);

  if (!item) {
    throw new ApiError(404, 'Featured content not found');
  }

  ApiResponse.success(res, null, 'Featured content deleted successfully');
});

/**
 * Bulk update featured content items
 * @route POST /api/admin/featured/bulk-update
 * @access Admin only
 */
const bulkUpdateFeaturedContent = asyncHandler(async (req, res) => {
  const { itemIds, updates } = req.body;

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    throw new ApiError(400, 'Item IDs array is required');
  }

  const allowedUpdates = ['status', 'placement'];
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

  const result = await FeaturedContent.updateMany(
    { _id: { $in: itemIds } },
    { $set: sanitizedUpdates }
  );

  ApiResponse.success(res, { modifiedCount: result.modifiedCount }, 'Items updated successfully');
});

// ==================== PUBLIC CONTROLLERS ====================

/**
 * Get active featured content
 * @route GET /api/featured
 * @access Public
 */
const getActiveFeaturedContent = asyncHandler(async (req, res) => {
  const items = await FeaturedContent.getActiveFeatured().select('-createdBy -updatedBy -streamUrl');

  ApiResponse.success(res, items);
});

/**
 * Get stream info for featured content (Authenticated)
 * @route GET /api/featured/:id/stream
 * @access Authenticated users only
 */
const getStreamInfo = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const item = await FeaturedContent.findOne({ _id: id });

  if (!item) {
    throw new ApiError(404, 'Featured content not found');
  }

  await item.incrementViewCount();

  const streamInfo = {
    _id: item._id,
    title: item.title,
    streamUrl: item.streamUrl
  };

  ApiResponse.success(res, streamInfo);
});

module.exports = {
  createFeaturedContent,
  getAllFeaturedContentAdmin,
  getFeaturedContentByIdAdmin,
  updateFeaturedContent,
  deleteFeaturedContent,
  bulkUpdateFeaturedContent,
  getActiveFeaturedContent,
  getStreamInfo
};
