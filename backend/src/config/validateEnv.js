const isTruthy = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== '' && normalized !== 'undefined' && normalized !== 'null';
};

const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = isProduction
    ? requiredInProduction.filter((name) => !isTruthy(process.env[name]))
    : [];

  if (missing.length > 0) {
    const message = `Missing required environment variables for production: ${missing.join(', ')}`;
    // Throwing here will cause server startup to fail fast (preferred on Render).
    throw new Error(message);
  }

  // Optional but strongly recommended if email is configured.
  const emailLooksConfigured =
    isTruthy(process.env.EMAIL_HOST) || isTruthy(process.env.EMAIL_USER) || isTruthy(process.env.EMAIL_PASS);

  if (isProduction && emailLooksConfigured && !isTruthy(process.env.FRONTEND_URL)) {
    // Password reset emails use FRONTEND_URL. Don’t hard-fail because not all deployments use email.
    // But make it very obvious in logs.
    console.warn(
      '⚠️ FRONTEND_URL is not set. Password reset emails will include a localhost link. ' +
        'Set FRONTEND_URL to a public HTTPS URL if you enable email.'
    );
  }
};

module.exports = validateEnv;
