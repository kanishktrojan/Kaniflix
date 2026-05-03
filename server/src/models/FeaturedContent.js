const mongoose = require('mongoose');

/**
 * Featured Content Schema
 * Model for admin-managed featured and trending content
 */
const featuredContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    contentType: {
      type: String,
      enum: ['movie', 'tv', 'live'],
      default: 'movie'
    },
    genre: {
      type: String,
      trim: true,
      default: ''
    },
    year: {
      type: Number,
      default: new Date().getFullYear()
    },
    rating: {
      type: String,
      trim: true,
      default: ''
    },
    duration: {
      type: String,
      trim: true,
      default: ''
    },
    badgeLabel: {
      type: String,
      trim: true,
      default: ''
    },
    placement: {
      type: String,
      enum: ['banner', 'trending', 'both'],
      required: [true, 'Placement is required']
    },
    priorityOrder: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'hidden', 'scheduled'],
      default: 'active'
    },
    scheduledAt: {
      type: Date,
      default: null
    },
    backdropImage: {
      type: String,
      required: [true, 'Backdrop image URL is required'],
      trim: true
    },
    posterImage: {
      type: String,
      required: [true, 'Poster image URL is required'],
      trim: true
    },
    streamUrl: {
      type: String,
      required: [true, 'Stream URL is required'],
      trim: true
    },
    trailerUrl: {
      type: String,
      trim: true,
      default: ''
    },
    tmdbId: {
      type: String,
      trim: true,
      default: ''
    },
    // Track views
    viewCount: {
      type: Number,
      default: 0
    },
    // Created by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
featuredContentSchema.index({ placement: 1 });
featuredContentSchema.index({ status: 1 });
featuredContentSchema.index({ priorityOrder: -1 });
featuredContentSchema.index({ scheduledAt: -1 });

// Static methods
featuredContentSchema.statics.getActiveFeatured = function() {
  const now = new Date();
  return this.find({
    $or: [
      { status: 'active' },
      { status: 'scheduled', scheduledAt: { $lte: now } }
    ]
  }).sort({ priorityOrder: -1 });
};

// Instance methods
featuredContentSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

const FeaturedContent = mongoose.model('FeaturedContent', featuredContentSchema);

module.exports = FeaturedContent;
