import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput as RNTextInput,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { authService } from '../../services';
import { CustomAlert } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export const VerifyScreen = ({ route, navigation }) => {
    const { email, sendPin } = route.params || {};
    console.log('VerifyScreen mounted. Params:', { email, sendPin });
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '', buttons: [] });

    // Use the global auth context to update state after verification
    const { checkAuthStatus } = useAuth();
    const { t } = useTranslation();

    const inputRefs = useRef([]);

    // Handle auto-send on mount
    useEffect(() => {
        if (sendPin) {
            handleResend();
        }
    }, []); // Run once on mount

    useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handlePinChange = (text, index) => {
        const newPin = [...pin];
        newPin[index] = text;
        setPin(newPin);

        // Auto-advance focus
        if (text.length === 1 && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit if complete
        if (index === 5 && text.length === 1 && newPin.every(d => d !== '')) {
            handleVerify(newPin.join(''));
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResend = async () => {
        if (resendTimer > 0) return;

        setLoading(true);
        try {
            const result = await authService.sendVerificationPin(email);
            if (result.success) {
                setResendTimer(60); // 60 seconds cooldown
                setAlert({
                    visible: true,
                    type: 'success',
                    title: t('auth.verify.codeSent'),
                    message: t('auth.verify.codeSentMessage'),
                    buttons: [],
                });
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: t('auth.verify.failedToSend'),
                    message: result.message || t('auth.verify.failedToSendMessage'),
                    buttons: [],
                });
            }
        } catch (error) {
            console.error('Resend error:', error);
            setAlert({
                visible: true,
                type: 'error',
                title: t('common.error'),
                message: t('errors.networkError'),
                buttons: [],
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (codeToVerify) => {
        // Determine the code to verify: either passed argument or state
        const fullPin = typeof codeToVerify === 'string' ? codeToVerify : pin.join('');

        if (fullPin.length !== 6) {
            setAlert({
                visible: true,
                type: 'warning',
                title: t('auth.verify.invalidCode'),
                message: t('auth.verify.invalidCodeMessage'),
                buttons: [],
            });
            return;
        }

        setLoading(true);
        try {
            const result = await authService.verifyEmailWithPin(email, fullPin);

            if (result.success) {
                setAlert({
                    visible: true,
                    type: 'success',
                    title: t('auth.verify.emailVerified'),
                    message: t('auth.verify.emailVerifiedMessage'),
                    buttons: [
                        {
                            text: t('auth.verify.continue'),
                            onPress: async () => {
                                // Critical step: Update global auth state to trigger AppNavigator switch
                                await checkAuthStatus();
                                // No explicit navigate needed; AppNavigator handles the switch to Home
                            }
                        }
                    ],
                });
            } else {
                setAlert({
                    visible: true,
                    type: 'error',
                    title: t('auth.verify.verificationFailed'),
                    message: result.message || t('auth.verify.verificationFailedMessage'),
                    buttons: [],
                });
            }
        } catch (error) {
            console.error('Verify error:', error);
            setAlert({
                visible: true,
                type: 'error',
                title: t('common.error'),
                message: t('errors.networkError'),
                buttons: [],
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoid}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="mail-open-outline" size={48} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.title}>{t('auth.verify.title')}</Text>
                            <Text style={styles.subtitle}>
                                {t('auth.verify.subtitle')}
                            </Text>
                            <Text style={styles.emailText}>{email}</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.pinContainer}>
                                {pin.map((digit, index) => (
                                    <RNTextInput
                                        key={index}
                                        ref={(el) => (inputRefs.current[index] = el)}
                                        style={[styles.pinInput, digit && styles.pinInputFilled]}
                                        value={digit}
                                        onChangeText={(text) => handlePinChange(text, index)}
                                        onKeyPress={(e) => handleKeyPress(e, index)}
                                        keyboardType="number-pad"
                                        maxLength={1}
                                        selectTextOnFocus
                                    />
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={() => handleVerify()}
                                disabled={loading}
                                style={[styles.verifyButton, loading && styles.buttonDisabled]}
                            >
                                <LinearGradient
                                    colors={[theme.colors.primary, '#4a8a3f']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.verifyGradient}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.buttonText}>{t('auth.verify.verifyButton')}</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleResend}
                                disabled={resendTimer > 0 || loading}
                                style={styles.resendButton}
                            >
                                <Text style={[
                                    styles.resendText,
                                    (resendTimer > 0 || loading) && styles.resendTextDisabled
                                ]}>
                                    {resendTimer > 0
                                        ? t('auth.verify.resendIn', { seconds: resendTimer })
                                        : t('auth.verify.resendCode')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </LinearGradient>

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
        padding: theme.spacing.lg,
    },
    backButton: {
        marginTop: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontFamily: theme.fonts.bold,
        color: '#FFFFFF',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
    },
    emailText: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: '#FFFFFF',
        marginTop: theme.spacing.xs,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    pinContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.xl,
    },
    pinInput: {
        width: 45,
        height: 55,
        borderWidth: 1.5,
        borderColor: theme.colors.background.secondary,
        borderRadius: theme.borderRadius.medium,
        textAlign: 'center',
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
        backgroundColor: theme.colors.background.primary,
    },
    pinInputFilled: {
        borderColor: theme.colors.primary,
        backgroundColor: '#F0FFF4',
    },
    verifyButton: {
        borderRadius: theme.borderRadius.medium,
        overflow: 'hidden',
        marginBottom: theme.spacing.lg,
    },
    verifyGradient: {
        paddingVertical: theme.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: theme.fonts.semiBold,
        color: '#FFFFFF',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    resendButton: {
        alignItems: 'center',
        padding: theme.spacing.sm,
    },
    resendText: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: theme.colors.primary,
    },
    resendTextDisabled: {
        color: theme.colors.text.secondary,
    },
});
