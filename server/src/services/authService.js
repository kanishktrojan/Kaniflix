const { User, OtpVerification, DeviceSession } = require('../models');
const TokenService = require('../utils/tokenService');
const emailService = require('../utils/emailService');
const { ApiError } = require('../utils/apiHelpers');
const config = require('../config');
const UAParser = require('ua-parser-js');

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */
class AuthService {
  /**
   * Initiate registration - sends OTP (does NOT create user yet)
   */
  async initiateRegister(userData) {
    const { email, password, username } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw ApiError.conflict('Email already registered');
      }
      throw ApiError.conflict('Username already taken');
    }

    // Check if there's already a pending verification
    let pendingVerification = await OtpVerification.findOne({ email });

    // Generate OTP
    const otp = OtpVerification.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (pendingVerification) {
      // Check resend cooldown
      if (!pendingVerification.canResend()) {
        const waitTime = Math.ceil((60 * 1000 - (Date.now() - pendingVerification.lastResendAt)) / 1000);
        throw ApiError.tooManyRequests(`Please wait ${waitTime} seconds before requesting a new OTP`);
      }

      // Update existing pending verification
      pendingVerification.otp = otp;
      pendingVerification.otpExpires = otpExpires;
      pendingVerification.username = username;
      pendingVerification.password = password;
      pendingVerification.attempts = 0;
      pendingVerification.lastResendAt = new Date();
      await pendingVerification.save();
    } else {
      // Create new pending verification
      pendingVerification = await OtpVerification.create({
        email,
        username,
        password,
        otp,
        otpExpires
      });
    }

    // Send OTP email
    await emailService.sendOTP(email, otp, username);

    return {
      message: 'Verification code sent to your email',
      email,
      expiresIn: 600 // 10 minutes in seconds
    };
  }

  /**
   * Verify OTP and complete registration
   */
  async verifyOTPAndRegister(email, otp, metadata = {}) {
    // Find pending verification
    const pendingVerification = await OtpVerification.findOne({ email });

    if (!pendingVerification) {
      throw ApiError.badRequest('No pending verification found. Please sign up again.');
    }

    // Check if OTP expired
    if (pendingVerification.isExpired()) {
      await OtpVerification.deleteOne({ email });
      throw ApiError.badRequest('OTP has expired. Please sign up again.');
    }

    // Check max attempts (5)
    if (pendingVerification.attempts >= 5) {
      await OtpVerification.deleteOne({ email });
      throw ApiError.tooManyRequests('Too many failed attempts. Please sign up again.');
    }

    // Verify OTP
    const isValid = await pendingVerification.verifyOTP(otp);
    
    if (!isValid) {
      pendingVerification.attempts += 1;
      await pendingVerification.save();
      
      const remainingAttempts = 5 - pendingVerification.attempts;
      throw ApiError.badRequest(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
    }

    // OTP is valid - create the actual user
    // Password is already hashed in OtpVerification
    // User model's pre-save hook detects this and skips re-hashing
    const user = await User.create({
      email: pendingVerification.email,
      password: pendingVerification.password, // Already hashed
      username: pendingVerification.username,
      isEmailVerified: true
    });

    // Delete the pending verification
    await OtpVerification.deleteOne({ email });

    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);

    // Save refresh token
    await this.saveRefreshToken(user._id, tokens.refreshToken, metadata);

    // Create device session for tracking
    await this.createDeviceSession(user._id, metadata);

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(email) {
    const pendingVerification = await OtpVerification.findOne({ email });

    if (!pendingVerification) {
      throw ApiError.badRequest('No pending verification found. Please sign up again.');
    }

    // Check resend cooldown
    if (!pendingVerification.canResend()) {
      const waitTime = Math.ceil((60 * 1000 - (Date.now() - pendingVerification.lastResendAt)) / 1000);
      throw ApiError.tooManyRequests(`Please wait ${waitTime} seconds before requesting a new OTP`);
    }

    // Generate new OTP
    const otp = OtpVerification.generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    pendingVerification.otp = otp;
    pendingVerification.otpExpires = otpExpires;
    pendingVerification.attempts = 0;
    pendingVerification.lastResendAt = new Date();
    await pendingVerification.save();

    // Send OTP email
    await emailService.sendOTP(email, otp, pendingVerification.username);

    return {
      message: 'New verification code sent to your email',
      email,
      expiresIn: 600
    };
  }

  /**
   * Register a new user (direct - for backward compatibility, NOT RECOMMENDED)
   * @deprecated Use initiateRegister + verifyOTPAndRegister instead
   */
  async register(userData) {
    const { email, password, username } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw ApiError.conflict('Email already registered');
      }
      throw ApiError.conflict('Username already taken');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      username
    });

    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);

    // Save refresh token
    await this.saveRefreshToken(user._id, tokens.refreshToken);

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Login user
   */
  async login(email, password, metadata = {}) {
    // Find user by credentials (handles lockout logic)
    const user = await User.findByCredentials(email, password);

    // Generate tokens
    const tokens = TokenService.generateTokenPair(user);

    // Save refresh token with metadata
    await this.saveRefreshToken(user._id, tokens.refreshToken, metadata);

    // Create device session for tracking
    await this.createDeviceSession(user._id, metadata);

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Create a device session for tracking
   */
  async createDeviceSession(userId, metadata = {}) {
    try {
      const { userAgent, ip } = metadata;
      
      // Parse user agent
      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();

      // Determine device type
      let deviceType = 'desktop';
      if (device.type === 'mobile') deviceType = 'mobile';
      else if (device.type === 'tablet') deviceType = 'tablet';
      else if (device.type === 'smarttv') deviceType = 'smart_tv';

      // Check for existing session with same device fingerprint
      const existingSession = await DeviceSession.findOne({
        user: userId,
        'deviceInfo.browser': browser.name || 'Unknown',
        'deviceInfo.os': os.name || 'Unknown',
        ipAddress: ip
      });

      if (existingSession) {
        // Update existing session
        existingSession.lastActive = new Date();
        await existingSession.save();
        return existingSession;
      }

      // Create new device session
      const session = await DeviceSession.create({
        user: userId,
        deviceType,
        deviceInfo: {
          browser: browser.name || 'Unknown',
          browserVersion: browser.version || '',
          os: os.name || 'Unknown',
          osVersion: os.version || '',
          deviceModel: device.model || '',
          deviceVendor: device.vendor || ''
        },
        ipAddress: ip || 'Unknown',
        userAgent: userAgent || '',
        lastActive: new Date()
      });

      return session;
    } catch (error) {
      // Don't fail login if device session creation fails
      console.error('Failed to create device session:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = TokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    // Find user and check if refresh token exists
    const user = await User.findOne({
      _id: decoded.userId,
      'refreshTokens.token': refreshToken
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account has been deactivated');
    }

    // Generate new token pair
    const tokens = TokenService.generateTokenPair(user);

    // Rotate refresh token (remove old, add new)
    await this.rotateRefreshToken(user._id, refreshToken, tokens.refreshToken);

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken) {
    if (refreshToken) {
      // Remove specific refresh token
      await User.updateOne(
        { _id: userId },
        { $pull: { refreshTokens: { token: refreshToken } } }
      );
    }
    return { success: true };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await User.updateOne(
      { _id: userId },
      { $set: { refreshTokens: [] } }
    );
    return { success: true };
  }

  /**
   * Save refresh token to user document
   */
  async saveRefreshToken(userId, token, metadata = {}) {
    const tokenData = {
      token,
      createdAt: new Date(),
      userAgent: metadata.userAgent || 'Unknown',
      ip: metadata.ip || 'Unknown'
    };

    // Limit to 5 refresh tokens per user (5 devices)
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          refreshTokens: {
            $each: [tokenData],
            $slice: -5 // Keep only last 5 tokens
          }
        }
      }
    );
  }

  /**
   * Rotate refresh token
   */
  async rotateRefreshToken(userId, oldToken, newToken) {
    await User.updateOne(
      { _id: userId },
      {
        $pull: { refreshTokens: { token: oldToken } }
      }
    );
    await this.saveRefreshToken(userId, newToken);
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user.toJSON();
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const allowedUpdates = ['username', 'avatar', 'preferences'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user.toJSON();
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens (force re-login)
    await this.logoutAll(userId);

    return { success: true };
  }

  /**
   * Get cookie options
   */
  getCookieOptions(isRefreshToken = false) {
    const baseOptions = {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: 'lax',
      domain: config.NODE_ENV === 'production' ? config.COOKIE_DOMAIN : undefined
    };

    if (isRefreshToken) {
      return {
        ...baseOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh'
      };
    }

    return {
      ...baseOptions,
      maxAge: 15 * 60 * 1000 // 15 minutes
    };
  }
}

module.exports = new AuthService();
