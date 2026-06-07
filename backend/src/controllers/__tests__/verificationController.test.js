const mockUserFindOne = jest.fn();
const mockUserSave = jest.fn().mockResolvedValue(true);

const buildUser = (data) => ({
  ...data,
  save: mockUserSave,
});

jest.mock('../../models/User', () => {
  const User = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = mockUserSave;
  });
  User.findOne = mockUserFindOne;
  return User;
});

const mockGeneratePin = jest.fn(() => '123456');
const mockSendPin = jest.fn();

jest.mock('../../services/emailService', () => ({
  generateVerificationPin: mockGeneratePin,
  sendVerificationPin: mockSendPin,
}));

const { sendVerificationPin, resendVerificationPin } = require('../verificationController');

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const buildReq = (body = {}) => ({ body });

describe('verificationController.sendVerificationPin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserSave.mockResolvedValue(true);
  });

  test('returns 400 EMAIL_REQUIRED when email is missing', async () => {
    const res = buildRes();
    await sendVerificationPin(buildReq({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'EMAIL_REQUIRED' })
    );
  });

  test('returns 404 USER_NOT_FOUND when no user matches the email', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const res = buildRes();
    await sendVerificationPin(buildReq({ email: 'ghost@example.com' }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'USER_NOT_FOUND' })
    );
  });

  test('returns 400 ALREADY_VERIFIED when the email is already verified', async () => {
    mockUserFindOne.mockResolvedValue(
      buildUser({ email: 'verified@example.com', isEmailVerified: true })
    );
    const res = buildRes();
    await sendVerificationPin(buildReq({ email: 'verified@example.com' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'ALREADY_VERIFIED' })
    );
    expect(mockSendPin).not.toHaveBeenCalled();
  });

  test('returns 502 EMAIL_SERVICE_DOWN when emailService throws', async () => {
    mockUserFindOne.mockResolvedValue(
      buildUser({ email: 'unverified@example.com', isEmailVerified: false, firstName: 'Ann' })
    );
    mockSendPin.mockRejectedValue(new Error('SMTP timeout'));
    const res = buildRes();
    await sendVerificationPin(buildReq({ email: 'unverified@example.com' }), res);

    expect(mockSendPin).toHaveBeenCalledWith('unverified@example.com', '123456', 'Ann');
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 'EMAIL_SERVICE_DOWN' })
    );
    // The PIN should be rolled back on the user record.
    expect(mockUserSave).toHaveBeenCalledTimes(2);
  });

  test('returns 200 when the PIN is sent successfully', async () => {
    mockUserFindOne.mockResolvedValue(
      buildUser({ email: 'happy@example.com', isEmailVerified: false, firstName: 'Pat' })
    );
    mockSendPin.mockResolvedValue({ success: true, messageId: 'x' });
    const res = buildRes();
    await sendVerificationPin(buildReq({ email: 'happy@example.com' }), res);

    expect(mockSendPin).toHaveBeenCalledWith('happy@example.com', '123456', 'Pat');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, expiresIn: 600 })
    );
  });
});

describe('verificationController.resendVerificationPin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserSave.mockResolvedValue(true);
  });

  test('returns 502 EMAIL_SERVICE_DOWN and rolls back the PIN when send fails', async () => {
    mockUserFindOne.mockResolvedValue(
      buildUser({
        email: 'unverified@example.com',
        isEmailVerified: false,
        firstName: 'Ann',
        emailVerification: { expires: new Date(Date.now() - 1000) },
      })
    );
    mockSendPin.mockRejectedValue(new Error('SMTP timeout'));
    const res = buildRes();
    await resendVerificationPin(buildReq({ email: 'unverified@example.com' }), res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_SERVICE_DOWN' }));
  });

  test('returns 429 RATE_LIMIT when a recent PIN is still in cooldown', async () => {
    mockUserFindOne.mockResolvedValue(
      buildUser({
        email: 'unverified@example.com',
        isEmailVerified: false,
        firstName: 'Ann',
        emailVerification: { expires: new Date(Date.now() + 10 * 60 * 1000) },
      })
    );
    const res = buildRes();
    await resendVerificationPin(buildReq({ email: 'unverified@example.com' }), res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMIT' }));
    expect(mockSendPin).not.toHaveBeenCalled();
  });
});
