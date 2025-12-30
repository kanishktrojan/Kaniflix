import api from './api';
import type {
  Movie,
  TVShow,
  Season,
  Episode,
  Genre,
  MediaItem,
  BrowseFilters,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

// Helper to transform backend response to PaginatedResponse format
function transformPaginatedResponse<T>(response: any): PaginatedResponse<T> {
  return {
    results: response.data || [],
    page: response.pagination?.page || 1,
    total_pages: response.pagination?.totalPages || 1,
    total_results: response.pagination?.totalResults || 0,
  };
}

/**
 * TMDB Service
 * Handles all media-related API calls
 */
export const tmdbService = {
  // ==================== TRENDING ====================

  /**
   * Get trending content (movies and TV)
   */
  async getTrending(mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'day', page = 1): Promise<PaginatedResponse<MediaItem>> {
    const response = await api.get(
      `/search/trending?mediaType=${mediaType}&timeWindow=${timeWindow}&page=${page}`
    );
    return transformPaginatedResponse<MediaItem>(response.data);
  },

  // ==================== MOVIES ====================

  /**
   * Get trending movies
   */
  async getTrendingMovies(timeWindow = 'week', page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(
      `/movies/trending?timeWindow=${timeWindow}&page=${page}`
    );
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get popular movies
   */
  async getPopularMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/popular?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get top rated movies
   */
  async getTopRatedMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/top-rated?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/upcoming?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/now-playing?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get movie details
   */
  async getMovieDetails(id: number): Promise<Movie> {
    const response = await api.get<ApiResponse<Movie>>(`/movies/${id}`);
    return response.data.data;
  },

  /**
   * Get movie credits (cast & crew)
   */
  async getMovieCredits(id: number): Promise<{ cast: any[]; crew: any[] }> {
    const response = await api.get(`/movies/${id}/credits`);
    return response.data.data;
  },

  /**
   * Get similar movies
   */
  async getSimilarMovies(id: number, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/${id}/similar?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get movie recommendations
   */
  async getMovieRecommendations(id: number, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get(`/movies/${id}/recommendations?page=${page}`);
    return transformPaginatedResponse<Movie>(response.data);
  },

  /**
   * Get movie videos (trailers, etc.)
   */
  async getMovieVideos(id: number): Promise<{ results: any[] }> {
    const response = await api.get(`/movies/${id}/videos`);
    return response.data.data;
  },

  /**
   * Discover movies with filters
   */
  async discoverMovies(filters: BrowseFilters): Promise<PaginatedResponse<Movie>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.genre) params.append('genre', String(filters.genre));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.minRating) params.append('minRating', String(filters.minRating));

    const response = await api.get<PaginatedResponse<Movie>>(`/movies/discover?${params}`);
    return response.data;
  },

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreId: number, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await api.get<PaginatedResponse<Movie>>(
      `/movies/genre/${genreId}?page=${page}`
    );
    return response.data;
  },

  /**
   * Get movie genres
   */
  async getMovieGenres(): Promise<Genre[]> {
    const response = await api.get<ApiResponse<Genre[]>>('/movies/genres');
    return response.data.data;
  },

  // ==================== TV SHOWS ====================

  /**
   * Get trending TV shows
   */
  async getTrendingTVShows(timeWindow = 'week', page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(
      `/tv/trending?timeWindow=${timeWindow}&page=${page}`
    );
    return transformPaginatedResponse<TVShow>(response.data);
  },

  /**
   * Get popular TV shows
   */
  async getPopularTVShows(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(`/tv/popular?page=${page}`);
    return transformPaginatedResponse<TVShow>(response.data);
  },

  // Alias for HomePage
  async getPopularTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    return this.getPopularTVShows(page);
  },

  /**
   * Get top rated TV shows
   */
  async getTopRatedTVShows(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(`/tv/top-rated?page=${page}`);
    return transformPaginatedResponse<TVShow>(response.data);
  },

  // Alias for HomePage
  async getTopRatedTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    return this.getTopRatedTVShows(page);
  },

  /**
   * Get airing today TV shows
   */
  async getAiringTodayTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(`/tv/airing-today?page=${page}`);
    return transformPaginatedResponse<TVShow>(response.data);
  },

  /**
   * Get TV show details
   */
  async getTVDetails(id: number): Promise<TVShow> {
    const response = await api.get(`/tv/${id}`);
    return response.data.data;
  },

  /**
   * Get TV season details
   */
  async getTVSeasonDetails(showId: number, seasonNumber: number): Promise<Season> {
    const response = await api.get<ApiResponse<Season>>(
      `/tv/${showId}/season/${seasonNumber}`
    );
    return response.data.data;
  },

  // Alias for WatchPage
  async getSeasonDetails(showId: number, seasonNumber: number): Promise<Season> {
    return this.getTVSeasonDetails(showId, seasonNumber);
  },

  /**
   * Get TV episode details
   */
  async getTVEpisodeDetails(
    showId: number,
    seasonNumber: number,
    episodeNumber: number
  ): Promise<Episode> {
    const response = await api.get<ApiResponse<Episode>>(
      `/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`
    );
    return response.data.data;
  },

  /**
   * Get TV credits (cast & crew)
   */
  async getTVCredits(id: number): Promise<{ cast: any[]; crew: any[] }> {
    const response = await api.get(`/tv/${id}/credits`);
    return response.data.data;
  },

  /**
   * Get similar TV shows
   */
  async getSimilarTV(id: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(`/tv/${id}/similar?page=${page}`);
    return transformPaginatedResponse<TVShow>(response.data);
  },

  /**
   * Get TV show recommendations
   */
  async getTVRecommendations(id: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get(`/tv/${id}/recommendations?page=${page}`);
    return transformPaginatedResponse<TVShow>(response.data);
  },

  /**
   * Get TV show videos (trailers, etc.)
   */
  async getTVVideos(id: number): Promise<{ results: any[] }> {
    const response = await api.get(`/tv/${id}/videos`);
    return response.data.data;
  },

  /**
   * Discover TV shows with filters
   */
  async discoverTVShows(filters: BrowseFilters): Promise<PaginatedResponse<TVShow>> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.genre) params.append('genre', String(filters.genre));
    if (filters.year) params.append('year', String(filters.year));
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.minRating) params.append('minRating', String(filters.minRating));

    const response = await api.get<PaginatedResponse<TVShow>>(`/tv/discover?${params}`);
    return response.data;
  },

  /**
   * Get TV shows by genre
   */
  async getTVShowsByGenre(genreId: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await api.get<PaginatedResponse<TVShow>>(
      `/tv/genre/${genreId}?page=${page}`
    );
    return response.data;
  },

  /**
   * Get TV genres
   */
  async getTVGenres(): Promise<Genre[]> {
    const response = await api.get<ApiResponse<Genre[]>>('/tv/genres');
    return response.data.data;
  },

  // ==================== SEARCH ====================

  /**
   * Multi-search (movies, TV shows, people)
   */
  async searchMulti(query: string, page = 1): Promise<PaginatedResponse<MediaItem>> {
    const response = await api.get(
      `/search?query=${encodeURIComponent(query)}&page=${page}`
    );
    return transformPaginatedResponse<MediaItem>(response.data);
  },

  /**
   * Search movies only
   */
  async searchMovies(query: string, page = 1): Promise<PaginatedResponse<MediaItem>> {
    const response = await api.get(
      `/search/movies?query=${encodeURIComponent(query)}&page=${page}`
    );
    return transformPaginatedResponse<MediaItem>(response.data);
  },

  /**
   * Search TV shows only
   */
  async searchTV(query: string, page = 1): Promise<PaginatedResponse<MediaItem>> {
    const response = await api.get(
      `/search/tv?query=${encodeURIComponent(query)}&page=${page}`
    );
    return transformPaginatedResponse<MediaItem>(response.data);
  },

  /**
   * Search people only
   */
  async searchPeople(query: string, page = 1): Promise<PaginatedResponse<any>> {
    const response = await api.get(
      `/search/person?query=${encodeURIComponent(query)}&page=${page}`
    );
    return transformPaginatedResponse<any>(response.data);
  },

  /**
   * Legacy search method (alias for searchMulti)
   */
  async search(query: string, page = 1): Promise<PaginatedResponse<MediaItem>> {
    return this.searchMulti(query, page);
  },

  /**
   * Get all genres
   */
  async getAllGenres(): Promise<{ movie: Genre[]; tv: Genre[]; combined: Genre[] }> {
    const response = await api.get<ApiResponse<{ movie: Genre[]; tv: Genre[]; combined: Genre[] }>>(
      '/search/genres'
    );
    return response.data.data;
  },
};

export default tmdbService;
