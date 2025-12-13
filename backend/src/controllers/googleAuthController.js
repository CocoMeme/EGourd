const { googleOAuthConfig } = require('../config/googleOAuth');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Handle Google OAuth authentication
 * Expects { idToken } in body
 */
const googleOAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // 1. Verify ID Token
    const verificationResult = await googleOAuthConfig.verifyIdToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google ID token',
        error: verificationResult.error,
      });
    }

    const { user: googleUser } = verificationResult;

    // 2. Find or Create User
    let user = await User.findOne({
      $or: [
        { googleId: googleUser.googleId },
        { email: googleUser.email }
      ]
    });

    if (!user) {
      // Create new user
      user = new User({
        googleId: googleUser.googleId,
        email: googleUser.email,
        firstName: googleUser.firstName,
        lastName: googleUser.lastName,
        profilePicture: googleUser.picture,
        emailVerified: googleUser.emailVerified || true, // Google emails are verified
        isEmailVerified: true,
        provider: 'google',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        role: 'user'
      });
      await user.save();
      console.log(`🆕 New Google user created: ${user.email}`);
    } else {
      // Update existing user
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account deactivated',
          accountDeactivated: true
        });
      }

      // Link Google ID if not present (e.g., previously registered with email)
      if (!user.googleId) user.googleId = googleUser.googleId;
      if (!user.profilePicture) user.profilePicture = googleUser.picture;
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        user.emailVerified = true;
      }

      user.lastLogin = new Date();
      await user.save();
      console.log(`👋 Google user logged in: ${user.email}`);
    }

    // 3. Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // 4. Respond
    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Google OAuth Controller Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Get Current User Profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id); // Assuming auth middleware sets req.user
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

module.exports = {
  googleOAuth,
  getCurrentUser
};