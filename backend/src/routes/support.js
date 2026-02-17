const express = require('express');
const { submitSupportRequest } = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/googleAuth');

const router = express.Router();

/**
 * @route   POST /api/support
 * @desc    Submit a help & support request (sends email to the team)
 * @access  Private
 */
router.post('/', authenticateToken, submitSupportRequest);

module.exports = router;
