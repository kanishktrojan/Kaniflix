const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const moviesRoutes = require('./movies');
const tvRoutes = require('./tv');
const searchRoutes = require('./search');
const streamRoutes = require('./stream');
const userRoutes = require('./user');
const adminRoutes = require('./admin');
const sportsRoutes = require('./sports');
const profileRoutes = require('./profile');
const paymentRoutes = require('./payments');

/**
 * API Routes Index
 * All routes are prefixed with /api
 */

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KANIFLIX API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/movies', moviesRoutes);
router.use('/tv', tvRoutes);
router.use('/search', searchRoutes);
router.use('/stream', streamRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/sports', sportsRoutes);
router.use('/profile', profileRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
