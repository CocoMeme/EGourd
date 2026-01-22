import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../../services';
import { theme } from '../../styles';
import { ProfileTab, HistoryTab, SettingsTab, AnalysisTab } from '../../components/Profile';

export const ProfileScreen = ({ navigation, route, onAuthChange }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Handle initial tab from navigation params
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
      // Clear params to prevent sticking to this tab on subsequent renders
      navigation.setParams({ initialTab: undefined });
    }
  }, [route?.params?.initialTab]);

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

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab user={user} navigation={navigation} loadUserData={loadUserData} />;
      case 'history':
        return <HistoryTab navigation={navigation} route={route} />;
      case 'analysis':
        return <AnalysisTab />;
      case 'settings':
        return <SettingsTab navigation={navigation} onAuthChange={onAuthChange} />;
      default:
        return <ProfileTab user={user} navigation={navigation} loadUserData={loadUserData} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Redesigned Profile Banner */}
      <LinearGradient
        colors={[theme.colors.gradient.start, theme.colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileBanner}
      >
        <View style={styles.bannerOverlay}>
          <View style={styles.avatarContainer}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={theme.colors.primary} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </Text>
            <View style={styles.emailContainer}>
              <Ionicons name="mail-outline" size={14} color="rgba(255, 255, 255, 0.8)" />
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? "person" : "person-outline"}
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
            name={activeTab === 'history' ? "time" : "time-outline"}
            size={20}
            color={activeTab === 'history' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
          onPress={() => setActiveTab('analysis')}
        >
          <Ionicons
            name={activeTab === 'analysis' ? "analytics" : "analytics-outline"}
            size={20}
            color={activeTab === 'analysis' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
            Analysis
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name={activeTab === 'settings' ? "settings" : "settings-outline"}
            size={20}
            color={activeTab === 'settings' ? theme.colors.primary : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.secondary },
  profileBanner: {
    paddingVertical: 30,
    paddingHorizontal: theme.spacing.lg,
    borderBottomLeftRadius: theme.borderRadius.large,
    borderBottomRightRadius: theme.borderRadius.large,
    marginBottom: -20, // Negative margin to overlap with tabs container slightly if desired, or just space it
    zIndex: 1,
  },
  bannerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  avatarPlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    padding: 5,
    // Shadow for the floating tabs look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 0, 
    zIndex: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderRadius: theme.borderRadius.medium,
  },
  activeTab: { 
    backgroundColor: 'rgba(85, 156, 73, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  activeTabText: { 
    color: theme.colors.primary, 
    fontFamily: theme.fonts.bold 
  },
  contentContainer: {
    flex: 1,
    marginTop: 10,
  },
});
