const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// Import configurations
const database = require('./config/database');
const { configureCloudinary } = require('./config/cloudinary');

class App {
  constructor() {
    this.app = express();
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  configureMiddleware() {
    // Security middleware
    this.app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:', 'https://validator.swagger.io'],
            connectSrc: ["'self'", 'https://egourd.onrender.com', 'http://localhost:5000'],
          },
        },
      })
    );

    // CORS configuration
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://192.168.1.66:3000',
        'http://localhost:19006', // Expo dev server
        'http://192.168.1.66:19006', // Expo dev server with IP
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    // For development, allow all origins from React Native
    if (process.env.NODE_ENV === 'development') {
      corsOptions.origin = true; // Allow all origins in development
    }

    this.app.use(cors(corsOptions));

    // Logging middleware - Custom format with more details
    const customFormat = ':method :url :status :response-time ms - :res[content-length]';
    this.app.use(
      morgan(customFormat, {
        stream: {
          write: (message) => {
            console.log(`📡 ${message.trim()}`);
          },
        },
      })
    );

    // Detailed request/response logging in development
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        const start = Date.now();
        console.log(`\n🔹 [${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
        if (Object.keys(req.body || {}).length > 0) {
          // Don't log passwords
          const safeBody = { ...req.body };
          if (safeBody.password) safeBody.password = '***';
          console.log('   📦 Body:', JSON.stringify(safeBody));
        }

        // Capture response
        const originalSend = res.send;
        res.send = function (body) {
          const duration = Date.now() - start;
          try {
            const parsed = typeof body === 'string' ? JSON.parse(body) : body;
            console.log(
              `   ✅ Response [${res.statusCode}] (${duration}ms):`,
              parsed.success !== undefined ? `success: ${parsed.success}` : 'sent'
            );
          } catch (e) {
            console.log(`   ✅ Response [${res.statusCode}] (${duration}ms)`);
          }
          return originalSend.call(this, body);
        };

        next();
      });
    }

    // Body parsing middleware
    this.app.use(
      express.json({
        limit: process.env.MAX_FILE_SIZE || '50mb',
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: process.env.MAX_FILE_SIZE || '50mb',
      })
    );

    // Serve static files
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Request timestamp middleware
    this.app.use((req, res, next) => {
      req.requestTime = new Date().toISOString();
      next();
    });

    console.log('⚙️  Middleware configured successfully');
  }

  configureRoutes() {
    // Health check endpoint (lightweight - no DB ping for routine checks)
    this.app.get('/api/health', async (req, res) => {
      try {
        // Skip DB ping unless ?full=true is passed
        const fullCheck = req.query.full === 'true';
        const dbHealth = await database.healthCheck(!fullCheck);
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          database: dbHealth,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
        };

        res.status(200).json(health);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    });

    // Database health check endpoint
    this.app.get('/api/health/database', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        res.status(200).json({
          success: true,
          message: 'Database connection is healthy',
          data: dbHealth,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({
          success: false,
          message: 'Database connection is unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // API documentation endpoint
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Gourd Classification API',
        version: '1.0.0',
        description: 'Backend API for the Gourd Classification mobile application',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth',
          verification: '/api/verification',
          users: '/api/users',
          scans: '/api/scans',
          uploads: '/api/uploads',
          news: '/api/news',
          pollination: '/api/pollination',
          forum: '/api/forum',
          chatbot: '/api/chatbot',
          admin: '/api/admin',
        },
        documentation: '/api/docs',
      });
    });

    // Import and use route modules
    this.app.use('/api/auth', require('./routes/googleAuth'));
    this.app.use('/api/auth/local', require('./routes/localAuth'));
    this.app.use('/api/verification', require('./routes/verification'));
    this.app.use('/api/news', require('./routes/news'));
    this.app.use('/api/pollination', require('./routes/pollination'));
    this.app.use('/api/plants', require('./routes/plant')); // New plant management routes
    this.app.use('/api/forum', require('./routes/forum'));
    this.app.use('/api/chatbot', require('./routes/chatbot'));
    this.app.use('/api/admin', require('./routes/admin'));
    this.app.use('/api/scans', require('./routes/scan'));
    this.app.use('/api/uploads', require('./routes/uploads'));
    // TODO: Add these when other route modules are created
    // this.app.use('/api/users', require('./routes/users'));

    // Catch-all route for undefined endpoints
    this.app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });

    console.log('🛣️  Routes configured successfully');
  }

  configureErrorHandling() {
    // Global error handling middleware
    this.app.use((err, req, res, next) => {
      // Log error
      console.error('❌ Error:', err.stack);

      // Handle different error types
      let error = { ...err };
      error.message = err.message;

      // Mongoose bad ObjectId
      if (err.name === 'CastError') {
        const message = 'Invalid ID format';
        error = { message, statusCode: 400 };
      }

      // Mongoose duplicate key
      if (err.code === 11000) {
        const message = 'Duplicate field value entered';
        error = { message, statusCode: 400 };
      }

      // Mongoose validation error
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors)
          .map((val) => val.message)
          .join(', ');
        error = { message, statusCode: 400 };
      }

      // JWT errors
      if (err.name === 'JsonWebTokenError') {
        const message = 'Invalid token';
        error = { message, statusCode: 401 };
      }

      if (err.name === 'TokenExpiredError') {
        const message = 'Token expired';
        error = { message, statusCode: 401 };
      }

      // Send error response
      res.status(error.statusCode || 500).json({
        status: 'error',
        message: error.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        timestamp: new Date().toISOString(),
      });
    });

    console.log('🛡️  Error handling configured successfully');
  }

  async initialize() {
    try {
      // Connect to database
      await database.connect();

      // Configure Cloudinary
      configureCloudinary();

      console.log('🚀 Application initialized successfully');
      return this.app;
    } catch (error) {
      console.error('❌ Application initialization failed:', error);
      throw error;
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;
