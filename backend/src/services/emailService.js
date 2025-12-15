const nodemailer = require('nodemailer');

/**
 * Email Service using Brevo (formerly Sendinblue)
 * Handles sending verification emails, password reset, and other transactional emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter with Brevo SMTP settings
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      this.initialized = true;
      console.log('✅ Email service initialized with Brevo SMTP');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }

  /**
   * Generate a 6-digit verification PIN
   */
  generateVerificationPin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification PIN email
   * @param {string} email - Recipient email address
   * @param {string} pin - 6-digit verification PIN
   * @param {string} userName - User's name (optional)
   */
  async sendVerificationPin(email, pin, userName = 'User') {
    if (!this.initialized) {
      throw new Error('Email service not initialized. Check EMAIL_USER and EMAIL_PASS in .env');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'eGourd'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - eGourd',
      html: this.getVerificationEmailTemplate(pin, userName),
      text: this.getVerificationEmailText(pin, userName)
    };

    try {
      console.log(`[EmailService] Attempting to send verification email to: ${email}`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ [EmailService] Success! MessageID: ${info.messageId}`);
      console.log(`[EmailService] Full Response:`, JSON.stringify(info));

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ [EmailService] FAILED to send email:', error);
      console.error('❌ [EmailService] Error Stack:', error.stack);

      // If error contains response code
      if (error.responseCode) {
        console.error(`❌ [EmailService] SMTP Response Code: ${error.responseCode}`);
      }

      throw new Error('Failed to send verification email. Please try again later.');
    }
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email address
   * @param {string} resetToken - Password reset token
   * @param {string} userName - User's name (optional)
   */
  async sendPasswordResetEmail(email, resetToken, userName = 'User') {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:19006'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'EGourd'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - EGourd',
      html: this.getPasswordResetEmailTemplate(resetUrl, userName),
      text: this.getPasswordResetEmailText(resetUrl, userName)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}:`, info.messageId);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error.message);
      throw new Error('Failed to send password reset email. Please try again later.');
    }
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email address
   * @param {string} userName - User's name
   */
  async sendWelcomeEmail(email, userName) {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'EGourd'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to EGourd!',
      html: this.getWelcomeEmailTemplate(userName),
      text: this.getWelcomeEmailText(userName)
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}:`, info.messageId);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      // Don't throw error for welcome email - it's not critical
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * HTML template for verification PIN email
   */
  getVerificationEmailTemplate(pin, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
          .header h1 { color: #4CAF50; margin: 0; }
          .content { padding: 30px 20px; }
          .pin-box { background-color: #f9f9f9; border: 2px dashed #4CAF50; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .pin { font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 30px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1765767466/egourd-high-resolution-logo-name-transparent_bcmk0s.png" alt="eGourd" style="max-width: 180px; height: auto;" />
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for registering with EGourd. To complete your registration, please verify your email address.</p>
            
            <div class="pin-box">
              <p style="margin: 0; color: #666;">Your Verification PIN:</p>
              <div class="pin">${pin}</div>
              <p style="margin: 0; color: #666; font-size: 14px;">This PIN will expire in 10 minutes</p>
            </div>

            <p>Enter this 6-digit PIN in the app to verify your email address.</p>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this PIN with anyone. Our team will never ask for your PIN.
            </div>

            <p>If you didn't request this verification, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EGourd. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plain text version of verification email
   */
  getVerificationEmailText(pin, userName) {
    return `
Hello ${userName}!

Thank you for registering with EGourd. To complete your registration, please verify your email address.

Your Verification PIN: ${pin}

This PIN will expire in 10 minutes.

Enter this 6-digit PIN in the app to verify your email address.

SECURITY NOTICE: Never share this PIN with anyone. Our team will never ask for your PIN.

If you didn't request this verification, please ignore this email or contact our support team.

© ${new Date().getFullYear()} EGourd. All rights reserved.
This is an automated email. Please do not reply to this message.
    `;
  }

  /**
   * HTML template for password reset email
   */
  getPasswordResetEmailTemplate(resetUrl, userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
          .header h1 { color: #4CAF50; margin: 0; }
          .content { padding: 30px 20px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1765767466/egourd-high-resolution-logo-name-transparent_bcmk0s.png" alt="eGourd" style="max-width: 180px; height: auto;" />
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EGourd. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plain text version of password reset email
   */
  getPasswordResetEmailText(resetUrl, userName) {
    return `
Hello ${userName},

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact support if you have concerns.

© ${new Date().getFullYear()} EGourd. All rights reserved.
    `;
  }

  /**
   * HTML template for welcome email
   */
  getWelcomeEmailTemplate(userName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EGourd</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
          .header h1 { color: #4CAF50; margin: 0; }
          .content { padding: 30px 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1765767466/egourd-high-resolution-logo-name-transparent_bcmk0s.png" alt="eGourd" style="max-width: 180px; height: auto;" />
            <h2 style="color: #4CAF50; margin-top: 10px;">Welcome!</h2>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for joining EGourd. We're excited to have you on board!</p>
            <p>With EGourd, you can:</p>
            <ul>
              <li>📸 Scan gourds to predict harvest readiness</li>
              <li>📊 Track your gourd growth over time</li>
              <li>📈 View analytics and insights</li>
              <li>🌱 Get expert growing tips</li>
            </ul>
            <p>Get started by taking your first scan!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} EGourd. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plain text version of welcome email
   */
  getWelcomeEmailText(userName) {
    return `
Welcome to EGourd!

Hello ${userName}!

Thank you for joining EGourd. We're excited to have you on board!

With EGourd, you can:
- Scan gourds to predict harvest readiness
- Track your gourd growth over time
- View analytics and insights
- Get expert growing tips

Get started by taking your first scan!

© ${new Date().getFullYear()} EGourd. All rights reserved.
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();
