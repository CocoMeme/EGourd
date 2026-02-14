const { firebaseConfig } = require('../config/firebase');
const User = require('../models/User');

/**
 * Middleware to verify Firebase ID token
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided or invalid format',
      });
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // Verify the Firebase token
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: verificationResult.error,
      });
    }

    // Add Firebase user data to request
    req.firebaseUser = verificationResult.user;
    req.uid = verificationResult.user.uid;

    // Optional: Sync with local database user
    try {
      const localUser = await User.findOne({ firebaseUid: req.uid });
      if (localUser) {
        req.user = localUser;
      }
    } catch (dbError) {
      console.error('Error fetching local user:', dbError);
      // Continue without local user - Firebase user is still valid
    }

    next();
  } catch (error) {
    console.error('Error in Firebase auth middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Middleware to verify Firebase token and require local user account
 */
const requireLocalUser = async (req, res, next) => {
  try {
    // First verify Firebase token
    await new Promise((resolve, reject) => {
      verifyFirebaseToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check if local user exists
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found. Please complete registration.',
        requiresRegistration: true,
      });
    }

    next();
  } catch (error) {
    console.error('Error in requireLocalUser middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to extract user info from Firebase token (optional authentication)
 */
const optionalFirebaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return next();
    }

    // Verify the Firebase token
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (verificationResult.success) {
      req.firebaseUser = verificationResult.user;
      req.uid = verificationResult.user.uid;

      // Try to get local user
      try {
        const localUser = await User.findOne({ firebaseUid: req.uid });
        if (localUser) {
          req.user = localUser;
        }
      } catch (dbError) {
        console.error('Error fetching local user:', dbError);
      }
    }

    next();
  } catch (error) {
    console.error('Error in optional Firebase auth middleware:', error);
    // Don't fail the request, just continue without authentication
    next();
  }
};

/**
 * Middleware to check if user has specific roles or permissions
 */
const requireRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check Firebase custom claims for roles
      const customClaims = req.firebaseUser.customClaims || {};
      const userRoles = customClaims.roles || [];

      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some(
        (role) => userRoles.includes(role) || req.user.role === role
      );

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredRoles,
          userRoles,
        });
      }

      next();
    } catch (error) {
      console.error('Error in role check middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Middleware to validate Firebase token format
 */
const validateTokenFormat = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header is required',
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization header format. Use "Bearer <token>"',
    });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token || token.trim() === '') {
    return res.status(401).json({
      success: false,
      message: 'Token is required',
    });
  }

  next();
};

module.exports = {
  verifyFirebaseToken,
  requireLocalUser,
  optionalFirebaseAuth,
  requireRole,
  validateTokenFormat,
};
