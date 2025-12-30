const { streamingService } = require('../services');
const { ApiResponse, ApiError } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Streaming Controller
 * Handles stream token generation and player configuration
 * CRITICAL: Never expose direct streaming URLs
 */
const streamController = {
  /**
   * Get stream token for movie
   * POST /api/stream/movie/:id
   */
  getMovieStream: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const streamToken = streamingService.generateStreamToken('movie', parseInt(id));
    
    ApiResponse.success(res, {
      streamToken,
      expiresIn: 3600 // 1 hour
    });
  }),

  /**
   * Get stream token for TV episode
   * POST /api/stream/tv/:id/:season/:episode
   */
  getTVStream: asyncHandler(async (req, res) => {
    const { id, season, episode } = req.params;
    
    const streamToken = streamingService.generateStreamToken('tv', parseInt(id), {
      season: parseInt(season),
      episode: parseInt(episode)
    });
    
    ApiResponse.success(res, {
      streamToken,
      expiresIn: 3600
    });
  }),

  /**
   * Get player configuration from stream token
   * POST /api/stream/config
   */
  getPlayerConfig: asyncHandler(async (req, res) => {
    const { streamToken } = req.body;
    
    if (!streamToken) {
      throw ApiError.badRequest('Stream token is required');
    }

    // Get user preferences if authenticated
    const userPreferences = req.user?.preferences || {};
    
    const config = streamingService.getStreamConfig(streamToken, userPreferences);
    
    if (config.error) {
      throw ApiError.badRequest(config.error);
    }
    
    ApiResponse.success(res, config.config);
  }),

  /**
   * Get player event configuration
   * GET /api/stream/events-config
   */
  getEventsConfig: asyncHandler(async (req, res) => {
    const config = streamingService.getPlayerEventConfig();
    ApiResponse.success(res, config);
  }),

  /**
   * Get available quality options
   * GET /api/stream/quality-options
   */
  getQualityOptions: asyncHandler(async (req, res) => {
    const options = streamingService.getQualityOptions();
    ApiResponse.success(res, options);
  })
};

module.exports = streamController;
