const { ApiError } = require('../utils/apiHelpers');
const TokenService = require('../utils/tokenService');
const { User } = require('../models');

/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    let token = TokenService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw ApiError.unauthorized('Access token is required');
    }

    // Verify token
    const decoded = TokenService.verifyAccessToken(token);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-refreshTokens');

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw ApiError.unauthorized('Password was recently changed. Please login again.');
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      return next(ApiError.unauthorized('Access token has expired'));
    }
    if (error.code === 'TOKEN_INVALID') {
      return next(ApiError.unauthorized('Invalid access token'));
    }
    next(error);
  }
};

/**
 * Optional Authentication
 * Attaches user if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = TokenService.extractTokenFromHeader(req.headers.authorization);
    
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = TokenService.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-refreshTokens');
      
      if (user && user.isActive) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Silently continue without user
    next();
  }
};

/**
 * Role-Based Access Control
 * Restricts access based on user roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }

    next();
  };
};

/**
 * Admin Only Middleware
 */
const adminOnly = authorize('admin');

/**
 * Premium Features Middleware
 */
const premiumOnly = authorize('premium', 'admin');

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  adminOnly,
  premiumOnly
};
