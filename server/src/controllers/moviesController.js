const { tmdbService } = require('../services');
const { ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Movies Controller
 * Handles all movie-related endpoints
 */
const moviesController = {
  /**
   * Get trending movies
   * GET /api/movies/trending
   */
  getTrending: asyncHandler(async (req, res) => {
    const { timeWindow = 'week', page = 1 } = req.query;
    const data = await tmdbService.getTrendingMovies(timeWindow, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get popular movies
   * GET /api/movies/popular
   */
  getPopular: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getPopularMovies(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get top rated movies
   * GET /api/movies/top-rated
   */
  getTopRated: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getTopRatedMovies(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get upcoming movies
   * GET /api/movies/upcoming
   */
  getUpcoming: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getUpcomingMovies(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get now playing movies
   * GET /api/movies/now-playing
   */
  getNowPlaying: asyncHandler(async (req, res) => {
    const { page = 1 } = req.query;
    const data = await tmdbService.getNowPlayingMovies(parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get movie details
   * GET /api/movies/:id
   */
  getDetails: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const movie = await tmdbService.getMovieDetails(parseInt(id));
    ApiResponse.success(res, movie);
  }),

  /**
   * Get movie credits
   * GET /api/movies/:id/credits
   */
  getCredits: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const credits = await tmdbService.getMovieCredits(parseInt(id));
    ApiResponse.success(res, credits);
  }),

  /**
   * Get similar movies
   * GET /api/movies/:id/similar
   */
  getSimilar: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getSimilarMovies(parseInt(id), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get movie recommendations
   * GET /api/movies/:id/recommendations
   */
  getRecommendations: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getMovieRecommendations(parseInt(id), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get movie videos
   * GET /api/movies/:id/videos
   */
  getVideos: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const videos = await tmdbService.getMovieVideos(parseInt(id));
    ApiResponse.success(res, videos);
  }),

  /**
   * Discover movies with filters
   * GET /api/movies/discover
   */
  discover: asyncHandler(async (req, res) => {
    const filters = {
      page: parseInt(req.query.page) || 1,
      genre: req.query.genre,
      year: req.query.year,
      sort: req.query.sort,
      minRating: req.query.minRating,
      maxRating: req.query.maxRating
    };

    const data = await tmdbService.discoverMovies(filters);
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get movies by genre
   * GET /api/movies/genre/:genreId
   */
  getByGenre: asyncHandler(async (req, res) => {
    const { genreId } = req.params;
    const { page = 1 } = req.query;
    const data = await tmdbService.getMoviesByGenre(parseInt(genreId), parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get movie genres list
   * GET /api/movies/genres
   */
  getGenres: asyncHandler(async (req, res) => {
    const genres = await tmdbService.getMovieGenres();
    ApiResponse.success(res, genres);
  })
};

module.exports = moviesController;
