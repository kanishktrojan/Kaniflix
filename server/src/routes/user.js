const express = require('express');
const router = express.Router();
const { userContentController } = require('../controllers');
const { authenticate, historyValidators, watchlistValidators } = require('../middlewares');

/**
 * User Content Routes
 * Base path: /api/user
 * 
 * All routes require authentication
 */

// Apply authentication to all routes
router.use(authenticate);

// Watch Progress
router.post('/progress', historyValidators.updateProgress, userContentController.updateProgress);
router.get('/progress/:mediaType/:tmdbId', userContentController.getProgress);

// Continue Watching
router.get('/continue-watching', userContentController.getContinueWatching);

// Watch History
router.get('/history', userContentController.getWatchHistory);
router.delete('/history', userContentController.clearHistory);
router.delete('/history/:mediaType/:tmdbId', userContentController.removeFromHistory);

// Last Episode (TV)
router.get('/last-episode/:tmdbId', userContentController.getLastWatchedEpisode);

// Watchlist
router.get('/watchlist', userContentController.getWatchlist);
router.post('/watchlist', watchlistValidators.addItem, userContentController.addToWatchlist);
router.delete('/watchlist/:tmdbId', watchlistValidators.removeItem, userContentController.removeFromWatchlist);
router.get('/watchlist/check/:mediaType/:tmdbId', userContentController.checkWatchlistStatus);
router.post('/watchlist/check-batch', userContentController.checkWatchlistBatch);

// Statistics
router.get('/stats', userContentController.getStats);

module.exports = router;
