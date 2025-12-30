const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT Token Utilities
 * Handles token generation, verification, and management
 */
class TokenService {
  /**
   * Generate access token
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRY,
      issuer: 'kaniflix',
      audience: 'kaniflix-users'
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRY,
      issuer: 'kaniflix',
      audience: 'kaniflix-users'
    });
  }

  /**
   * Generate both tokens
   */
  static generateTokenPair(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ userId: user._id })
    };
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: 'kaniflix',
        audience: 'kaniflix-users'
      });
    } catch (error) {
      throw this.handleTokenError(error);
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: 'kaniflix',
        audience: 'kaniflix-users'
      });
    } catch (error) {
      throw this.handleTokenError(error);
    }
  }

  /**
   * Decode token without verification
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Handle token errors
   */
  static handleTokenError(error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token has expired');
      err.code = 'TOKEN_EXPIRED';
      return err;
    }
    if (error.name === 'JsonWebTokenError') {
      const err = new Error('Invalid token');
      err.code = 'TOKEN_INVALID';
      return err;
    }
    return error;
  }

  /**
   * Extract token from header
   */
  static extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  /**
   * Get token expiry time
   */
  static getTokenExpiry(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if token is about to expire
   */
  static isTokenExpiringSoon(token, thresholdMinutes = 5) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    
    const threshold = thresholdMinutes * 60 * 1000;
    return (expiry.getTime() - Date.now()) < threshold;
  }
}

module.exports = TokenService;
