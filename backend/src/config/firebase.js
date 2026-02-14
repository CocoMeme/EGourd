const admin = require('firebase-admin');

// Firebase Admin SDK configuration
class FirebaseConfig {
  constructor() {
    this.initialized = false;
    this.admin = null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initialize() {
    if (this.initialized) {
      return this.admin;
    }

    try {
      // Option 1: Using service account key file (recommended for development)
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

        this.admin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
      // Option 2: Using service account key file path
      else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

        this.admin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
      // Option 3: Using environment variables (recommended for production)
      else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        const serviceAccount = {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`,
        };

        this.admin = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }
      // Option 4: Default credentials (for Google Cloud environment)
      else {
        this.admin = admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
      }

      this.initialized = true;
      console.log('Firebase Admin SDK initialized successfully');

      return this.admin;
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw new Error('Firebase initialization failed');
    }
  }

  /**
   * Get Firebase Admin instance
   */
  getAdmin() {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.admin;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    const admin = this.getAdmin();
    return admin.auth();
  }

  /**
   * Get Firestore instance (if needed for future features)
   */
  getFirestore() {
    const admin = this.getAdmin();
    return admin.firestore();
  }

  /**
   * Verify Firebase ID token
   */
  async verifyToken(idToken) {
    try {
      const auth = this.getAuth();
      const decodedToken = await auth.verifyIdToken(idToken);
      return {
        success: true,
        user: decodedToken,
      };
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user by UID
   */
  async getUserByUid(uid) {
    try {
      const auth = this.getAuth();
      const userRecord = await auth.getUser(uid);
      return {
        success: true,
        user: userRecord,
      };
    } catch (error) {
      console.error('Error getting user by UID:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create custom token for user
   */
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      const auth = this.getAuth();
      const customToken = await auth.createCustomToken(uid, additionalClaims);
      return {
        success: true,
        token: customToken,
      };
    } catch (error) {
      console.error('Error creating custom token:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user claims (for role-based access)
   */
  async setCustomUserClaims(uid, customClaims) {
    try {
      const auth = this.getAuth();
      await auth.setCustomUserClaims(uid, customClaims);
      return {
        success: true,
        message: 'Custom claims updated successfully',
      };
    } catch (error) {
      console.error('Error setting custom claims:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete user from Firebase
   */
  async deleteUser(uid) {
    try {
      const auth = this.getAuth();
      await auth.deleteUser(uid);
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = {
  firebaseConfig,
  admin: () => firebaseConfig.getAdmin(),
  auth: () => firebaseConfig.getAuth(),
  firestore: () => firebaseConfig.getFirestore(),
};
