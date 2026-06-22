import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services';
import { theme } from '../../styles';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const AdminDashboardScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const result = await adminService.getDashboardOverview();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        console.error('Failed to load dashboard:', result.message);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statIconContainer}>
        <View style={[styles.statIconBg, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickAction = ({ title, icon, color, onPress }) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[color, color + 'DD']}
        style={styles.quickActionGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={icon} size={28} color="#fff" />
        <Text style={styles.quickActionText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t('admin.dashboard.loading')}</Text>
      </View>
    );
  }

  const overview = dashboardData?.overview || {};
  const usersByRole = dashboardData?.usersByRole || {};
  const usersByProvider = dashboardData?.usersByProvider || {};

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primary + 'DD']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>{t('admin.dashboard.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('admin.dashboard.subtitle')}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.overview')}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              title={t('admin.dashboard.totalUsers')}
              value={overview.totalUsers || 0}
              icon="people"
              color={theme.colors.primary}
              onPress={() => navigation.navigate('UserManagement')}
            />
            <StatCard
              title={t('admin.dashboard.activeUsers')}
              value={overview.activeUsers || 0}
              icon="checkmark-circle"
              color="#4CAF50"
              onPress={() => navigation.navigate('UserManagement', { filter: 'active' })}
            />
            <StatCard
              title={t('admin.dashboard.inactiveUsers')}
              value={overview.inactiveUsers || 0}
              icon="close-circle"
              color="#F44336"
              onPress={() => navigation.navigate('UserManagement', { filter: 'inactive' })}
            />
            <StatCard
              title={t('admin.dashboard.verified')}
              value={overview.verifiedUsers || 0}
              icon="shield-checkmark"
              color="#2196F3"
              onPress={() => navigation.navigate('UserManagement', { filter: 'verified' })}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.recentActivity')}</Text>
          <View style={styles.activityGrid}>
            <View style={styles.activityCard}>
              <Text style={styles.activityValue}>{overview.newUsers7Days || 0}</Text>
              <Text style={styles.activityLabel}>{t('admin.dashboard.newUsers7Days')}</Text>
            </View>
            <View style={styles.activityCard}>
              <Text style={styles.activityValue}>{overview.newUsers30Days || 0}</Text>
              <Text style={styles.activityLabel}>{t('admin.dashboard.newUsers30Days')}</Text>
            </View>
          </View>
        </View>

        {/* Forum Stats */}
        {dashboardData?.forumStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('admin.dashboard.forumStatistics')}</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title={t('admin.dashboard.pendingPosts')}
                value={dashboardData.forumStats.pendingPosts || 0}
                icon="time"
                color="#FF9800"
                onPress={() => navigation.navigate('ForumManagement', { filter: 'pending' })}
              />
              <StatCard
                title={t('admin.dashboard.activePosts')}
                value={dashboardData.forumStats.activePosts || 0}
                icon="chatbubble-ellipses"
                color="#4CAF50"
                onPress={() => navigation.navigate('ForumManagement', { filter: 'active' })}
              />
              <StatCard
                title={t('admin.dashboard.flaggedPosts')}
                value={dashboardData.forumStats.flaggedPosts || 0}
                icon="flag"
                color="#9C27B0"
                onPress={() => navigation.navigate('ForumManagement', { filter: 'flagged' })}
              />
              <StatCard
                title={t('admin.dashboard.totalPosts')}
                value={dashboardData.forumStats.totalPosts || 0}
                icon="chatbubbles"
                color={theme.colors.primary}
                onPress={() => navigation.navigate('ForumManagement')}
              />
            </View>
          </View>
        )}

        {/* Users by Role */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.usersByRole')}</Text>
          <View style={styles.roleContainer}>
            {Object.entries(usersByRole).map(([role, count]) => (
              <View key={role} style={styles.roleItem}>
                <View style={styles.roleInfo}>
                  <View style={[styles.roleDot, { backgroundColor: getRoleColor(role) }]} />
                  <Text style={styles.roleLabel}>{capitalizeFirst(role)}</Text>
                </View>
                <Text style={styles.roleCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Users by Provider */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.authProviders')}</Text>
          <View style={styles.roleContainer}>
            {Object.entries(usersByProvider).map(([provider, count]) => (
              <View key={provider} style={styles.roleItem}>
                <View style={styles.roleInfo}>
                  <Ionicons
                    name={getProviderIcon(provider)}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.roleLabel}>{capitalizeFirst(provider)}</Text>
                </View>
                <Text style={styles.roleCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.dashboard.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              title={t('admin.dashboard.manageUsers')}
              icon="people"
              color={theme.colors.primary}
              onPress={() => navigation.navigate('UserManagement')}
            />
            <QuickAction
              title={t('admin.dashboard.manageForum')}
              icon="chatbubbles"
              color="#4CAF50"
              onPress={() => navigation.navigate('ForumManagement')}
            />
            <QuickAction
              title={t('admin.dashboard.viewReports')}
              icon="stats-chart"
              color="#FF9800"
              onPress={() => {}}
            />
            <QuickAction
              title={t('admin.dashboard.settings')}
              icon="settings"
              color="#9C27B0"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getRoleColor = (role) => {
  const colors = {
    admin: '#F44336',
    researcher: '#FF9800',
    user: '#4CAF50',
  };
  return colors[role] || '#9E9E9E';
};

const getProviderIcon = (provider) => {
  const icons = {
    local: 'mail',
    google: 'logo-google',
    facebook: 'logo-facebook',
    apple: 'logo-apple',
  };
  return icons[provider] || 'person';
};

const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontFamily: 'Poppins_400Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    ...theme.shadows.medium,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: theme.colors.text.primary,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  activityCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  activityValue: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: theme.colors.primary,
  },
  activityLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  roleContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...theme.shadows.medium,
  },
  roleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  roleLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  roleCount: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickAction: {
    width: CARD_WIDTH,
    height: 100,
    margin: 6,
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.medium,
  },
  quickActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
});
