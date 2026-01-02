import axios from 'axios';
import type {
  Movie,
  TVShow,
  Season,
  Episode,
  Genre,
  MediaItem,
  BrowseFilters,
  PaginatedResponse,
} from '@/types';

// TMDB API Configuration - Use environment variable or fallback
// NOTE: For production, you should use a proxy or serverless function to hide the API key
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || '';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Image size configurations
const IMAGE_SIZES = {
  backdrop: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  poster: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  profile: {
    small: 'w45',
    medium: 'w185',
    large: 'h632',
    original: 'original',
  },
};

// Create axios instance for TMDB
const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000,
  params: {
    api_key: TMDB_API_KEY,
  },
});

// Request interceptor for logging in development
tmdbClient.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`🎬 TMDB Direct: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
tmdbClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('TMDB API key is invalid');
    }
    if (error.response?.status === 404) {
      console.error('Content not found');
    }
    return Promise.reject(error);
  }
);

/**
 * Build full image URL
 */
function getImageUrl(
  path: string | null,
  size: 'small' | 'medium' | 'large' | 'original' = 'large',
  type: 'backdrop' | 'poster' | 'profile' = 'backdrop'
): string | null {
  if (!path) return null;
  const sizeKey = IMAGE_SIZES[type]?.[size] || size;
  return `${TMDB_IMAGE_BASE_URL}/${sizeKey}${path}`;
}

/**
 * Transform raw TMDB movie data for frontend
 */
function transformMovie(movie: any): Movie {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    posterPath: getImageUrl(movie.poster_path, 'large', 'poster'),
    backdropPath: getImageUrl(movie.backdrop_path, 'large', 'backdrop'),
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    popularity: movie.popularity,
    adult: movie.adult,
    genreIds: movie.genre_ids,
    genres: movie.genres,
    runtime: movie.runtime,
    mediaType: 'movie',
    tagline: movie.tagline,
    budget: movie.budget,
    revenue: movie.revenue,
    status: movie.status,
    imdbId: movie.imdb_id,
    productionCompanies: movie.production_companies?.map((c: any) => ({
      id: c.id,
      name: c.name,
      logoPath: getImageUrl(c.logo_path, 'medium', 'poster'),
      originCountry: c.origin_country,
    })),
  };
}

/**
 * Transform raw TMDB TV show data for frontend
 */
function transformTVShow(show: any): TVShow {
  return {
    id: show.id,
    title: show.name,
    originalTitle: show.original_name,
    overview: show.overview,
    posterPath: getImageUrl(show.poster_path, 'large', 'poster'),
    backdropPath: getImageUrl(show.backdrop_path, 'large', 'backdrop'),
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
    mediaType: 'tv',
    tagline: show.tagline,
    type: show.type,
    networks: show.networks?.map((n: any) => ({
      id: n.id,
      name: n.name,
      logoPath: getImageUrl(n.logo_path, 'medium', 'poster'),
    })),
    seasons: show.seasons?.map((s: any) => transformSeason(s)),
  };
}

/**
 * Transform season data
 */
function transformSeason(season: any): Season {
  return {
    id: season.id,
    name: season.name,
    seasonNumber: season.season_number,
    episodeCount: season.episode_count,
    airDate: season.air_date,
    posterPath: getImageUrl(season.poster_path, 'medium', 'poster'),
    overview: season.overview || '',
    episodes: season.episodes?.map((e: any) => transformEpisode(e)),
  };
}

/**
 * Transform episode data
 */
function transformEpisode(episode: any): Episode {
  return {
    id: episode.id,
    name: episode.name,
    episodeNumber: episode.episode_number,
    seasonNumber: episode.season_number,
    overview: episode.overview,
    airDate: episode.air_date,
    runtime: episode.runtime,
    stillPath: getImageUrl(episode.still_path, 'medium', 'backdrop'),
    voteAverage: episode.vote_average,
    guestStars: episode.guest_stars?.map((g: any) => ({
      id: g.id,
      name: g.name,
      character: g.character,
      profilePath: getImageUrl(g.profile_path, 'medium', 'profile'),
    })),
  };
}

/**
 * Transform credits data
 */
function transformCredits(credits: any) {
  return {
    cast: credits.cast?.map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: getImageUrl(c.profile_path, 'medium', 'profile'),
    })) || [],
    crew: credits.crew?.map((c: any) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      profilePath: getImageUrl(c.profile_path, 'medium', 'profile'),
    })) || [],
  };
}

/**
 * Transform media item (could be movie or TV)
 */
function transformMediaItem(item: any): MediaItem {
  const isTV = item.media_type === 'tv' || item.first_air_date;
  if (isTV) {
    return transformTVShow(item);
  }
  return transformMovie(item);
}

/**
 * Sort mapping for TMDB discover API
 */
const SORT_MAPPING: Record<string, string> = {
  'popularity.desc': 'popularity.desc',
  'popularity.asc': 'popularity.asc',
  'vote_average.desc': 'vote_average.desc',
  'vote_average.asc': 'vote_average.asc',
  'release_date.desc': 'primary_release_date.desc',
  'release_date.asc': 'primary_release_date.asc',
  'first_air_date.desc': 'first_air_date.desc',
  'first_air_date.asc': 'first_air_date.asc',
  'title.asc': 'original_title.asc',
  'title.desc': 'original_title.desc',
};

/**
 * TMDB Direct Service
 * Calls TMDB API directly from frontend for faster content loading
 */
export const tmdbDirectService = {
  // ==================== TRENDING ====================

  /**
   * Get trending content (movies and TV)
   */
  async getTrending(
    mediaType: 'all' | 'movie' | 'tv' = 'all',
    timeWindow: 'day' | 'week' = 'day',
    page = 1
  ): Promise<PaginatedResponse<MediaItem>> {
    const response = await tmdbClient.get(`/trending/${mediaType}/${timeWindow}`, {
      params: { page },
    });
    return {
      results: response.data.results.map((item: any) => ({
        ...transformMediaItem(item),
        mediaType: item.media_type || (item.first_air_date ? 'tv' : 'movie'),
      })),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  // ==================== MOVIES ====================

  /**
   * Get trending movies
   */
  async getTrendingMovies(
    timeWindow: 'day' | 'week' = 'week',
    page = 1
  ): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get(`/trending/movie/${timeWindow}`, {
      params: { page },
    });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get popular movies
   */
  async getPopularMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get('/movie/popular', { params: { page } });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get top rated movies
   */
  async getTopRatedMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get('/movie/top_rated', { params: { page } });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get upcoming movies
   */
  async getUpcomingMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get('/movie/upcoming', { params: { page } });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get now playing movies
   */
  async getNowPlayingMovies(page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get('/movie/now_playing', { params: { page } });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get movie details
   */
  async getMovieDetails(id: number): Promise<Movie> {
    const response = await tmdbClient.get(`/movie/${id}`, {
      params: { append_to_response: 'videos,credits,similar,recommendations' },
    });
    const movie = transformMovie(response.data);

    // Add additional data
    if (response.data.credits) {
      movie.cast = transformCredits(response.data.credits).cast;
      movie.crew = transformCredits(response.data.credits).crew;
    }
    if (response.data.videos) {
      movie.videos = response.data.videos.results;
    }
    if (response.data.similar) {
      movie.similar = response.data.similar.results.map(transformMovie);
    }
    if (response.data.recommendations) {
      movie.recommendations = response.data.recommendations.results.map(transformMovie);
    }

    return movie;
  },

  /**
   * Get movie credits (cast & crew)
   */
  async getMovieCredits(id: number): Promise<{ cast: any[]; crew: any[] }> {
    const response = await tmdbClient.get(`/movie/${id}/credits`);
    return transformCredits(response.data);
  },

  /**
   * Get similar movies
   */
  async getSimilarMovies(id: number, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get(`/movie/${id}/similar`, { params: { page } });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get movie recommendations
   */
  async getMovieRecommendations(id: number, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get(`/movie/${id}/recommendations`, {
      params: { page },
    });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get movie videos (trailers, etc.)
   */
  async getMovieVideos(id: number): Promise<{ results: any[] }> {
    const response = await tmdbClient.get(`/movie/${id}/videos`);
    return { results: response.data.results };
  },

  /**
   * Discover movies with filters
   */
  async discoverMovies(filters: BrowseFilters): Promise<PaginatedResponse<Movie>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      sort_by: SORT_MAPPING[filters.sort || 'popularity.desc'] || 'popularity.desc',
    };

    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.primary_release_year = filters.year;
    if (filters.minRating) params['vote_average.gte'] = filters.minRating;

    const response = await tmdbClient.get('/discover/movie', { params });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get movies by genre
   */
  async getMoviesByGenre(genreId: number, page = 1): Promise<PaginatedResponse<Movie>> {
    return this.discoverMovies({ genre: genreId, page });
  },

  /**
   * Get movie genres
   */
  async getMovieGenres(): Promise<Genre[]> {
    const response = await tmdbClient.get('/genre/movie/list');
    return response.data.genres;
  },

  // ==================== TV SHOWS ====================

  /**
   * Get trending TV shows
   */
  async getTrendingTVShows(
    timeWindow: 'day' | 'week' = 'week',
    page = 1
  ): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get(`/trending/tv/${timeWindow}`, {
      params: { page },
    });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get popular TV shows
   */
  async getPopularTVShows(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get('/tv/popular', { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  // Alias for HomePage
  async getPopularTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    return this.getPopularTVShows(page);
  },

  /**
   * Get top rated TV shows
   */
  async getTopRatedTVShows(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get('/tv/top_rated', { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  // Alias for HomePage
  async getTopRatedTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    return this.getTopRatedTVShows(page);
  },

  /**
   * Get airing today TV shows
   */
  async getAiringTodayTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get('/tv/airing_today', { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get on the air TV shows
   */
  async getOnTheAirTV(page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get('/tv/on_the_air', { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get TV show details
   */
  async getTVDetails(id: number): Promise<TVShow> {
    const response = await tmdbClient.get(`/tv/${id}`, {
      params: { append_to_response: 'videos,credits,similar,recommendations' },
    });
    const show = transformTVShow(response.data);

    // Add additional data
    if (response.data.credits) {
      show.cast = transformCredits(response.data.credits).cast;
    }
    if (response.data.videos) {
      show.videos = response.data.videos.results;
    }
    if (response.data.similar) {
      show.similar = response.data.similar.results.map(transformTVShow);
    }
    if (response.data.recommendations) {
      show.recommendations = response.data.recommendations.results.map(transformTVShow);
    }

    return show;
  },

  /**
   * Get TV season details
   */
  async getTVSeasonDetails(showId: number, seasonNumber: number): Promise<Season> {
    const response = await tmdbClient.get(`/tv/${showId}/season/${seasonNumber}`);
    return transformSeason(response.data);
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
    const response = await tmdbClient.get(
      `/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`
    );
    return transformEpisode(response.data);
  },

  /**
   * Get TV credits (cast & crew)
   */
  async getTVCredits(id: number): Promise<{ cast: any[]; crew: any[] }> {
    const response = await tmdbClient.get(`/tv/${id}/credits`);
    return transformCredits(response.data);
  },

  /**
   * Get similar TV shows
   */
  async getSimilarTV(id: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get(`/tv/${id}/similar`, { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get TV show recommendations
   */
  async getTVRecommendations(id: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get(`/tv/${id}/recommendations`, { params: { page } });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get TV show videos (trailers, etc.)
   */
  async getTVVideos(id: number): Promise<{ results: any[] }> {
    const response = await tmdbClient.get(`/tv/${id}/videos`);
    return { results: response.data.results };
  },

  /**
   * Discover TV shows with filters
   */
  async discoverTVShows(filters: BrowseFilters): Promise<PaginatedResponse<TVShow>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      sort_by: SORT_MAPPING[filters.sort || 'popularity.desc'] || 'popularity.desc',
    };

    if (filters.genre) params.with_genres = filters.genre;
    if (filters.year) params.first_air_date_year = filters.year;
    if (filters.minRating) params['vote_average.gte'] = filters.minRating;

    const response = await tmdbClient.get('/discover/tv', { params });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Get TV shows by genre
   */
  async getTVShowsByGenre(genreId: number, page = 1): Promise<PaginatedResponse<TVShow>> {
    return this.discoverTVShows({ genre: genreId, page });
  },

  /**
   * Get TV genres
   */
  async getTVGenres(): Promise<Genre[]> {
    const response = await tmdbClient.get('/genre/tv/list');
    return response.data.genres;
  },

  // ==================== SEARCH ====================

  /**
   * Multi-search (movies, TV shows, people)
   */
  async searchMulti(query: string, page = 1): Promise<PaginatedResponse<MediaItem>> {
    const response = await tmdbClient.get('/search/multi', {
      params: { query, page },
    });
    return {
      results: response.data.results
        .filter((item: any) => item.media_type !== 'person')
        .map((item: any) => ({
          ...transformMediaItem(item),
          mediaType: item.media_type,
        })),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Search movies only
   */
  async searchMovies(query: string, page = 1): Promise<PaginatedResponse<Movie>> {
    const response = await tmdbClient.get('/search/movie', {
      params: { query, page },
    });
    return {
      results: response.data.results.map(transformMovie),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Search TV shows only
   */
  async searchTV(query: string, page = 1): Promise<PaginatedResponse<TVShow>> {
    const response = await tmdbClient.get('/search/tv', {
      params: { query, page },
    });
    return {
      results: response.data.results.map(transformTVShow),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
  },

  /**
   * Search people only
   */
  async searchPeople(query: string, page = 1): Promise<PaginatedResponse<any>> {
    const response = await tmdbClient.get('/search/person', {
      params: { query, page },
    });
    return {
      results: response.data.results.map((p: any) => ({
        id: p.id,
        name: p.name,
        profilePath: getImageUrl(p.profile_path, 'medium', 'profile'),
        knownForDepartment: p.known_for_department,
        knownFor: p.known_for?.map(transformMediaItem),
      })),
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
    };
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
    const [movieGenres, tvGenres] = await Promise.all([
      this.getMovieGenres(),
      this.getTVGenres(),
    ]);

    // Create combined genres with deduplication
    const genreMap = new Map<number, Genre>();
    movieGenres.forEach((g) => genreMap.set(g.id, { ...g, mediaTypes: ['movie'] }));
    tvGenres.forEach((g) => {
      const existing = genreMap.get(g.id);
      if (existing) {
        existing.mediaTypes = ['movie', 'tv'];
      } else {
        genreMap.set(g.id, { ...g, mediaTypes: ['tv'] });
      }
    });

    return {
      movie: movieGenres,
      tv: tvGenres,
      combined: Array.from(genreMap.values()),
    };
  },
};

export default tmdbDirectService;
