const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { postMessage, getSuggestions, getStatus } = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

/**
 * @route   POST /api/chatbot/message
 * @desc    Send message to AI chatbot
 * @access  Private
 */
router.post(
  '/message',
  authenticate,
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 1000 })
      .withMessage('Message too long (max 1000 characters)'),
    body('conversationHistory')
      .optional()
      .isArray()
      .withMessage('Conversation history must be an array'),
  ],
  handleValidationErrors,
  postMessage
);

/**
 * @route   GET /api/chatbot/suggestions
 * @desc    Get quick suggestion prompts
 * @access  Private
 */
router.get('/suggestions', authenticate, getSuggestions);

/**
 * @route   GET /api/chatbot/status
 * @desc    Check chatbot availability
 * @access  Private
 */
router.get('/status', authenticate, getStatus);

module.exports = router;
