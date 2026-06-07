import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveApiUrl } from '../config/api';
// Native Google Auth will be imported dynamically or we can import here
import nativeGoogleAuthService from './nativeGoogleAuth';

// Configuration
const TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const GOOGLE_AUTH_TIMEOUT_MS = 60000;

// Decode a JWT payload without verifying it (verification happens server-side).
const decodeJwt = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(decodeURIComponent(escape(atob(padded))));
    return payload;
  } catch {
    return null;
  }
};

const isTokenExpired = (token, skewSeconds = 30) => {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() / 1000 >= payload.exp - skewSeconds;
};

class AuthService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    this._refreshInFlight = null;
  }

  /**
   * Initialize the auth service by loading stored credentials and
   * transparently refreshing the access token if it has expired.
   */
  async initialize() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      const user = await AsyncStorage.getItem(USER_KEY);

      this.token = token;
      this.refreshToken = refreshToken;
      this.user = user ? JSON.parse(user) : null;

      if (!this.token) {
        return false;
      }

      // If the access token is still valid, just make sure the cached user
      // object is fresh so callers don't see stale data.
      if (!isTokenExpired(this.token)) {
        await this._refreshProfileIfPossible();
        return true;
      }

      // Access token expired (or near expiry). Try to rotate via refresh token.
      const rotated = await this._rotateWithRefreshToken();
      if (rotated) {
        return true;
      }

      // Refresh failed — clear credentials so the user is sent to login.
      console.warn('[AuthService] Stored token expired and refresh failed. Forcing logout.');
      await this.logout();
      return false;
    } catch (error) {
      console.error('Error initializing auth service:', error);
      return false;
    }
  }

  /**
   * Best-effort: fetch the latest profile and update the cached user. Never throws.
   */
  async _refreshProfileIfPossible() {
    try {
      const result = await this.fetchProfile();
      if (result.success) {
        this.user = result.user;
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }
    } catch (error) {
      console.warn('[AuthService] Background profile refresh failed:', error?.message);
    }
  }

  /**
   * Internal: try to swap an expired access token for a fresh pair using the
   * stored refresh token. Coalesces concurrent calls.
   */
  async _rotateWithRefreshToken() {
    if (!this.refreshToken) return false;
    if (this._refreshInFlight) return this._refreshInFlight;

    this._refreshInFlight = (async () => {
      try {
        const response = await fetch(`${getActiveApiUrl()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.token || !data?.refreshToken) {
          console.warn('[AuthService] Refresh token rejected:', data?.message);
          return false;
        }

        await this._persistTokens(data.token, data.refreshToken);
        // Pull fresh profile data so the cached user is current.
        await this._refreshProfileIfPossible();
        return true;
      } catch (error) {
        console.error('[AuthService] Refresh request failed:', error);
        return false;
      } finally {
        this._refreshInFlight = null;
      }
    })();

    return this._refreshInFlight;
  }

  /**
   * Persist a new access + refresh token pair in memory and AsyncStorage.
   */
  async _persistTokens(token, refreshToken) {
    this.token = token;
    if (refreshToken) {
      this.refreshToken = refreshToken;
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Fetch current user profile from server
   */
  async fetchProfile() {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${getActiveApiUrl()}/auth/local/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error('Fetch profile error:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch profile',
      };
    }
  }

  /**
   * Login with email and password (Local authentication using MongoDB)
   */
  async login(email, password) {
    try {
      const response = await fetch(`${getActiveApiUrl()}/auth/local/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if account is deactivated
        if (response.status === 403 && data.accountDeactivated) {
          return {
            success: false,
            message: data.message || 'Your account has been deactivated',
            accountDeactivated: true,
            deactivationReason: data.deactivationReason,
          };
        }

        throw new Error(data.message || 'Login failed');
      }

      // Store credentials
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }

      this.token = data.token;
      this.refreshToken = data.refreshToken || this.refreshToken;
      this.user = data.user;

      return {
        success: true,
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * Register a new user (Local registration using MongoDB)
   */
  async register(userData) {
    try {
      const response = await fetch(`${getActiveApiUrl()}/auth/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store credentials
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }

      this.token = data.token;
      this.refreshToken = data.refreshToken || this.refreshToken;
      this.user = data.user;

      return {
        success: true,
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * Google Sign-In
   */
  /**
   * Google Sign-In (Native)
   */
  async signInWithGoogle() {
    try {
      // Import dynamically to avoid circular dependencies if any
      const { nativeGoogleAuthService } = require('./nativeGoogleAuth');

      // Perform Native Google Sign-In
      const googleResult = await nativeGoogleAuthService.signIn();

      if (!googleResult.success) {
        if (googleResult.error === 'Cancelled') {
          return { success: false, cancelled: true };
        }
        return {
          success: false,
          message: googleResult.error || 'Google Sign-In failed',
        };
      }

      // Send ID Token to Backend for Verification
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GOOGLE_AUTH_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(`${getActiveApiUrl()}/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            idToken: googleResult.idToken,
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const data = await response.json();

      if (!response.ok) {
        // Check if account is deactivated
        if (response.status === 403 && data.accountDeactivated) {
          // Sign out from Google since backend rejected/deactivated
          await nativeGoogleAuthService.signOut();

          return {
            success: false,
            message: data.message || 'Your account has been deactivated',
            accountDeactivated: true,
            deactivationReason: data.deactivationReason,
          };
        }

        return {
          success: false,
          message: data.message || 'Server authentication failed',
        };
      }

      // Store credentials
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      }

      this.token = data.token;
      this.refreshToken = data.refreshToken || this.refreshToken;
      this.user = data.user;

      return {
        success: true,
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      };
    } catch (error) {
      console.error('Google Sign-In error:', error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          message:
            'Sign-in timed out. The server may be waking up — please try again in a few seconds.',
        };
      }

      return {
        success: false,
        message: error.message || 'Google Sign-In failed',
      };
    }
  }

  /**
   * Logout and clear stored credentials
   */
  async logout() {
    try {
      // Call logout endpoint if token exists, and revoke the refresh token
      if (this.token) {
        await fetch(`${getActiveApiUrl()}/auth/local/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken || null }),
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local cleanup even if API call fails
    }

    try {
      // Sign out from Native Google Auth to force account picker next time
      const { nativeGoogleAuthService } = require('./nativeGoogleAuth');
      await nativeGoogleAuthService.signOut();
    } catch (error) {
      console.error('Native Google Sign-Out failed:', error);
    }

    // Clear local storage
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    this.token = null;
    this.refreshToken = null;
    this.user = null;

    return true;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token;
  }

  /**
   * Get current user data
   */
  getCurrentUser() {
    return this.user;
  }

  /**
   * Get current auth token
   */
  getToken() {
    return this.token;
  }

  /**
   * Get authorization headers for API calls
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Refresh the access token using the stored refresh token.
   * Backward-compatible alias used by older callers; delegates to the
   * internal rotate pipeline so behaviour is consistent everywhere.
   */
  async refreshToken(refreshToken) {
    const tokenToUse = refreshToken || this.refreshToken;
    if (!tokenToUse) {
      return {
        success: false,
        message: 'No refresh token available',
      };
    }
    const previous = this.refreshToken;
    this.refreshToken = tokenToUse;
    const ok = await this._rotateWithRefreshToken();
    if (!ok) {
      this.refreshToken = previous;
      return {
        success: false,
        message: 'Token refresh failed',
      };
    }
    return { success: true };
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${getActiveApiUrl()}/auth/local/profile`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }

      // Update stored user data
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      this.user = data.user;

      return {
        success: true,
        user: data.user,
      };
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        message: error.message || 'Profile update failed',
      };
    }
  }

  /**
   * Change password for local accounts
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${getActiveApiUrl()}/auth/local/password`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      return {
        success: true,
        message: data.message || 'Password changed successfully',
      };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        message: error.message || 'Password change failed',
      };
    }
  }

  /**
   * Request password reset (to be implemented)
   */
  async requestPasswordReset(email) {
    try {
      // This would typically send a password reset email
      // For now, return a placeholder response
      return {
        success: false,
        message: 'Password reset functionality is not yet implemented. Please contact support for assistance.',
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: error.message || 'Password reset request failed',
      };
    }
  }

  /**
   * Make authenticated API request
   */
  async authenticatedRequest(endpoint, options = {}) {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const doFetch = () =>
      fetch(`${getActiveApiUrl()}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

    let response;
    try {
      response = await doFetch();
    } catch (error) {
      console.error('Authenticated request error:', error);
      throw error;
    }

    // Attempt one transparent refresh + retry on 401, but never for the
    // refresh endpoint itself (would create an infinite loop).
    if (
      response.status === 401 &&
      this.refreshToken &&
      !endpoint.startsWith('/auth/refresh') &&
      !endpoint.startsWith('/auth/local/logout')
    ) {
      const rotated = await this._rotateWithRefreshToken();
      if (rotated) {
        try {
          response = await doFetch();
        } catch (error) {
          console.error('Authenticated request retry error:', error);
          throw error;
        }
      } else {
        // Refresh failed — force logout so the user lands on the login screen
        // instead of seeing a perpetual "Session expired" message.
        await this.logout();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  }

  /**
   * Get Google OAuth configuration status
   */
  /**
   * Get Google OAuth configuration status
   */
  getGoogleAuthStatus() {
    return nativeGoogleAuthService.getConfigurationStatus();
  }

  /**
   * Check if Google OAuth is configured
   */
  isGoogleAuthConfigured() {
    return true; // Native auth is always considered configured for UI purposes
  }

  /**
   * Send verification PIN to email
   */
  async sendVerificationPin(email) {
    try {
      console.log('[AuthService] sendVerificationPin called with email:', JSON.stringify(email));

      const response = await fetch(`${getActiveApiUrl()}/verification/send-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn(
          `[VerifyPin] failed: status=${response.status} code=${data?.code || 'UNKNOWN'} message=${data?.message}`
        );
        return {
          success: false,
          status: response.status,
          code: data?.code || 'UNKNOWN',
          message: data?.message || 'Failed to send verification PIN',
        };
      }

      return {
        success: true,
        message: data.message,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error('Send verification PIN error:', error);
      return {
        success: false,
        status: 0,
        code: 'NETWORK_ERROR',
        message: error.message || 'Failed to send verification PIN',
      };
    }
  }

  /**
   * Verify email with PIN
   */
  async verifyEmailWithPin(email, pin) {
    try {
      const response = await fetch(`${getActiveApiUrl()}/verification/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Email verification failed');
      }

      // Update stored user data
      if (this.user) {
        this.user.isEmailVerified = true;
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(this.user));
      }

      return {
        success: true,
        message: data.message,
        user: data.user,
      };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        message: error.message || 'Email verification failed',
      };
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(email) {
    try {
      const response = await fetch(`${getActiveApiUrl()}/verification/status?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check verification status');
      }

      return {
        success: true,
        isVerified: data.isVerified,
      };
    } catch (error) {
      console.error('Check verification status error:', error);
      return {
        success: false,
        message: error.message || 'Failed to check verification status',
      };
    }
  }
}

// Create and export singleton instance
export const authService = new AuthService();

// Export class for testing
export { AuthService };
