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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services';
import { theme } from '../../styles';
import { useTranslation } from 'react-i18next';

export const ForumManagementScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    isPinned: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [page, filters]);

  useEffect(() => {
    // Handle route params for filtering
    if (route.params?.filter) {
      const { filter } = route.params;
      setFilters(prev => ({ ...prev, status: filter }));
    }
  }, [route.params]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const result = await adminService.getAllForumPosts({
        page,
        limit: 20,
        search: search.trim(),
        ...filters,
      });

      if (result.success) {
        setPosts(result.posts);
        setPagination(result.pagination);
      } else {
        Alert.alert(t('errors.generic'), result.message);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      Alert.alert(t('errors.generic'), t('admin.forum.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadPosts();
    setRefreshing(false);
  }, [search, filters]);

  const handleSearch = () => {
    setPage(1);
    loadPosts();
  };

  const handlePostPress = (post) => {
    setSelectedPost(post);
    setShowActionsModal(true);
  };

  const handleTogglePin = async (post) => {
    const action = post.isPinned ? 'unpin' : 'pin';
    Alert.alert(
      t('admin.forum.pinUnpin'),
      t('admin.forum.pinUnpinConfirm', { action }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: post.isPinned ? t('admin.forum.unpin') : t('admin.forum.pin'),
          onPress: async () => {
            try {
              const result = await adminService.togglePinPost(post._id);

              if (result.success) {
                Alert.alert(t('common.success'), t('admin.forum.postAction', { action }));
                setShowActionsModal(false);
                loadPosts();
              } else {
                Alert.alert(t('errors.generic'), result.message);
              }
            } catch (error) {
              Alert.alert(t('errors.generic'), t('admin.forum.postActionFailed', { action }));
            }
          },
        },
      ]
    );
  };

  const handleToggleLock = async (post) => {
    const action = post.isLocked ? 'unlock' : 'lock';
    Alert.alert(
      t('admin.forum.lockUnlock'),
      t('admin.forum.lockUnlockConfirm', { action }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: post.isLocked ? t('admin.forum.unlock') : t('admin.forum.lock'),
          onPress: async () => {
            try {
              const result = await adminService.toggleLockPost(post._id);

              if (result.success) {
                Alert.alert(t('common.success'), t('admin.forum.postAction', { action }));
                setShowActionsModal(false);
                loadPosts();
              } else {
                Alert.alert(t('errors.generic'), result.message);
              }
            } catch (error) {
              Alert.alert(t('errors.generic'), t('admin.forum.postActionFailed', { action }));
            }
          },
        },
      ]
    );
  };

  const handleChangeStatus = async (post, newStatus) => {
    const action = newStatus;

    Alert.alert(
      t('admin.forum.postActions'),
      t('admin.forum.changeStatusConfirm', { action }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.forum.confirm'),
          style: newStatus === 'deleted' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = await adminService.updateForumPostStatus(post._id, newStatus);

              if (result.success) {
                Alert.alert(t('common.success'), t('admin.forum.postAction', { action }));
                setShowActionsModal(false);
                loadPosts();
              } else {
                Alert.alert(t('errors.generic'), result.message);
              }
            } catch (error) {
              Alert.alert(t('errors.generic'), t('admin.forum.postActionFailed', { action }));
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (post) => {
    Alert.alert(
      t('admin.forum.approve'),
      t('admin.forum.approveConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.forum.approve'),
          style: 'default',
          onPress: async () => {
            try {
              const result = await adminService.approvePost(post._id);

              if (result.success) {
                Alert.alert(t('common.success'), t('admin.forum.approvedMessage'));
                setShowActionsModal(false);
                // Immediately remove the post from the list if filtering by pending
                if (filters.status === 'pending') {
                  setPosts(prevPosts => prevPosts.filter(p => p._id !== post._id));
                  if (pagination) {
                    setPagination(prev => ({
                      ...prev,
                      totalPosts: prev.totalPosts - 1
                    }));
                  }
                } else {
                  // Otherwise reload to show updated status
                  loadPosts();
                }
              } else {
                Alert.alert(t('errors.generic'), result.message);
              }
            } catch (error) {
              console.error('Approve error:', error);
              Alert.alert(t('errors.generic'), t('admin.forum.postActionFailed', { action: t('admin.forum.approve') }));
            }
          },
        },
      ]
    );
  };

  const handleReject = async (post) => {
    // Use a simpler alert with a default reason or custom modal
    Alert.alert(
      t('admin.forum.reject'),
      t('admin.forum.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.forum.reject'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Use a default reason or you can implement a custom modal for input
              const reason = t('admin.forum.rejectedMessage');
              const result = await adminService.rejectPost(post._id, reason);

              if (result.success) {
                Alert.alert(t('common.success'), t('admin.forum.rejectedMessage'));
                setShowActionsModal(false);
                // Immediately remove the post from the list
                setPosts(prevPosts => prevPosts.filter(p => p._id !== post._id));
                // Also update pagination if needed
                if (pagination) {
                  setPagination(prev => ({
                    ...prev,
                    totalPosts: prev.totalPosts - 1
                  }));
                }
              } else {
                Alert.alert(t('errors.generic'), result.message);
              }
            } catch (error) {
              console.error('Reject error:', error);
              Alert.alert(t('errors.generic'), t('admin.forum.postActionFailed', { action: t('admin.forum.reject') }));
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#FF9800',
      active: '#4CAF50',
      archived: '#9E9E9E',
      deleted: '#F44336',
      flagged: '#9C27B0',
      rejected: '#F44336',
    };
    return colors[status] || '#9E9E9E';
  };

  const getCategoryColor = (category) => {
    const colors = {
      tips: '#2196F3',
      questions: '#FF9800',
      showcase: '#4CAF50',
      discussion: '#9C27B0',
    };
    return colors[category] || '#9E9E9E';
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => handlePostPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <View style={styles.postAuthor}>
          <View style={styles.authorAvatar}>
            <Text style={styles.authorAvatarText}>
              {(item.author?.username?.[0] || item.author?.firstName?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>
              {item.author?.username || 
               (item.author?.firstName && item.author?.lastName
                 ? `${item.author.firstName} ${item.author.lastName}`
                 : t('forum.anonymous'))}
            </Text>
            <Text style={styles.postDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.postBadges}>
          {item.isPinned && (
            <View style={styles.badge}>
              <Ionicons name="pin" size={12} color="#F44336" />
            </View>
          )}
          {item.isLocked && (
            <View style={styles.badge}>
              <Ionicons name="lock-closed" size={12} color="#FF9800" />
            </View>
          )}
        </View>
      </View>

      <Text style={styles.postTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={styles.postContent} numberOfLines={3}>
        {item.content}
      </Text>

      {item.images && item.images.length > 0 && (
        <View style={styles.postImages}>
          {item.images.slice(0, 3).map((img, index) => (
            <Image
              key={index}
              source={{ uri: img.url }}
              style={styles.postImage}
              resizeMode="cover"
            />
          ))}
          {item.images.length > 3 && (
            <View style={styles.moreImages}>
              <Text style={styles.moreImagesText}>+{item.images.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.postFooter}>
        <View style={styles.postMeta}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {item.category}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.postStats}>
          <View style={styles.stat}>
            <Ionicons name="heart" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{item.likeCount || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{item.commentCount || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="eye" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.statText}>{item.views || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const ActionsModal = () => (
    <Modal
      visible={showActionsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowActionsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('admin.forum.postActions')}</Text>
            <TouchableOpacity onPress={() => setShowActionsModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedPost && (
            <View style={styles.actionsContainer}>
              {/* Show Approve/Reject for pending posts */}
              {selectedPost.status === 'pending' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionItem, styles.approveAction]}
                    onPress={() => handleApprove(selectedPost)}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                    <Text style={[styles.actionText, styles.approveText]}>{t('admin.forum.approvePost')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionItem, styles.rejectAction]}
                    onPress={() => handleReject(selectedPost)}
                  >
                    <Ionicons name="close-circle" size={24} color="#F44336" />
                    <Text style={[styles.actionText, styles.rejectText]}>{t('admin.forum.rejectPost')}</Text>
                  </TouchableOpacity>

                  <View style={styles.divider} />
                </>
              )}

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleTogglePin(selectedPost)}
              >
                <Ionicons
                  name={selectedPost.isPinned ? 'pin' : 'pin-outline'}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.actionText}>
                  {selectedPost.isPinned ? t('admin.forum.unpinPost') : t('admin.forum.pinPost')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleToggleLock(selectedPost)}
              >
                <Ionicons
                  name={selectedPost.isLocked ? 'lock-open' : 'lock-closed'}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={styles.actionText}>
                  {selectedPost.isLocked ? t('admin.forum.unlockPost') : t('admin.forum.lockPost')}
                </Text>
              </TouchableOpacity>

              {selectedPost.status !== 'flagged' && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleChangeStatus(selectedPost, 'flagged')}
                >
                  <Ionicons name="flag" size={24} color="#9C27B0" />
                  <Text style={styles.actionText}>{t('admin.forum.flagPost')}</Text>
                </TouchableOpacity>
              )}

              {selectedPost.status !== 'active' && selectedPost.status !== 'flagged' && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleChangeStatus(selectedPost, 'active')}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.actionText}>{t('admin.forum.activatePost')}</Text>
                </TouchableOpacity>
              )}

              {selectedPost.status !== 'deleted' && (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleChangeStatus(selectedPost, 'deleted')}
                >
                  <Ionicons name="trash" size={24} color="#F44336" />
                  <Text style={styles.actionText}>{t('admin.forum.removeFromCommunity')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
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
            <Text style={styles.modalTitle}>{t('admin.forum.filters')}</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('admin.forum.category')}</Text>
            <View style={styles.filterOptions}>
              {['', 'tips', 'questions', 'showcase', 'discussion'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterOption,
                    filters.category === category && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, category }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.category === category && styles.filterOptionTextActive,
                  ]}>
                    {category || t('admin.forum.allCategories')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('admin.forum.status')}</Text>
            <View style={styles.filterOptions}>
              {[
                { label: t('admin.forum.allStatuses'), value: '' },
                { label: t('admin.forum.pending'), value: 'pending' },
                { label: t('admin.forum.active'), value: 'active' },
                { label: t('admin.forum.flagged'), value: 'flagged' },
                { label: t('admin.forum.rejected'), value: 'rejected' },
                { label: t('admin.forum.deleted'), value: 'deleted' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.status === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, status: option.value }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.status === option.value && styles.filterOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('admin.forum.pinned')}</Text>
            <View style={styles.filterOptions}>
              {[
                { label: t('admin.forum.allPosts'), value: '' },
                { label: t('admin.forum.pinnedOnly'), value: 'true' },
                { label: t('admin.forum.notPinned'), value: 'false' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.isPinned === option.value && styles.filterOptionActive,
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, isPinned: option.value }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.isPinned === option.value && styles.filterOptionTextActive,
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
              loadPosts();
            }}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primary + 'DD']}
              style={styles.applyButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.applyButtonText}>{t('admin.forum.applyFilters')}</Text>
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
          <Text style={styles.headerTitle}>{t('admin.forum.title')}</Text>
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
            placeholder={t('admin.forum.searchPlaceholder')}
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
            {t('admin.forum.showingResults', { count: posts.length, total: pagination.totalPosts })}
          </Text>
          {pagination.totalPages > 1 && (
            <Text style={styles.paginationText}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </Text>
          )}
        </View>
      )}

      {/* Post List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('admin.forum.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles" size={64} color={theme.colors.text.secondary} />
              <Text style={styles.emptyText}>{t('admin.forum.noPostsFound')}</Text>
              <Text style={styles.emptySubtext}>{t('admin.forum.tryAdjustingFilters')}</Text>
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

      <ActionsModal />
      <FilterModal />
    </SafeAreaView>
  );
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
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.medium,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
  },
  postDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  postBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  postImages: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImages: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
  moreImagesText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    textTransform: 'capitalize',
  },
  postStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.secondary,
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
  actionsContainer: {
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.secondary,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: theme.colors.text.primary,
    marginLeft: 16,
  },
  approveAction: {
    backgroundColor: '#4CAF5010',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  approveText: {
    color: '#4CAF50',
  },
  rejectAction: {
    backgroundColor: '#F4433610',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectText: {
    color: '#F44336',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background.secondary,
    marginVertical: 8,
  },
  dangerAction: {
    backgroundColor: '#F4433610',
  },
  dangerText: {
    color: '#F44336',
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
