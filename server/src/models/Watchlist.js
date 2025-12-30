const mongoose = require('mongoose');

/**
 * Watchlist Schema
 * User's saved movies and TV shows for later viewing
 */
const watchlistSchema = new mongoose.Schema(
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
    overview: {
      type: String,
      default: null
    },
    releaseDate: {
      type: String,
      default: null
    },
    voteAverage: {
      type: Number,
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index - user can only add same item once
watchlistSchema.index({ user: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

// Static method: Add to watchlist
watchlistSchema.statics.addItem = async function(userId, mediaData) {
  try {
    const item = await this.create({
      user: userId,
      ...mediaData
    });
    return { success: true, item };
  } catch (error) {
    if (error.code === 11000) {
      return { success: false, message: 'Item already in watchlist' };
    }
    throw error;
  }
};

// Static method: Remove from watchlist
watchlistSchema.statics.removeItem = async function(userId, tmdbId, mediaType) {
  const result = await this.findOneAndDelete({
    user: userId,
    tmdbId,
    mediaType
  });
  return { success: !!result, removed: result };
};

// Static method: Check if item is in watchlist
watchlistSchema.statics.isInWatchlist = async function(userId, tmdbId, mediaType) {
  const item = await this.findOne({ user: userId, tmdbId, mediaType });
  return !!item;
};

// Static method: Get user's watchlist
watchlistSchema.statics.getUserWatchlist = async function(userId, page = 1, limit = 20, mediaType = null) {
  const skip = (page - 1) * limit;
  const query = { user: userId };
  
  if (mediaType) {
    query.mediaType = mediaType;
  }

  const [items, total] = await Promise.all([
    this.find(query)
      .sort({ addedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
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

const Watchlist = mongoose.model('Watchlist', watchlistSchema);

module.exports = Watchlist;
