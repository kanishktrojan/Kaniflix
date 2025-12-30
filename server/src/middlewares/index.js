const { errorHandler, notFoundHandler, asyncHandler } = require('./errorHandler');
const { authenticate, optionalAuth, authorize, adminOnly, premiumOnly } = require('./auth');
const { generalLimiter, authLimiter, searchLimiter, streamLimiter } = require('./rateLimiter');
const { 
  validate, 
  authValidators, 
  mediaValidators, 
  historyValidators, 
  watchlistValidators 
} = require('./validators');

module.exports = {
  // Error handling
  errorHandler,
  notFoundHandler,
  asyncHandler,
  
  // Authentication
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  premiumOnly,
  
  // Rate limiting
  generalLimiter,
  authLimiter,
  searchLimiter,
  streamLimiter,
  
  // Validation
  validate,
  authValidators,
  mediaValidators,
  historyValidators,
  watchlistValidators
};
