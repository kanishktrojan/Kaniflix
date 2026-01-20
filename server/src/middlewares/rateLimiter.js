const rateLimit = require('express-rate-limit');
const config = require('../config');
const { ApiError } = require('../utils/apiHelpers');
const Settings = require('../models/Settings');
const { DEFAULT_RATE_LIMIT_SETTINGS } = require('../models/Settings');
const jwt = require('jsonwebtoken');

/**
 * Cache for rate limit settings
 * Refreshed every 30 seconds to reduce DB calls
 */
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get rate limit settings from cache or database
 */
const getRateLimitSettings = async () => {
  const now = Date.now();
  if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return settingsCache;
  }
  
  try {
    settingsCache = await Settings.getRateLimitSettings();
    cacheTimestamp = now;
    return settingsCache;
  } catch (error) {
    console.error('Error fetching rate limit settings:', error);
    return DEFAULT_RATE_LIMIT_SETTINGS;
  }
};

/**
 * Clear the settings cache (called when settings are updated)
 */
const clearRateLimitCache = () => {
  settingsCache = null;
  cacheTimestamp = 0;
};

/**
 * Extract user role from JWT token without full authentication
 * This allows rate limiter to skip for admins/premium before auth middleware runs
 */
const getUserRoleFromToken = (req) => {
  try {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.JWT_SECRET);
      return decoded.role || null;
    }
    
    // Check cookies as fallback
    if (req.cookies && req.cookies.accessToken) {
      const decoded = jwt.verify(req.cookies.accessToken, config.JWT_SECRET);
      return decoded.role || null;
    }
    
    return null;
  } catch (error) {
    // Token invalid or expired - don't skip rate limiting
    return null;
  }
};

/**
 * Create dynamic skip function based on settings
 */
const createSkipFunction = (settingKey) => {
  return async (req) => {
    const settings = await getRateLimitSettings();
    const rateLimitConfig = settings[settingKey];
    
    // If rate limiting is disabled for this endpoint, skip all requests
    if (!rateLimitConfig || !rateLimitConfig.enabled) {
      return true;
    }
    
    // Get user role from token (works before auth middleware)
    const userRole = req.user?.role || getUserRoleFromToken(req);
    
    // Skip for admin users if configured
    if (rateLimitConfig.skipAdmin && userRole === 'admin') {
      return true;
    }
    
    // Skip for premium users if configured
    if (rateLimitConfig.skipPremium && userRole === 'premium') {
      return true;
    }
    
    return false;
  };
};

/**
 * Create a dynamic rate limiter that reads from database settings
 */
const createDynamicLimiter = (settingKey, defaultMessage) => {
  // Use high defaults, actual limiting is controlled by skip function and dynamic max
  return rateLimit({
    windowMs: DEFAULT_RATE_LIMIT_SETTINGS[settingKey]?.windowMs || 60000,
    max: async (req) => {
      const settings = await getRateLimitSettings();
      const rateLimitConfig = settings[settingKey];
      return rateLimitConfig?.maxRequests || 100;
    },
    message: {
      success: false,
      message: defaultMessage
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: createSkipFunction(settingKey),
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.id || req.ip;
    },
    handler: (req, res, next, options) => {
      next(ApiError.tooManyRequests(options.message.message));
    }
  });
};

/**
 * General API Rate Limiter
 * Protects against abuse and DDoS
 */
const generalLimiter = createDynamicLimiter(
  'general',
  'Too many requests, please try again later.'
);

/**
 * Authentication Rate Limiter
 * Stricter limits for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: async (req) => {
    const settings = await getRateLimitSettings();
    return settings.auth?.maxRequests || 10;
  },
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: async (req) => {
    const settings = await getRateLimitSettings();
    return !settings.auth?.enabled;
  },
  handler: (req, res, next, options) => {
    next(ApiError.tooManyRequests(options.message.message));
  }
});

/**
 * Search Rate Limiter
 * Prevents search abuse
 */
const searchLimiter = createDynamicLimiter(
  'search',
  'Too many search requests. Please slow down.'
);

/**
 * Streaming Rate Limiter
 * Controls stream requests
 */
const streamLimiter = createDynamicLimiter(
  'stream',
  'Too many stream requests. Please try again later.'
);

/**
 * Sports Rate Limiter
 * Controls sports endpoint requests
 */
const sportsLimiter = createDynamicLimiter(
  'sports',
  'Too many sports requests. Please try again later.'
);

module.exports = {
  generalLimiter,
  authLimiter,
  searchLimiter,
  streamLimiter,
  sportsLimiter,
  clearRateLimitCache,
  getRateLimitSettings
};
