const { firebaseConfig } = require('../config/firebase');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Handle Google Sign-In with Firebase authentication
 */
const googleAuth = async (req, res) => {
  try {
    const { googleUser, idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify Google token with Firebase
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
        error: verificationResult.error,
      });
    }

    const firebaseUser = verificationResult.user;

    // Check if user exists in local database
    let localUser = await User.findOne({ 
      $or: [
        { firebaseUid: firebaseUser.uid },
        { email: firebaseUser.email }
      ]
    });

    if (!localUser) {
      // Create new user from Google data
      localUser = new User({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName: googleUser.firstName || firebaseUser.name?.split(' ')[0] || '',
        lastName: googleUser.lastName || firebaseUser.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: googleUser.picture || firebaseUser.picture,
        emailVerified: true, // Google accounts are pre-verified
        provider: 'google',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      await localUser.save();
    } else {
      // Update existing user's last login and Firebase UID if needed
      localUser.lastLogin = new Date();
      if (!localUser.firebaseUid) {
        localUser.firebaseUid = firebaseUser.uid;
      }
      if (!localUser.profilePicture && googleUser.picture) {
        localUser.profilePicture = googleUser.picture;
      }
      await localUser.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: localUser._id,
        email: localUser.email,
        firebaseUid: localUser.firebaseUid,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove sensitive information
    const userResponse = {
      id: localUser._id,
      email: localUser.email,
      firstName: localUser.firstName,
      lastName: localUser.lastName,
      profilePicture: localUser.profilePicture,
      emailVerified: localUser.emailVerified,
      provider: localUser.provider,
      createdAt: localUser.createdAt,
    };

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: userResponse,
      token: jwtToken,
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Handle Firebase user authentication and sync with local database
 */
const firebaseLogin = async (req, res) => {
  try {
    const { idToken, userData } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required',
      });
    }

    // Verify Firebase token
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        error: verificationResult.error,
      });
    }

    const firebaseUser = verificationResult.user;

    // Check if user exists in local database
    let localUser = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!localUser) {
      // Create new user if doesn't exist
      localUser = new User({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName: userData?.firstName || firebaseUser.name?.split(' ')[0] || '',
        lastName: userData?.lastName || firebaseUser.name?.split(' ').slice(1).join(' ') || '',
        profilePicture: firebaseUser.picture,
        emailVerified: firebaseUser.email_verified,
        provider: firebaseUser.firebase?.sign_in_provider || 'firebase',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      await localUser.save();
    } else {
      // Update existing user's login info
      localUser.lastLogin = new Date();
      localUser.emailVerified = firebaseUser.email_verified;
      
      // Update profile picture if available from Firebase
      if (firebaseUser.picture && !localUser.profilePicture) {
        localUser.profilePicture = firebaseUser.picture;
      }

      await localUser.save();
    }

    // Generate JWT for API authentication (optional - you can use Firebase tokens directly)
    const jwtToken = jwt.sign(
      {
        userId: localUser._id,
        firebaseUid: firebaseUser.uid,
        email: localUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: localUser._id,
        firebaseUid: localUser.firebaseUid,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profilePicture: localUser.profilePicture,
        emailVerified: localUser.emailVerified,
        provider: localUser.provider,
        role: localUser.role,
        createdAt: localUser.createdAt,
        lastLogin: localUser.lastLogin,
      },
      tokens: {
        firebaseToken: idToken,
        jwtToken: jwtToken,
      },
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

/**
 * Handle Firebase user registration
 */
const firebaseRegister = async (req, res) => {
  try {
    const { idToken, userData } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required',
      });
    }

    if (!userData || !userData.firstName || !userData.lastName) {
      return res.status(400).json({
        success: false,
        message: 'User data with firstName and lastName is required',
      });
    }

    // Verify Firebase token
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        error: verificationResult.error,
      });
    }

    const firebaseUser = verificationResult.user;

    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        },
      });
    }

    // Create new user
    const newUser = new User({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      profilePicture: firebaseUser.picture || userData.profilePicture,
      emailVerified: firebaseUser.email_verified,
      provider: firebaseUser.firebase?.sign_in_provider || 'firebase',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
    });

    await newUser.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: newUser._id,
        firebaseUid: firebaseUser.uid,
        email: newUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        firebaseUid: newUser.firebaseUid,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        profilePicture: newUser.profilePicture,
        emailVerified: newUser.emailVerified,
        provider: newUser.provider,
        role: newUser.role,
        createdAt: newUser.createdAt,
        lastLogin: newUser.lastLogin,
      },
      tokens: {
        firebaseToken: idToken,
        jwtToken: jwtToken,
      },
    });
  } catch (error) {
    console.error('Firebase registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
    });
  }
};

/**
 * Handle Google OAuth login through Firebase
 */
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase ID token is required',
      });
    }

    // Verify Firebase token
    const verificationResult = await firebaseConfig.verifyToken(idToken);

    if (!verificationResult.success) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        error: verificationResult.error,
      });
    }

    const firebaseUser = verificationResult.user;

    // Verify it's a Google sign-in
    if (firebaseUser.firebase?.sign_in_provider !== 'google.com') {
      return res.status(400).json({
        success: false,
        message: 'Token is not from Google authentication',
      });
    }

    // Check if user exists in local database
    let localUser = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!localUser) {
      // Create new user from Google profile
      const nameParts = firebaseUser.name ? firebaseUser.name.split(' ') : [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      localUser = new User({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        firstName: firstName,
        lastName: lastName,
        profilePicture: firebaseUser.picture,
        emailVerified: firebaseUser.email_verified,
        provider: 'google',
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
      });

      await localUser.save();
    } else {
      // Update existing user's login info
      localUser.lastLogin = new Date();
      localUser.emailVerified = firebaseUser.email_verified;
      
      // Update profile picture if available
      if (firebaseUser.picture) {
        localUser.profilePicture = firebaseUser.picture;
      }

      await localUser.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: localUser._id,
        firebaseUid: firebaseUser.uid,
        email: localUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        id: localUser._id,
        firebaseUid: localUser.firebaseUid,
        email: localUser.email,
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        profilePicture: localUser.profilePicture,
        emailVerified: localUser.emailVerified,
        provider: localUser.provider,
        role: localUser.role,
        createdAt: localUser.createdAt,
        lastLogin: localUser.lastLogin,
      },
      tokens: {
        firebaseToken: idToken,
        jwtToken: jwtToken,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during Google authentication',
    });
  }
};

/**
 * Handle user logout (invalidate tokens)
 */
const firebaseLogout = async (req, res) => {
  try {
    const { uid } = req;

    if (uid) {
      // Update last login timestamp
      await User.updateOne(
        { firebaseUid: uid },
        { lastActive: new Date() }
      );
    }

    // Note: Firebase tokens cannot be invalidated server-side
    // The client should remove the token locally
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
    });
  }
};

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const { user } = req;
    const { firstName, lastName, profilePicture } = req.body;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during profile update',
    });
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const { user, uid } = req;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Delete from local database
    await User.deleteOne({ _id: user._id });

    // Optionally delete from Firebase (uncomment if needed)
    // await firebaseConfig.deleteUser(uid);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during account deletion',
    });
  }
};

module.exports = {
  firebaseLogin,
  firebaseRegister,
  googleAuth,
  googleLogin,
  firebaseLogout,
  getCurrentUser,
  updateProfile,
  deleteAccount,
};