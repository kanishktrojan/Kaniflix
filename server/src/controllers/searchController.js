const { tmdbService } = require('../services');
const { ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Search Controller
 * Handles search functionality
 */
const searchController = {
  /**
   * Multi-search (movies, TV shows)
   * GET /api/search
   */
  search: asyncHandler(async (req, res) => {
    const { query, page = 1 } = req.query;
    const data = await tmdbService.search(query, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Search movies only
   * GET /api/search/movies
   */
  searchMovies: asyncHandler(async (req, res) => {
    const { query, page = 1 } = req.query;
    const data = await tmdbService.searchMovies(query, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Search TV shows only
   * GET /api/search/tv
   */
  searchTV: asyncHandler(async (req, res) => {
    const { query, page = 1 } = req.query;
    const data = await tmdbService.searchTVShows(query, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Search people only
   * GET /api/search/person
   */
  searchPeople: asyncHandler(async (req, res) => {
    const { query, page = 1 } = req.query;
    const data = await tmdbService.searchPeople(query, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get trending content (movies, TV, or all)
   * GET /api/search/trending
   */
  getTrending: asyncHandler(async (req, res) => {
    const { mediaType = 'all', timeWindow = 'day', page = 1 } = req.query;
    const data = await tmdbService.getTrending(mediaType, timeWindow, parseInt(page));
    ApiResponse.paginated(res, data.results, {
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults
    });
  }),

  /**
   * Get all genres (movies + TV)
   * GET /api/search/genres
   */
  getAllGenres: asyncHandler(async (req, res) => {
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbService.getMovieGenres(),
      tmdbService.getTVGenres()
    ]);

    // Combine and deduplicate genres
    const genreMap = new Map();
    
    movieGenres.forEach(g => {
      genreMap.set(g.id, { ...g, mediaTypes: ['movie'] });
    });
    
    tvGenres.forEach(g => {
      if (genreMap.has(g.id)) {
        genreMap.get(g.id).mediaTypes.push('tv');
      } else {
        genreMap.set(g.id, { ...g, mediaTypes: ['tv'] });
      }
    });

    ApiResponse.success(res, {
      movie: movieGenres,
      tv: tvGenres,
      combined: Array.from(genreMap.values())
    });
  })
};

module.exports = searchController;
