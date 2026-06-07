const nodemailer = require('nodemailer');

/**
 * Email Service using Brevo (formerly Sendinblue)
 * Supports both SMTP and HTTP API (fallback for platforms like Render that block SMTP)
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
    this.useHttpApi = false;
    this.brevoApiKey = process.env.BREVO_API_KEY;
    this.initializeTransporter();
  }

  /**
   * Initialize Nodemailer transporter with Brevo SMTP settings
   * Falls back to HTTP API if BREVO_API_KEY is provided
   */
  initializeTransporter() {
    try {
      // Check if we should use HTTP API (for platforms like Render that block SMTP)
      if (this.brevoApiKey) {
        this.useHttpApi = true;
        this.initialized = true;
        console.log('✅ Email service initialized with Brevo HTTP API (transport=http)');
        return;
      }

      // Fall back to SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Use STARTTLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000, // 10 second timeout
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      this.initialized = true;
      console.log(
        `✅ Email service initialized with Brevo SMTP (transport=smtp, host=${process.env.EMAIL_HOST || 'smtp-relay.brevo.com'})`
      );
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Send email using Brevo HTTP API
   * @param {Object} mailOptions - Email options (from, to, subject, html, text)
   */
  async sendViaHttpApi(mailOptions) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': this.brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'GourdVision',
          email: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gourdvision.com',
        },
        to: [{ email: mailOptions.to }],
        ...(mailOptions.replyTo ? { replyTo: { email: mailOptions.replyTo } } : {}),
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
        textContent: mailOptions.text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Brevo API error: ${response.status} - ${errorData.message || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return { messageId: data.messageId || 'brevo-api-' + Date.now() };
  }

  /**
   * Send email (auto-selects SMTP or HTTP API)
   * @param {Object} mailOptions - Email options
   */
  async sendMail(mailOptions) {
    if (this.useHttpApi) {
      return this.sendViaHttpApi(mailOptions);
    }
    return this.transporter.sendMail(mailOptions);
  }

  /**
   * Verify SMTP connection (skipped for HTTP API)
   */
  async verifyConnection() {
    if (!this.initialized) {
      throw new Error('Email service not initialized');
    }

    // HTTP API doesn't need connection verification
    if (this.useHttpApi) {
      console.log('✅ Using Brevo HTTP API - no connection verification needed');
      return true;
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
      throw new Error(
        'Email service not initialized. Check BREVO_API_KEY or EMAIL_USER/EMAIL_PASS in .env'
      );
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'GourdVision'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gourdvision.com'}>`,
      to: email,
      subject: 'Verify Your Email - GourdVision',
      html: this.getVerificationEmailTemplate(pin, userName),
      text: this.getVerificationEmailText(pin, userName),
    };

    try {
      console.log(
        `[EmailService] Attempting to send verification email to: ${email} (using ${this.useHttpApi ? 'HTTP API' : 'SMTP'})`
      );
      const info = await this.sendMail(mailOptions);
      console.log(`✅ [EmailService] Success! MessageID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
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
      from: `"${process.env.EMAIL_FROM_NAME || 'GourdVision'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gourdvision.com'}>`,
      to: email,
      subject: 'Password Reset Request - GourdVision',
      html: this.getPasswordResetEmailTemplate(resetUrl, userName),
      text: this.getPasswordResetEmailText(resetUrl, userName),
    };

    try {
      const info = await this.sendMail(mailOptions);
      console.log(`✅ Password reset email sent to ${email}:`, info.messageId);
      return {
        success: true,
        messageId: info.messageId,
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
      from: `"${process.env.EMAIL_FROM_NAME || 'GourdVision'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gourdvision.com'}>`,
      to: email,
      subject: 'Welcome to GourdVision!',
      html: this.getWelcomeEmailTemplate(userName),
      text: this.getWelcomeEmailText(userName),
    };

    try {
      const info = await this.sendMail(mailOptions);
      console.log(`✅ Welcome email sent to ${email}:`, info.messageId);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
      // Don't throw error for welcome email - it's not critical
      return {
        success: false,
        error: error.message,
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
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1769076175/gourdvision-name-high-resolution-logo-transparent_bhihll.png" alt="GourdVision" style="max-width: 180px; height: auto;" />
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for registering with GourdVision. To complete your registration, please verify your email address.</p>

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
            <p>© ${new Date().getFullYear()} GourdVision. All rights reserved.</p>
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

Thank you for registering with GourdVision. To complete your registration, please verify your email address.

Your Verification PIN: ${pin}

This PIN will expire in 10 minutes.

Enter this 6-digit PIN in the app to verify your email address.

SECURITY NOTICE: Never share this PIN with anyone. Our team will never ask for your PIN.

If you didn't request this verification, please ignore this email or contact our support team.

© ${new Date().getFullYear()} GourdVision. All rights reserved.
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
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1769076175/gourdvision-name-high-resolution-logo-transparent_bhihll.png" alt="GourdVision" style="max-width: 180px; height: auto;" />
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
            <p>© ${new Date().getFullYear()} GourdVision. All rights reserved.</p>
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

© ${new Date().getFullYear()} GourdVision. All rights reserved.
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
        <title>Welcome to GourdVision</title>
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
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1769076175/gourdvision-name-high-resolution-logo-transparent_bhihll.png" alt="GourdVision" style="max-width: 180px; height: auto;" />
            <h2 style="color: #4CAF50; margin-top: 10px;">Welcome!</h2>
          </div>
          <div class="content">
            <h2>Hello ${userName}!</h2>
            <p>Thank you for joining GourdVision. We're excited to have you on board!</p>
            <p>With GourdVision, you can:</p>
            <ul>
              <li>📸 Scan gourds to predict harvest readiness</li>
              <li>📊 Track your gourd growth over time</li>
              <li>📈 View analytics and insights</li>
              <li>🌱 Get expert growing tips</li>
            </ul>
            <p>Get started by taking your first scan!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GourdVision. All rights reserved.</p>
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
Welcome to GourdVision!

Hello ${userName}!

Thank you for joining GourdVision. We're excited to have you on board!

With GourdVision, you can:
- Scan gourds to predict harvest readiness
- Track your gourd growth over time
- View analytics and insights
- Get expert growing tips

Get started by taking your first scan!

© ${new Date().getFullYear()} GourdVision. All rights reserved.
    `;
  }

  /**
   * Send a support/help request email to the team
   * @param {string} senderEmail - The user's email address
   * @param {string} senderName - The user's display name
   * @param {string} subject - Support request subject
   * @param {string} message - Support request message body
   * @param {string} category - Category (e.g., 'Bug Report', 'Question', 'Feature Request', 'Other')
   */
  async sendSupportEmail(senderEmail, senderName, subject, message, category = 'Other') {
    if (!this.initialized) {
      throw new Error(
        'Email service not initialized. Check BREVO_API_KEY or EMAIL_USER/EMAIL_PASS in .env'
      );
    }

    const supportEmail = process.env.SUPPORT_EMAIL || 'egourd.app@gmail.com';

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'GourdVision'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@gourdvision.com'}>`,
      to: supportEmail,
      replyTo: senderEmail,
      subject: `[${category}] ${subject}`,
      html: this.getSupportEmailTemplate(senderName, senderEmail, subject, message, category),
      text: this.getSupportEmailText(senderName, senderEmail, subject, message, category),
    };

    try {
      console.log(
        `[EmailService] Sending support email from ${senderEmail} (using ${this.useHttpApi ? 'HTTP API' : 'SMTP'})`
      );
      const info = await this.sendMail(mailOptions);
      console.log(`[EmailService] Support email sent. MessageID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('[EmailService] Failed to send support email:', error);
      throw new Error('Failed to send support email. Please try again later.');
    }
  }

  /**
   * HTML template for support email
   */
  getSupportEmailTemplate(senderName, senderEmail, subject, message, category) {
    const escapedMessage = message.replace(/\n/g, '<br>');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Support Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #4CAF50; }
          .content { padding: 30px 20px; }
          .meta-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          .meta-table td { padding: 8px 12px; border-bottom: 1px solid #eee; }
          .meta-table td:first-child { font-weight: bold; color: #555; width: 120px; }
          .category-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: bold; color: #fff; background-color: #4CAF50; }
          .message-box { background-color: #f9f9f9; border-left: 4px solid #4CAF50; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; white-space: pre-wrap; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #ddd; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dflsh74ta/image/upload/v1769076175/gourdvision-name-high-resolution-logo-transparent_bhihll.png" alt="GourdVision" style="max-width: 180px; height: auto;" />
            <h2 style="color: #4CAF50; margin-top: 10px;">Support Request</h2>
          </div>
          <div class="content">
            <table class="meta-table">
              <tr><td>From</td><td>${senderName}</td></tr>
              <tr><td>Email</td><td><a href="mailto:${senderEmail}">${senderEmail}</a></td></tr>
              <tr><td>Category</td><td><span class="category-badge">${category}</span></td></tr>
              <tr><td>Subject</td><td><strong>${subject}</strong></td></tr>
            </table>
            <h3>Message</h3>
            <div class="message-box">${escapedMessage}</div>
            <p style="color: #888; font-size: 13px;">You can reply directly to this email to respond to the user.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GourdVision. All rights reserved.</p>
            <p>This support request was submitted from the GourdVision mobile app.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Plain text version of support email
   */
  getSupportEmailText(senderName, senderEmail, subject, message, category) {
    return `
GOURDVISION SUPPORT REQUEST
======================

From: ${senderName}
Email: ${senderEmail}
Category: ${category}
Subject: ${subject}

Message:
--------
${message}

---
You can reply directly to this email to respond to the user.
(c) ${new Date().getFullYear()} GourdVision. All rights reserved.
    `;
  }
}

// Export singleton instance
module.exports = new EmailService();
