const express = require('express');
const router = express.Router();
const { tvController } = require('../controllers');
const { mediaValidators } = require('../middlewares');

/**
 * TV Shows Routes
 * Base path: /api/tv
 */

// List endpoints
router.get('/genres', tvController.getGenres);
router.get('/trending', tvController.getTrending);
router.get('/popular', tvController.getPopular);
router.get('/top-rated', tvController.getTopRated);
router.get('/airing-today', tvController.getAiringToday);
router.get('/discover', mediaValidators.browse, tvController.discover);
router.get('/genre/:genreId', tvController.getByGenre);

// Detail endpoints
router.get('/:id', mediaValidators.getById, tvController.getDetails);
router.get('/:id/credits', mediaValidators.getById, tvController.getCredits);
router.get('/:id/similar', mediaValidators.getById, tvController.getSimilar);
router.get('/:id/recommendations', mediaValidators.getById, tvController.getRecommendations);
router.get('/:id/videos', mediaValidators.getById, tvController.getVideos);
router.get('/:id/season/:season', mediaValidators.tvEpisode, tvController.getSeasonDetails);
router.get('/:id/season/:season/episode/:episode', mediaValidators.tvEpisode, tvController.getEpisodeDetails);

module.exports = router;
