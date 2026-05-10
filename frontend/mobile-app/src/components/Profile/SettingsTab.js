import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    ActivityIndicator,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { authService, supportService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';
import { ProfileItem, ProfileSection } from './shared';
import { buildConfig } from '../../config/build';
import {
    getActiveApiUrl,
    setApiUrlOverride,
    getStoredApiUrlOverride,
    getApiUrl,
} from '../../config/api';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SettingsTab = ({ navigation, onAuthChange, isGuest }) => {
    const [loading, setLoading] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    const { logout } = useAuth();
    const { isDeveloperMode, setDeveloperMode } = useDeveloperMode();
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | downloading | ready | up-to-date | error
    const [user, setUser] = useState(null);
    const [geminiEmbeddingEnabled, setGeminiEmbeddingEnabled] = useState(false);

    // API URL state
    const [apiUrlModalVisible, setApiUrlModalVisible] = useState(false);
    const [apiUrlInput, setApiUrlInput] = useState('');
    const [apiUrlTesting, setApiUrlTesting] = useState(false);
    const [apiUrlTestResult, setApiUrlTestResult] = useState(null); // null | 'ok' | 'fail'
    const [hasApiUrlOverride, setHasApiUrlOverride] = useState(false);

    // Support Modal State
    const [supportModalVisible, setSupportModalVisible] = useState(false);
    const [supportSubject, setSupportSubject] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [supportCategory, setSupportCategory] = useState('Question');
    const [supportLoading, setSupportLoading] = useState(false);

    const SUPPORT_CATEGORIES = ['Bug Report', 'Question', 'Feature Request', 'Other'];
    const PRESET_URLS = [
        { label: 'GourdVision', url: 'https://gourdvision.onrender.com/api', badge: 'Current' },
        { label: 'eGourd', url: 'https://egourd.onrender.com/api', badge: 'Legacy' },
    ];
    const insets = useSafeAreaInsets();

    useEffect(() => {
        calculateStorageUsage();
        // Check if there's a stored API URL override
        getStoredApiUrlOverride().then((stored) => {
            setHasApiUrlOverride(!!stored);
        });
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            if (!isGuest) {
                const userData = await authService.getCurrentUser();
                setUser(userData);
                setGeminiEmbeddingEnabled(userData?.preferences?.geminiEmbeddingEnabled || false);
            }
        } catch (error) {
            console.error('Error loading user data in settings:', error);
        }
    };

    // --- API URL helpers ---
    const handleOpenApiUrlModal = async () => {
        const stored = await getStoredApiUrlOverride();
        setApiUrlInput(stored || getActiveApiUrl());
        setApiUrlTestResult(null);
        setApiUrlModalVisible(true);
    };

    const handleTestApiUrl = async () => {
        const url = apiUrlInput.trim();
        if (!url) return;
        setApiUrlTesting(true);
        setApiUrlTestResult(null);
        try {
            const normalized = url.endsWith('/api') ? url : url.replace(/\/+$/, '') + '/api';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`${normalized}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            setApiUrlTestResult(res.ok ? 'ok' : 'fail');
        } catch {
            setApiUrlTestResult('fail');
        } finally {
            setApiUrlTesting(false);
        }
    };

    const handleSaveApiUrl = async () => {
        const url = apiUrlInput.trim();
        await setApiUrlOverride(url || null);
        setHasApiUrlOverride(!!url);
        setApiUrlModalVisible(false);
        Alert.alert(
            'API URL Updated',
            url
                ? 'The new API URL is saved and active. Restart the app to ensure all connections use it.'
                : 'API URL reset to the default.',
            [
                { text: 'Later', style: 'cancel' },
                { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
            ]
        );
    };

    const handleResetApiUrl = async () => {
        await setApiUrlOverride(null);
        setApiUrlInput(getApiUrl());
        setHasApiUrlOverride(false);
        setApiUrlTestResult(null);
    };

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
            id: 'geminiEmbedding',
            icon: 'share-social-outline',
            title: 'Contribute to AI',
            description: 'Help improve our model by securely sharing your validated scans',
            toggleValue: geminiEmbeddingEnabled,
            onToggle: async (value) => {
                setGeminiEmbeddingEnabled(value);
                try {
                    await authService.updateProfile({
                        preferences: { ...user?.preferences, geminiEmbeddingEnabled: value }
                    });
                } catch (error) {
                    console.error('Failed to update embedding preference', error);
                    setGeminiEmbeddingEnabled(!value);
                    Alert.alert('Error', 'Failed to update preference.');
                }
            },
        },
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

    const handleOpenSupport = () => {
        setSupportSubject('');
        setSupportMessage('');
        setSupportCategory('Question');
        setSupportModalVisible(true);
    };

    const handleCloseSupport = () => {
        setSupportModalVisible(false);
    };

    const handleSubmitSupport = async () => {
        if (!supportSubject.trim()) {
            Alert.alert('Error', 'Please enter a subject');
            return;
        }
        if (!supportMessage.trim()) {
            Alert.alert('Error', 'Please enter a message');
            return;
        }

        try {
            setSupportLoading(true);
            const user = await authService.getCurrentUser();
            // If user is guest/not logged in, we might want to ask for email, but for now we'll send as anonymous or guest
            // The backend handles auth, so if they are guest (which is a valid auth state in this app), it works.

            await supportService.submitSupportRequest(
                supportSubject,
                supportMessage,
                supportCategory
            );

            setSupportModalVisible(false);
            Alert.alert(
                'Request Sent',
                'Thank you for your feedback! We have received your support request and will get back to you shortly.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Support submission error:', error);
            Alert.alert('Error', 'Failed to send support request. Please try again later.');
        } finally {
            setSupportLoading(false);
        }
    };

    const updateDate = getUpdateDate();
    const aboutItems = [
        {
            id: 'version',
            icon: 'information-circle-outline',
            title: 'App Version',
            value: Constants.nativeAppVersion ? `v${Constants.nativeAppVersion}` : 'Development',
            description: `Built ${buildConfig.buildDate}`,
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
            action: handleOpenSupport,
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
                {/* API Server */}
                <ProfileSection title="API Server">
                    <ProfileItem
                        icon="server-outline"
                        title="Backend URL"
                        description={getActiveApiUrl()}
                        value={hasApiUrlOverride ? 'Custom' : 'Default'}
                        valueStyle={hasApiUrlOverride ? { color: '#FF9800', fontFamily: theme.fonts.bold } : undefined}
                        onPress={handleOpenApiUrlModal}
                        isLast={true}
                    />
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleOpenApiUrlModal}
                    >
                        <Text style={styles.actionButtonText}>
                            {hasApiUrlOverride ? 'Edit / Reset URL' : 'Set Custom URL'}
                        </Text>
                    </TouchableOpacity>
                </ProfileSection>

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
                        style={[styles.actionButton, loading && { opacity: 0.5 }]}
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

                {isGuest ? (
                    <View style={styles.guestAuthContainer}>
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={() => logout()}
                        >
                            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.signInText}>SIGN IN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.createAccountButton}
                            onPress={() => logout()}
                        >
                            <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.createAccountText}>CREATE ACCOUNT</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.logoutButton, logoutLoading && styles.logoutButtonDisabled]}
                        onPress={handleLogout}
                        disabled={logoutLoading}
                    >
                        <Text style={styles.logoutText}>{logoutLoading ? 'Logging out...' : 'LOGOUT'}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Support Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={supportModalVisible}
                onRequestClose={handleCloseSupport}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalKeyboardAvoid}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Contact Support</Text>
                                    <TouchableOpacity onPress={handleCloseSupport} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text style={styles.inputLabel}>Category</Text>
                                    <View style={styles.categoryContainer}>
                                        {SUPPORT_CATEGORIES.map((cat) => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[
                                                    styles.categoryChip,
                                                    supportCategory === cat && styles.categoryChipSelected
                                                ]}
                                                onPress={() => setSupportCategory(cat)}
                                            >
                                                <Text style={[
                                                    styles.categoryChipText,
                                                    supportCategory === cat && styles.categoryChipTextSelected
                                                ]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.inputLabel}>Subject</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="What is this about?"
                                        placeholderTextColor={theme.colors.text.hint}
                                        value={supportSubject}
                                        onChangeText={setSupportSubject}
                                    />

                                    <Text style={styles.inputLabel}>Message</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Describe your issue or question..."
                                        placeholderTextColor={theme.colors.text.hint}
                                        multiline
                                        numberOfLines={5}
                                        textAlignVertical="top"
                                        value={supportMessage}
                                        onChangeText={setSupportMessage}
                                    />

                                    <TouchableOpacity
                                        style={[styles.submitButton, supportLoading && styles.disabledButton, { marginBottom: insets.bottom || 20 }]}
                                        onPress={handleSubmitSupport}
                                        disabled={supportLoading}
                                    >
                                        {supportLoading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Send Message</Text>
                                        )}
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* API URL Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={apiUrlModalVisible}
                onRequestClose={() => setApiUrlModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalKeyboardAvoid}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>API Server URL</Text>
                                    <TouchableOpacity onPress={() => setApiUrlModalVisible(false)} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabel}>Backend URL</Text>
                                <View style={styles.presetContainer}>
                                    {PRESET_URLS.map((preset) => (
                                        <TouchableOpacity
                                            key={preset.url}
                                            style={[
                                                styles.presetChip,
                                                apiUrlInput.trim() === preset.url && styles.presetChipSelected,
                                            ]}
                                            onPress={() => {
                                                setApiUrlInput(preset.url);
                                                setApiUrlTestResult(null);
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.presetChipText,
                                                    apiUrlInput.trim() === preset.url && styles.presetChipTextSelected,
                                                ]}
                                            >
                                                {preset.label}
                                            </Text>
                                            {preset.badge && (
                                                <Text
                                                    style={[
                                                        styles.presetChipBadge,
                                                        apiUrlInput.trim() === preset.url && styles.presetChipBadgeSelected,
                                                    ]}
                                                >
                                                    {preset.badge}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="https://gourdvision.onrender.com/api"
                                    placeholderTextColor={theme.colors.text.hint}
                                    value={apiUrlInput}
                                    onChangeText={(text) => {
                                        setApiUrlInput(text);
                                        setApiUrlTestResult(null);
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                />

                                {/* Test result indicator */}
                                {apiUrlTestResult && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                                        <Ionicons
                                            name={apiUrlTestResult === 'ok' ? 'checkmark-circle' : 'close-circle'}
                                            size={16}
                                            color={apiUrlTestResult === 'ok' ? '#4CAF50' : '#F44336'}
                                        />
                                        <Text style={{ fontSize: 13, color: apiUrlTestResult === 'ok' ? '#4CAF50' : '#F44336' }}>
                                            {apiUrlTestResult === 'ok' ? 'Server reachable' : 'Could not reach server'}
                                        </Text>
                                    </View>
                                )}

                                <Text style={[styles.inputLabel, { marginTop: 16, fontSize: 12, color: theme.colors.text.hint }]}>
                                    Current active: {getActiveApiUrl()}
                                </Text>

                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, { flex: 1, marginTop: 0 }]}
                                        onPress={handleTestApiUrl}
                                        disabled={apiUrlTesting}
                                    >
                                        {apiUrlTesting ? (
                                            <ActivityIndicator size="small" color={theme.colors.primary} />
                                        ) : (
                                            <Text style={styles.actionButtonText}>Test</Text>
                                        )}
                                    </TouchableOpacity>

                                    {hasApiUrlOverride && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { flex: 1, marginTop: 0, borderColor: 'rgba(244,67,54,0.3)', backgroundColor: 'rgba(244,67,54,0.06)' }]}
                                            onPress={handleResetApiUrl}
                                        >
                                            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>Reset to Default</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, { marginTop: 16, marginBottom: insets.bottom || 20 }]}
                                    onPress={handleSaveApiUrl}
                                >
                                    <Text style={styles.submitButtonText}>Save &amp; Restart</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    guestAuthContainer: {
        marginHorizontal: theme.profile.card.margin,
        marginTop: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        gap: theme.spacing.sm,
    },
    signInButton: {
        height: theme.profile.button.height,
        borderRadius: theme.profile.button.borderRadius,
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        color: '#FFFFFF',
        fontSize: theme.profile.button.fontSize,
        fontFamily: theme.fonts.bold,
        letterSpacing: theme.profile.button.letterSpacing,
    },
    createAccountButton: {
        height: theme.profile.button.height,
        borderRadius: theme.profile.button.borderRadius,
        backgroundColor: 'rgba(85, 156, 73, 0.08)',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(85, 156, 73, 0.15)',
    },
    createAccountText: {
        color: theme.colors.primary,
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalKeyboardAvoid: {
        width: '100%',
    },
    modalContent: {
        backgroundColor: theme.colors.background.primary,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: theme.spacing.xl,
        paddingBottom: 0, // Let scrollview or button handle bottom spacing
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.primary,
    },
    closeButton: {
        padding: 4,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.secondary,
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: theme.colors.background.secondary,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        fontFamily: theme.fonts.regular,
        color: theme.colors.text.primary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    textArea: {
        minHeight: 120,
        paddingTop: 12,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    categoryChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: theme.colors.primary,
    },
    categoryChipText: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.secondary,
    },
    categoryChipTextSelected: {
        color: '#FFFFFF',
    },
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 4,
    },
    presetChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 6,
    },
    presetChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    presetChipText: {
        fontSize: 14,
        fontFamily: theme.fonts.medium,
        color: theme.colors.text.secondary,
    },
    presetChipTextSelected: {
        color: '#FFFFFF',
    },
    presetChipBadge: {
        fontSize: 10,
        fontFamily: theme.fonts.bold,
        color: theme.colors.text.hint,
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    presetChipBadgeSelected: {
        color: 'rgba(255,255,255,0.9)',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    submitButton: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 20, // Default, overridden by insets
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: theme.fonts.bold,
    },
    disabledButton: {
        opacity: 0.7,
    },
});
