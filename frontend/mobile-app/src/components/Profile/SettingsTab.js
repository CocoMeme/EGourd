import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    Switch,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../../styles';
import { authService } from '../../services';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';

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

    const ProfileItem = ({ icon, title, value, onPress, badge, badgeColor, isLast = false, description, toggleValue, onToggle, valueStyle }) => (
        <TouchableOpacity
            style={[styles.profileItem, isLast && styles.profileItemLast]}
            onPress={onPress}
            disabled={!onPress || toggleValue !== undefined}
            activeOpacity={onPress ? 0.8 : 1}
        >
            <View style={styles.profileItemLeft}>
                <View style={styles.profileIconWrap}>
                    <Ionicons name={icon} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.profileItemTextGroup}>
                    <View style={styles.titleRow}>
                        <Text style={styles.profileItemTitle}>{title}</Text>
                        {badge && (
                            <View style={[styles.badge, { backgroundColor: badgeColor || theme.colors.primary }]}>
                                <Text style={styles.badgeText}>{badge}</Text>
                            </View>
                        )}
                    </View>
                    {description && <Text style={styles.profileItemDescription}>{description}</Text>}
                </View>
            </View>
            <View style={styles.profileItemRight}>
                {toggleValue !== undefined ? (
                    <Switch
                        value={toggleValue}
                        onValueChange={onToggle}
                        trackColor={{ false: '#767577', true: '#FF9800' }}
                        thumbColor={toggleValue ? '#FFFFFF' : '#f4f3f4'}
                        ios_backgroundColor="#767577"
                    />
                ) : (
                    <>
                        {!!value && (
                            <Text style={[styles.profileItemValue, valueStyle]} numberOfLines={1}>
                                {value}
                            </Text>
                        )}
                        {onPress && (
                            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.secondary} />
                        )}
                    </>
                )}
            </View>
        </TouchableOpacity>
    );

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
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
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
                </View>

                {/* Storage Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Storage & Data</Text>
                    <ProfileItem
                        icon="images-outline"
                        title="Cache & Temporary Files"
                        description="Images from camera, temporary downloads"
                        value={loading ? "Calculating..." : formatSize(cacheSize)}
                        valueStyle={styles.boldValue}
                        isLast={true}
                    />
                    <TouchableOpacity
                        style={[styles.actionButton, loading && { opacity: 0.5 }]}
                        onPress={handleClearCache}
                        disabled={loading}
                    >
                        <Text style={styles.actionButtonText}>Clear Cache</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>About</Text>
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
                </View>

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
    content: { flex: 1 },
    // scrollContent: { paddingBottom: theme.spacing.sm },
    sectionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.medium,
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
        marginBottom: theme.spacing.md,
    },
    profileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.background.secondary,
    },
    profileItemLast: { borderBottomWidth: 0 },
    profileItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    profileIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 5,
        backgroundColor: 'rgba(85, 156, 73, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileItemTextGroup: { marginLeft: theme.spacing.md, flex: 1 },
    profileItemTitle: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.primary,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileItemDescription: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginTop: 2,
    },
    profileItemRight: { flexDirection: 'row', alignItems: 'center' },
    profileItemValue: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginRight: theme.spacing.xs,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        marginLeft: theme.spacing.xs,
    },
    badgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
    logoutButton: {
        height: 48,
        borderRadius: theme.borderRadius.medium,
        backgroundColor: 'rgba(244, 67, 54, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.15)',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
    },
    logoutButtonDisabled: { opacity: 0.6 },
    logoutText: {
        color: theme.colors.error,
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        letterSpacing: 0.5,
    },

    actionButton: {
        height: 48,
        borderRadius: theme.borderRadius.medium,
        backgroundColor: 'rgba(85, 156, 73, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(85, 156, 73, 0.15)',
    },
    actionButtonText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontFamily: theme.fonts.bold,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    boldValue: {
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
});