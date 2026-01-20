const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const sportsController = require('../controllers/sportsController');
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

// Settings Management
router.get('/settings/rate-limits', adminController.getRateLimitSettings);
router.put('/settings/rate-limits', adminController.updateRateLimitSettings);
router.post('/settings/rate-limits/reset', adminController.resetRateLimitSettings);

module.exports = router;
