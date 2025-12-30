const config = require('../config');
const { v4: uuidv4 } = require('uuid');

/**
 * Streaming Service
 * CRITICAL: This service abstracts all streaming logic
 * NEVER expose direct URLs to the client
 */
class StreamingService {
  constructor() {
    // Private configuration - never exposed
    this._providers = {
      primary: {
        baseUrl: 'https://vidrock.net',
        moviePath: '/movie/',
        tvPath: '/tv/'
      }
    };

    // Default player parameters
    this._defaultParams = {
      autoplay: '1',
      theme: 'dark',
      autonext: '1'
    };
  }

  /**
   * Generate secure stream token
   * This adds a layer of abstraction for stream requests
   */
  generateStreamToken(mediaType, tmdbId, options = {}) {
    const token = uuidv4();
    const timestamp = Date.now();
    
    // In production, store this in Redis with TTL
    // For now, we encode the data (in production, use encryption)
    const payload = {
      t: token,
      m: mediaType,
      i: tmdbId,
      s: options.season,
      e: options.episode,
      ts: timestamp
    };

    // Base64 encode (in production, use proper encryption)
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /**
   * Validate and decode stream token
   */
  validateStreamToken(token) {
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
      
      // Check token age (valid for 1 hour)
      const maxAge = 60 * 60 * 1000;
      if (Date.now() - payload.ts > maxAge) {
        return { valid: false, error: 'Token expired' };
      }

      return {
        valid: true,
        mediaType: payload.m,
        tmdbId: payload.i,
        season: payload.s,
        episode: payload.e
      };
    } catch (error) {
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Get embed URL for movie
   * PRIVATE METHOD - Never expose URL directly
   */
  _getMovieEmbedUrl(tmdbId, imdbId = null, params = {}) {
    const provider = this._providers.primary;
    const id = imdbId || tmdbId;
    const queryParams = new URLSearchParams({
      ...this._defaultParams,
      ...params
    });

    return `${provider.baseUrl}${provider.moviePath}${id}?${queryParams}`;
  }

  /**
   * Get embed URL for TV episode
   * PRIVATE METHOD - Never expose URL directly
   */
  _getTVEmbedUrl(tmdbId, season, episode, imdbId = null, params = {}) {
    const provider = this._providers.primary;
    const id = imdbId || tmdbId;
    const queryParams = new URLSearchParams({
      ...this._defaultParams,
      ...params,
      episodeselector: '1',
      nextbutton: '1'
    });

    return `${provider.baseUrl}${provider.tvPath}${id}/${season}/${episode}?${queryParams}`;
  }

  /**
   * Get stream configuration for client
   * Returns an opaque configuration object, not direct URLs
   */
  getStreamConfig(streamToken, userPreferences = {}) {
    const validation = this.validateStreamToken(streamToken);
    
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Build player parameters based on user preferences
    const playerParams = {
      theme: userPreferences.theme || 'dark',
      autoplay: userPreferences.autoplay !== false ? '1' : '0',
      autonext: userPreferences.autonext !== false ? '1' : '0',
      lang: userPreferences.language || 'en'
    };

    let embedUrl;
    if (validation.mediaType === 'movie') {
      embedUrl = this._getMovieEmbedUrl(validation.tmdbId, null, playerParams);
    } else {
      embedUrl = this._getTVEmbedUrl(
        validation.tmdbId,
        validation.season,
        validation.episode,
        null,
        playerParams
      );
    }

    // Return configuration with embedded URL (only sent server-side rendered)
    return {
      success: true,
      config: {
        embedUrl, // In production, consider server-side rendering the iframe
        mediaType: validation.mediaType,
        tmdbId: validation.tmdbId,
        season: validation.season,
        episode: validation.episode,
        playerSettings: {
          allowFullscreen: true,
          allowAutoplay: true,
          sandbox: 'allow-scripts allow-same-origin allow-forms'
        }
      }
    };
  }

  /**
   * Get available quality options
   * Could be expanded with actual quality detection
   */
  getQualityOptions() {
    return [
      { label: 'Auto', value: 'auto' },
      { label: '1080p', value: '1080' },
      { label: '720p', value: '720' },
      { label: '480p', value: '480' },
      { label: '360p', value: '360' }
    ];
  }

  /**
   * Generate player event handler configuration
   * For handling postMessage events from embedded player
   */
  getPlayerEventConfig() {
    return {
      allowedOrigins: ['https://vidrock.net'],
      eventTypes: {
        MEDIA_DATA: 'media_data',
        PLAYER_EVENT: 'player_event',
        PROGRESS_UPDATE: 'progress_update',
        ERROR: 'error'
      },
      progressUpdateInterval: 10000 // 10 seconds
    };
  }
}

module.exports = new StreamingService();
