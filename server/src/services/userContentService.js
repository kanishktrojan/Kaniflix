const { User } = require('../models');
const { ApiError } = require('../utils/apiHelpers');

/**
 * User Content Service
 * Handles watch history, watchlist using embedded arrays in User document
 * 
 * Benefits of embedded approach:
 * - Single database query instead of separate collection lookup
 * - No joins needed
 * - Better performance for read operations
 * - Simpler data model
 * 
 * Trade-off: Media details (title, poster, etc.) are fetched from TMDB on-demand
 * This is more efficient as TMDB data might change and we don't duplicate storage
 */
class UserContentService {
  // ==================== WATCH HISTORY ====================

  /**
   * Deduplicate watch history - keeps the most recent entry for each unique item
   * @private
   */
  _dedupeWatchHistory(watchHistory) {
    const seen = new Map();
    
    // Sort by lastWatchedAt descending so most recent comes first
    const sorted = [...watchHistory].sort((a, b) => 
      new Date(b.lastWatchedAt || 0) - new Date(a.lastWatchedAt || 0)
    );
    
    const deduped = [];
    for (const item of sorted) {
      // Normalize season/episode to handle null/undefined/0 cases
      const season = item.mediaType === 'tv' ? (Number(item.seasonNumber) || 1) : null;
      const episode = item.mediaType === 'tv' ? (Number(item.episodeNumber) || 1) : null;
      
      // Create unique key: for TV it's tmdbId-mediaType-season-episode, for movies just tmdbId-mediaType
      const key = item.mediaType === 'tv'
        ? `${item.tmdbId}-${item.mediaType}-${season}-${episode}`
        : `${item.tmdbId}-${item.mediaType}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        // Also fix the item's season/episode if they were null
        if (item.mediaType === 'tv') {
          item.seasonNumber = season;
          item.episodeNumber = episode;
        }
        deduped.push(item);
      }
    }
    
    return deduped;
  }

  /**
   * Update watch progress
   * Stores minimal data - just IDs and progress
   */
  async updateProgress(userId, mediaData, progressData) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    // First, dedupe existing history to fix any past duplicates
    const originalLength = user.watchHistory.length;
    user.watchHistory = this._dedupeWatchHistory(user.watchHistory);
    
    if (user.watchHistory.length !== originalLength) {
      console.log(`[UserContentService] Cleaned up ${originalLength - user.watchHistory.length} duplicate entries for user ${userId}`);
    }

    // Ensure tmdbId is a number for comparison
    const tmdbIdNum = Number(mediaData.tmdbId);
    const mediaTypeStr = String(mediaData.mediaType);
    
    // For TV shows, normalize season/episode (default to 1 if not provided)
    const seasonNum = mediaTypeStr === 'tv' ? (Number(mediaData.seasonNumber) || 1) : null;
    const episodeNum = mediaTypeStr === 'tv' ? (Number(mediaData.episodeNumber) || 1) : null;

    // Find existing entry index with robust comparison
    const existingIndex = user.watchHistory.findIndex(item => {
      const itemTmdbId = Number(item.tmdbId);
      const itemMediaType = String(item.mediaType);
      
      // Basic match on tmdbId and mediaType
      if (itemTmdbId !== tmdbIdNum || itemMediaType !== mediaTypeStr) {
        return false;
      }
      
      // For TV shows, also match on season/episode
      if (mediaTypeStr === 'tv') {
        const itemSeason = Number(item.seasonNumber) || 1;
        const itemEpisode = Number(item.episodeNumber) || 1;
        return itemSeason === seasonNum && itemEpisode === episodeNum;
      }
      
      // For movies, just tmdbId + mediaType match is enough
      return true;
    });

    const isCompleted = progressData.progress >= 95;

    if (existingIndex >= 0) {
      // Update existing entry
      user.watchHistory[existingIndex].progress = progressData.progress;
      user.watchHistory[existingIndex].currentTime = progressData.currentTime;
      user.watchHistory[existingIndex].duration = progressData.duration;
      user.watchHistory[existingIndex].isCompleted = isCompleted;
      user.watchHistory[existingIndex].lastWatchedAt = new Date();
      // Also update season/episode in case they were null before
      if (mediaTypeStr === 'tv') {
        user.watchHistory[existingIndex].seasonNumber = seasonNum;
        user.watchHistory[existingIndex].episodeNumber = episodeNum;
      }
    } else {
      // Add new entry with normalized values
      user.watchHistory.push({
        tmdbId: tmdbIdNum,
        mediaType: mediaTypeStr,
        seasonNumber: seasonNum,
        episodeNumber: episodeNum,
        progress: progressData.progress,
        currentTime: progressData.currentTime,
        duration: progressData.duration,
        isCompleted,
        lastWatchedAt: new Date()
      });
    }

    await user.save();

    // Return the updated/created entry
    const entry = existingIndex >= 0 
      ? user.watchHistory[existingIndex] 
      : user.watchHistory[user.watchHistory.length - 1];

    return {
      tmdbId: entry.tmdbId,
      mediaType: entry.mediaType,
      seasonNumber: entry.seasonNumber,
      episodeNumber: entry.episodeNumber,
      progress: entry.progress,
      currentTime: entry.currentTime,
      duration: entry.duration,
      isCompleted: entry.isCompleted,
      lastWatchedAt: entry.lastWatchedAt
    };
  }

  /**
   * Get continue watching list
   * Returns items that:
   * - Have been watched (currentTime > 0)
   * - Are not completed (progress < 95%)
   * - Have valid duration data
   */
  async getContinueWatching(userId, limit = 20) {
    const user = await User.findById(userId).lean();
    if (!user) return [];

    // Dedupe first to handle any legacy duplicate entries
    const deduped = this._dedupeWatchHistory(user.watchHistory || []);

    return deduped
      .filter(item => 
        !item.isCompleted && 
        item.progress < 95 &&
        item.currentTime > 0 && // Must have some watch time
        item.duration > 0 // Must have valid duration
      )
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))
      .slice(0, limit);
  }

  /**
   * Get watch history with pagination
   */
  async getWatchHistory(userId, page = 1, limit = 20) {
    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        items: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    // Dedupe first to handle any legacy duplicate entries
    const deduped = this._dedupeWatchHistory(user.watchHistory || []);

    const sorted = deduped
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt));
    
    const total = sorted.length;
    const skip = (page - 1) * limit;
    const items = sorted.slice(skip, skip + limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get last watched episode for a TV show
   */
  async getLastWatchedEpisode(userId, tmdbId) {
    const user = await User.findById(userId).lean();
    if (!user) return null;

    const tvHistory = user.watchHistory
      .filter(item => item.tmdbId === tmdbId && item.mediaType === 'tv')
      .sort((a, b) => {
        // Sort by season desc, then episode desc, then lastWatchedAt desc
        if (b.seasonNumber !== a.seasonNumber) return b.seasonNumber - a.seasonNumber;
        if (b.episodeNumber !== a.episodeNumber) return b.episodeNumber - a.episodeNumber;
        return new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt);
      });

    return tvHistory[0] || null;
  }

  /**
   * Get progress for specific media
   */
  async getProgress(userId, tmdbId, mediaType, seasonNumber = null, episodeNumber = null) {
    const user = await User.findById(userId).lean();
    if (!user) return null;

    const entry = user.watchHistory.find(item => {
      const basicMatch = item.tmdbId === tmdbId && item.mediaType === mediaType;
      if (mediaType === 'tv' && seasonNumber !== null) {
        return basicMatch && 
               item.seasonNumber === seasonNumber && 
               (episodeNumber === null || item.episodeNumber === episodeNumber);
      }
      return basicMatch;
    });

    return entry || null;
  }

  /**
   * Clear watch history
   */
  async clearHistory(userId) {
    await User.findByIdAndUpdate(userId, { $set: { watchHistory: [] } });
    return { success: true };
  }

  /**
   * Remove item from history
   */
  async removeFromHistory(userId, tmdbId, mediaType) {
    await User.findByIdAndUpdate(userId, {
      $pull: {
        watchHistory: { tmdbId, mediaType }
      }
    });
    return { success: true };
  }

  // ==================== WATCHLIST ====================

  /**
   * Add to watchlist
   * Only stores tmdbId and mediaType - fetch details from TMDB on frontend
   */
  async addToWatchlist(userId, mediaData) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    // Check if already in watchlist
    const exists = user.watchlist.some(
      item => item.tmdbId === mediaData.tmdbId && item.mediaType === mediaData.mediaType
    );

    if (exists) {
      throw ApiError.conflict('Item already in watchlist');
    }

    user.watchlist.push({
      tmdbId: mediaData.tmdbId,
      mediaType: mediaData.mediaType,
      addedAt: new Date()
    });

    await user.save();

    return {
      tmdbId: mediaData.tmdbId,
      mediaType: mediaData.mediaType,
      addedAt: new Date()
    };
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(userId, tmdbId, mediaType) {
    const result = await User.findByIdAndUpdate(userId, {
      $pull: {
        watchlist: { tmdbId, mediaType }
      }
    });

    if (!result) throw ApiError.notFound('User not found');
    return { success: true };
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId, page = 1, limit = 20, mediaType = null) {
    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        items: [],
        pagination: { page, limit, total: 0, pages: 0 }
      };
    }

    let filtered = user.watchlist || [];
    if (mediaType) {
      filtered = filtered.filter(item => item.mediaType === mediaType);
    }

    // Sort by addedAt descending
    const sorted = filtered.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    
    const total = sorted.length;
    const skip = (page - 1) * limit;
    const items = sorted.slice(skip, skip + limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Check if item is in watchlist
   */
  async isInWatchlist(userId, tmdbId, mediaType) {
    const user = await User.findById(userId).lean();
    if (!user) return false;

    return (user.watchlist || []).some(
      item => item.tmdbId === tmdbId && item.mediaType === mediaType
    );
  }

  /**
   * Get watchlist status for multiple items
   */
  async getWatchlistStatuses(userId, items) {
    const user = await User.findById(userId).lean();
    if (!user) return {};

    return items.reduce((acc, item) => {
      const inWatchlist = (user.watchlist || []).some(
        w => w.tmdbId === item.tmdbId && w.mediaType === item.mediaType
      );
      acc[`${item.mediaType}-${item.tmdbId}`] = inWatchlist;
      return acc;
    }, {});
  }

  // ==================== ANALYTICS & RECOMMENDATIONS ====================

  /**
   * Get user's viewing stats
   */
  async getViewingStats(userId) {
    const user = await User.findById(userId).lean();
    if (!user) {
      return {
        totalWatched: 0,
        completed: 0,
        inProgress: 0,
        watchlistSize: 0,
        preferredMediaType: 'movie'
      };
    }

    const historyCount = (user.watchHistory || []).length;
    const completedCount = (user.watchHistory || []).filter(h => h.isCompleted).length;
    const watchlistCount = (user.watchlist || []).length;

    // Calculate preferred media type
    const mediaTypeCounts = (user.watchHistory || []).reduce((acc, h) => {
      acc[h.mediaType] = (acc[h.mediaType] || 0) + 1;
      return acc;
    }, {});

    const preferredMediaType = Object.entries(mediaTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'movie';

    return {
      totalWatched: historyCount,
      completed: completedCount,
      inProgress: historyCount - completedCount,
      watchlistSize: watchlistCount,
      preferredMediaType
    };
  }

  /**
   * Get recently watched (for recommendations)
   */
  async getRecentGenrePreferences(userId, limit = 5) {
    const user = await User.findById(userId).lean();
    if (!user) return { recentItems: [], topGenres: [] };

    const recentHistory = (user.watchHistory || [])
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))
      .slice(0, 20);

    return {
      recentItems: recentHistory.map(h => ({
        tmdbId: h.tmdbId,
        mediaType: h.mediaType
      })),
      topGenres: [] // Placeholder for genre analysis
    };
  }
}

module.exports = new UserContentService();
