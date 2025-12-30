const express = require('express');
const router = express.Router();
const { moviesController } = require('../controllers');
const { mediaValidators } = require('../middlewares');

/**
 * Movies Routes
 * Base path: /api/movies
 */

// List endpoints
router.get('/genres', moviesController.getGenres);
router.get('/trending', moviesController.getTrending);
router.get('/popular', moviesController.getPopular);
router.get('/top-rated', moviesController.getTopRated);
router.get('/upcoming', moviesController.getUpcoming);
router.get('/now-playing', moviesController.getNowPlaying);
router.get('/discover', mediaValidators.browse, moviesController.discover);
router.get('/genre/:genreId', moviesController.getByGenre);

// Detail endpoints
router.get('/:id', mediaValidators.getById, moviesController.getDetails);
router.get('/:id/credits', mediaValidators.getById, moviesController.getCredits);
router.get('/:id/similar', mediaValidators.getById, moviesController.getSimilar);
router.get('/:id/recommendations', mediaValidators.getById, moviesController.getRecommendations);
router.get('/:id/videos', mediaValidators.getById, moviesController.getVideos);

module.exports = router;
