const rateLimit = require('express-rate-limit');
const { rateLimitErrorHandler } = require('./errorHandler');

/**
 * General API rate limiting
 */
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Rate limiting for password reset requests
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset attempts. Please try again in an hour.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Rate limiting for file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    status: 'error',
    message: 'Too many file uploads. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Rate limiting for ML prediction requests (more expensive operations)
 */
const mlPredictionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 predictions per hour
  message: {
    status: 'error',
    message: 'Too many prediction requests. Please try again later.',
    code: 'PREDICTION_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Rate limiting for search requests
 */
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 searches per 5 minutes
  message: {
    status: 'error',
    message: 'Too many search requests. Please try again in a few minutes.',
    code: 'SEARCH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitErrorHandler,
});

/**
 * Dynamic rate limiter based on user role
 */
const createDynamicRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: (req) => {
      // Higher limits for authenticated users
      if (req.user) {
        switch (req.user.role) {
          case 'admin':
            return options.adminMax || 1000;
          case 'researcher':
            return options.researcherMax || 500;
          case 'user':
            return options.userMax || 200;
          default:
            return options.defaultMax || 100;
        }
      }
      // Lower limits for anonymous users
      return options.anonymousMax || 50;
    },
    message: {
      status: 'error',
      message: 'Rate limit exceeded for your user tier.',
      code: 'USER_RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitErrorHandler,
  });
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove powered by header
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
  // Basic XSS protection - remove script tags from request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS patterns
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
};

/**
 * API key validation middleware (for external integrations)
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({
      status: 'error',
      message: 'API key is required',
      code: 'API_KEY_REQUIRED',
    });
  }

  // In production, validate against database or environment variable
  const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
  }

  next();
};

/**
 * IP whitelist middleware for admin endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    // Add default allowed IPs
    const defaultAllowedIPs = (process.env.ADMIN_ALLOWED_IPS || '').split(',');
    const allAllowedIPs = [...allowedIPs, ...defaultAllowedIPs];

    if (allAllowedIPs.length === 0 || allAllowedIPs.includes(clientIP)) {
      return next();
    }

    res.status(403).json({
      status: 'error',
      message: 'Access denied from this IP address',
      code: 'IP_NOT_ALLOWED',
    });
  };
};

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    contentLength: req.get('Content-Length'),
  };

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // XSS
    /%3c.*%3e/i, // Encoded HTML
  ];

  const isSuspicious = suspiciousPatterns.some(
    (pattern) => pattern.test(req.originalUrl) || pattern.test(JSON.stringify(req.body || ''))
  );

  if (isSuspicious) {
    console.warn('🚨 Suspicious request detected:', logData);
  }

  next();
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  mlPredictionLimiter,
  searchLimiter,
  createDynamicRateLimiter,
  securityHeaders,
  sanitizeRequest,
  validateApiKey,
  ipWhitelist,
  securityLogger,
};
