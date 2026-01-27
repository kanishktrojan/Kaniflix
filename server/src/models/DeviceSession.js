const mongoose = require('mongoose');
const UAParser = require('ua-parser-js');

/**
 * Device Session Schema
 * Tracks user's logged-in devices for session management
 */
const deviceSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Device identification
    deviceId: {
      type: String,
      required: true
    },
    deviceName: {
      type: String,
      default: 'Unknown Device'
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop', 'tv', 'unknown'],
      default: 'unknown'
    },
    // Browser/App info
    browser: {
      name: String,
      version: String
    },
    os: {
      name: String,
      version: String
    },
    // Location info
    location: {
      ip: String,
      city: String,
      country: String,
      countryCode: String
    },
    // Session info
    refreshToken: {
      type: String,
      required: true,
      select: false
    },
    isCurrentDevice: {
      type: Boolean,
      default: false
    },
    lastActiveAt: {
      type: Date,
      default: Date.now
    },
    loginAt: {
      type: Date,
      default: Date.now
    },
    // For tracking streaming
    isStreaming: {
      type: Boolean,
      default: false
    },
    currentlyWatching: {
      mediaType: String,
      tmdbId: Number,
      title: String,
      startedAt: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
deviceSessionSchema.index({ user: 1, deviceId: 1 }, { unique: true });
deviceSessionSchema.index({ user: 1, lastActiveAt: -1 });
deviceSessionSchema.index({ refreshToken: 1 });

// Static method to parse user agent and create device info
deviceSessionSchema.statics.parseUserAgent = function(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  let deviceType = 'unknown';
  const device = result.device;
  
  if (device.type === 'mobile') deviceType = 'mobile';
  else if (device.type === 'tablet') deviceType = 'tablet';
  else if (device.type === 'smarttv') deviceType = 'tv';
  else if (result.os.name) deviceType = 'desktop';

  // Generate device name
  let deviceName = 'Unknown Device';
  if (result.browser.name && result.os.name) {
    deviceName = `${result.browser.name} on ${result.os.name}`;
  } else if (result.os.name) {
    deviceName = result.os.name;
  } else if (result.browser.name) {
    deviceName = result.browser.name;
  }

  return {
    deviceType,
    deviceName,
    browser: {
      name: result.browser.name || 'Unknown',
      version: result.browser.version || ''
    },
    os: {
      name: result.os.name || 'Unknown',
      version: result.os.version || ''
    }
  };
};

// Generate unique device ID from request info
deviceSessionSchema.statics.generateDeviceId = function(userAgent, ip) {
  const crypto = require('crypto');
  const data = `${userAgent}-${ip}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
};

// Method to update last active
deviceSessionSchema.methods.touch = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to start streaming
deviceSessionSchema.methods.startStreaming = function(mediaType, tmdbId, title) {
  this.isStreaming = true;
  this.currentlyWatching = {
    mediaType,
    tmdbId,
    title,
    startedAt: new Date()
  };
  return this.save();
};

// Method to stop streaming
deviceSessionSchema.methods.stopStreaming = function() {
  this.isStreaming = false;
  this.currentlyWatching = undefined;
  return this.save();
};

const DeviceSession = mongoose.model('DeviceSession', deviceSessionSchema);

module.exports = DeviceSession;
