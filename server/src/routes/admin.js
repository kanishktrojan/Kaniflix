const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const sportsController = require('../controllers/sportsController');
const subscriptionAdminController = require('../controllers/subscriptionAdminController');
const { authenticate, authorize } = require('../middlewares/auth');

/**
 * Admin Routes
 * All routes require authentication and admin role
 */

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// Activity
router.get('/activity', adminController.getRecentActivity);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/bulk-update', adminController.bulkUpdateUsers);

// Sports Management
router.get('/sports/stats', sportsController.getSportsStats);
router.get('/sports', sportsController.getAllSportsEventsAdmin);
router.get('/sports/:id', sportsController.getSportsEventByIdAdmin);
router.post('/sports', sportsController.createSportsEvent);
router.put('/sports/:id', sportsController.updateSportsEvent);
router.delete('/sports/:id', sportsController.deleteSportsEvent);
router.patch('/sports/:id/toggle-live', sportsController.toggleLiveStatus);
router.patch('/sports/:id/scores', sportsController.updateScores);
router.post('/sports/bulk-update', sportsController.bulkUpdateSportsEvents);

// Subscription Plans Management
router.get('/subscriptions/stats', subscriptionAdminController.getSubscriptionStats);
router.get('/subscriptions/plans', subscriptionAdminController.getAllPlans);
router.post('/subscriptions/plans', subscriptionAdminController.createPlan);
router.put('/subscriptions/plans/:id', subscriptionAdminController.updatePlan);
router.delete('/subscriptions/plans/:id', subscriptionAdminController.deletePlan);

// Coupon Codes Management
router.get('/subscriptions/coupons', subscriptionAdminController.getAllCoupons);
router.post('/subscriptions/coupons', subscriptionAdminController.createCoupon);
router.put('/subscriptions/coupons/:id', subscriptionAdminController.updateCoupon);
router.delete('/subscriptions/coupons/:id', subscriptionAdminController.deleteCoupon);
router.get('/subscriptions/coupons/:id/usage', subscriptionAdminController.getCouponUsage);
router.post('/subscriptions/coupons/bulk', subscriptionAdminController.bulkCreateCoupons);

// Redeem Codes Management (Free Subscriptions - SEPARATE from Coupons)
router.get('/subscriptions/redeem-codes', subscriptionAdminController.getAllRedeemCodes);
router.post('/subscriptions/redeem-codes', subscriptionAdminController.createRedeemCode);
router.put('/subscriptions/redeem-codes/:id', subscriptionAdminController.updateRedeemCode);
router.delete('/subscriptions/redeem-codes/:id', subscriptionAdminController.deleteRedeemCode);
router.get('/subscriptions/redeem-codes/:id/usage', subscriptionAdminController.getRedeemCodeUsage);
router.post('/subscriptions/redeem-codes/bulk', subscriptionAdminController.bulkCreateRedeemCodes);

// User Subscriptions Management
router.get('/subscriptions/users/:userId', subscriptionAdminController.getUserSubscription);
router.put('/subscriptions/users/:userId', subscriptionAdminController.updateUserSubscription);
router.delete('/subscriptions/users/:userId', subscriptionAdminController.cancelUserSubscription);

// Settings Management
router.get('/settings/rate-limits', adminController.getRateLimitSettings);
router.put('/settings/rate-limits', adminController.updateRateLimitSettings);
router.post('/settings/rate-limits/reset', adminController.resetRateLimitSettings);

module.exports = router;
