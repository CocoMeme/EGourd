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
import { useTranslation } from 'react-i18next';

export const SignUpScreen = ({ navigation, onAuthSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '', buttons: [] });
  const { t } = useTranslation();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    // Check if all fields are filled
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setAlert({
        visible: true,
        type: 'warning',
        title: t('auth.signUp.missingInfo'),
        message: t('auth.signUp.missingInfoMessage'),
        buttons: [],
      });
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAlert({
        visible: true,
        type: 'error',
        title: t('auth.signUp.invalidEmail'),
        message: t('auth.signUp.invalidEmailMessage'),
        buttons: [],
      });
      return false;
    }

    // Validate password strength
    if (password.length < 8) {
      setAlert({
        visible: true,
        type: 'error',
        title: t('auth.signUp.passwordTooShort'),
        message: t('auth.signUp.passwordTooShortMessage'),
        buttons: [],
      });
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      setAlert({
        visible: true,
        type: 'warning',
        title: t('auth.signUp.weakPassword'),
        message: t('auth.signUp.weakPasswordMessage'),
        buttons: [],
      });
      return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setAlert({
        visible: true,
        type: 'error',
        title: t('auth.signUp.passwordMismatch'),
        message: t('auth.signUp.passwordMismatchMessage'),
        buttons: [],
      });
      return false;
    }

    // Check terms agreement
    if (!agreeToTerms) {
      setAlert({
        visible: true,
        type: 'warning',
        title: t('auth.signUp.termsRequired'),
        message: t('auth.signUp.termsRequiredMessage'),
        buttons: [],
      });
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...signupData } = formData;

      const result = await authService.register(signupData);

      if (result.success) {
        setAlert({
          visible: true,
          type: 'success',
          title: t('auth.signUp.accountCreated'),
          message: t('auth.signUp.accountCreatedMessage'),
          buttons: [
            {
              text: t('auth.signUp.verifyEmail'),
              onPress: () => {
                navigation.navigate('VerifyEmail', { email: signupData.email, sendPin: true });
              }
            }
          ],
        });
      } else {
        setAlert({
          visible: true,
          type: 'error',
          title: t('auth.signUp.registrationFailed'),
          message: result.message || t('auth.signUp.registrationFailedMessage'),
          buttons: [],
        });
      }
    } catch (error) {
      console.error('Signup error:', error);
      setAlert({
        visible: true,
        type: 'error',
        title: t('auth.login.connectionError'),
        message: t('auth.login.connectionErrorMessage'),
        buttons: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);

    try {
      const result = await authService.signInWithGoogle();

      if (result.success) {
        const user = result.user;
        const isVerified = user.isEmailVerified;

        if (!isVerified) {
          navigation.navigate('VerifyEmail', { email: user.email, sendPin: true });
        } else {
          setAlert({
            visible: true,
            type: 'success',
            title: t('auth.signUp.welcomeToEgourd'),
            message: t('auth.signUp.googleSignupSuccess'),
            buttons: [
              {
                text: t('auth.signUp.getStarted'),
                onPress: () => {
                  if (onAuthSuccess) onAuthSuccess();
                }
              }
            ],
          });
        }
      } else {
        // Show a more detailed error for configuration issues
        const errorMessage = result.message || t('auth.signUp.signUpFailed');
        if (errorMessage.includes('not configured')) {
          setAlert({
            visible: true,
            type: 'info',
            title: t('auth.login.setupRequired'),
            message: t('auth.login.googleDemoModeMessage'),
            buttons: [
              { text: t('auth.login.useDemoMode'), onPress: () => handleGoogleSignUp() },
              { text: t('common.cancel'), style: 'cancel' }
            ],
          });
        } else {
          setAlert({
            visible: true,
            type: 'error',
            title: t('auth.signUp.signUpFailed'),
            message: errorMessage,
            buttons: [],
          });
        }
      }
    } catch (error) {
      console.error('Google Sign-Up error:', error);
      setAlert({
        visible: true,
        type: 'error',
        title: t('auth.login.connectionError'),
        message: t('auth.login.connectionErrorMessage'),
        buttons: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    if (password.length === 0) return { text: '', color: '#ccc' };
    if (password.length < 8) return { text: t('auth.signUp.tooShort'), color: '#f44336' };

    let strength = 0;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength === 1) return { text: t('auth.signUp.weak'), color: '#ff9800' };
    if (strength === 2) return { text: t('auth.signUp.fair'), color: '#ffeb3b' };
    if (strength === 3) return { text: t('auth.signUp.good'), color: '#8bc34a' };
    return { text: t('auth.signUp.strong'), color: '#4caf50' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundContainer}>
        {/* Blurred colored shapes */}
        <View style={[styles.shape, styles.shape1]} />
        <View style={[styles.shape, styles.shape2]} />
        <View style={[styles.shape, styles.shape3]} />
        <View style={[styles.shape, styles.shape4]} />
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
                source={require('../../../assets/logo/gourdvision-name-high-resolution-logo-transparent.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Sign Up Form */}
            <View style={styles.formContainer}>

              {/* Name Inputs */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={theme.colors.text.secondary}
                    style={styles.inputIcon}
                  />
                  <RNTextInput
                    placeholder={t('auth.signUp.firstName')}
                    placeholderTextColor={theme.colors.text.secondary}
                    value={formData.firstName}
                    onChangeText={(value) => updateField('firstName', value)}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputContainer, styles.nameInput]}>
                  <RNTextInput
                    placeholder={t('auth.signUp.lastName')}
                    placeholderTextColor={theme.colors.text.secondary}
                    value={formData.lastName}
                    onChangeText={(value) => updateField('lastName', value)}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.text.secondary}
                  style={styles.inputIcon}
                />
                <RNTextInput
                  placeholder={t('auth.signUp.emailPlaceholder')}
                  placeholderTextColor={theme.colors.text.secondary}
                  value={formData.email}
                  onChangeText={(value) => updateField('email', value)}
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
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  placeholderTextColor={theme.colors.text.secondary}
                  value={formData.password}
                  onChangeText={(value) => updateField('password', value)}
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
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

              {/* Password Strength */}
              {formData.password.length > 0 && (
                <View style={styles.passwordStrength}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {t('auth.signUp.passwordStrength')} {passwordStrength.text}
                  </Text>
                </View>
              )}

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.text.secondary}
                  style={styles.inputIcon}
                />
                <RNTextInput
                  placeholder={t('auth.signUp.confirmPassword')}
                  placeholderTextColor={theme.colors.text.secondary}
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField('confirmPassword', value)}
                  style={styles.input}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreeToTerms(!agreeToTerms)}
              >
                <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
                  {agreeToTerms && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxText}>
                  {t('auth.signUp.agreeToTerms')}
                  <Text style={styles.linkText}>{t('auth.signUp.termsOfService')}</Text>
                  {' '}{t('auth.signUp.and')}{' '}
                  <Text style={styles.linkText}>{t('auth.signUp.privacyPolicy')}</Text>
                </Text>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignUp}
                disabled={loading}
                style={[styles.signupButton, loading && styles.buttonDisabled]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#4a8a3f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signupButtonGradient}
                >
                  {loading ? (
                    <Text style={styles.buttonText}>{t('auth.signUp.creatingAccount')}</Text>
                  ) : (
                    <Text style={styles.buttonText}>{t('auth.signUp.signUpButton')}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.signUp.orSignUpWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign Up Button */}
              <TouchableOpacity
                onPress={handleGoogleSignUp}
                disabled={loading}
                style={[styles.googleButton, loading && styles.buttonDisabled]}
              >
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={theme.colors.primary}
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>{t('auth.signUp.signUpWithGoogle')}</Text>
              </TouchableOpacity>

              {/* Guest Button */}
              <TouchableOpacity
                onPress={() => {
                  if (onAuthSuccess) {
                    onAuthSuccess(true); // true indicates guest mode
                  }
                }}
                disabled={loading}
                style={[styles.guestButton, loading && styles.buttonDisabled]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={theme.colors.text.secondary}
                  style={styles.googleIcon}
                />
                <Text style={styles.guestButtonText}>{t('auth.signUp.continueAsGuest')}</Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t('auth.signUp.alreadyHaveAccount')}</Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>{t('auth.signUp.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

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
    backgroundColor: '#FFFFFF',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  shape: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.08,
  },
  shape1: {
    width: 350,
    height: 350,
    backgroundColor: '#FFEB3B',
    top: -120,
    right: -120,
  },
  shape2: {
    width: 280,
    height: 280,
    backgroundColor: '#8BC34A',
    bottom: -100,
    left: -100,
  },
  shape3: {
    width: 220,
    height: 220,
    backgroundColor: '#CDDC39',
    top: '25%',
    left: -60,
  },
  shape4: {
    width: 200,
    height: 200,
    backgroundColor: '#4CAF50',
    bottom: '30%',
    right: -70,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 250,
    height: 250,
  },
  formContainer: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  nameInput: {
    flex: 0.48,
    marginBottom: 0,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
  passwordStrength: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingLeft: theme.spacing.sm,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  linkText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.semiBold,
  },
  signupButton: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  signupButtonGradient: {
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
    marginBottom: theme.spacing.lg,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  loginText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
  loginLink: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: theme.colors.text.disabled,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  guestButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.secondary,
  },
});
