import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';
import { authService } from '../../services';
import { ProfileItem, ProfileSection } from './shared';
import { GuestBanner } from '../../components';

export const ProfileTab = ({ user, navigation, loadUserData, isGuest }) => {
    const { t } = useTranslation();
    const [verificationModalVisible, setVerificationModalVisible] = useState(false);
    const [verificationPin, setVerificationPin] = useState('');
    const [sendingPin, setSendingPin] = useState(false);
    const [verifyingPin, setVerifyingPin] = useState(false);
    const [lastSendError, setLastSendError] = useState(null);

    const isVerified = user?.emailVerified || user?.isEmailVerified;

    const friendlyPinError = (result, fallback) => {
        switch (result?.code) {
            case 'USER_NOT_FOUND':
                return t('profile.profileTab.noEmailFound');
            case 'ALREADY_VERIFIED':
                return t('profile.profileTab.alreadyVerifiedMessage');
            case 'EMAIL_SERVICE_DOWN':
                return t('errors.serverError');
            case 'RATE_LIMIT':
                return result?.message || t('errors.tryAgain');
            case 'EMAIL_REQUIRED':
                return t('profile.profileTab.noEmailFound');
            case 'NETWORK_ERROR':
                return t('errors.networkError');
            default:
                return result?.message || fallback;
        }
    };

    const handleVerifyEmail = async () => {
        if (!user?.email) {
            Alert.alert(t('common.error'), t('profile.profileTab.noEmailFound'));
            return;
        }

        if (isVerified) {
            Alert.alert(t('profile.profileTab.alreadyVerified'), t('profile.profileTab.alreadyVerifiedMessage'));
            return;
        }

        setSendingPin(true);
        setLastSendError(null);
        const result = await authService.sendVerificationPin(user.email);
        setSendingPin(false);

        if (result.success) {
            setVerificationModalVisible(true);
            Alert.alert(t('common.success'), t('profile.profileTab.pinSent'));
        } else {
            const message = friendlyPinError(result, t('profile.profileTab.failedToSend'));
            setLastSendError({ message, code: result.code });
            Alert.alert(t('profile.profileTab.failedToSend'), message);
        }
    };

    const handleVerifyPin = async () => {
        if (!verificationPin || verificationPin.length !== 6) {
            Alert.alert(t('common.error'), t('profile.profileTab.invalidPin'));
            return;
        }

        setVerifyingPin(true);
        const result = await authService.verifyEmailWithPin(user.email, verificationPin);
        setVerifyingPin(false);

        if (result.success) {
            setVerificationModalVisible(false);
            setVerificationPin('');
            setLastSendError(null);
            Alert.alert(t('common.success'), t('profile.profileTab.verifiedSuccess'));
            if (loadUserData) await loadUserData();
        } else {
            Alert.alert(t('common.error'), result.message || t('profile.profileTab.verificationFailed'));
        }
    };

    const handleResendPin = async () => {
        setSendingPin(true);
        setLastSendError(null);
        const result = await authService.sendVerificationPin(user.email);
        setSendingPin(false);

        if (result.success) {
            Alert.alert(t('common.success'), t('profile.profileTab.newPinSent'));
            setVerificationPin('');
        } else {
            const message = friendlyPinError(result, t('profile.profileTab.failedToSend'));
            setLastSendError({ message, code: result.code });
            Alert.alert(t('profile.profileTab.failedToSend'), message);
        }
    };

    const profileDetails = [
        { id: 'firstName', icon: 'person-outline', title: t('profile.profileTab.firstName'), value: user?.firstName || '-' },
        { id: 'lastName', icon: 'person-outline', title: t('profile.profileTab.lastName'), value: user?.lastName || '-' },
        { id: 'email', icon: 'mail-outline', title: t('profile.profileTab.email'), value: user?.email || '-' },
    ];

    const quickActions = [
        {
            id: 'history',
            icon: 'time-outline',
            label: t('profile.profileTab.scanHistory'),
            description: t('profile.profileTab.scanHistoryDesc'),
            action: () => navigation.navigate('History'),
        },
        {
            id: 'news',
            icon: 'newspaper-outline',
            label: t('profile.profileTab.newsUpdates'),
            description: t('profile.profileTab.scanHistoryDesc'),
            action: () => navigation.navigate('News'),
        },
        {
            id: 'support',
            icon: 'help-circle-outline',
            label: t('profile.profileTab.support'),
            description: t('profile.profileTab.support'),
            action: () => Alert.alert(t('profile.profileTab.support'), t('home.help')),
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {isGuest ? (
                    <GuestBanner
                        message={t('profile.profileTab.signInPrompt')}
                        icon="person-circle-outline"
                        style={{ marginHorizontal: theme.profile.card.margin, marginTop: theme.spacing.md }}
                    />
                ) : (
                    <ProfileSection title={t('profile.profileTab.accountStatus')} style={styles.statusCard}>
                        <View style={styles.statusRow}>
                            <View style={styles.statusIconWrap}>
                                <Ionicons
                                    name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                                    size={22}
                                    color={isVerified ? theme.colors.success : theme.colors.warning}
                                />
                            </View>
                            <View style={styles.statusTextGroup}>
                                <Text style={styles.statusTitle}>{t('profile.profileTab.verification')}</Text>
                                <Text style={styles.statusDescription}>
                                    {isVerified ? t('profile.profileTab.verified') : t('profile.profileTab.notVerified')}
                                </Text>
                            </View>
                            {!isVerified && (
                                <TouchableOpacity style={styles.statusButton} onPress={handleVerifyEmail}>
                                    <Text style={styles.statusButtonText}>{t('profile.profileTab.verifyNow')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ProfileSection>
                )}

                <ProfileSection title={t('profile.profileTab.profileInfo')}>
                    {profileDetails.map((item) => (
                        <ProfileItem
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            value={item.value}
                        />
                    ))}
                    {!isGuest && (
                        <ProfileItem
                            icon="shield-checkmark-outline"
                            title={t('profile.profileTab.accountSecurity')}
                            value={isVerified ? t('profile.profileTab.verified') : ''}
                            badge={isVerified ? t('profile.profileTab.verified') : t('profile.profileTab.verifyNow')}
                            badgeColor={isVerified ? theme.colors.success : theme.colors.warning}
                            onPress={!isVerified ? handleVerifyEmail : undefined}
                            isLast
                            description={isVerified ? t('profile.profileTab.securityGood') : t('profile.profileTab.securityVerify')}
                        />
                    )}
                </ProfileSection>

                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>{t('profile.profileTab.quickActions')}</Text>
                    <View style={styles.quickActionsRow}>
                        {quickActions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.quickAction}
                                onPress={action.action}
                                activeOpacity={0.85}
                            >
                                <View style={styles.quickActionIconWrap}>
                                    <Ionicons name={action.icon} size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.quickActionLabel}>{action.label}</Text>
                                <Text style={styles.quickActionDescription}>{action.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {!isGuest && <Modal
                visible={verificationModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => {
                    setVerificationModalVisible(false);
                    setLastSendError(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('profile.profileTab.verifyEmailTitle')}</Text>
                            <TouchableOpacity onPress={() => {
                                setVerificationModalVisible(false);
                                setLastSendError(null);
                            }}>
                                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>
                            {t('profile.profileTab.verifyEmailDesc')}
                        </Text>
                        {lastSendError && (
                            <View style={styles.modalErrorBox}>
                                <Ionicons name="alert-circle-outline" size={18} color={theme.colors.error || '#D32F2F'} />
                                <Text style={styles.modalErrorText}>{lastSendError.message}</Text>
                            </View>
                        )}
                        <TextInput
                            style={styles.pinInput}
                            value={verificationPin}
                            onChangeText={setVerificationPin}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder={t('profile.profileTab.pinPlaceholder')}
                            placeholderTextColor={theme.colors.text.secondary}
                        />
                        <TouchableOpacity
                            style={[styles.verifyButton, verifyingPin && styles.buttonDisabled]}
                            onPress={handleVerifyPin}
                            disabled={verifyingPin}
                        >
                            {verifyingPin ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.verifyButtonText}>{t('profile.profileTab.verifyButton')}</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.resendButton, sendingPin && styles.buttonDisabled]}
                            onPress={handleResendPin}
                            disabled={sendingPin}
                        >
                            <Text style={styles.resendButtonText}>
                                {sendingPin ? t('profile.profileTab.sending') : t('profile.profileTab.resendPin')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: theme.spacing.xl,
    },
    statusCard: {
        borderWidth: 1,
        borderColor: 'rgba(85, 156, 73, 0.15)',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(85, 156, 73, 0.12)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    statusTextGroup: { flex: 1 },
    statusTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    statusDescription: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        lineHeight: 16,
    },
    statusButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.medium,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginLeft: theme.spacing.sm,
    },
    statusButtonText: {
        color: '#FFFFFF',
        fontFamily: theme.fonts.semiBold,
        fontSize: 12,
    },
    quickActionsContainer: {
        paddingHorizontal: theme.profile.card.margin,
        marginTop: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: theme.typography.profileTitle.fontSize,
        fontFamily: theme.typography.profileTitle.fontFamily,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        flexWrap: 'wrap',
    },
    quickAction: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.profile.card.borderRadius,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: theme.profile.card.shadowOpacity,
        shadowRadius: theme.profile.card.shadowRadius,
        elevation: theme.profile.card.elevation,
    },
    quickActionIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(85, 156, 73, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    quickActionLabel: {
        fontSize: 13,
        fontFamily: theme.fonts.semiBold,
        color: theme.colors.text.primary,
    },
    quickActionDescription: {
        marginTop: 4,
        fontSize: 11,
        color: theme.colors.text.secondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.large,
        padding: theme.spacing.xl,
        width: '100%',
        maxWidth: 340,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
    modalDescription: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
    },
    pinInput: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: theme.borderRadius.medium,
        padding: theme.spacing.md,
        fontSize: 24,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
        textAlign: 'center',
        letterSpacing: 8,
        marginBottom: theme.spacing.lg,
    },
    verifyButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.medium,
        padding: theme.spacing.md,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: theme.fonts.bold,
    },
    resendButton: { padding: theme.spacing.sm, alignItems: 'center' },
    resendButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontFamily: theme.fonts.medium,
    },
    buttonDisabled: { opacity: 0.6 },
    modalErrorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(211, 47, 47, 0.08)',
        borderColor: 'rgba(211, 47, 47, 0.3)',
        borderWidth: 1,
        borderRadius: theme.borderRadius.medium,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    modalErrorText: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.error || '#D32F2F',
        fontFamily: theme.fonts.medium,
    },
});