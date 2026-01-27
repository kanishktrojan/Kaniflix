const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middlewares/auth');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validators');

/**
 * Profile Routes
 * Base path: /api/profile
 * 
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Profile
router.get('/', profileController.getProfile);
router.patch('/', profileController.updateProfile);
router.delete('/', 
  body('password').notEmpty().withMessage('Password is required'),
  body('confirmDelete').equals('DELETE').withMessage('Please type DELETE to confirm'),
  validate,
  profileController.deleteAccount
);

// Preferences
router.patch('/preferences', profileController.updatePreferences);

// Notifications
router.patch('/notifications', profileController.updateNotifications);

// Password
router.post('/change-password',
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/\d/).withMessage('New password must contain a number'),
  validate,
  profileController.changePassword
);

// Devices
router.get('/devices', profileController.getDevices);
router.delete('/devices/:deviceId', profileController.logoutDevice);
router.post('/devices/logout-all', profileController.logoutAllDevices);

// Subscription
router.get('/subscription', profileController.getSubscription);


// Coupon
router.post('/redeem-coupon',
  body('code').notEmpty().withMessage('Coupon code is required'),
  validate,
  profileController.redeemCoupon
);

// Redeem Code (separate from coupon)
router.post('/redeem-code',
  body('code').notEmpty().withMessage('Redeem code is required'),
  validate,
  profileController.redeemRedeemCode
);

// Profile PIN
router.post('/pin',
  body('pin').isLength({ min: 4, max: 4 }).isNumeric().withMessage('PIN must be exactly 4 digits'),
  validate,
  profileController.setProfilePin
);
router.delete('/pin', profileController.removeProfilePin);
router.post('/pin/verify',
  body('pin').isLength({ min: 4, max: 4 }).isNumeric().withMessage('PIN must be exactly 4 digits'),
  validate,
  profileController.verifyProfilePin
);

// Stats
router.get('/stats', profileController.getStats);

// Avatar
router.post('/avatar',
  body('avatar').notEmpty().withMessage('Avatar is required'),
  validate,
  profileController.updateAvatar
);
router.delete('/avatar', profileController.removeAvatar);

module.exports = router;
