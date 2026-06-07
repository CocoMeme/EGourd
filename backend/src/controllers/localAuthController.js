const User = require('../models/User');
const jwt = require('jsonwebtoken');

/**
 * Register a new user with email and password
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create new user (password will be hashed automatically by the pre-save middleware)
    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: password,
      firstName: firstName ? firstName.trim() : '',
      lastName: lastName ? lastName.trim() : '',

      provider: 'local',
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
    });

    await newUser.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: newUser._id,
        email: newUser.email,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Generate refresh token (30d) and persist it on the user
    const refreshToken = newUser.generateRefreshToken();
    await newUser.save();

    // Remove sensitive information from response
    const userResponse = {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      profilePicture: newUser.profilePicture,
      isEmailVerified: newUser.isEmailVerified,
      provider: newUser.provider,
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: userResponse,
      token: jwtToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    if (!email || !password) {
      console.log('❌ Login failed: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user by email (don't filter by isActive yet)
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password'); // Include password field for comparison

    if (!user) {
      console.log(`❌ Login failed: User not found - ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log(`👤 User found: ${user.email} | Role: ${user.role} | Active: ${user.isActive}`);

    // Users created with social auth may not have a local password
    if (!user.password) {
      console.log(`❌ Login failed: No local password set - ${email}`);
      return res.status(401).json({
        success: false,
        message:
          'This account does not have a password set. Please use your social login provider.',
      });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      console.log(`❌ Login failed: Account deactivated - ${email}`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support for assistance.',
        accountDeactivated: true,
        deactivationReason: user.deactivationReason || null,
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log(`✅ Login successful: ${email} | Role: ${user.role}`);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Generate refresh token (30d) and persist it on the user
    const refreshToken = user.generateRefreshToken();
    await user.save();

    // Remove sensitive information from response
    const userResponse = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: jwtToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    const { firstName, lastName, profilePicture, preferences } = req.body;

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

    // Update preferences if provided
    if (preferences !== undefined && preferences.geminiEmbeddingEnabled !== undefined) {
      if (!user.preferences) user.preferences = {};
      user.preferences.geminiEmbeddingEnabled = preferences.geminiEmbeddingEnabled;
    }

    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role,
        updatedAt: user.updatedAt,
        preferences: user.preferences,
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
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { user } = req;
    const { currentPassword, newPassword } = req.body;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.provider !== 'local') {
      return res.status(400).json({
        success: false,
        message: 'Password change is only available for local accounts',
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    // Get user with password field
    const userWithPassword = await User.findById(user._id).select('+password');

    // Verify current password
    const isCurrentPasswordValid = await userWithPassword.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password (will be hashed by pre-save middleware)
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change',
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    let { userId } = req;
    const { refreshToken } = req.body || {};

    // Fallback: if access token was expired and auth middleware did not set req.userId,
    // try to derive userId from the refresh token in the body so we can still revoke it.
    if (!userId && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
        if (decoded && decoded.type === 'refresh' && decoded.id) {
          userId = decoded.id;
        }
      } catch (_e) {
        // Refresh token invalid/expired — nothing to revoke, proceed to clear response.
      }
    }

    if (userId) {
      // Revoke the supplied refresh token so it cannot be reused
      if (refreshToken) {
        const user = await User.findById(userId);
        if (user) {
          user.revokeRefreshToken(refreshToken);
          await user.save();
        }
      }
    }

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
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Delete from database
    await User.deleteOne({ _id: user._id });

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

/**
 * Register a new user with username and password (no email verification required)
 */
const registerWithUsername = async (req, res) => {
  try {
    const { username, password, firstName, lastName } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({
      username: username.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    // Create new user (no email required for username-based accounts)
    const newUser = new User({
      username: username.toLowerCase().trim(),
      // No email for username-based accounts
      password: password,
      firstName: firstName ? firstName.trim() : '',
      lastName: lastName ? lastName.trim() : '',
      provider: 'local',
      isActive: true,
      isEmailVerified: true, // No email verification needed for username accounts
      lastLogin: new Date(),
      createdAt: new Date(),
    });

    await newUser.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: newUser._id,
        username: newUser.username,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Generate refresh token (30d) and persist it on the user
    const refreshToken = newUser.generateRefreshToken();
    await newUser.save();

    // Remove sensitive information from response
    const userResponse = {
      id: newUser._id,
      username: newUser.username,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      profilePicture: newUser.profilePicture,
      isEmailVerified: newUser.isEmailVerified,
      provider: newUser.provider,
      authMethod: 'username',
      createdAt: newUser.createdAt,
    };

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: userResponse,
      token: jwtToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Username registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Login user with username and password
 */
const loginWithUsername = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(`🔐 Username login attempt for: ${username}`);

    if (!username || !password) {
      console.log('❌ Login failed: Missing username or password');
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Find user by username
    const user = await User.findOne({
      username: username.toLowerCase().trim(),
    }).select('+password');

    if (!user) {
      console.log(`❌ Login failed: User not found - ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    console.log(`👤 User found: ${user.username} | Role: ${user.role} | Active: ${user.isActive}`);

    // Users created with social auth may not have a local password
    if (!user.password) {
      console.log(`❌ Login failed: No local password set - ${username}`);
      return res.status(401).json({
        success: false,
        message:
          'This account does not have a password set. Please use your social login provider.',
      });
    }

    // Check if account is deactivated
    if (!user.isActive) {
      console.log(`❌ Login failed: Account deactivated - ${username}`);
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support for assistance.',
        accountDeactivated: true,
        deactivationReason: user.deactivationReason || null,
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`❌ Login failed: Invalid password - ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    console.log(`✅ Username login successful: ${username} | Role: ${user.role}`);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Generate refresh token (30d) and persist it on the user
    const refreshToken = user.generateRefreshToken();
    await user.save();

    // Remove sensitive information from response
    const userResponse = {
      id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      isEmailVerified: user.isEmailVerified,
      provider: user.provider,
      authMethod: 'username',
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: userResponse,
      token: jwtToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Username login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Refresh access token using a valid refresh token
 * Rotates the refresh token: the supplied one is revoked and a new one is issued.
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        code: 'NO_REFRESH_TOKEN',
        message: 'Refresh token is required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret');
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Refresh token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token',
      });
    }

    if (!user.isActive) {
      console.log(`❌ Refresh rejected: Account deactivated - ${user.email}`);
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated. Please contact support for assistance.',
        accountDeactivated: true,
        deactivationReason: user.deactivationReason || null,
      });
    }

    const tokenRecord = user.refreshTokens.find(
      (rt) => rt.token === refreshToken && rt.isActive && rt.expiresAt > new Date()
    );

    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token is no longer valid. Please log in again.',
      });
    }

    // Rotate: revoke the old refresh token, then issue a new pair.
    user.revokeRefreshToken(refreshToken);
    user.cleanExpiredRefreshTokens();

    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d' }
    );

    const newRefreshToken = user.generateRefreshToken();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: 'Failed to refresh token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  register,
  login,
  registerWithUsername,
  loginWithUsername,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
  refresh,
};
