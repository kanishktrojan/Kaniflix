const express = require('express');
const router = express.Router();
const sportsController = require('../controllers/sportsController');
const { authenticate, authorize } = require('../middlewares/auth');
const { sportsLimiter } = require('../middlewares/rateLimiter');

/**
 * Sports Routes
 * Public routes for viewing sports content
 */

// Apply sports-specific rate limiting to all sports routes
router.use(sportsLimiter);

// Public routes (no auth required)
router.get('/', sportsController.getAllSportsEvents);
router.get('/categories', sportsController.getCategories);
router.get('/live', sportsController.getLiveEvents);
router.get('/upcoming', sportsController.getUpcomingEvents);
router.get('/featured', sportsController.getFeaturedEvents);
router.get('/category/:category', sportsController.getEventsByCategory);
router.get('/:id', sportsController.getSportsEventById);

// Protected route - requires authentication to get stream info
router.get('/:id/stream', authenticate, sportsController.getStreamInfo);

module.exports = router;
