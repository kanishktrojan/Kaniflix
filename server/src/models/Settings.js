const mongoose = require('mongoose');

/**
 * Site Settings Schema
 * Stores configurable site settings including rate limiting
 */
const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    category: {
      type: String,
      enum: ['rate_limiting', 'general', 'security', 'features'],
      default: 'general'
    },
    description: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Default rate limiting settings
const DEFAULT_RATE_LIMIT_SETTINGS = {
  // General API
  general: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
    skipPremium: true,
    skipAdmin: true
  },
  // Auth endpoints
  auth: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 10,
    skipPremium: false,
    skipAdmin: false
  },
  // Search endpoints
  search: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    skipPremium: true,
    skipAdmin: true
  },
  // Stream endpoints
  stream: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    skipPremium: true,
    skipAdmin: true
  },
  // Sports endpoints
  sports: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    skipPremium: true,
    skipAdmin: true
  }
};

// Static method to get a setting
settingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

// Static method to set a setting
settingsSchema.statics.setSetting = async function(key, value, category = 'general', description = '', userId = null) {
  const setting = await this.findOneAndUpdate(
    { key },
    { 
      value, 
      category, 
      description,
      updatedBy: userId
    },
    { upsert: true, new: true }
  );
  return setting;
};

// Static method to get all rate limit settings
settingsSchema.statics.getRateLimitSettings = async function() {
  const setting = await this.findOne({ key: 'rate_limits' });
  return setting ? setting.value : DEFAULT_RATE_LIMIT_SETTINGS;
};

// Static method to update rate limit settings
settingsSchema.statics.updateRateLimitSettings = async function(updates, userId = null) {
  const current = await this.getRateLimitSettings();
  const merged = { ...current, ...updates };
  
  // Deep merge for nested objects
  for (const key of Object.keys(updates)) {
    if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
      merged[key] = { ...current[key], ...updates[key] };
    }
  }
  
  return this.setSetting(
    'rate_limits',
    merged,
    'rate_limiting',
    'API rate limiting configuration',
    userId
  );
};

// Static method to initialize default settings
settingsSchema.statics.initializeDefaults = async function() {
  const existing = await this.findOne({ key: 'rate_limits' });
  if (!existing) {
    await this.setSetting(
      'rate_limits',
      DEFAULT_RATE_LIMIT_SETTINGS,
      'rate_limiting',
      'API rate limiting configuration'
    );
    console.log('✅ Default rate limit settings initialized');
  }
  return this.getRateLimitSettings();
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
module.exports.DEFAULT_RATE_LIMIT_SETTINGS = DEFAULT_RATE_LIMIT_SETTINGS;
