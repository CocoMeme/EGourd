const { generateMessage, getQuickSuggestions, isAvailable } = require('../services/geminiService');

/**
 * Send message to chatbot and get AI response
 */
async function postMessage(req, res, next) {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and cannot be empty',
      });
    }

    // Check if Gemini is configured
    if (!isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'AI service is not available. Please contact administrator.',
        error: 'GEMINI_NOT_CONFIGURED',
      });
    }

    // Generate AI response
    const aiResponse = await generateMessage(message.trim(), conversationHistory);

    return res.json({
      success: aiResponse.success !== false,
      message: aiResponse.message,
      data: {
        reply: aiResponse.message,
        model: aiResponse.model,
        timestamp: aiResponse.timestamp,
        fallback: aiResponse.fallback || false,
      },
    });
  } catch (err) {
    console.error('Chatbot controller error:', err);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing your message',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/**
 * Get quick suggestion prompts
 */
async function getSuggestions(req, res) {
  try {
    const suggestions = getQuickSuggestions();
    return res.json({
      success: true,
      data: suggestions,
    });
  } catch (err) {
    console.error('Get suggestions error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load suggestions',
    });
  }
}

/**
 * Check chatbot status
 */
async function getStatus(req, res) {
  try {
    const available = isAvailable();
    return res.json({
      success: true,
      data: {
        available,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
        status: available ? 'online' : 'offline',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check status',
    });
  }
}

module.exports = {
  postMessage,
  getSuggestions,
  getStatus,
};
