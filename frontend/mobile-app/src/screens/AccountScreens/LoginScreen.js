import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TextInput as RNTextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../services';
import { theme } from '../../styles';
import { CustomAlert } from '../../components';

export const LoginScreen = ({ navigation, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '', buttons: [] });

  const handleLogin = async () => {
    if (!email || !password) {
      setAlert({
        visible: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in all fields to continue.',
        buttons: [],
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlert({
        visible: true,
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        buttons: [],
      });
      return;
    }

    setLoading(true);

    try {
      const result = await authService.login(email, password);

      if (result.success) {
        // Check if email is verified
        const user = result.user;
        const isVerified = user.isEmailVerified;

        if (!isVerified) {
          // Use user.email from server (canonical) instead of typed email
          navigation.navigate('VerifyEmail', { email: user.email, sendPin: true });
        } else {
          // Navigate immediately without showing alert on login screen
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      } else {
        // Check if account is deactivated
        if (result.accountDeactivated) {
          const message = result.deactivationReason
            ? `Your account has been deactivated.\n\nReason: ${result.deactivationReason}\n\nPlease contact support for assistance.`
            : 'Your account has been deactivated. Please contact support for assistance.';

          setAlert({
            visible: true,
            type: 'error',
            title: 'Account Deactivated',
            message: message,
            buttons: [],
          });
        } else {
          setAlert({
            visible: true,
            type: 'error',
            title: 'Login Failed',
            message: result.message || 'Invalid credentials. Please try again.',
            buttons: [],
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setAlert({
        visible: true,
        type: 'error',
        title: 'Connection Error',
        message: 'Network error. Please check your connection and try again.',
        buttons: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);

    try {
      // Check Google Auth configuration status
      const authStatus = authService.getGoogleAuthStatus();
      console.log('🔍 Google Auth Status:', authStatus);

      const result = await authService.signInWithGoogle();

      if (result.success) {
        // Check if email is verified
        const user = result.user;
        const isVerified = user.isEmailVerified;

        if (!isVerified) {
          navigation.navigate('VerifyEmail', { email: user.email, sendPin: true });
        } else {
          // Navigate immediately
          if (onAuthSuccess) {
            onAuthSuccess();
          }
        }
      } else {
        // Check if account is deactivated
        if (result.accountDeactivated) {
          const message = result.deactivationReason
            ? `Your account has been deactivated.\n\nReason: ${result.deactivationReason}\n\nPlease contact support for assistance.`
            : 'Your account has been deactivated. Please contact support for assistance.';

          setAlert({
            visible: true,
            type: 'error',
            title: 'Account Deactivated',
            message: message,
            buttons: [],
          });
        } else {
          // Show a more detailed error for configuration issues
          const errorMessage = result.message || 'Unable to sign in with Google';
          if (errorMessage.includes('not configured')) {
            setAlert({
              visible: true,
              type: 'info',
              title: 'Setup Required',
              message: 'Google Sign-In is running in demo mode. To enable real Google authentication, please follow the setup guide.',
              buttons: [
                { text: 'Use Demo Mode', onPress: () => handleGoogleSignIn() },
                { text: 'Cancel', style: 'cancel' }
              ],
            });
          } else {
            setAlert({
              visible: true,
              type: 'error',
              title: 'Sign-In Failed',
              message: errorMessage,
              buttons: [],
            });
          }
        }
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setAlert({
        visible: true,
        type: 'error',
        title: 'Connection Error',
        message: 'Network error. Please check your connection and try again.',
        buttons: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo/egourd-high-resolution-logo-white-transparent.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>eGourd</Text>
              <Text style={styles.subtitle}>
                Scan, Analyze, and Track Your Gourds
              </Text>
            </View>

            {/* Login Form Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome Back</Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.text.secondary}
                  style={styles.inputIcon}
                />
                <RNTextInput
                  placeholder="Email"
                  placeholderTextColor={theme.colors.text.secondary}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.text.secondary}
                  style={styles.inputIcon}
                />
                <RNTextInput
                  placeholder="Password"
                  placeholderTextColor={theme.colors.text.secondary}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => setAlert({
                  visible: true,
                  type: 'info',
                  title: 'Coming Soon',
                  message: 'Password recovery feature will be available soon!',
                  buttons: [],
                })}
                style={styles.forgotButton}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={[styles.loginButton, loading && styles.buttonDisabled]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#4a8a3f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.buttonText}>Signing In...</Text>
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                onPress={handleGoogleSignIn}
                disabled={loading}
                style={[styles.googleButton, loading && styles.buttonDisabled]}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={navigateToSignUp}>
                <Text style={styles.signupLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Custom Alert */}
      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 36,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    color: theme.colors.text.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
  },
  eyeIcon: {
    padding: theme.spacing.xs,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  loginButton: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  loginButtonGradient: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
  },
  googleIcon: {
    marginRight: theme.spacing.sm,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  signupText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  signupLink: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});