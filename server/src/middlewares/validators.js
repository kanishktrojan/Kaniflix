const { body, query, param, validationResult } = require('express-validator');
const { ApiError } = require('../utils/apiHelpers');

/**
 * Validation Result Handler
 * Checks for validation errors and throws formatted error
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    throw ApiError.badRequest('Validation failed', formattedErrors);
  }
  
  next();
};

/**
 * Authentication Validators
 */
const authValidators = {
  register: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    validate
  ],

  verifyOTP: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    validate
  ],

  resendOTP: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    validate
  ],

  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate
  ],

  refreshToken: [
    body('refreshToken')
      .optional()
      .isString()
      .withMessage('Invalid refresh token format'),
    validate
  ]
};

/**
 * Media Validators
 */
const mediaValidators = {
  getById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid media ID'),
    validate
  ],

  search: [
    query('query')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('page')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Page must be between 1 and 500'),
    validate
  ],

  browse: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Page must be between 1 and 500'),
    query('genre')
      .optional()
      .isInt()
      .withMessage('Invalid genre ID'),
    query('year')
      .optional()
      .isInt({ min: 1900, max: new Date().getFullYear() + 5 })
      .withMessage('Invalid year'),
    query('sort')
      .optional()
      .isIn(['popularity.desc', 'popularity.asc', 'vote_average.desc', 'vote_average.asc', 'release_date.desc', 'release_date.asc'])
      .withMessage('Invalid sort option'),
    validate
  ],

  tvEpisode: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid TV show ID'),
    param('season')
      .isInt({ min: 0 })
      .withMessage('Invalid season number'),
    param('episode')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid episode number'),
    validate
  ]
};

/**
 * Watch History Validators
 */
const historyValidators = {
  updateProgress: [
    body('mediaType')
      .isIn(['movie', 'tv'])
      .withMessage('Media type must be movie or tv'),
    body('tmdbId')
      .isInt({ min: 1 })
      .withMessage('Invalid TMDB ID'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),
    body('progress')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Progress must be between 0 and 100'),
    body('currentTime')
      .isFloat({ min: 0 })
      .withMessage('Current time must be a positive number'),
    body('duration')
      .isFloat({ min: 0 })
      .withMessage('Duration must be a positive number'),
    body('seasonNumber')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Invalid season number'),
    body('episodeNumber')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid episode number'),
    validate
  ]
};

/**
 * Watchlist Validators
 */
const watchlistValidators = {
  addItem: [
    body('mediaType')
      .isIn(['movie', 'tv'])
      .withMessage('Media type must be movie or tv'),
    body('tmdbId')
      .isInt({ min: 1 })
      .withMessage('Invalid TMDB ID'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required'),
    validate
  ],

  removeItem: [
    param('tmdbId')
      .isInt({ min: 1 })
      .withMessage('Invalid TMDB ID'),
    query('mediaType')
      .isIn(['movie', 'tv'])
      .withMessage('Media type must be movie or tv'),
    validate
  ]
};

module.exports = {
  validate,
  authValidators,
  mediaValidators,
  historyValidators,
  watchlistValidators
};
