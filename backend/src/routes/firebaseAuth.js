const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// Controllers
const {
  googleAuth,
  getCurrentUser,
  updateProfile,
  deleteAccount,
} = require('../controllers/firebaseAuthController');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Validation rules

const googleAuthValidation = [
  body('idToken')
    .notEmpty()
    .withMessage('Google ID token is required')
    .isString()
    .withMessage('Token must be a string'),
  body('googleUser.email')
    .notEmpty()
    .withMessage('Google user email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('googleUser.firstName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('googleUser.lastName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
];

const updateProfileValidation = [
  body('firstName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('profilePicture')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true; // Allow clearing profile picture
      if (typeof value === 'string' && value.match(/^https?:\/\/.+/)) return true;
      throw new Error('Profile picture must be a valid URL or empty');
    }),
];

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/firebase/google
 * @desc    Authenticate with Google Sign-In
 * @access  Public
 */
router.post('/google', googleAuthValidation, handleValidationErrors, googleAuth);

/**
 * @route   POST /api/auth/firebase/login
 * @desc    Login with email/password
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user in local database
      const User = require('../models/User');
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

      if (!user) {
        console.log('❌ Login failed: User not found for email:', email.toLowerCase());
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if user has no password (true Google Sign-In users)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'This account was created with Google Sign-In. Please use Google to login.',
        });
      }

      // Check password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const jwtToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      {
        process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d';
      }
      res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          provider: user.provider,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
        token: jwtToken,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login',
      });
    }
  }
);

/**
 * @route   POST /api/auth/firebase/register
 * @desc    Register new user with email/password (creates Firebase user)
 * @access  Public
 */
router.post(
  '/register',
  [
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('email')
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Must be a valid email address'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;

      // Check if user already exists in local database
      const existingUser = await require('../models/User').findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }

      // Initialize Firebase Admin
      const { firebaseConfig } = require('../config/firebase');
      const admin = firebaseConfig.initialize();

      let firebaseUid = null;

      try {
        // Create user in Firebase Authentication
        const firebaseUser = await admin.auth().createUser({
          email: email.toLowerCase(),
          password: password,
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          emailVerified: false,
        });

        firebaseUid = firebaseUser.uid;
        console.log('✅ User created in Firebase:', firebaseUid);
      } catch (firebaseError) {
        console.error('❌ Firebase user creation failed:', firebaseError.message);
        // Continue with local registration even if Firebase fails
      }

      // Create user in local database
      // Note: Password will be automatically hashed by User model's pre-save hook
      const newUser = new (require('../models/User'))({
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        password: password, // Plain password - will be hashed by pre-save hook
        firebaseUid: firebaseUid, // Store Firebase UID
        emailVerified: false,
        provider: 'local', // Email/password registration
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      await newUser.save();

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const jwtToken = jwt.sign(
        {
          userId: newUser._id,
          email: newUser.email,
        },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      {
        process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d';
      }
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          emailVerified: newUser.emailVerified,
          provider: newUser.provider,
          createdAt: newUser.createdAt,
        },
        token: jwtToken,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
      });
    }
  }
);

// Google route already defined above - removed duplicate

// Protected routes (require Firebase authentication)

/**
 * @route   POST /api/auth/firebase/logout
 * @desc    Logout user
 * @access  Private (JWT token required)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Since we're using JWT tokens, logout is simply handled client-side
    // by removing the token from storage. We can optionally blacklist the token here
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

/**
 * @route   GET /api/auth/firebase/me
 * @desc    Get current user profile
 * @access  Private (JWT token required)
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * @route   PUT /api/auth/firebase/profile
 * @desc    Update user profile
 * @access  Private (Firebase token + local user required)
 */
router.put(
  '/profile',
  authenticate,
  updateProfileValidation,
  handleValidationErrors,
  updateProfile
);

/**
 * @route   DELETE /api/auth/firebase/account
 * @desc    Delete user account
 * @access  Private (JWT token required)
 */
router.delete('/account', authenticate, deleteAccount);

// Health check route
/**
 * @route   GET /api/auth/firebase/health
 * @desc    Health check for Firebase auth service
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Firebase authentication service is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware specific to this router
router.use((error, req, res, _next) => {
  console.error('Firebase auth route error:', error);

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error in Firebase authentication',
  });
});

module.exports = router;
