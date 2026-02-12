import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { authService } from '../../services';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';
import { ProfileItem, ProfileSection } from './shared';

export const SettingsTab = ({ navigation, onAuthChange }) => {
    const [loading, setLoading] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    const { isDeveloperMode, setDeveloperMode } = useDeveloperMode();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | downloading | ready | up-to-date | error

    useEffect(() => {
        calculateStorageUsage();
    }, []);

    // --- OTA Update helpers ---
    const getUpdateId = () => {
        try {
            return Updates.updateId ? Updates.updateId.slice(0, 8) : 'embedded';
        } catch {
            return 'dev';
        }
    };

    const getUpdateDate = () => {
        try {
            if (Updates.createdAt) {
                return Updates.createdAt.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                });
            }
            return null;
        } catch {
            return null;
        }
    };

    const handleCheckForUpdate = async () => {
        try {
            setUpdateStatus('checking');
            const update = await Updates.checkForUpdateAsync();

            if (!update.isAvailable) {
                setUpdateStatus('up-to-date');
                setTimeout(() => setUpdateStatus('idle'), 3000);
                return;
            }

            setUpdateStatus('downloading');
            await Updates.fetchUpdateAsync();
            setUpdateStatus('ready');

            Alert.alert(
                'Update Ready',
                'A new update has been downloaded. Restart the app to apply it.',
                [
                    { text: 'Later', style: 'cancel', onPress: () => setUpdateStatus('idle') },
                    { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
                ]
            );
        } catch (error) {
            console.error('Update check failed:', error);
            setUpdateStatus('error');
            Alert.alert('Update Error', error.message || 'Could not check for updates.');
            setTimeout(() => setUpdateStatus('idle'), 3000);
        }
    };

    const getUpdateButtonLabel = () => {
        switch (updateStatus) {
            case 'checking': return 'Checking...';
            case 'downloading': return 'Downloading...';
            case 'ready': return 'Restart to Apply';
            case 'up-to-date': return 'Up to Date ✓';
            case 'error': return 'Check Failed';
            default: return 'Check for Updates';
        }
    };

    const calculateStorageUsage = async () => {
        try {
            setLoading(true);
            const cacheDir = FileSystem.cacheDirectory;
            const cacheInfo = await FileSystem.getInfoAsync(cacheDir);
            let totalCache = 0;
            if (cacheInfo.exists && cacheInfo.isDirectory) {
                const files = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of files) {
                    const fileInfo = await FileSystem.getInfoAsync(cacheDir + file);
                    if (!fileInfo.isDirectory) {
                        totalCache += fileInfo.size || 0;
                    }
                }
            }
            setCacheSize(totalCache);
        } catch (error) {
            console.log('Error calculating storage:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleClearCache = () => {
        Alert.alert(
            'Clear Cache',
            'This will delete all temporary files and images. You won\'t lose any account data. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: performClearCache }
            ]
        );
    };

    const performClearCache = async () => {
        try {
            setLoading(true);
            const cacheDir = FileSystem.cacheDirectory;
            await FileSystem.deleteAsync(cacheDir, { idempotent: true });
            await calculateStorageUsage();
            Alert.alert('Success', 'Cache cleared successfully');
        } catch (error) {
            console.error('Clear cache error:', error);
            Alert.alert('Error', 'Failed to clear cache');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: performLogout },
            ],
            { cancelable: false }
        );
    };

    const performLogout = async () => {
        try {
            setLogoutLoading(true);
            await authService.logout();
            if (onAuthChange) {
                onAuthChange();
            }
        } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
        } finally {
            setLogoutLoading(false);
        }
    };

    const preferenceItems = [
        {
            id: 'developerMode',
            icon: 'flask-outline',
            title: 'Developer Mode',
            description: 'Test quantized TM models in Camera tab',
            badge: 'Experimental',
            badgeColor: '#FF9800',
            toggleValue: isDeveloperMode,
            onToggle: async (value) => {
                await setDeveloperMode(value);
                Alert.alert(
                    'Developer Mode ' + (value ? 'Enabled' : 'Disabled'),
                    value
                        ? 'Camera tab now shows model selection screen for testing quantized and unquantized Teachable Machine models.'
                        : 'Camera tab restored to normal scan mode.',
                    [{ text: 'OK' }]
                );
            },
        },
        {
            id: 'notifications',
            icon: 'notifications-outline',
            title: 'Notifications',
            description: 'Manage push alerts and reminders',
            badge: 'Soon',
            badgeColor: theme.colors.warning,
            action: () => Alert.alert('Notifications', 'Notification preferences are coming soon.'),
        },
        {
            id: 'language',
            icon: 'language-outline',
            title: 'Language',
            value: 'English',
            description: 'Primary language for the interface',
            action: () => Alert.alert('Language', 'Additional languages will be available soon.'),
        },
        {
            id: 'appearance',
            icon: 'contrast-outline',
            title: 'Appearance',
            value: 'Light',
            description: 'Switch between light and dark themes',
            action: () => Alert.alert('Appearance', 'Theme selection is coming soon.'),
        },
    ];

    const updateDate = getUpdateDate();
    const aboutItems = [
        {
            id: 'version',
            icon: 'information-circle-outline',
            title: 'App Version',
            value: 'v1.12.07',
        },
        {
            id: 'codeVersion',
            icon: 'git-commit-outline',
            title: 'Code Version',
            value: getUpdateId(),
            description: updateDate ? `Published ${updateDate}` : 'Embedded build (no OTA update)',
        },
        {
            id: 'support',
            icon: 'help-circle-outline',
            title: 'Help & Support',
            description: 'Find answers and contact our team',
            action: () => Alert.alert('Support', 'Support resources will be available here soon.'),
        },
        {
            id: 'model',
            icon: 'cube-outline',
            title: 'Model Version',
            value: 'v2.12.07',
        },
        {
            id: 'privacy',
            icon: 'document-text-outline',
            title: 'Privacy Policy',
            description: 'Understand how we handle your data',
            action: () => Alert.alert('Privacy Policy', 'We will direct you to the privacy policy soon.'),
        },
        {
            id: 'terms',
            icon: 'shield-checkmark-outline',
            title: 'Terms of Service',
            description: 'Review our latest agreement',
            action: () => Alert.alert('Terms of Service', 'Terms of service will be accessible here soon.'),
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <ProfileSection title="Preferences">
                    {preferenceItems.map((item, index) => (
                        <ProfileItem
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            value={item.value}
                            description={item.description}
                            badge={item.badge}
                            badgeColor={item.badgeColor}
                            onPress={item.action}
                            toggleValue={item.toggleValue}
                            onToggle={item.onToggle}
                            isLast={index === preferenceItems.length - 1}
                        />
                    ))}
                </ProfileSection>

                <ProfileSection title="Storage & Data">
                    <ProfileItem
                        icon="images-outline"
                        title="Cache & Temporary Files"
                        description="Images from camera, temporary downloads"
                        value={loading ? "Calculating..." : formatSize(cacheSize)}
                        valueStyle={styles.boldValue}
                        isLast={true}
                    />
                    <TouchableOpacity
                        style={[styles.actionButton, loading && { opacity: 0.5 } ]}
                        onPress={handleClearCache}
                        disabled={loading}
                    >
                        <Text style={styles.actionButtonText}>Clear Cache</Text>
                    </TouchableOpacity>
                </ProfileSection>

                <ProfileSection title="About">
                    {aboutItems.map((item, index) => (
                        <ProfileItem
                            key={item.id}
                            icon={item.icon}
                            title={item.title}
                            value={item.value}
                            description={item.description}
                            onPress={item.action}
                            isLast={index === aboutItems.length - 1}
                        />
                    ))}
                    <TouchableOpacity
                        style={[
                            styles.updateButton,
                            updateStatus === 'up-to-date' && styles.updateButtonSuccess,
                            updateStatus === 'error' && styles.updateButtonError,
                            (updateStatus === 'checking' || updateStatus === 'downloading') && styles.updateButtonBusy,
                        ]}
                        onPress={handleCheckForUpdate}
                        disabled={updateStatus !== 'idle'}
                    >
                        {(updateStatus === 'checking' || updateStatus === 'downloading') ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />
                        ) : (
                            <Ionicons
                                name={updateStatus === 'up-to-date' ? 'checkmark-circle' : updateStatus === 'error' ? 'alert-circle' : 'cloud-download-outline'}
                                size={18}
                                color={updateStatus === 'up-to-date' ? theme.colors.success : updateStatus === 'error' ? theme.colors.error : theme.colors.primary}
                                style={{ marginRight: 8 }}
                            />
                        )}
                        <Text style={[
                            styles.updateButtonText,
                            updateStatus === 'up-to-date' && styles.updateButtonTextSuccess,
                            updateStatus === 'error' && styles.updateButtonTextError,
                        ]}>{getUpdateButtonLabel()}</Text>
                    </TouchableOpacity>
                </ProfileSection>

                <TouchableOpacity
                    style={[styles.logoutButton, logoutLoading && styles.logoutButtonDisabled]}
                    onPress={handleLogout}
                    disabled={logoutLoading}
                >
                    <Text style={styles.logoutText}>{logoutLoading ? 'Logging out...' : 'LOGOUT'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
    },
    content: { flex: 1 },
    scrollContent: { paddingBottom: theme.spacing.xl },
    logoutButton: {
        height: theme.profile.button.height,
        borderRadius: theme.profile.button.borderRadius,
        backgroundColor: 'rgba(244, 67, 54, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.15)',
        marginHorizontal: theme.profile.card.margin,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    logoutButtonDisabled: { opacity: 0.6 },
    logoutText: {
        color: theme.colors.error,
        fontSize: theme.profile.button.fontSize,
        fontFamily: theme.fonts.bold,
        letterSpacing: theme.profile.button.letterSpacing,
    },
    actionButton: {
        height: theme.profile.button.height,
        borderRadius: theme.profile.button.borderRadius,
        backgroundColor: 'rgba(85, 156, 73, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(85, 156, 73, 0.15)',
    },
    actionButtonText: {
        color: theme.colors.primary,
        fontSize: theme.profile.button.fontSize,
        fontFamily: theme.fonts.bold,
        letterSpacing: theme.profile.button.letterSpacing,
        textTransform: 'uppercase',
    },
    updateButton: {
        height: theme.profile.button.height,
        borderRadius: theme.profile.button.borderRadius,
        backgroundColor: 'rgba(85, 156, 73, 0.08)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(85, 156, 73, 0.15)',
    },
    updateButtonSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
        borderColor: 'rgba(76, 175, 80, 0.2)',
    },
    updateButtonError: {
        backgroundColor: 'rgba(244, 67, 54, 0.08)',
        borderColor: 'rgba(244, 67, 54, 0.15)',
    },
    updateButtonBusy: {
        opacity: 0.7,
    },
    updateButtonText: {
        color: theme.colors.primary,
        fontSize: theme.profile.button.fontSize,
        fontFamily: theme.fonts.bold,
        letterSpacing: theme.profile.button.letterSpacing,
        textTransform: 'uppercase',
    },
    updateButtonTextSuccess: {
        color: theme.colors.success,
    },
    updateButtonTextError: {
        color: theme.colors.error,
    },
    boldValue: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
});
