const axios = require('axios');
const config = require('../config');
const { cacheService, CACHE_TTL, CacheService } = require('../utils/cacheService');
const { ApiError } = require('../utils/apiHelpers');

/**
 * TMDB API Service
 * Handles all interactions with The Movie Database API
 */
class TMDBService {
  constructor() {
    this.client = axios.create({
      baseURL: config.TMDB_BASE_URL,
      timeout: 15000, // 15 seconds timeout
      params: {
        api_key: config.TMDB_API_KEY
      }
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🎬 TMDB Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const errorMessage = error.response?.data?.status_message || error.message;

        console.error(`❌ TMDB Error: ${status || 'Network'} - ${errorMessage}`);

        if (status === 401) {
          throw ApiError.internal('TMDB API key is invalid');
        }
        if (status === 404) {
          throw ApiError.notFound('Content not found');
        }
        if (status === 429) {
          throw ApiError.tooManyRequests('Rate limit exceeded. Please try again.');
        }
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw ApiError.serviceUnavailable('TMDB request timed out.');
        }
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw ApiError.serviceUnavailable('Unable to connect to TMDB.');
        }

        throw ApiError.serviceUnavailable(`TMDB error: ${errorMessage}`);
      }
    );
  }

  /**
   * Generic cached fetch method
   */
  async cachedFetch(endpoint, params = {}, ttl = CACHE_TTL.MEDIUM) {
    const cacheKey = CacheService.generateTMDBKey(endpoint, params);

    return cacheService.getOrSet(cacheKey, async () => {
      const response = await this.client.get(endpoint, { params });
      return response.data;
    }, ttl);
  }

  /**
   * Build full image URL
   */
  getImageUrl(path, size = 'original', type = 'backdrop') {
    if (!path) return null;
    const sizeKey = config.IMAGE_SIZES[type]?.[size] || size;
    return `${config.TMDB_IMAGE_BASE_URL}/${sizeKey}${path}`;
  }

  /**
   * Transform movie data for frontend
   */
  transformMovie(movie) {
    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      overview: movie.overview,
      posterPath: this.getImageUrl(movie.poster_path, 'large', 'poster'),
      backdropPath: this.getImageUrl(movie.backdrop_path, 'large', 'backdrop'),
      releaseDate: movie.release_date,
      voteAverage: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      adult: movie.adult,
      genreIds: movie.genre_ids,
      genres: movie.genres,
      runtime: movie.runtime,
      mediaType: 'movie'
    };
  }

  /**
   * Transform TV show data for frontend
   */
  transformTVShow(show) {
    return {
      id: show.id,
      title: show.name,
      originalTitle: show.original_name,
      overview: show.overview,
      posterPath: this.getImageUrl(show.poster_path, 'large', 'poster'),
      backdropPath: this.getImageUrl(show.backdrop_path, 'large', 'backdrop'),
      firstAirDate: show.first_air_date,
      lastAirDate: show.last_air_date,
      voteAverage: show.vote_average,
      voteCount: show.vote_count,
      popularity: show.popularity,
      genreIds: show.genre_ids,
      genres: show.genres,
      numberOfSeasons: show.number_of_seasons,
      numberOfEpisodes: show.number_of_episodes,
      status: show.status,
      mediaType: 'tv'
    };
  }

  // ==================== TRENDING ENDPOINTS ====================

  /**
   * Get trending content (movies, TV, or all)
   */
  async getTrending(mediaType = 'all', timeWindow = 'day', page = 1) {
    const data = await this.cachedFetch(`/trending/${mediaType}/${timeWindow}`, { page }, CACHE_TTL.SHORT);
    return {
      results: data.results.map(item => {
        // Transform and ensure mediaType is set
        const transformedItem = item.media_type === 'tv' || item.first_air_date
          ? this.transformTVShow(item)
          : this.transformMovie(item);
        return {
          ...transformedItem,
          mediaType: item.media_type || (item.first_air_date ? 'tv' : 'movie')
        };
      }),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  // ==================== MOVIE ENDPOINTS ====================

  /**
   * Get trending movies
   */
  async getTrendingMovies(timeWindow = 'week', page = 1) {
    const data = await this.cachedFetch(`/trending/movie/${timeWindow}`, { page }, CACHE_TTL.SHORT);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get popular movies
   */
  async getPopularMovies(page = 1) {
    const data = await this.cachedFetch('/movie/popular', { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get top rated movies
   */
  async getTopRatedMovies(page = 1) {
    const data = await this.cachedFetch('/movie/top_rated', { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page = 1) {
    const data = await this.cachedFetch('/movie/upcoming', { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page = 1) {
    const data = await this.cachedFetch('/movie/now_playing', { page }, CACHE_TTL.SHORT);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get movie details
   */
  async getMovieDetails(movieId) {
    const data = await this.cachedFetch(`/movie/${movieId}`, {
      append_to_response: 'credits,videos,similar,recommendations,external_ids,images'
    }, CACHE_TTL.LONG);

    // Get English logo (or null language) from images
    const logos = data.images?.logos?.filter(logo =>
      logo.iso_639_1 === 'en' || logo.iso_639_1 === null
    ) || [];
    const logoPath = logos.length > 0 ? logos[0].file_path : null;

    return {
      ...this.transformMovie(data),
      logoPath: logoPath ? `${config.TMDB_IMAGE_BASE_URL}/w500${logoPath}` : null,
      tagline: data.tagline,
      budget: data.budget,
      revenue: data.revenue,
      runtime: data.runtime,
      status: data.status,
      imdbId: data.imdb_id || data.external_ids?.imdb_id,
      productionCompanies: data.production_companies,
      cast: data.credits?.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      })),
      crew: data.credits?.crew?.filter(c =>
        ['Director', 'Producer', 'Writer'].includes(c.job)
      ).slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      })),
      videos: data.videos?.results?.filter(v =>
        v.site === 'YouTube' && ['Trailer', 'Teaser'].includes(v.type)
      ).map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site
      })),
      similar: data.similar?.results?.slice(0, 12).map(m => this.transformMovie(m)),
      recommendations: data.recommendations?.results?.slice(0, 12).map(m => this.transformMovie(m))
    };
  }

  /**
   * Get movie credits
   */
  async getMovieCredits(movieId) {
    const data = await this.cachedFetch(`/movie/${movieId}/credits`, {}, CACHE_TTL.LONG);
    return {
      cast: data.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      })),
      crew: data.crew?.map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      }))
    };
  }

  /**
   * Get similar movies
   */
  async getSimilarMovies(movieId, page = 1) {
    const data = await this.cachedFetch(`/movie/${movieId}/similar`, { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get movie recommendations
   */
  async getMovieRecommendations(movieId, page = 1) {
    const data = await this.cachedFetch(`/movie/${movieId}/recommendations`, { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get movie videos
   */
  async getMovieVideos(movieId) {
    const data = await this.cachedFetch(`/movie/${movieId}/videos`, {}, CACHE_TTL.LONG);
    return {
      results: data.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official
      }))
    };
  }

  /**
   * Discover movies with filters
   */
  async discoverMovies(filters = {}) {
    const params = {
      page: filters.page || 1,
      sort_by: filters.sort || 'popularity.desc',
      include_adult: false,
      include_video: false,
      'vote_count.gte': 50
    };

    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.primary_release_year = filters.year;
    if (filters.minRating) params['vote_average.gte'] = filters.minRating;
    if (filters.maxRating) params['vote_average.lte'] = filters.maxRating;

    const data = await this.cachedFetch('/discover/movie', params, CACHE_TTL.SHORT);
    return {
      results: data.results.map(m => this.transformMovie(m)),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  // ==================== TV SHOW ENDPOINTS ====================

  /**
   * Get trending TV shows
   */
  async getTrendingTVShows(timeWindow = 'week', page = 1) {
    const data = await this.cachedFetch(`/trending/tv/${timeWindow}`, { page }, CACHE_TTL.SHORT);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get popular TV shows
   */
  async getPopularTVShows(page = 1) {
    const data = await this.cachedFetch('/tv/popular', { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get top rated TV shows
   */
  async getTopRatedTVShows(page = 1) {
    const data = await this.cachedFetch('/tv/top_rated', { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get airing today TV shows
   */
  async getAiringTodayTV(page = 1) {
    const data = await this.cachedFetch('/tv/airing_today', { page }, CACHE_TTL.SHORT);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get TV show details
   */
  async getTVShowDetails(tvId) {
    const data = await this.cachedFetch(`/tv/${tvId}`, {
      append_to_response: 'credits,videos,similar,recommendations,external_ids,content_ratings,images'
    }, CACHE_TTL.LONG);

    // Get English logo (or null language) from images
    const logos = data.images?.logos?.filter(logo =>
      logo.iso_639_1 === 'en' || logo.iso_639_1 === null
    ) || [];
    const logoPath = logos.length > 0 ? logos[0].file_path : null;

    return {
      ...this.transformTVShow(data),
      logoPath: logoPath ? `${config.TMDB_IMAGE_BASE_URL}/w500${logoPath}` : null,
      tagline: data.tagline,
      status: data.status,
      type: data.type,
      imdbId: data.external_ids?.imdb_id,
      networks: data.networks?.map(n => ({
        id: n.id,
        name: n.name,
        logoPath: this.getImageUrl(n.logo_path, 'small', 'poster')
      })),
      seasons: data.seasons?.map(s => ({
        id: s.id,
        name: s.name,
        seasonNumber: s.season_number,
        episodeCount: s.episode_count,
        airDate: s.air_date,
        posterPath: this.getImageUrl(s.poster_path, 'medium', 'poster'),
        overview: s.overview
      })),
      cast: data.credits?.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      })),
      videos: data.videos?.results?.filter(v =>
        v.site === 'YouTube' && ['Trailer', 'Teaser', 'Opening Credits'].includes(v.type)
      ).map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site
      })),
      similar: data.similar?.results?.slice(0, 12).map(s => this.transformTVShow(s)),
      recommendations: data.recommendations?.results?.slice(0, 12).map(s => this.transformTVShow(s))
    };
  }

  /**
   * Get TV credits
   */
  async getTVCredits(tvId) {
    const data = await this.cachedFetch(`/tv/${tvId}/credits`, {}, CACHE_TTL.LONG);
    return {
      cast: data.cast?.slice(0, 20).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      })),
      crew: data.crew?.map(c => ({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        profilePath: this.getImageUrl(c.profile_path, 'medium', 'profile')
      }))
    };
  }

  /**
   * Get similar TV shows
   */
  async getSimilarTVShows(tvId, page = 1) {
    const data = await this.cachedFetch(`/tv/${tvId}/similar`, { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get TV recommendations
   */
  async getTVRecommendations(tvId, page = 1) {
    const data = await this.cachedFetch(`/tv/${tvId}/recommendations`, { page }, CACHE_TTL.MEDIUM);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    };
  }

  /**
   * Get TV videos
   */
  async getTVVideos(tvId) {
    const data = await this.cachedFetch(`/tv/${tvId}/videos`, {}, CACHE_TTL.LONG);
    return {
      results: data.results?.filter(v => v.site === 'YouTube').map(v => ({
        id: v.id,
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official
      }))
    };
  }

  /**
   * Get TV season details
   */
  async getTVSeasonDetails(tvId, seasonNumber) {
    const data = await this.cachedFetch(`/tv/${tvId}/season/${seasonNumber}`, {}, CACHE_TTL.LONG);

    return {
      id: data.id,
      name: data.name,
      seasonNumber: data.season_number,
      airDate: data.air_date,
      overview: data.overview,
      posterPath: this.getImageUrl(data.poster_path, 'large', 'poster'),
      episodes: data.episodes?.map(e => ({
        id: e.id,
        name: e.name,
        episodeNumber: e.episode_number,
        seasonNumber: e.season_number,
        overview: e.overview,
        airDate: e.air_date,
        runtime: e.runtime,
        stillPath: this.getImageUrl(e.still_path, 'medium', 'backdrop'),
        voteAverage: e.vote_average
      }))
    };
  }

  /**
   * Get TV episode details
   */
  async getTVEpisodeDetails(tvId, seasonNumber, episodeNumber) {
    const data = await this.cachedFetch(
      `/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`,
      { append_to_response: 'credits,videos' },
      CACHE_TTL.LONG
    );

    return {
      id: data.id,
      name: data.name,
      episodeNumber: data.episode_number,
      seasonNumber: data.season_number,
      overview: data.overview,
      airDate: data.air_date,
      runtime: data.runtime,
      stillPath: this.getImageUrl(data.still_path, 'large', 'backdrop'),
      voteAverage: data.vote_average,
      crew: data.crew?.slice(0, 10),
      guestStars: data.credits?.guest_stars?.slice(0, 10).map(g => ({
        id: g.id,
        name: g.name,
        character: g.character,
        profilePath: this.getImageUrl(g.profile_path, 'medium', 'profile')
      }))
    };
  }

  /**
   * Discover TV shows with filters
   */
  async discoverTVShows(filters = {}) {
    const params = {
      page: filters.page || 1,
      sort_by: filters.sort || 'popularity.desc',
      include_adult: false,
      'vote_count.gte': 50
    };

    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.first_air_date_year = filters.year;
    if (filters.minRating) params['vote_average.gte'] = filters.minRating;

    const data = await this.cachedFetch('/discover/tv', params, CACHE_TTL.SHORT);
    return {
      results: data.results.map(s => this.transformTVShow(s)),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  // ==================== SEARCH & GENRES ====================

  /**
   * Multi-search (movies, TV, people)
   */
  async search(query, page = 1) {
    const data = await this.cachedFetch('/search/multi', { query, page }, CACHE_TTL.SHORT);

    return {
      results: data.results
        .filter(item => item.media_type !== 'person')
        .map(item => {
          if (item.media_type === 'movie') {
            return { ...this.transformMovie(item), mediaType: 'movie' };
          }
          return { ...this.transformTVShow(item), mediaType: 'tv' };
        }),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  /**
   * Search movies only
   */
  async searchMovies(query, page = 1) {
    const data = await this.cachedFetch('/search/movie', { query, page }, CACHE_TTL.SHORT);

    return {
      results: data.results.map(item => ({ ...this.transformMovie(item), mediaType: 'movie' })),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  /**
   * Search TV shows only
   */
  async searchTVShows(query, page = 1) {
    const data = await this.cachedFetch('/search/tv', { query, page }, CACHE_TTL.SHORT);

    return {
      results: data.results.map(item => ({ ...this.transformTVShow(item), mediaType: 'tv' })),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  /**
   * Search people only
   */
  async searchPeople(query, page = 1) {
    const data = await this.cachedFetch('/search/person', { query, page }, CACHE_TTL.SHORT);

    return {
      results: data.results.map(person => ({
        id: person.id,
        name: person.name,
        profilePath: this.getImageUrl(person.profile_path, 'medium', 'poster'),
        knownFor: person.known_for_department,
        popularity: person.popularity,
        mediaType: 'person'
      })),
      page: data.page,
      totalPages: Math.min(data.total_pages, 500),
      totalResults: data.total_results
    };
  }

  /**
   * Get movie genres
   */
  async getMovieGenres() {
    const data = await this.cachedFetch('/genre/movie/list', {}, CACHE_TTL.VERY_LONG);
    return data.genres;
  }

  /**
   * Get TV genres
   */
  async getTVGenres() {
    const data = await this.cachedFetch('/genre/tv/list', {}, CACHE_TTL.VERY_LONG);
    return data.genres;
  }

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreId, page = 1) {
    return this.discoverMovies({ genre: genreId, page });
  }

  /**
   * Get TV shows by genre
   */
  async getTVShowsByGenre(genreId, page = 1) {
    return this.discoverTVShows({ genre: genreId, page });
  }
}

module.exports = new TMDBService();
