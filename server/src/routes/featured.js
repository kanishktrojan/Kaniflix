const express = require('express');
const router = express.Router();
const featuredController = require('../controllers/featuredController');
const { authenticate } = require('../middlewares/auth');

/**
 * Featured Content Routes
 * Public routes for viewing featured/trending content
 */

// Public routes (no auth required)
router.get('/', featuredController.getActiveFeaturedContent);

// Protected route - requires authentication to get stream info
router.get('/:id/stream', authenticate, featuredController.getStreamInfo);

module.exports = router;
