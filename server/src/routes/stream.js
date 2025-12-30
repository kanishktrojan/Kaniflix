const express = require('express');
const router = express.Router();
const { streamController } = require('../controllers');
const { authenticate, optionalAuth, streamLimiter } = require('../middlewares');

/**
 * Streaming Routes
 * Base path: /api/stream
 * 
 * SECURITY: All streaming endpoints are rate-limited and require authentication
 */

// Stream token generation (requires auth)
router.post('/movie/:id', authenticate, streamLimiter, streamController.getMovieStream);
router.post('/tv/:id/:season/:episode', authenticate, streamLimiter, streamController.getTVStream);

// Player configuration (optional auth for preferences)
router.post('/config', optionalAuth, streamController.getPlayerConfig);

// Player settings
router.get('/events-config', streamController.getEventsConfig);
router.get('/quality-options', streamController.getQualityOptions);

module.exports = router;
