const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: false, // Make username optional for email registration
    unique: true,
    sparse: true, // Allows multiple null values
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password required only if not using Google OAuth
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't return password in queries by default
  },

  // Google OAuth integration fields
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    index: true
  },



  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple'],
    default: 'local'
  },

  // Profile information (top-level for Firebase compatibility)
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },

  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },

  profilePicture: {
    type: String, // URL to profile image
    default: null
  },

  // Additional profile information
  profile: {
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    }
  },

  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de'] // Add more languages as needed
    },
    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      scanReminders: { type: Boolean, default: true }
    },
    measurementUnits: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    }
  },

  // Account status and security
  isActive: {
    type: Boolean,
    default: true
  },

  isEmailVerified: {
    type: Boolean,
    default: false
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Soft delete
  deletedAt: {
    type: Date,
    default: null
  },

  deactivationReason: {
    type: String,
    default: null
  },

  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Email verification
  emailVerification: {
    pin: {
      type: String,
      select: false // Don't return PIN in queries by default
    },
    expires: Date,
    attempts: {
      type: Number,
      default: 0
    }
  },

  // Login tracking
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  },

  // Refresh token for JWT
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date,
    isActive: { type: Boolean, default: true }
  }],

  // Statistics
  stats: {
    totalScans: { type: Number, default: 0 },
    totalGourdsDetected: { type: Number, default: 0 },
    accurateScans: { type: Number, default: 0 },
    lastScanDate: Date
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// Note: email and username indexes are already created by unique: true
userSchema.index({ 'refreshTokens.token': 1 });
userSchema.index({ 'refreshTokens.expiresAt': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username;
});

// Virtual for scan accuracy percentage
userSchema.virtual('scanAccuracyPercentage').get(function () {
  if (this.stats.totalScans === 0) return 0;
  return Math.round((this.stats.accurateScans / this.stats.totalScans) * 100);
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash password if it's been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update login count and last login
userSchema.pre('save', function (next) {
  if (this.isModified('lastLogin')) {
    this.loginCount += 1;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  const refreshToken = jwt.sign(
    { id: this._id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );

  // Add refresh token to user's refresh tokens array
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  this.refreshTokens.push({
    token: refreshToken,
    expiresAt: expiresAt
  });

  return refreshToken;
};

// Instance method to revoke refresh token
userSchema.methods.revokeRefreshToken = function (token) {
  const refreshToken = this.refreshTokens.find(rt => rt.token === token);
  if (refreshToken) {
    refreshToken.isActive = false;
  }
};

// Instance method to clean expired refresh tokens
userSchema.methods.cleanExpiredRefreshTokens = function () {
  this.refreshTokens = this.refreshTokens.filter(
    rt => rt.isActive && rt.expiresAt > new Date()
  );
};

// Static method to find user by email or username
userSchema.statics.findByCredentials = async function (identifier, password) {
  // Find user by email or username
  const user = await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ],
    isActive: true
  }).select('+password');

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  return user;
};

// Static method to clean all expired refresh tokens
userSchema.statics.cleanAllExpiredTokens = async function () {
  return this.updateMany(
    {},
    {
      $pull: {
        refreshTokens: {
          $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
          ]
        }
      }
    }
  );
};

const User = mongoose.model('User', userSchema);

module.exports = User;