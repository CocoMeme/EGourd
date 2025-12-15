const User = require('../models/User');
const emailService = require('../services/emailService');

/**
 * Email Verification Controller
 * Handles email verification with PIN-based verification
 */

/**
 * Send verification PIN to user's email
 * @route POST /api/auth/send-verification-pin
 */
exports.sendVerificationPin = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('=== [SendPin] START ===');
    console.log('[SendPin] Raw email from request:', JSON.stringify(email));
    console.log('[SendPin] Lowercase email:', email ? email.toLowerCase() : 'UNDEFINED');

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const normalizedEmail = email.toLowerCase().trim();
    console.log('[SendPin] Querying User collection with email:', normalizedEmail);

    const user = await User.findOne({ email: normalizedEmail });

    console.log('[SendPin] User.findOne result:', user ? `Found: ${user.email}` : 'NOT FOUND');

    // Debug: List all users to compare
    const allUsers = await User.find({}).select('email');
    console.log('[SendPin] All users in DB:', allUsers.map(u => u.email));

    if (!user) {
      console.log('[SendPin] Returning 404 - user not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate 6-digit PIN
    const pin = emailService.generateVerificationPin();

    // Set PIN expiration (10 minutes)
    const pinExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save PIN to user document
    user.emailVerification = {
      pin: pin,
      expires: pinExpires,
      attempts: 0
    };
    await user.save();

    // Send email with PIN
    const userName = user.firstName || user.username || 'User';
    await emailService.sendVerificationPin(email, pin, userName);

    res.status(200).json({
      success: true,
      message: 'Verification PIN sent to your email',
      expiresIn: 600 // seconds
    });

  } catch (error) {
    console.error('Error sending verification PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification PIN',
      error: error.message
    });
  }
};

/**
 * Verify email with PIN
 * @route POST /api/auth/verify-email
 */
exports.verifyEmailWithPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Email and PIN are required'
      });
    }

    // Find user with PIN (explicitly select PIN field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+emailVerification.pin');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if PIN exists
    if (!user.emailVerification || !user.emailVerification.pin) {
      return res.status(400).json({
        success: false,
        message: 'No verification PIN found. Please request a new PIN.'
      });
    }

    // Check if PIN has expired
    if (user.emailVerification.expires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification PIN has expired. Please request a new PIN.'
      });
    }

    // Check attempt limit (max 5 attempts)
    if (user.emailVerification.attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please request a new PIN.'
      });
    }

    // Verify PIN
    if (user.emailVerification.pin !== pin.toString()) {
      // Increment attempts
      user.emailVerification.attempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid PIN',
        attemptsRemaining: 5 - user.emailVerification.attempts
      });
    }

    // PIN is correct - verify email
    user.isEmailVerified = true;

    // Clear verification data
    user.emailVerification = {
      pin: undefined,
      expires: undefined,
      attempts: 0
    };
    await user.save();

    // Send welcome email (non-blocking)
    const userName = user.firstName || user.username || 'User';
    emailService.sendWelcomeEmail(email, userName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: error.message
    });
  }
};

/**
 * Resend verification PIN
 * @route POST /api/auth/resend-verification-pin
 */
exports.resendVerificationPin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if last PIN was sent recently (prevent spam - 1 minute cooldown)
    if (user.emailVerification && user.emailVerification.expires && user.emailVerification.expires > new Date(Date.now() + 9 * 60 * 1000)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting a new PIN'
      });
    }

    // Generate new PIN
    const pin = emailService.generateVerificationPin();
    const pinExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save new PIN
    user.emailVerification = {
      pin: pin,
      expires: pinExpires,
      attempts: 0
    };
    await user.save();

    // Send email
    const userName = user.firstName || user.username || 'User';
    await emailService.sendVerificationPin(email, pin, userName);

    res.status(200).json({
      success: true,
      message: 'New verification PIN sent to your email',
      expiresIn: 600
    });

  } catch (error) {
    console.error('Error resending verification PIN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification PIN',
      error: error.message
    });
  }
};

/**
 * Check verification status
 * @route GET /api/auth/verification-status
 */
exports.checkVerificationStatus = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      isVerified: user.isEmailVerified,
      email: user.email
    });

  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status',
      error: error.message
    });
  }
};
