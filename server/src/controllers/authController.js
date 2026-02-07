const { authService } = require('../services');
const { ApiResponse } = require('../utils/apiHelpers');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * Authentication Controller
 * Thin controller layer - delegates to authService
 */
const authController = {
  /**
   * Initiate registration - sends OTP
   * POST /api/auth/register
   */
  register: asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;
    
    const result = await authService.initiateRegister({ email, password, username });
    
    ApiResponse.success(res, result, 'Verification code sent to your email');
  }),

  /**
   * Verify OTP and complete registration
   * POST /api/auth/verify-otp
   */
  verifyOTP: asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    
    const metadata = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };
    
    const result = await authService.verifyOTPAndRegister(email, otp, metadata);
    
    // Set cookies
    res.cookie('accessToken', result.tokens.accessToken, authService.getCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, authService.getCookieOptions(true));
    
    ApiResponse.created(res, {
      user: result.user,
      accessToken: result.tokens.accessToken
    }, 'Registration successful');
  }),

  /**
   * Resend OTP
   * POST /api/auth/resend-otp
   */
  resendOTP: asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    const result = await authService.resendOTP(email);
    
    ApiResponse.success(res, result, 'Verification code resent');
  }),

  /**
   * Login user
   * POST /api/auth/login
   */
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const metadata = {
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    };
    
    const result = await authService.login(email, password, metadata);
    
    // Set cookies
    res.cookie('accessToken', result.tokens.accessToken, authService.getCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, authService.getCookieOptions(true));
    
    ApiResponse.success(res, {
      user: result.user,
      accessToken: result.tokens.accessToken
    }, 'Login successful');
  }),

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refresh: asyncHandler(async (req, res) => {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    const result = await authService.refreshToken(refreshToken);
    
    // Set new cookies
    res.cookie('accessToken', result.tokens.accessToken, authService.getCookieOptions());
    res.cookie('refreshToken', result.tokens.refreshToken, authService.getCookieOptions(true));
    
    ApiResponse.success(res, {
      accessToken: result.tokens.accessToken
    }, 'Token refreshed');
  }),

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout: asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
    
    await authService.logout(req.user._id, refreshToken);
    
    // Clear cookies with matching options
    res.clearCookie('accessToken', authService.getClearCookieOptions());
    res.clearCookie('refreshToken', authService.getClearCookieOptions(true));
    
    ApiResponse.success(res, null, 'Logged out successfully');
  }),

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  logoutAll: asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user._id);
    
    // Clear cookies with matching options
    res.clearCookie('accessToken', authService.getClearCookieOptions());
    res.clearCookie('refreshToken', authService.getClearCookieOptions(true));
    
    ApiResponse.success(res, null, 'Logged out from all devices');
  }),

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile: asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.user._id);
    ApiResponse.success(res, profile);
  }),

  /**
   * Update user profile
   * PATCH /api/auth/me
   */
  updateProfile: asyncHandler(async (req, res) => {
    const profile = await authService.updateProfile(req.user._id, req.body);
    ApiResponse.success(res, profile, 'Profile updated');
  }),

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    await authService.changePassword(req.user._id, currentPassword, newPassword);
    
    // Clear cookies with matching options (force re-login)
    res.clearCookie('accessToken', authService.getClearCookieOptions());
    res.clearCookie('refreshToken', authService.getClearCookieOptions(true));
    
    ApiResponse.success(res, null, 'Password changed successfully. Please login again.');
  }),

  /**
   * Check authentication status
   * GET /api/auth/status
   */
  checkStatus: asyncHandler(async (req, res) => {
    ApiResponse.success(res, {
      authenticated: true,
      user: req.user
    });
  })
};

module.exports = authController;
