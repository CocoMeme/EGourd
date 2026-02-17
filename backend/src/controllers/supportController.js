const emailService = require('../services/emailService');

const VALID_CATEGORIES = ['Bug Report', 'Question', 'Feature Request', 'Other'];

/**
 * @desc    Submit a support/help request via email
 * @route   POST /api/support
 * @access  Private
 */
exports.submitSupportRequest = async (req, res) => {
  try {
    const { subject, message, category } = req.body;

    // Validate required fields
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required',
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Validate category if provided
    const resolvedCategory = category && VALID_CATEGORIES.includes(category) ? category : 'Other';

    // Extract user info from authenticated request
    const senderName =
      req.user.firstName && req.user.lastName
        ? `${req.user.firstName} ${req.user.lastName}`
        : req.user.username || 'EGourd User';
    const senderEmail = req.user.email || 'no-reply@egourd.com';

    const result = await emailService.sendSupportEmail(
      senderEmail,
      senderName,
      subject.trim(),
      message.trim(),
      resolvedCategory
    );

    return res.status(200).json({
      success: true,
      message: 'Your support request has been sent successfully. We will get back to you soon!',
      data: { messageId: result.messageId },
    });
  } catch (error) {
    console.error('[SupportController] Error submitting support request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send your support request. Please try again later.',
    });
  }
};
