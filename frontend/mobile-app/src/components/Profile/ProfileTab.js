import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { authService } from '../../services';
import { ProfileItem, ProfileSection, StandardHeader } from './shared';

export const ProfileTab = ({ user, navigation, loadUserData }) => {
    const [verificationModalVisible, setVerificationModalVisible] = useState(false);
    const [verificationPin, setVerificationPin] = useState('');
    const [sendingPin, setSendingPin] = useState(false);
    const [verifyingPin, setVerifyingPin] = useState(false);

    const isVerified = user?.emailVerified || user?.isEmailVerified;

    const handleVerifyEmail = async () => {
        if (!user?.email) {
            Alert.alert('Error', 'No email found');
            return;
        }

        if (isVerified) {
            Alert.alert('Already Verified', 'Your email is already verified');
            return;
        }

        setSendingPin(true);
        const result = await authService.sendVerificationPin(user.email);
        setSendingPin(false);

        if (result.success) {
            setVerificationModalVisible(true);
            Alert.alert('Success', 'Verification PIN sent to your email. Please check your inbox.');
        } else {
            Alert.alert('Error', result.message || 'Failed to send verification PIN');
        }
    };

    const handleVerifyPin = async () => {
        if (!verificationPin || verificationPin.length !== 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit PIN');
            return;
        }

        setVerifyingPin(true);
        const result = await authService.verifyEmailWithPin(user.email, verificationPin);
        setVerifyingPin(false);

        if (result.success) {
            setVerificationModalVisible(false);
            setVerificationPin('');
            Alert.alert('Success', 'Email verified successfully!');
            if (loadUserData) await loadUserData();
        } else {
            Alert.alert('Error', result.message || 'Failed to verify email');
        }
    };

    const handleResendPin = async () => {
        setSendingPin(true);
        const result = await authService.sendVerificationPin(user.email);
        setSendingPin(false);

        if (result.success) {
            Alert.alert('Success', 'New verification PIN sent to your email');
            setVerificationPin('');
        } else {
            Alert.alert('Error', result.message || 'Failed to resend verification PIN');
        }
    };

    const profileDetails = [
        { id: 'firstName', icon: 'person-outline', title: 'First Name', value: user?.firstName || '-' },
        { id: 'lastName', icon: 'person-outline', title: 'Last Name', value: user?.lastName || '-' },
        { id: 'email', icon: 'mail-outline', title: 'Email', value: user?.email || '-' },
    ];

    const quickActions = [
        {
            id: 'history',
            icon: 'time-outline',
            label: 'Scan History',
            description: 'Review past scans and notes',
            action: () => navigation.navigate('History'),
        },
        {
            id: 'news',
            icon: 'newspaper-outline',
            label: 'News & Updates',
            description: 'Stay up to date with releases',
            action: () => navigation.navigate('News'),
        },
        {
            id: 'support',
            icon: 'help-circle-outline',
            label: 'Support',
            description: 'Need a hand? Get help here',
            action: () => Alert.alert('Support', 'Support center coming soon.'),
        },
    ];

    return (
        <View style={styles.container}>
            <StandardHeader title="Profile" />
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* User Avatar Section */}
                <View style={styles.userInfoSection}>
                    <View style={styles.avatarContainer}>
                        {user?.profilePicture ? (
                            <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={40} color={theme.colors.primary} />
                            </View>
                        )}
                    </View>
                    <Text style={styles.userName}>
                        {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
                    </Text>
                    <Text style={styles.userEmail}>{user?.email || ''}</Text>
                </View>

                <ProfileSection title="Account Status" style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusIconWrap}>
                            <Ionicons
                                name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                                size={22}
                                color={isVerified ? theme.colors.success : theme.colors.warning}
                            />
                        </View>
                        <View style={styles.statusTextGroup}>
                            <Text style={styles.statusTitle}>Verification</Text>
                            <Text style={styles.statusDescription}>
                                {isVerified ? 'Your email is verified and secure.' : 'Verify your email to unlock all features.'}
                            </Text>
                        </View>
                        {!isVerified && (
                            <TouchableOpacity style={styles.statusButton} onPress={handleVerifyEmail}>
                                <Text style={styles.statusButtonText}>Verify now</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ProfileSection>

                <ProfileSection title="Profile Information">
                    {profileDetails.map((item) => (
                        <ProfileItem
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            value={item.value}
                        />
                    ))}
                    <ProfileItem
                        icon="shield-checkmark-outline"
                        title="Account Security"
                        value={isVerified ? 'Verified' : ''}
                        badge={isVerified ? 'Verified' : 'Needs action'}
                        badgeColor={isVerified ? theme.colors.success : theme.colors.warning}
                        onPress={!isVerified ? handleVerifyEmail : undefined}
                        isLast
                        description={isVerified ? 'Everything looks good.' : 'Tap to verify your email.'}
                    />
                </ProfileSection>

                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
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

            <Modal
                visible={verificationModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setVerificationModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Verify Your Email</Text>
                            <TouchableOpacity onPress={() => setVerificationModalVisible(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDescription}>
                            Enter the 6-digit PIN sent to your email address
                        </Text>
                        <TextInput
                            style={styles.pinInput}
                            value={verificationPin}
                            onChangeText={setVerificationPin}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="000000"
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
                                <Text style={styles.verifyButtonText}>Verify Email</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.resendButton, sendingPin && styles.buttonDisabled]}
                            onPress={handleResendPin}
                            disabled={sendingPin}
                        >
                            <Text style={styles.resendButtonText}>
                                {sendingPin ? 'Sending...' : 'Resend PIN'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    userInfoSection: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderBottomLeftRadius: theme.borderRadius.large,
        borderBottomRightRadius: theme.borderRadius.large,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: theme.spacing.md,
    },
    avatarContainer: {
        marginBottom: theme.spacing.md,
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.profile.icon.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    userName: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        fontFamily: theme.fonts.regular,
        color: theme.colors.text.secondary,
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
});
