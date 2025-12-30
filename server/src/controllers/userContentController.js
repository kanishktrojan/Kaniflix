const { userContentService } = require('../services');
const { ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * User Content Controller
 * Handles watch history, continue watching, and watchlist
 */
const userContentController = {
  // ==================== WATCH HISTORY ====================

  /**
   * Update watch progress
   * POST /api/user/progress
   */
  updateProgress: asyncHandler(async (req, res) => {
    const mediaData = {
      mediaType: req.body.mediaType,
      tmdbId: req.body.tmdbId,
      imdbId: req.body.imdbId,
      title: req.body.title,
      posterPath: req.body.posterPath,
      backdropPath: req.body.backdropPath,
      seasonNumber: req.body.seasonNumber,
      episodeNumber: req.body.episodeNumber,
      episodeTitle: req.body.episodeTitle
    };

    const progressData = {
      progress: req.body.progress,
      currentTime: req.body.currentTime,
      duration: req.body.duration
    };

    const result = await userContentService.updateProgress(
      req.user._id,
      mediaData,
      progressData
    );

    ApiResponse.success(res, result, 'Progress updated');
  }),

  /**
   * Get continue watching list
   * GET /api/user/continue-watching
   */
  getContinueWatching: asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;
    const items = await userContentService.getContinueWatching(
      req.user._id,
      parseInt(limit)
    );
    ApiResponse.success(res, items);
  }),

  /**
   * Get watch history
   * GET /api/user/history
   */
  getWatchHistory: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await userContentService.getWatchHistory(
      req.user._id,
      parseInt(page),
      parseInt(limit)
    );
    ApiResponse.paginated(res, result.items, result.pagination);
  }),

  /**
   * Get progress for specific media
   * GET /api/user/progress/:mediaType/:tmdbId
   */
  getProgress: asyncHandler(async (req, res) => {
    const { mediaType, tmdbId } = req.params;
    const { season, episode } = req.query;

    const progress = await userContentService.getProgress(
      req.user._id,
      parseInt(tmdbId),
      mediaType,
      season ? parseInt(season) : null,
      episode ? parseInt(episode) : null
    );

    ApiResponse.success(res, progress);
  }),

  /**
   * Get last watched episode for TV show
   * GET /api/user/last-episode/:tmdbId
   */
  getLastWatchedEpisode: asyncHandler(async (req, res) => {
    const { tmdbId } = req.params;
    const episode = await userContentService.getLastWatchedEpisode(
      req.user._id,
      parseInt(tmdbId)
    );
    ApiResponse.success(res, episode);
  }),

  /**
   * Clear watch history
   * DELETE /api/user/history
   */
  clearHistory: asyncHandler(async (req, res) => {
    await userContentService.clearHistory(req.user._id);
    ApiResponse.success(res, null, 'History cleared');
  }),

  /**
   * Remove item from history
   * DELETE /api/user/history/:mediaType/:tmdbId
   */
  removeFromHistory: asyncHandler(async (req, res) => {
    const { mediaType, tmdbId } = req.params;
    await userContentService.removeFromHistory(
      req.user._id,
      parseInt(tmdbId),
      mediaType
    );
    ApiResponse.success(res, null, 'Item removed from history');
  }),

  // ==================== WATCHLIST ====================

  /**
   * Add to watchlist
   * POST /api/user/watchlist
   */
  addToWatchlist: asyncHandler(async (req, res) => {
    const mediaData = {
      mediaType: req.body.mediaType,
      tmdbId: req.body.tmdbId,
      title: req.body.title,
      posterPath: req.body.posterPath,
      backdropPath: req.body.backdropPath,
      overview: req.body.overview,
      releaseDate: req.body.releaseDate,
      voteAverage: req.body.voteAverage
    };

    const result = await userContentService.addToWatchlist(req.user._id, mediaData);
    
    if (!result.success) {
      return ApiResponse.success(res, { inWatchlist: true }, result.message);
    }

    ApiResponse.created(res, result.item, 'Added to watchlist');
  }),

  /**
   * Remove from watchlist
   * DELETE /api/user/watchlist/:tmdbId
   */
  removeFromWatchlist: asyncHandler(async (req, res) => {
    const { tmdbId } = req.params;
    const { mediaType } = req.query;

    await userContentService.removeFromWatchlist(
      req.user._id,
      parseInt(tmdbId),
      mediaType
    );

    ApiResponse.success(res, { inWatchlist: false }, 'Removed from watchlist');
  }),

  /**
   * Get watchlist
   * GET /api/user/watchlist
   */
  getWatchlist: asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, mediaType } = req.query;
    const result = await userContentService.getWatchlist(
      req.user._id,
      parseInt(page),
      parseInt(limit),
      mediaType
    );
    ApiResponse.paginated(res, result.items, result.pagination);
  }),

  /**
   * Check watchlist status
   * GET /api/user/watchlist/check/:mediaType/:tmdbId
   */
  checkWatchlistStatus: asyncHandler(async (req, res) => {
    const { mediaType, tmdbId } = req.params;
    const inWatchlist = await userContentService.isInWatchlist(
      req.user._id,
      parseInt(tmdbId),
      mediaType
    );
    ApiResponse.success(res, { inWatchlist });
  }),

  /**
   * Get watchlist statuses for multiple items
   * POST /api/user/watchlist/check-batch
   */
  checkWatchlistBatch: asyncHandler(async (req, res) => {
    const { items } = req.body;
    const statuses = await userContentService.getWatchlistStatuses(
      req.user._id,
      items
    );
    ApiResponse.success(res, statuses);
  }),

  // ==================== STATS ====================

  /**
   * Get viewing statistics
   * GET /api/user/stats
   */
  getStats: asyncHandler(async (req, res) => {
    const stats = await userContentService.getViewingStats(req.user._id);
    ApiResponse.success(res, stats);
  })
};

module.exports = userContentController;
