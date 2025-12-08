import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services';
import { theme } from '../../styles';
import { HistoryScreen } from '../HistoryScreens/HistoryScreen';
import { useDeveloperMode } from '../../contexts/DeveloperModeContext';

export const ProfileScreen = ({ navigation, route, onAuthChange }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationPin, setVerificationPin] = useState('');
  const [sendingPin, setSendingPin] = useState(false);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const { isDeveloperMode, setDeveloperMode } = useDeveloperMode();

  // Handle initial tab from navigation params
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
      // Clear params to prevent sticking to this tab on subsequent renders if needed
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab]);

  // Logo configuration - adjust these values to customize the logo
  const logoConfig = {
    size: 270,           // Logo width and height
    opacity: 0.15,        // Logo opacity (0.0 to 1.0)
    top: -30,             // Distance from top
    right: -10,           // Distance from right
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
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
      setLoading(true);
      await authService.logout();
      if (onAuthChange) {
        onAuthChange();
      }
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email found');
      return;
    }

    if (user.emailVerified || user.isEmailVerified) {
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
      await loadUserData();
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

  const ProfileItem = ({ icon, title, value, onPress, badge, badgeColor, isLast = false, description, toggleValue, onToggle }) => (
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
          <Text style={styles.profileItemTitle}>{title}</Text>
          {description && <Text style={styles.profileItemDescription}>{description}</Text>}
        </View>
      </View>
      <View style={styles.profileItemRight}>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor || theme.colors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
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
              <Text style={styles.profileItemValue} numberOfLines={1}>
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

  const isVerified = user?.emailVerified || user?.isEmailVerified;

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
      value: 'v1.0.0',
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
      value: 'v1.10.30',
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

  const settingsSections = [
    { id: 'preferences', title: 'Preferences', items: preferenceItems },
    { id: 'about', title: 'About', items: aboutItems },
  ];

  const tabContentPadding = useMemo(
    () => [
      styles.tabContentContainer,
      { paddingBottom: theme.spacing.lg + insets.bottom },
    ],
    [insets.bottom]
  );

  const renderProfileTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={tabContentPadding}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.sectionCard, styles.statusCard]}>
        <View style={styles.statusRow}>
          <View style={styles.statusIconWrap}>
            <Ionicons
              name={isVerified ? 'shield-checkmark' : 'shield-outline'}
              size={22}
              color={isVerified ? theme.colors.success : theme.colors.warning}
            />
          </View>
          <View style={styles.statusTextGroup}>
            <Text style={styles.statusTitle}>Account status</Text>
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
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile information</Text>
        {profileDetails.map((item, index) => (
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
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
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
  );

  const renderSettingsTab = () => (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={tabContentPadding}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false}
      showsVerticalScrollIndicator={false}
    >
      {settingsSections.map((section) => (
        <View key={section.id} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, index) => (
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
              isLast={index === section.items.length - 1}
            />
          ))}
        </View>
      ))}
      <TouchableOpacity
        style={[styles.logoutButton, loading && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loading}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>{loading ? 'Logging out...' : 'Logout'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: theme.spacing.xl + insets.top }]}
      >
        {/* Background Logo */}
        <Image
          source={require('../../../assets/logo/egourd-high-resolution-logo-white-transparent.png')}
          style={[
            styles.backgroundLogo,
            {
              width: logoConfig.size,
              height: logoConfig.size,
              opacity: logoConfig.opacity,
              top: logoConfig.top,
              right: logoConfig.right,
            }
          ]}
          resizeMode="contain"
        />
        
        <View style={styles.profileHeaderContainer}>
          <View style={styles.avatarContainer}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>
              {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={activeTab === 'profile' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={activeTab === 'history' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={activeTab === 'settings' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'history' && <HistoryScreen navigation={navigation} />}
      {activeTab === 'settings' && renderSettingsTab()}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.secondary },
  header: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundLogo: {
    position: 'absolute',
  },
  profileHeaderContainer: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: theme.spacing.md },
  avatarImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userInfoContainer: { flex: 1, justifyContent: 'center' },
  userName: {
    fontSize: theme.typography.h2.fontSize,
    fontFamily: theme.typography.h2.fontFamily,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  activeTab: { borderBottomWidth: 3, borderBottomColor: theme.colors.primary },
  tabText: {
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
  },
  activeTabText: { color: theme.colors.primary, fontFamily: theme.fonts.semiBold },
  tabContent: { flex: 1 },
  tabContentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  section: { marginBottom: theme.spacing.lg, marginTop: theme.spacing.md },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
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
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statusDescription: {
    fontSize: 13,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
  },
  statusButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginLeft: theme.spacing.md,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontFamily: theme.fonts.semiBold,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontFamily: theme.typography.h3.fontFamily,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  profileItems: { backgroundColor: theme.colors.surface },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  profileItemLast: {
    borderBottomWidth: 0,
  },
  profileItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  profileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(85, 156, 73, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileItemTextGroup: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  profileItemTitle: {
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.primary,
  },
  profileItemDescription: {
    fontSize: 13,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  profileItemRight: { flexDirection: 'row', alignItems: 'center' },
  profileItemValue: {
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    marginRight: theme.spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: theme.typography.body.fontFamily,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  quickAction: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(85, 156, 73, 0.1)',
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
    fontSize: theme.typography.bodyMedium.fontSize,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  quickActionDescription: {
    marginTop: theme.spacing.xs,
    fontSize: 13,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.xl,
    borderRadius: theme.borderRadius.medium,
  },
  logoutButtonDisabled: { opacity: 0.6 },
  logoutIcon: { marginRight: theme.spacing.sm },
  logoutText: {
    color: '#FFFFFF',
    fontSize: theme.typography.button.fontSize,
    fontFamily: theme.typography.button.fontFamily,
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
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontFamily: theme.typography.h2.fontFamily,
    color: theme.colors.text.primary,
  },
  modalDescription: {
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    fontSize: 24,
    fontFamily: theme.typography.body.fontFamily,
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
    fontSize: theme.typography.button.fontSize,
    fontFamily: theme.typography.button.fontFamily,
    fontWeight: '600',
  },
  resendButton: { padding: theme.spacing.sm, alignItems: 'center' },
  resendButtonText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    fontFamily: theme.typography.body.fontFamily,
  },
  buttonDisabled: { opacity: 0.6 },
});
