const rateLimit = require('express-rate-limit');
const config = require('../config');
const { ApiError } = require('../utils/apiHelpers');

/**
 * Skip function for premium/admin users
 * Premium users bypass rate limiting
 */
const skipForPremiumUsers = (req) => {
  // Skip rate limiting for premium and admin users
  if (req.user && (req.user.role === 'premium' || req.user.role === 'admin')) {
    return true;
  }
  return false;
};

/**
 * General API Rate Limiter
 * Protects against abuse and DDoS
 */
const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForPremiumUsers,
  handler: (req, res, next, options) => {
    next(ApiError.tooManyRequests(options.message.message));
  }
});

/**
 * Authentication Rate Limiter
 * Stricter limits for auth endpoints (not skipped for premium as they're not logged in during auth)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    next(ApiError.tooManyRequests(options.message.message));
  }
});

/**
 * Search Rate Limiter
 * Prevents search abuse
 */
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: {
    success: false,
    message: 'Too many search requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForPremiumUsers,
  handler: (req, res, next, options) => {
    next(ApiError.tooManyRequests(options.message.message));
  }
});

/**
 * Streaming Rate Limiter
 * Controls stream requests
 */
const streamLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 stream requests per minute
  message: {
    success: false,
    message: 'Too many stream requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForPremiumUsers,
  handler: (req, res, next, options) => {
    next(ApiError.tooManyRequests(options.message.message));
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  searchLimiter,
  streamLimiter
};
