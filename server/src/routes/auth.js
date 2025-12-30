const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const { authenticate, authLimiter, authValidators } = require('../middlewares');

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes (with rate limiting)
router.post('/register', authLimiter, authValidators.register, authController.register);
router.post('/verify-otp', authLimiter, authValidators.verifyOTP, authController.verifyOTP);
router.post('/resend-otp', authLimiter, authValidators.resendOTP, authController.resendOTP);
router.post('/login', authLimiter, authValidators.login, authController.login);
router.post('/refresh', authLimiter, authValidators.refreshToken, authController.refresh);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.get('/status', authenticate, authController.checkStatus);

module.exports = router;
