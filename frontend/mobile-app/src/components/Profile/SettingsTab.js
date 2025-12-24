import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../../styles';
import { authService } from '../../services';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';
import { ProfileItem, ProfileSection } from './shared';

export const SettingsTab = ({ navigation, onAuthChange }) => {
    const [loading, setLoading] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    const { isDeveloperMode, setDeveloperMode } = useDeveloperMode();
    const [logoutLoading, setLogoutLoading] = useState(false);

    useEffect(() => {
        calculateStorageUsage();
    }, []);

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

    const aboutItems = [
        {
            id: 'version',
            icon: 'information-circle-outline',
            title: 'App Version',
            value: 'v1.12.07',
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
    boldValue: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
});
