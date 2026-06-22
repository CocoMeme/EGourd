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
import { useLanguage } from '../../i18n/LanguageContext';
import { ProfileItem, ProfileSection } from './shared';
import { buildConfig } from '../../config/build';
import {
    getActiveApiUrl,
    setApiUrlOverride,
    getStoredApiUrlOverride,
    getApiUrl,
} from '../../config/api';

import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SettingsTab = ({ navigation, onAuthChange, isGuest }) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    const { logout } = useAuth();
    const { isDeveloperMode, setDeveloperMode } = useDeveloperMode();
    const { language, setLanguage } = useLanguage();
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
    const [supportCategory, setSupportCategory] = useState('question');
    const [supportLoading, setSupportLoading] = useState(false);

    const SUPPORT_CATEGORY_IDS = ['bugReport', 'question', 'featureRequest', 'other'];
    const getCategoryLabel = (id) => t(`settings.supportCategories.${id}`);
    const PRESET_URLS = [
        { label: t('settings.presetUrls.gourdvision'), url: 'https://gourdvision.onrender.com/api', badge: t('settings.presetUrls.current') },
        { label: t('settings.presetUrls.egourd'), url: 'https://egourd.onrender.com/api', badge: t('settings.presetUrls.legacy') },
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
            t('settings.apiUrlUpdated'),
            url
                ? t('settings.apiUrlSaved')
                : t('settings.apiUrlReset'),
            [
                { text: t('settings.later'), style: 'cancel' },
                { text: t('settings.restartNow'), onPress: () => Updates.reloadAsync() },
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
                t('settings.updateReady'),
                t('settings.updateReadyMessage'),
                [
                    { text: t('settings.later'), style: 'cancel', onPress: () => setUpdateStatus('idle') },
                    { text: t('settings.restartNow'), onPress: () => Updates.reloadAsync() },
                ]
            );
        } catch (error) {
            console.error('Update check failed:', error);
            setUpdateStatus('error');
            Alert.alert(t('settings.updateError'), error.message || t('settings.updateErrorMessage'));
            setTimeout(() => setUpdateStatus('idle'), 3000);
        }
    };

    const getUpdateButtonLabel = () => {
        switch (updateStatus) {
            case 'checking': return t('splash.checking');
            case 'downloading': return t('splash.downloading');
            case 'ready': return t('settings.restartNow');
            case 'up-to-date': return t('splash.upToDate');
            case 'error': return t('errors.tryAgain');
            default: return t('common.checkForUpdates');
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
            t('settings.clearCacheTitle'),
            t('settings.clearCacheMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('settings.clear'), style: 'destructive', onPress: performClearCache }
            ]
        );
    };

    const performClearCache = async () => {
        try {
            setLoading(true);
            const cacheDir = FileSystem.cacheDirectory;
            await FileSystem.deleteAsync(cacheDir, { idempotent: true });
            await calculateStorageUsage();
            Alert.alert(t('common.success'), t('settings.cacheCleared'));
        } catch (error) {
            console.error('Clear cache error:', error);
            Alert.alert(t('common.error'), t('settings.cacheClearFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            t('settings.logoutTitle'),
            t('settings.logoutMessage'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('settings.logout'), style: 'destructive', onPress: performLogout },
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
            Alert.alert(t('common.error'), t('settings.logoutFailed'));
        } finally {
            setLogoutLoading(false);
        }
    };

    const preferenceItems = [
        {
            id: 'geminiEmbedding',
            icon: 'share-social-outline',
            title: t('settings.contributeToAI'),
            description: t('settings.contributeDescription'),
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
                    Alert.alert(t('common.error'), t('settings.contributeFailed'));
                }
            },
        },
        {
            id: 'developerMode',
            icon: 'flask-outline',
            title: t('settings.developerMode'),
            description: t('settings.developerModeDescription'),
            badge: 'Experimental',
            badgeColor: '#FF9800',
            toggleValue: isDeveloperMode,
            onToggle: async (value) => {
                await setDeveloperMode(value);
                Alert.alert(
                    t('settings.developerModeEnabled', { status: value ? 'Enabled' : 'Disabled' }),
                    value
                        ? t('settings.developerModeOn')
                        : t('settings.developerModeOff'),
                    [{ text: t('common.ok') }]
                );
            },
        },
        {
            id: 'notifications',
            icon: 'notifications-outline',
            title: t('settings.notifications'),
            description: t('settings.notificationsDescription'),
            badge: 'Soon',
            badgeColor: theme.colors.warning,
            action: () => Alert.alert(t('settings.notifications'), t('settings.notificationsSoon')),
        },
        {
            id: 'language',
            icon: 'language-outline',
            title: t('settings.language'),
            value: language === 'tl' ? t('settings.tagalog') : t('settings.english'),
            description: t('settings.languageDescription'),
            action: () => setLanguage(language === 'en' ? 'tl' : 'en'),
        },
        {
            id: 'appearance',
            icon: 'contrast-outline',
            title: t('settings.appearance'),
            value: t('settings.light'),
            description: t('settings.appearanceDescription'),
            action: () => Alert.alert(t('settings.appearance'), t('settings.appearanceSoon')),
        },
    ];

    const handleOpenSupport = () => {
        setSupportSubject('');
        setSupportMessage('');
        setSupportCategory('question');
        setSupportModalVisible(true);
    };

    const handleCloseSupport = () => {
        setSupportModalVisible(false);
    };

    const handleSubmitSupport = async () => {
        if (!supportSubject.trim()) {
            Alert.alert(t('common.error'), t('settings.enterSubject'));
            return;
        }
        if (!supportMessage.trim()) {
            Alert.alert(t('common.error'), t('settings.enterMessage'));
            return;
        }

        try {
            setSupportLoading(true);
            const user = await authService.getCurrentUser();

            await supportService.submitSupportRequest(
                supportSubject,
                supportMessage,
                supportCategory
            );

            setSupportModalVisible(false);
            Alert.alert(
                t('settings.requestSent'),
                t('settings.requestSentMessage'),
                [{ text: t('common.ok') }]
            );
        } catch (error) {
            console.error('Support submission error:', error);
            Alert.alert(t('common.error'), t('settings.supportFailed'));
        } finally {
            setSupportLoading(false);
        }
    };

    const updateDate = getUpdateDate();
    const aboutItems = [
        {
            id: 'version',
            icon: 'information-circle-outline',
            title: t('settings.appVersion'),
            value: Constants.nativeAppVersion ? `v${Constants.nativeAppVersion}` : t('settings.development'),
            description: `Built ${buildConfig.buildDate}`,
        },
        {
            id: 'codeVersion',
            icon: 'git-commit-outline',
            title: t('settings.codeVersion'),
            value: getUpdateId(),
            description: updateDate ? `Published ${updateDate}` : 'Embedded build (no OTA update)',
        },
        {
            id: 'support',
            icon: 'help-circle-outline',
            title: t('settings.helpSupport'),
            description: t('settings.helpDescription'),
            action: handleOpenSupport,
        },
        {
            id: 'model',
            icon: 'cube-outline',
            title: t('settings.modelVersion'),
            value: 'v2.12.07',
        },
        {
            id: 'privacy',
            icon: 'document-text-outline',
            title: t('settings.privacyPolicy'),
            description: t('settings.privacyDescription'),
            action: () => Alert.alert(t('settings.privacyPolicy'), t('settings.privacySoon')),
        },
        {
            id: 'terms',
            icon: 'shield-checkmark-outline',
            title: t('settings.termsOfService'),
            description: t('settings.termsDescription'),
            action: () => Alert.alert(t('settings.termsOfService'), t('settings.termsSoon')),
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
                <ProfileSection title={t('settings.apiServer')}>
                    <ProfileItem
                        icon="server-outline"
                        title={t('settings.backendUrl')}
                        description={getActiveApiUrl()}
                        value={hasApiUrlOverride ? t('settings.custom') : t('settings.default')}
                        valueStyle={hasApiUrlOverride ? { color: '#FF9800', fontFamily: theme.fonts.bold } : undefined}
                        onPress={handleOpenApiUrlModal}
                        isLast={true}
                    />
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleOpenApiUrlModal}
                    >
                        <Text style={styles.actionButtonText}>
                            {hasApiUrlOverride ? t('settings.editResetUrl') : t('settings.setCustomUrl')}
                        </Text>
                    </TouchableOpacity>
                </ProfileSection>

                <ProfileSection title={t('settings.preferences')}>
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

                <ProfileSection title={t('settings.storage')}>
                    <ProfileItem
                        icon="images-outline"
                        title={t('settings.cacheTitle')}
                        description={t('settings.cacheDescription')}
                        value={loading ? t('settings.calculating') : formatSize(cacheSize)}
                        valueStyle={styles.boldValue}
                        isLast={true}
                    />
                    <TouchableOpacity
                        style={[styles.actionButton, loading && { opacity: 0.5 }]}
                        onPress={handleClearCache}
                        disabled={loading}
                    >
                        <Text style={styles.actionButtonText}>{t('settings.clearCache')}</Text>
                    </TouchableOpacity>
                </ProfileSection>

                <ProfileSection title={t('settings.about')}>
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
                            <Text style={styles.signInText}>{t('settings.signIn')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.createAccountButton}
                            onPress={() => logout()}
                        >
                            <Ionicons name="person-add-outline" size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.createAccountText}>{t('settings.createAccount')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.logoutButton, logoutLoading && styles.logoutButtonDisabled]}
                        onPress={handleLogout}
                        disabled={logoutLoading}
                    >
                        <Text style={styles.logoutText}>{logoutLoading ? t('settings.loggingOut') : t('settings.logout')}</Text>
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
                                    <Text style={styles.modalTitle}>{t('settings.contactSupport')}</Text>
                                    <TouchableOpacity onPress={handleCloseSupport} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text style={styles.inputLabel}>{t('settings.category')}</Text>
                                    <View style={styles.categoryContainer}>
                                        {SUPPORT_CATEGORY_IDS.map((catId) => (
                                            <TouchableOpacity
                                                key={catId}
                                                style={[
                                                    styles.categoryChip,
                                                    supportCategory === catId && styles.categoryChipSelected
                                                ]}
                                                onPress={() => setSupportCategory(catId)}
                                            >
                                                <Text style={[
                                                    styles.categoryChipText,
                                                    supportCategory === catId && styles.categoryChipTextSelected
                                                ]}>
                                                    {getCategoryLabel(catId)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <Text style={styles.inputLabel}>{t('settings.subject')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={t('settings.subjectPlaceholder')}
                                        placeholderTextColor={theme.colors.text.hint}
                                        value={supportSubject}
                                        onChangeText={setSupportSubject}
                                    />

                                    <Text style={styles.inputLabel}>{t('settings.message')}</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder={t('settings.messagePlaceholder')}
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
                                            <Text style={styles.submitButtonText}>{t('settings.sendMessage')}</Text>
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
                                    <Text style={styles.modalTitle}>{t('settings.apiUrlModalTitle')}</Text>
                                    <TouchableOpacity onPress={() => setApiUrlModalVisible(false)} style={styles.closeButton}>
                                        <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabel}>{t('settings.backendUrl')}</Text>
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
                                    placeholder={t('settings.backendUrlPlaceholder')}
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
                                             {apiUrlTestResult === 'ok' ? t('settings.serverReachable') : t('settings.couldNotReach')}
                                        </Text>
                                    </View>
                                )}

                                <Text style={[styles.inputLabel, { marginTop: 16, fontSize: 12, color: theme.colors.text.hint }]}>
                                    {t('settings.currentActive', { url: getActiveApiUrl() })}
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
                                            <Text style={styles.actionButtonText}>{t('settings.test')}</Text>
                                        )}
                                    </TouchableOpacity>

                                    {hasApiUrlOverride && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { flex: 1, marginTop: 0, borderColor: 'rgba(244,67,54,0.3)', backgroundColor: 'rgba(244,67,54,0.06)' }]}
                                            onPress={handleResetApiUrl}
                                        >
                                            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>{t('settings.resetToDefault')}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitButton, { marginTop: 16, marginBottom: insets.bottom || 20 }]}
                                    onPress={handleSaveApiUrl}
                                >
                                    <Text style={styles.submitButtonText}>{t('settings.saveAndRestart')}</Text>
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
