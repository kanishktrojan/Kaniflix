const mongoose = require('mongoose');

/**
 * Sports Event Schema
 * Model for admin-managed sports content
 */
const sportsEventSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    
    // Media
    thumbnail: {
      type: String,
      required: [true, 'Thumbnail image URL is required'],
      trim: true
    },
    banner: {
      type: String,
      trim: true,
      default: null
    },
    
    // Sport Category
    category: {
      type: String,
      required: [true, 'Sport category is required'],
      enum: [
        'cricket',
        'football',
        'basketball',
        'tennis',
        'hockey',
        'baseball',
        'motorsport',
        'mma',
        'boxing',
        'wrestling',
        'golf',
        'esports',
        'olympics',
        'other'
      ],
      default: 'other'
    },
    
    // Teams/Participants
    team1: {
      name: { type: String, trim: true, default: '' },
      logo: { type: String, trim: true, default: '' },
      score: { type: String, trim: true, default: '' }
    },
    team2: {
      name: { type: String, trim: true, default: '' },
      logo: { type: String, trim: true, default: '' },
      score: { type: String, trim: true, default: '' }
    },
    
    // Event Status
    isLive: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'ended', 'cancelled'],
      default: 'upcoming'
    },
    
    // Schedule
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date/time is required']
    },
    endedAt: {
      type: Date,
      default: null
    },
    
    // Streaming Configuration
    streamUrl: {
      type: String,
      required: [true, 'Stream URL (m3u8) is required'],
      trim: true
    },
    
    // Proxy Configuration - Route stream through proxy server
    useProxy: {
      type: Boolean,
      default: false
    },
    
    // DRM Configuration (Optional)
    drmEnabled: {
      type: Boolean,
      default: false
    },
    drmConfig: {
      type: {
        type: String,
        enum: ['widevine', 'clearkey', 'fairplay'],
        default: 'clearkey'
      },
      licenseUrl: {
        type: String,
        trim: true,
        default: ''
      },
      // Clearkey Configuration
      clearkey: {
        keyId: {
          type: String,
          trim: true,
          default: ''
        },
        key: {
          type: String,
          trim: true,
          default: ''
        }
      }
    },
    
    // Quality Options
    qualityOptions: [{
      label: { type: String, trim: true },
      url: { type: String, trim: true }
    }],
    
    // Additional Info
    venue: {
      type: String,
      trim: true,
      default: ''
    },
    tournament: {
      type: String,
      trim: true,
      default: ''
    },
    
    // Visibility
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    
    // Viewership
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

// Indexes for efficient queries
sportsEventSchema.index({ category: 1 });
sportsEventSchema.index({ status: 1 });
sportsEventSchema.index({ isLive: 1 });
sportsEventSchema.index({ scheduledAt: -1 });
sportsEventSchema.index({ isFeatured: 1 });
sportsEventSchema.index({ isActive: 1, scheduledAt: -1 });
sportsEventSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if event is currently live based on time
sportsEventSchema.virtual('isCurrentlyLive').get(function() {
  const now = new Date();
  return this.isLive && this.status === 'live' && this.scheduledAt <= now;
});

// Virtual for time until event starts
sportsEventSchema.virtual('timeUntilStart').get(function() {
  const now = new Date();
  const scheduledTime = new Date(this.scheduledAt);
  const diff = scheduledTime - now;
  return diff > 0 ? diff : 0;
});

// Pre-save middleware to update status based on isLive and endedAt
sportsEventSchema.pre('save', function(next) {
  if (this.isModified('isLive')) {
    if (this.isLive) {
      this.status = 'live';
    }
  }
  // Auto-mark as ended if endedAt is set and has passed
  if (this.endedAt && new Date(this.endedAt) <= new Date() && this.status !== 'cancelled') {
    this.status = 'ended';
    this.isLive = false;
  }
  next();
});

// Static methods
sportsEventSchema.statics.getLiveEvents = function() {
  return this.find({ 
    isLive: true, 
    status: 'live', 
    isActive: true 
  }).sort({ scheduledAt: -1 });
};

sportsEventSchema.statics.getUpcomingEvents = function(limit = 10) {
  const now = new Date();
  return this.find({
    status: 'upcoming',
    scheduledAt: { $gt: now },
    isActive: true
  })
  .sort({ scheduledAt: 1 })
  .limit(limit);
};

sportsEventSchema.statics.getByCategory = function(category, limit = 20) {
  return this.find({
    category,
    isActive: true
  })
  .sort({ scheduledAt: -1 })
  .limit(limit);
};

sportsEventSchema.statics.getFeaturedEvents = function(limit = 5) {
  return this.find({
    isFeatured: true,
    isActive: true
  })
  .sort({ scheduledAt: -1 })
  .limit(limit);
};

// Instance methods
sportsEventSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  await this.save();
};

sportsEventSchema.methods.markAsLive = async function() {
  this.isLive = true;
  this.status = 'live';
  await this.save();
};

sportsEventSchema.methods.markAsEnded = async function() {
  this.isLive = false;
  this.status = 'ended';
  this.endedAt = new Date();
  await this.save();
};

const SportsEvent = mongoose.model('SportsEvent', sportsEventSchema);

module.exports = SportsEvent;
