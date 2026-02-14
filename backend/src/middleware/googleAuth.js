const jwt = require('jsonwebtoken');
const { googleOAuthConfig } = require('../config/googleOAuth');
const User = require('../models/User');

/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Get user from database
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found',
      });
    }

    // Attach user info to request
    req.user = user;
    req.userId = user._id;
    req.googleId = user.googleId;

    next();
  } catch (error) {
    console.error('Token authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Middleware to authenticate requests using Google ID tokens (alternative)
 */
const authenticateGoogleToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const idToken = authHeader && authHeader.split(' ')[1]; // Bearer ID_TOKEN

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify Google ID token
    const verificationResult = await googleOAuthConfig.verifyIdToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google ID token',
        error: verificationResult.error,
      });
    }

    const googleUser = verificationResult.user;

    // Get user from database using Google ID
    const user = await User.findOne({ googleId: googleUser.googleId });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Attach user info to request
    req.user = user;
    req.userId = user._id;
    req.googleId = user.googleId;
    req.googleUserInfo = googleUser;

    next();
  } catch (error) {
    console.error('Google token authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication',
    });
  }
};

/**
 * Middleware to handle optional authentication (for public endpoints that can work with or without auth)
 */
const optionalAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    // Try to verify JWT token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id;
        req.googleId = user.googleId;
      }
    } catch (tokenError) {
      // Token is invalid, but continue without authentication
      console.log('Optional authentication failed:', tokenError.message);
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue even if there's an error
    next();
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role || 'user';
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole,
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during role check',
      });
    }
  };
};

/**
 * Middleware to check if user account is verified
 */
const requireVerifiedEmail = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Email verification required',
        emailVerified: false,
      });
    }

    next();
  } catch (error) {
    console.error('Email verification check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during email verification check',
    });
  }
};

/**
 * Middleware to validate request source (optional security measure)
 */
const validateRequestSource = (req, res, next) => {
  try {
    const origin = req.headers.origin;
    const userAgent = req.headers['user-agent'];

    // Log request for monitoring (you can enhance this based on your needs)
    console.log(`Request from origin: ${origin}, User-Agent: ${userAgent}`);

    // Add any specific validation logic here if needed
    // For now, we'll just continue
    next();
  } catch (error) {
    console.error('Request source validation error:', error);
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateGoogleToken,
  optionalAuthentication,
  requireRole,
  requireVerifiedEmail,
  validateRequestSource,
};
