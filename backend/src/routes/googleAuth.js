const express = require('express');
const {
  googleOAuth,
  getCurrentUser
} = require('../controllers/googleAuthController');
const {
  authenticateToken
} = require('../middleware/googleAuth');

const router = express.Router();

/**
 * @route   POST /auth/google
 * @desc    Authenticate user with Google OAuth (ID Token)
 * @access  Public
 */
router.post(
  '/google',
  (req, res, next) => {
    // Simple validation
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }
    next();
  },
  googleOAuth
);

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;