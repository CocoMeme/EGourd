import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services';
import { theme } from '../../styles';

export const UserManagementScreen = ({ navigation, route }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    role: '',
    provider: '',
    isActive: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminService.getAllUsers({
        page,
        limit: 20,
        search: search.trim(),
        ...filters,
      });

      if (result.success) {
        const visibleUsers = (result.users || []).filter(user => !user.deletedAt);
        setUsers(visibleUsers);
        setPagination(result.pagination);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  useEffect(() => {
    // Handle route params for filtering
    if (route.params?.filter) {
      const { filter } = route.params;
      if (filter === 'active') {
        setFilters(prev => ({ ...prev, isActive: 'true' }));
      } else if (filter === 'inactive') {
        setFilters(prev => ({ ...prev, isActive: 'false' }));
      } else if (filter === 'verified') {
        // Add verified filter if needed
      }
    }
  }, [route.params]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleUserPress = (user) => {
    navigation.navigate('UserDetail', { userId: user._id });
  };

  const handleToggleStatus = async (user) => {
    const action = user.isActive ? 'deactivate' : 'activate';
    
    Alert.alert(
      `${action === 'activate' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${action} ${user.username || user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'activate' ? 'Activate' : 'Deactivate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = action === 'activate'
                ? await adminService.activateUser(user._id)
                : await adminService.deactivateUser(user._id);

              if (result.success) {
                Alert.alert('Success', `User ${action}d successfully`);
                loadUsers();
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              Alert.alert('Error', `Failed to ${action} user`);
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {(item.firstName?.[0] || item.username?.[0] || item.email?.[0] || '?').toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.firstName && item.lastName
            ? `${item.firstName} ${item.lastName}`
            : item.username || 'No name'}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.badge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
            <Text style={styles.badgeText}>{item.role}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: item.isActive ? '#4CAF5020' : '#F4433620' }]}>
            <Text style={[styles.badgeText, { color: item.isActive ? '#4CAF50' : '#F44336' }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => handleToggleStatus(item)}
      >
        <Ionicons
          name={item.isActive ? 'close-circle' : 'checkmark-circle'}
          size={24}
          color={item.isActive ? '#F44336' : '#4CAF50'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Role</Text>
            <View style={styles.filterOptions}>
              {['', 'user', 'admin', 'researcher'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterOption,
                    filters.role === role && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, role }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.role === role && styles.filterOptionTextActive,
                  ]}>
                    {role || 'All'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {[
                { label: 'All', value: '' },
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.isActive === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, isActive: option.value }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.isActive === option.value && styles.filterOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              setShowFilters(false);
              setPage(1);
              loadUsers();
            }}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primary + 'DD']}
              style={styles.applyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={theme.colors.text.secondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Pagination Info */}
      {pagination && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {users.length} of {pagination.totalUsers} users
          </Text>
          {pagination.totalPages > 1 && (
            <Text style={styles.paginationText}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
          )}
        </View>
      )}

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={64} color={theme.colors.text.secondary} />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasPrevPage && styles.pageButtonDisabled]}
            onPress={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={!pagination.hasPrevPage}
          >
            <Ionicons name="chevron-back" size={24} color={pagination.hasPrevPage ? theme.colors.primary : theme.colors.text.secondary} />
          </TouchableOpacity>

          <Text style={styles.pageText}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageButton, !pagination.hasNextPage && styles.pageButtonDisabled]}
            onPress={() => setPage(prev => prev + 1)}
            disabled={!pagination.hasNextPage}
          >
            <Ionicons name="chevron-forward" size={24} color={pagination.hasNextPage ? theme.colors.primary : theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )}

      <FilterModal />
    </SafeAreaView>
  );
};

const getRoleBadgeColor = (role) => {
  const colors = {
    admin: '#F4433620',
    researcher: '#FF980020',
    user: '#4CAF5020',
  };
  return colors[role] || '#9E9E9E20';
};

const getRoleTextColor = (role) => {
  const colors = {
    admin: '#F44336',
    researcher: '#FF9800',
    user: '#4CAF50',
  };
  return colors[role] || '#9E9E9E';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.primary,
  },
  paginationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
  },
  paginationText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
  },
  listContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.medium,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.primary,
    textTransform: 'capitalize',
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
  },
  pageButton: {
    padding: 12,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.primary,
    marginHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  filterOptionActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  filterOptionTextActive: {
    color: theme.colors.primary,
  },
  applyButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
});
