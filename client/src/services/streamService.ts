import api from './api';
import type { StreamConfig, ApiResponse } from '@/types';

/**
 * Streaming Service
 * Handles stream token generation and player configuration
 * CRITICAL: This abstracts all streaming logic
 */
export const streamService = {
  /**
   * Get stream token for movie
   */
  async getMovieStreamToken(tmdbId: number): Promise<{ streamToken: string; expiresIn: number }> {
    const response = await api.post<ApiResponse<{ streamToken: string; expiresIn: number }>>(
      `/stream/movie/${tmdbId}`
    );
    return response.data.data;
  },

  /**
   * Get stream token for TV episode
   */
  async getTVStreamToken(
    tmdbId: number,
    season: number,
    episode: number
  ): Promise<{ streamToken: string; expiresIn: number }> {
    const response = await api.post<ApiResponse<{ streamToken: string; expiresIn: number }>>(
      `/stream/tv/${tmdbId}/${season}/${episode}`
    );
    return response.data.data;
  },

  /**
   * Get player configuration from stream token
   */
  async getPlayerConfig(streamToken: string): Promise<StreamConfig> {
    const response = await api.post<ApiResponse<StreamConfig>>('/stream/config', { streamToken });
    return response.data.data;
  },

  /**
   * Get player event configuration
   */
  async getPlayerEventsConfig(): Promise<{
    allowedOrigins: string[];
    eventTypes: Record<string, string>;
    progressUpdateInterval: number;
  }> {
    const response = await api.get('/stream/events-config');
    return response.data.data;
  },

  /**
   * Get available quality options
   */
  async getQualityOptions(): Promise<{ label: string; value: string }[]> {
    const response = await api.get('/stream/quality-options');
    return response.data.data;
  },
};

export default streamService;
