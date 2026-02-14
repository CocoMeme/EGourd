const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware to protect routes that require authentication
 * Extracts JWT token from Authorization header and verifies it
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token format. Use Bearer token.',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user and attach to request
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during authentication',
      code: 'AUTH_SERVER_ERROR',
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for routes that can work with or without authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // If there's an error with the token, continue without user
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param {string|array} roles - Required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is accessing their own resource
 * @param {string} paramName - The parameter name to check against user ID (default: 'id')
 */
const authorizeOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const resourceId = req.params[paramName];
    const userId = req.user._id.toString();

    // Admin users can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    if (resourceId !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You can only access your own resources.',
        code: 'OWNERSHIP_REQUIRED',
      });
    }

    next();
  };
};

/**
 * Middleware to verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }

    // Find user and check if refresh token exists in database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    // Check if refresh token exists and is active
    const tokenRecord = user.refreshTokens.find(
      (rt) => rt.token === refreshToken && rt.isActive && rt.expiresAt > new Date()
    );

    if (!tokenRecord) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired or invalid',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }

    console.error('Refresh token verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during token verification',
      code: 'TOKEN_SERVER_ERROR',
    });
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeOwnership,
  verifyRefreshToken,
};
