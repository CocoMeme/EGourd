const express = require('express');
const { refresh } = require('../controllers/localAuthController');

const router = express.Router();

/**
 * @route   POST /auth/refresh
 * @desc    Exchange a valid refresh token for a new access + refresh token pair.
 *          Refresh tokens are rotated on every successful use.
 * @access  Public
 */
router.post('/refresh', refresh);

module.exports = router;
