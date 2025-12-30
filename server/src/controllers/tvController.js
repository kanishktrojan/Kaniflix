const { tmdbService } = require('../services');
const { ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * TV Shows Controller
 * Handles all TV show-related endpoints
 */
const tvController = {
  /**
   * Get trending TV shows
   * GET /api/tv/trending
   */
  getTrending: asyncHandler(async (req, res) => {
    const { timeWindow = 'week', page = 1 } = req.query;
    const data = await tmdbService.getTrendingTVShows(timeWindow, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get popular TV shows
   * GET /api/tv/popular
   */
  getPopular: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getPopularTVShows(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get top rated TV shows
   * GET /api/tv/top-rated
   */
  getTopRated: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getTopRatedTVShows(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get airing today TV shows
   * GET /api/tv/airing-today
   */
  getAiringToday: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getAiringTodayTV(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get TV show details
   * GET /api/tv/:id
   */
  getDetails: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const show = await tmdbService.getTVShowDetails(parseInt(id));
    ApiResponse.success(res, show);
  }),

  /**
   * Get TV credits
   * GET /api/tv/:id/credits
   */
  getCredits: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const credits = await tmdbService.getTVCredits(parseInt(id));
    ApiResponse.success(res, credits);
  }),

  /**
   * Get similar TV shows
   * GET /api/tv/:id/similar
   */
  getSimilar: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getSimilarTVShows(parseInt(id), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get TV recommendations
   * GET /api/tv/:id/recommendations
   */
  getRecommendations: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getTVRecommendations(parseInt(id), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get TV videos
   * GET /api/tv/:id/videos
   */
  getVideos: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const videos = await tmdbService.getTVVideos(parseInt(id));
    ApiResponse.success(res, videos);
  }),

  /**
   * Get TV season details
   * GET /api/tv/:id/season/:season
   */
  getSeasonDetails: asyncHandler(async (req, res) => {
    const { id, season } = req.params;
    const seasonData = await tmdbService.getTVSeasonDetails(
      parseInt(id),
      parseInt(season)
    );
    ApiResponse.success(res, seasonData);
  }),

  /**
   * Get TV episode details
   * GET /api/tv/:id/season/:season/episode/:episode
   */
  getEpisodeDetails: asyncHandler(async (req, res) => {
    const { id, season, episode } = req.params;
    const episodeData = await tmdbService.getTVEpisodeDetails(
      parseInt(id),
      parseInt(season),
      parseInt(episode)
    );
    ApiResponse.success(res, episodeData);
  }),

  /**
   * Discover TV shows with filters
   * GET /api/tv/discover
   */
  discover: asyncHandler(async (req, res) => {
    const filters = {
      page: parseInt(req.query.page) || 1,
      genre: req.query.genre,
      year: req.query.year,
      sort: req.query.sort,
      minRating: req.query.minRating
    };

    const data = await tmdbService.discoverTVShows(filters);
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get TV shows by genre
   * GET /api/tv/genre/:genreId
   */
  getByGenre: asyncHandler(async (req, res) => {
    const { genreId } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getTVShowsByGenre(parseInt(genreId), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get TV genres list
   * GET /api/tv/genres
   */
  getGenres: asyncHandler(async (req, res) => {
    const genres = await tmdbService.getTVGenres();
    ApiResponse.success(res, genres);
  })
};

module.exports = tvController;
