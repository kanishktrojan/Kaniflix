const express = require('express');
const router = express.Router();
const { searchController } = require('../controllers');
const { searchLimiter, mediaValidators } = require('../middlewares');

/**
 * Search Routes
 * Base path: /api/search
 */

router.get('/', searchLimiter, mediaValidators.search, searchController.search);
router.get('/movies', searchLimiter, searchController.searchMovies);
router.get('/tv', searchLimiter, searchController.searchTV);
router.get('/person', searchLimiter, searchController.searchPeople);
router.get('/trending', searchController.getTrending);
router.get('/genres', searchController.getAllGenres);

module.exports = router;
