const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config');
const database = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFoundHandler, generalLimiter } = require('./middlewares');
const { Settings } = require('./models');

/**
 * KANIFLIX Server Application
 * Industrial-grade Express server setup
 */
class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security headers
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameSrc: ["'self'", "https://vidrock.net"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
        }
      }
    }));

    // CORS configuration
    const allowedOrigins = config.ALLOWED_ORIGINS;
    this.app.use(cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Request parsing
    this.app.use(express.json({ limit: '10kb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    this.app.use(cookieParser());

    // Compression
    this.app.use(compression());

    // Logging (development only)
    if (config.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    // Rate limiting
    this.app.use('/api', generalLimiter);

    // Trust proxy (for rate limiting behind reverse proxy)
    this.app.set('trust proxy', 1);
  }

  setupRoutes() {
    // API routes
    this.app.use('/api', routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'KANIFLIX API',
        version: '1.0.0',
        documentation: '/api/health'
      });
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Initialize default settings
      await Settings.initializeDefaults();

      // Start server
      this.app.listen(config.PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎬 KANIFLIX API Server                                 
║                                                           
║   Environment: ${config.NODE_ENV.padEnd(40)}              
║   Port: ${String(config.PORT).padEnd(47)}                 
║   Client URL: ${config.CLIENT_URL.padEnd(41)}             
║                                                           
║   API Health: http://localhost:${config.PORT}/api/health  
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }
}

// Create and start application
const app = new App();
app.start();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
