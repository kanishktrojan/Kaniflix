const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ApiError } = require('../utils/apiHelpers');

/**
 * User Schema
 * Industrial-grade user model with security best practices
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Never return password by default
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters']
    },
    avatar: {
      type: String,
      default: null
    },
    role: {
      type: String,
      enum: ['user', 'premium', 'admin'],
      default: 'user'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    preferences: {
      language: {
        type: String,
        default: 'en'
      },
      maturityRating: {
        type: String,
        enum: ['G', 'PG', 'PG-13', 'R', 'NC-17'],
        default: 'R'
      },
      autoplayNext: {
        type: Boolean,
        default: true
      },
      autoplayPreviews: {
        type: Boolean,
        default: true
      },
      // Playback preferences
      defaultVideoQuality: {
        type: String,
        enum: ['auto', '360p', '480p', '720p', '1080p', '4k'],
        default: 'auto'
      },
      dataSaverMode: {
        type: Boolean,
        default: false
      },
      // Audio preferences
      defaultAudioLanguage: {
        type: String,
        default: 'en'
      },
      defaultSubtitleLanguage: {
        type: String,
        default: 'off'
      },
      subtitlesEnabled: {
        type: Boolean,
        default: false
      }
    },
    // Notification preferences
    notifications: {
      email: {
        newReleases: {
          type: Boolean,
          default: true
        },
        recommendations: {
          type: Boolean,
          default: true
        },
        accountUpdates: {
          type: Boolean,
          default: true
        },
        marketing: {
          type: Boolean,
          default: false
        },
        watchlistReminders: {
          type: Boolean,
          default: true
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: true
        },
        newEpisodes: {
          type: Boolean,
          default: true
        },
        continueWatching: {
          type: Boolean,
          default: true
        }
      }
    },
    // Profile customization
    profile: {
      bio: {
        type: String,
        maxlength: 200,
        default: ''
      },
      favoriteGenres: [{
        type: Number // Genre IDs
      }],
      profileLock: {
        enabled: {
          type: Boolean,
          default: false
        },
        pin: {
          type: String,
          select: false
        }
      }
    },
    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d'
      },
      userAgent: String,
      ip: String
    }],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false
    },
    
    // ==================== EMBEDDED WATCHLIST ====================
    // Store only essential data, fetch rest from TMDB
    watchlist: [{
      tmdbId: {
        type: Number,
        required: true
      },
      mediaType: {
        type: String,
        enum: ['movie', 'tv'],
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // ==================== EMBEDDED WATCH HISTORY ====================
    // Store progress data, fetch media details from TMDB
    watchHistory: [{
      tmdbId: {
        type: Number,
        required: true
      },
      mediaType: {
        type: String,
        enum: ['movie', 'tv'],
        required: true
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
      isCompleted: {
        type: Boolean,
        default: false
      },
      lastWatchedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
  // This handles the case when transferring already-hashed password from OtpVerification
  if (this.password && this.password.startsWith('$2')) {
    return next(); // Already hashed, skip
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    
    if (!this.isNew) {
      this.passwordChangedAt = Date.now() - 1000;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method: Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: Check if password changed after token was issued
userSchema.methods.changedPasswordAfter = function(jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method: Increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours
  const MAX_LOGIN_ATTEMPTS = 5;

  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account if max attempts exceeded
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }

  return this.updateOne(updates);
};

// Instance method: Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 }
  });
};

// Static method: Find by credentials
userSchema.statics.findByCredentials = async function(email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw ApiError.unauthorized('No account found with this email address');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  if (user.isLocked) {
    throw ApiError.tooManyRequests('Account is temporarily locked due to too many failed attempts. Please try again later.');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    await user.incrementLoginAttempts();
    throw ApiError.unauthorized('Incorrect password. Please try again.');
  }

  await user.resetLoginAttempts();
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
