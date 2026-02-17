const supportController = require('./supportController');
const emailService = require('../services/emailService');

// Mock emailService
jest.mock('../services/emailService');

describe('Support Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        subject: 'Test Subject',
        message: 'Test Message',
        category: 'Question',
      },
      user: {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should return 400 if subject is missing', async () => {
    req.body.subject = '';
    await supportController.submitSupportRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Subject is required',
      })
    );
  });

  it('should return 400 if message is missing', async () => {
    req.body.message = '';
    await supportController.submitSupportRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Message is required',
      })
    );
  });

  it('should call emailService.sendSupportEmail with correct parameters', async () => {
    emailService.sendSupportEmail.mockResolvedValue({ messageId: 'test-id' });

    await supportController.submitSupportRequest(req, res);

    expect(emailService.sendSupportEmail).toHaveBeenCalledWith(
      'test@example.com',
      'John Doe',
      'Test Subject',
      'Test Message',
      'Question'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { messageId: 'test-id' },
      })
    );
  });

  it('should handle missing user name gracefully', async () => {
    req.user = { email: 'test@example.com', username: 'johndoe' };
    emailService.sendSupportEmail.mockResolvedValue({ messageId: 'test-id' });

    await supportController.submitSupportRequest(req, res);

    expect(emailService.sendSupportEmail).toHaveBeenCalledWith(
      'test@example.com',
      'johndoe',
      'Test Subject',
      'Test Message',
      'Question'
    );
  });

  it('should default category to Other if invalid', async () => {
    req.body.category = 'Invalid Category';
    emailService.sendSupportEmail.mockResolvedValue({ messageId: 'test-id' });

    await supportController.submitSupportRequest(req, res);

    expect(emailService.sendSupportEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      'Other'
    );
  });

  it('should return 500 if emailService fails', async () => {
    emailService.sendSupportEmail.mockRejectedValue(new Error('Email failed'));

    await supportController.submitSupportRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Failed to send your support request. Please try again later.',
      })
    );
  });
});
