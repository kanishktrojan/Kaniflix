const mongoose = require('mongoose');

/**
 * Watch History Schema
 * Tracks user viewing progress for continue watching feature
 */
const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mediaType: {
      type: String,
      enum: ['movie', 'tv'],
      required: true
    },
    tmdbId: {
      type: Number,
      required: true
    },
    imdbId: {
      type: String,
      default: null
    },
    title: {
      type: String,
      required: true
    },
    posterPath: {
      type: String,
      default: null
    },
    backdropPath: {
      type: String,
      default: null
    },
    // For TV Shows
    seasonNumber: {
      type: Number,
      default: null
    },
    episodeNumber: {
      type: Number,
      default: null
    },
    episodeTitle: {
      type: String,
      default: null
    },
    // Progress tracking
    progress: {
      type: Number, // Percentage 0-100
      default: 0,
      min: 0,
      max: 100
    },
    currentTime: {
      type: Number, // Seconds
      default: 0
    },
    duration: {
      type: Number, // Total duration in seconds
      default: 0
    },
    // Completion status
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    // Watch count
    watchCount: {
      type: Number,
      default: 1
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
watchHistorySchema.index({ user: 1, tmdbId: 1, mediaType: 1 });
watchHistorySchema.index({ user: 1, lastWatchedAt: -1 });
watchHistorySchema.index({ user: 1, mediaType: 1, seasonNumber: 1, episodeNumber: 1 });

// Static method: Get continue watching list
watchHistorySchema.statics.getContinueWatching = async function(userId, limit = 20) {
  return this.find({
    user: userId,
    isCompleted: false,
    progress: { $gte: 0, $lt: 95 } // Any progress below 95% (not completed)
  })
    .sort({ lastWatchedAt: -1 })
    .limit(limit)
    .lean();
};

// Static method: Update or create watch progress
watchHistorySchema.statics.updateProgress = async function(userId, mediaData, progressData) {
  const query = {
    user: userId,
    tmdbId: mediaData.tmdbId,
    mediaType: mediaData.mediaType
  };

  // For TV shows, include season and episode in query
  if (mediaData.mediaType === 'tv') {
    query.seasonNumber = mediaData.seasonNumber;
    query.episodeNumber = mediaData.episodeNumber;
  }

  const update = {
    ...mediaData,
    ...progressData,
    lastWatchedAt: Date.now(),
    $inc: { watchCount: 0 } // Will be handled separately
  };

  // Check if completed (>= 95% progress)
  if (progressData.progress >= 95) {
    update.isCompleted = true;
    update.completedAt = Date.now();
  }

  const options = {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  };

  return this.findOneAndUpdate(query, update, options);
};

// Static method: Get watch history
watchHistorySchema.statics.getHistory = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  const [items, total] = await Promise.all([
    this.find({ user: userId })
      .sort({ lastWatchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ user: userId })
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method: Get last watched episode for a TV show
watchHistorySchema.statics.getLastWatchedEpisode = async function(userId, tmdbId) {
  return this.findOne({
    user: userId,
    tmdbId,
    mediaType: 'tv'
  })
    .sort({ seasonNumber: -1, episodeNumber: -1, lastWatchedAt: -1 })
    .lean();
};

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

module.exports = WatchHistory;
