import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

class NativeGoogleAuthService {
    constructor() {
        this.isConfigured = false;
    }

    /**
     * Get configuration status
     */
    getConfigurationStatus() {
        return {
            isConfigured: true,
            isDemoMode: false,
            validationEnabled: true,
            webClientIdConfigured: true
        };
    }

    /**
     * Configure the Google Sign-In library
     * Must be called in App.js or before sign-in
     */
    configure() {
        if (this.isConfigured) return;

        GoogleSignin.configure({
            // Web Client ID (from Google Cloud Console -> Web Client)
            // This is REQUIRED for the backend to verify the token
            webClientId: '797245365582-lb13u42fmg9kfpn5r9hh08t5um1ba70d.apps.googleusercontent.com', // Firebase Auto-created Web Client

            // Offline access (to get refresh token)
            offlineAccess: true,

            // Force user to select account
            forceCodeForRefreshToken: true,
        });

        this.isConfigured = true;
        console.log('✅ Native Google Sign-In Configured');
    }

    /**
     * Sign In with Google
     * Returns { success, idToken, user }
     */
    async signIn() {
        try {
            if (!this.isConfigured) this.configure();

            // Check for Play Services
            await GoogleSignin.hasPlayServices();

            // Sign In
            const response = await GoogleSignin.signIn();
            const { idToken, user } = response.data; // Newer versions return data object

            console.log('✅ Google Sign-In Success:', user.email);

            return {
                success: true,
                idToken,
                user
            };

        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log('Google Sign-In cancelled by user');
                return { success: false, error: 'Cancelled' };
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log('Google Sign-In already in progress');
                return { success: false, error: 'In Progress' };
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                console.error('Play Services not available or outdated');
                return { success: false, error: 'Play Services Error' };
            } else {
                console.error('Google Sign-In Error:', error);
                return { success: false, error: error.message };
            }
        }
    }

    /**
     * Sign Out
     */
    async signOut() {
        try {
            if (!this.isConfigured) this.configure();
            await GoogleSignin.signOut();
            return { success: true };
        } catch (error) {
            console.error('Google Sign-Out Error:', error);
            return { success: false, error: error.message };
        }
    }
}

export const nativeGoogleAuthService = new NativeGoogleAuthService();
export default nativeGoogleAuthService;
