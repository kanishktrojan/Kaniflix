import api from './api';
import type {
  WatchHistory,
  WatchlistItem,
  UserStats,
  MediaType,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

// Helper to transform backend paginated response to frontend format
interface BackendPaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function transformPaginatedResponse<T>(response: BackendPaginatedResponse<T>): PaginatedResponse<T> {
  return {
    results: response.data || [],
    page: response.pagination?.page || 1,
    total_pages: response.pagination?.totalPages || 1,
    total_results: response.pagination?.totalResults || 0,
  };
}

interface ProgressUpdate {
  mediaType: MediaType;
  tmdbId: number;
  imdbId?: string;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  progress: number;
  currentTime: number;
  duration: number;
}

interface WatchlistAdd {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  releaseDate?: string | null;
  voteAverage?: number;
}

/**
 * User Content Service
 * Handles watch history, watchlist, and user progress
 */
export const userContentService = {
  // ==================== WATCH PROGRESS ====================

  /**
   * Update watch progress
   */
  async updateProgress(data: ProgressUpdate): Promise<WatchHistory> {
    const response = await api.post<ApiResponse<WatchHistory>>('/user/progress', data);
    return response.data.data;
  },

  /**
   * Get progress for specific media
   */
  async getProgress(
    mediaType: MediaType,
    tmdbId: number,
    season?: number,
    episode?: number
  ): Promise<WatchHistory | null> {
    const params = new URLSearchParams();
    if (season !== undefined) params.append('season', String(season));
    if (episode !== undefined) params.append('episode', String(episode));

    const response = await api.get<ApiResponse<WatchHistory | null>>(
      `/user/progress/${mediaType}/${tmdbId}?${params}`
    );
    return response.data.data;
  },

  // ==================== CONTINUE WATCHING ====================

  /**
   * Get continue watching list
   */
  async getContinueWatching(limit = 20): Promise<WatchHistory[]> {
    const response = await api.get<ApiResponse<WatchHistory[]>>(
      `/user/continue-watching?limit=${limit}`
    );
    return response.data.data;
  },

  // ==================== WATCH HISTORY ====================

  /**
   * Get watch history
   */
  async getWatchHistory(page = 1, limit = 20): Promise<PaginatedResponse<WatchHistory>> {
    const response = await api.get<BackendPaginatedResponse<WatchHistory>>(
      `/user/history?page=${page}&limit=${limit}`
    );
    return transformPaginatedResponse(response.data);
  },

  /**
   * Clear all watch history
   */
  async clearHistory(): Promise<void> {
    await api.delete('/user/history');
  },

  /**
   * Remove item from history
   */
  async removeFromHistory(mediaType: MediaType, tmdbId: number): Promise<void> {
    await api.delete(`/user/history/${mediaType}/${tmdbId}`);
  },

  // ==================== LAST EPISODE ====================

  /**
   * Get last watched episode for TV show
   */
  async getLastWatchedEpisode(tmdbId: number): Promise<WatchHistory | null> {
    const response = await api.get<ApiResponse<WatchHistory | null>>(
      `/user/last-episode/${tmdbId}`
    );
    return response.data.data;
  },

  // ==================== WATCHLIST ====================

  /**
   * Get user's watchlist
   */
  async getWatchlist(
    page = 1,
    limit = 20,
    mediaType?: MediaType
  ): Promise<PaginatedResponse<WatchlistItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (mediaType) params.append('mediaType', mediaType);

    const response = await api.get<BackendPaginatedResponse<WatchlistItem>>(
      `/user/watchlist?${params}`
    );
    return transformPaginatedResponse(response.data);
  },

  /**
   * Add to watchlist
   */
  async addToWatchlist(data: WatchlistAdd): Promise<WatchlistItem> {
    const response = await api.post<ApiResponse<WatchlistItem>>('/user/watchlist', data);
    return response.data.data;
  },

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(tmdbId: number, mediaType: MediaType): Promise<void> {
    await api.delete(`/user/watchlist/${tmdbId}?mediaType=${mediaType}`);
  },

  /**
   * Check if item is in watchlist
   */
  async checkWatchlistStatus(
    mediaType: MediaType,
    tmdbId: number
  ): Promise<{ inWatchlist: boolean }> {
    const response = await api.get<ApiResponse<{ inWatchlist: boolean }>>(
      `/user/watchlist/check/${mediaType}/${tmdbId}`
    );
    return response.data.data;
  },

  /**
   * Check watchlist status for multiple items
   */
  async checkWatchlistBatch(
    items: { tmdbId: number; mediaType: MediaType }[]
  ): Promise<Record<string, boolean>> {
    const response = await api.post<ApiResponse<Record<string, boolean>>>(
      '/user/watchlist/check-batch',
      { items }
    );
    return response.data.data;
  },

  // ==================== STATS ====================

  /**
   * Get user viewing stats
   */
  async getStats(): Promise<UserStats> {
    const response = await api.get<ApiResponse<UserStats>>('/user/stats');
    return response.data.data;
  },
};

export default userContentService;
