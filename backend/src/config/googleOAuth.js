const { OAuth2Client } = require('google-auth-library');

/**
 * Google OAuth 2.0 Configuration for Server-Side Authentication
 */
class GoogleOAuthConfig {
  constructor() {
    this.initialized = false;
    this.client = null;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
  }

  /**
   * Initialize Google OAuth client
   */
  initialize() {
    if (this.initialized) {
      return this.client;
    }

    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error(
          'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.'
        );
      }

      this.client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);

      this.initialized = true;
      console.log('Google OAuth client initialized successfully');

      return this.client;
    } catch (error) {
      console.error('Failed to initialize Google OAuth client:', error);
      throw new Error('Google OAuth initialization failed');
    }
  }

  /**
   * Get Google OAuth client instance
   */
  getClient() {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.client;
  }

  /**
   * Verify Google ID token
   */
  async verifyIdToken(idToken) {
    try {
      const client = this.getClient();

      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new Error('Invalid token payload');
      }

      return {
        success: true,
        user: {
          googleId: payload.sub,
          email: payload.email,
          emailVerified: payload.email_verified,
          name: payload.name,
          firstName: payload.given_name,
          lastName: payload.family_name,
          picture: payload.picture,
          locale: payload.locale,
          aud: payload.aud,
          iss: payload.iss,
          exp: payload.exp,
          iat: payload.iat,
        },
      };
    } catch (error) {
      console.error('Error verifying Google ID token:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user profile from Google using access token
   */
  async getUserProfile(accessToken) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user profile from Google');
      }

      const userProfile = await response.json();

      return {
        success: true,
        user: {
          googleId: userProfile.id,
          email: userProfile.email,
          emailVerified: userProfile.verified_email,
          name: userProfile.name,
          firstName: userProfile.given_name,
          lastName: userProfile.family_name,
          picture: userProfile.picture,
          locale: userProfile.locale,
        },
      };
    } catch (error) {
      console.error('Error fetching Google user profile:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate Google OAuth authorization URL
   */
  generateAuthUrl(state = null) {
    try {
      const client = this.getClient();

      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ];

      const authUrl = client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state,
        prompt: 'consent',
      });

      return {
        success: true,
        authUrl,
      };
    } catch (error) {
      console.error('Error generating Google auth URL:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const client = this.getClient();

      const { tokens } = await client.getToken(code);

      return {
        success: true,
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token,
          expiryDate: tokens.expiry_date,
        },
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const client = this.getClient();
      client.setCredentials({ refresh_token: refreshToken });

      const { credentials } = await client.refreshAccessToken();

      return {
        success: true,
        tokens: {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          idToken: credentials.id_token,
          expiryDate: credentials.expiry_date,
        },
      };
    } catch (error) {
      console.error('Error refreshing access token:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoke tokens (logout)
   */
  async revokeToken(token) {
    try {
      const client = this.getClient();
      await client.revokeToken(token);

      return {
        success: true,
        message: 'Token revoked successfully',
      };
    } catch (error) {
      console.error('Error revoking token:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const googleOAuthConfig = new GoogleOAuthConfig();

module.exports = {
  googleOAuthConfig,
  OAuth2Client,
};
