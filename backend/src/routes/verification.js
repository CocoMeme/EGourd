const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { body, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/verification/send-pin
 * @desc    Send verification PIN to user's email
 * @access  Public
 */
router.post(
  '/send-pin',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Please provide a valid email address')
  ],
  handleValidationErrors,
  verificationController.sendVerificationPin
);

/**
 * @route   POST /api/verification/verify-email
 * @desc    Verify email with PIN
 * @access  Public
 */
router.post(
  '/verify-email',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Please provide a valid email address'),
    body('pin')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('PIN must be a 6-digit number')
  ],
  handleValidationErrors,
  verificationController.verifyEmailWithPin
);

/**
 * @route   POST /api/verification/resend-pin
 * @desc    Resend verification PIN
 * @access  Public
 */
router.post(
  '/resend-pin',
  [
    body('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Please provide a valid email address')
  ],
  handleValidationErrors,
  verificationController.resendVerificationPin
);

/**
 * @route   GET /api/verification/status
 * @desc    Check email verification status
 * @access  Public
 */
router.get(
  '/status',
  [
    query('email')
      .isEmail()
      .normalizeEmail({ gmail_remove_dots: false })
      .withMessage('Please provide a valid email address')
  ],
  handleValidationErrors,
  verificationController.checkVerificationStatus
);

module.exports = router;
