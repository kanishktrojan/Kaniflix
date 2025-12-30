const { WatchHistory, Watchlist } = require('../models');
const { ApiError } = require('../utils/apiHelpers');

/**
 * User Content Service
 * Handles watch history, watchlist, and personalization
 */
class UserContentService {
  // ==================== WATCH HISTORY ====================

  /**
   * Update watch progress
   */
  async updateProgress(userId, mediaData, progressData) {
    return WatchHistory.updateProgress(userId, mediaData, progressData);
  }

  /**
   * Get continue watching list
   */
  async getContinueWatching(userId, limit = 20) {
    return WatchHistory.getContinueWatching(userId, limit);
  }

  /**
   * Get watch history with pagination
   */
  async getWatchHistory(userId, page = 1, limit = 20) {
    return WatchHistory.getHistory(userId, page, limit);
  }

  /**
   * Get last watched episode for a TV show
   */
  async getLastWatchedEpisode(userId, tmdbId) {
    return WatchHistory.getLastWatchedEpisode(userId, tmdbId);
  }

  /**
   * Get progress for specific media
   */
  async getProgress(userId, tmdbId, mediaType, seasonNumber = null, episodeNumber = null) {
    const query = {
      user: userId,
      tmdbId,
      mediaType
    };

    if (mediaType === 'tv' && seasonNumber !== null) {
      query.seasonNumber = seasonNumber;
      if (episodeNumber !== null) {
        query.episodeNumber = episodeNumber;
      }
    }

    return WatchHistory.findOne(query).lean();
  }

  /**
   * Clear watch history
   */
  async clearHistory(userId) {
    await WatchHistory.deleteMany({ user: userId });
    return { success: true };
  }

  /**
   * Remove item from history
   */
  async removeFromHistory(userId, tmdbId, mediaType) {
    await WatchHistory.deleteMany({ user: userId, tmdbId, mediaType });
    return { success: true };
  }

  // ==================== WATCHLIST ====================

  /**
   * Add to watchlist
   */
  async addToWatchlist(userId, mediaData) {
    return Watchlist.addItem(userId, mediaData);
  }

  /**
   * Remove from watchlist
   */
  async removeFromWatchlist(userId, tmdbId, mediaType) {
    return Watchlist.removeItem(userId, tmdbId, mediaType);
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId, page = 1, limit = 20, mediaType = null) {
    return Watchlist.getUserWatchlist(userId, page, limit, mediaType);
  }

  /**
   * Check if item is in watchlist
   */
  async isInWatchlist(userId, tmdbId, mediaType) {
    return Watchlist.isInWatchlist(userId, tmdbId, mediaType);
  }

  /**
   * Get watchlist status for multiple items
   */
  async getWatchlistStatuses(userId, items) {
    const statuses = await Promise.all(
      items.map(async (item) => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        inWatchlist: await this.isInWatchlist(userId, item.tmdbId, item.mediaType)
      }))
    );

    return statuses.reduce((acc, status) => {
      acc[`${status.mediaType}-${status.tmdbId}`] = status.inWatchlist;
      return acc;
    }, {});
  }

  // ==================== ANALYTICS & RECOMMENDATIONS ====================

  /**
   * Get user's viewing stats
   */
  async getViewingStats(userId) {
    const [historyCount, completedCount, watchlistCount] = await Promise.all([
      WatchHistory.countDocuments({ user: userId }),
      WatchHistory.countDocuments({ user: userId, isCompleted: true }),
      Watchlist.countDocuments({ user: userId })
    ]);

    const genrePreferences = await WatchHistory.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$mediaType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return {
      totalWatched: historyCount,
      completed: completedCount,
      inProgress: historyCount - completedCount,
      watchlistSize: watchlistCount,
      preferredMediaType: genrePreferences[0]?._id || 'movie'
    };
  }

  /**
   * Get recently watched genres (for recommendations)
   * This is a placeholder for future ML-based recommendations
   */
  async getRecentGenrePreferences(userId, limit = 5) {
    const recentHistory = await WatchHistory.find({ user: userId })
      .sort({ lastWatchedAt: -1 })
      .limit(20)
      .lean();

    // Aggregate genre IDs from recent history
    // In a real implementation, this would query TMDB for genre data
    return {
      recentItems: recentHistory.map(h => ({
        tmdbId: h.tmdbId,
        mediaType: h.mediaType
      })),
      // Placeholder for genre analysis
      topGenres: []
    };
  }
}

module.exports = new UserContentService();
