import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl, ActivityIndicator, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { forumService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const CommunityScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isGuest, logout } = useAuth();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { id: 'all', label: t('forum.categories.allPosts'), icon: 'apps-outline' },
    { id: 'tips', label: t('forum.categories.tips'), icon: 'bulb-outline' },
    { id: 'questions', label: t('forum.categories.qa'), icon: 'help-circle-outline' },
    { id: 'showcase', label: t('forum.categories.showcase'), icon: 'image-outline' },
    { id: 'discussion', label: t('forum.categories.discussion'), icon: 'chatbubbles-outline' },
  ];

  // Fetch posts from backend
  const fetchPosts = async () => {
    try {
      setError(null);
      const params = {
        sortBy: 'recent',
        limit: 20,
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await forumService.getAllPosts(params);

      if (response.success) {
        console.log('Fetched posts:', response.data?.slice(0, 2)); // Log first 2 posts
        setPosts(response.data || []);
      } else {
        setError(response.message || t('forum.failedToLoad'));
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(t('forum.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  // Search debounce effect
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchPosts();
      } else if (searchQuery === '') {
        fetchPosts();
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // Helper to gate guest actions
  const requireAccount = (action) => {
    if (isGuest) {
      Alert.alert(
        t('forum.accountRequired'),
        t('forum.accountRequiredMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('forum.signIn'), onPress: () => logout() },
        ]
      );
      return true;
    }
    return false;
  };

  // Handle like post
  const handleLikePost = async (postId) => {
    if (requireAccount()) return;
    try{
      console.log('Liking post with ID:', postId);
      if (!postId) {
        console.error('Post ID is undefined');
        return;
      }
      const response = await forumService.toggleLike(postId);
      if (response.success) {
        // Update post in local state - only update like count and status
        setPosts(prevPosts =>
          prevPosts.map(post =>
            post._id === postId ? {
              ...post,
              likeCount: response.data.likes,
              isLiked: response.data.isLiked,
            } : post
          )
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleReportPost = (postId) => {
    if (requireAccount()) return;
    Alert.alert(
      t('forum.reportPost'),
      t('forum.reportPostMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('forum.report'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await forumService.reportPost(postId);
              if (response.success) {
                Alert.alert(
                  t('forum.thankYou'),
                  t('forum.reportSubmitted'),
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(t('errors.generic'), response.message || t('forum.reportFailed'));
              }
            } catch (error) {
              console.error('Error reporting post:', error);
              Alert.alert(t('errors.generic'), t('forum.reportFailed'));
            }
          },
        },
      ]
    );
  };

  const getCategoryColor = (category) => {
    const colors = {
      tips: theme.colors.success,
      questions: theme.colors.info,
      showcase: theme.colors.warning,
      discussion: theme.colors.primary,
    };
    return colors[category] || theme.colors.text.secondary;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('forum.justNow');
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // If less than 1 hour, show relative time
    if (diffInMinutes < 60) {
      if (diffInMinutes < 1) return t('forum.justNow');
      return t('forum.minutesAgo', { count: diffInMinutes });
    }

    // If less than 24 hours, show hours
    if (diffInHours < 24) {
      return t('forum.hoursAgo', { count: diffInHours });
    }

    // If less than 7 days, show days
    if (diffInDays < 7) {
      return t('forum.daysAgo', { count: diffInDays });
    }

    // Otherwise show full date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();

    // Don't show year if it's current year
    if (year === currentYear) {
      return `${month} ${day}`;
    }
    return `${month} ${day}, ${year}`;
  };

  const handlePostPress = (post) => {
    if (!post._id && !post.id) {
      console.error('Post ID is missing');
      return;
    }
    navigation.navigate('PostDetail', { postId: post._id || post.id });
  };

  const handleCreatePost = () => {
    if (requireAccount()) return;
    // Navigate to create post screen (to be implemented)
    navigation.navigate('CreatePost', {
      onPostCreated: () => {
        fetchPosts();
      }
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('forum.loading')}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPosts}>
            <Text style={styles.retryButtonText}>{t('forum.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={theme.colors.text.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('forum.searchPlaceholder')}
            placeholderTextColor={theme.colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                selectedCategory === category.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={selectedCategory === category.id ? '#fff' : theme.colors.text.secondary} 
              />
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Forum Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('forum.recentPosts')}</Text>
            {posts.length > 10 && (
              <TouchableOpacity>
                <Text style={styles.sectionAction}>{t('forum.seeAll')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={theme.colors.text.secondary} />
              <Text style={styles.emptyStateTitle}>{t('forum.noPostsYet')}</Text>
              <Text style={styles.emptyStateText}>
                {t('forum.beFirst')}
              </Text>
              <TouchableOpacity style={styles.createFirstButton} onPress={handleCreatePost}>
                <Text style={styles.createFirstButtonText}>{t('forum.createPost')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map((post) => (
              <TouchableOpacity
                key={post._id || post.id}
                style={[
                  styles.postCard,
                  post.isPinned && styles.pinnedPostCard
                ]}
                onPress={() => handlePostPress(post)}
                activeOpacity={0.7}
              >
                {/* Pinned Badge */}
                {post.isPinned && (
                  <View style={styles.pinnedBadge}>
                    <Ionicons name="pin" size={14} color="#fff" />
                    <Text style={styles.pinnedBadgeText}>{t('forum.pinned')}</Text>
                  </View>
                )}

                {/* Post Header */}
                <View style={styles.postHeader}>
                  <View style={styles.authorInfo}>
                    {post.author?.profilePicture ? (
                      <Image 
                        source={{ uri: post.author.profilePicture }} 
                        style={styles.authorAvatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color={theme.colors.text.secondary} />
                      </View>
                    )}
                    <View style={styles.authorDetails}>
                      <View style={styles.authorNameRow}>
                        <Text style={styles.authorName}>{post.author?.username || t('forum.anonymous')}</Text>
                      </View>
                      <Text style={styles.postTimestamp}>{formatDate(post.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
                    <Text style={[styles.categoryBadgeText, { color: getCategoryColor(post.category) }]}>
                      {categories.find(c => c.id === post.category)?.label.split(' ')[0]}
                    </Text>
                  </View>
                </View>

                {/* Post Content */}
                <View style={styles.postContent}>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postText} numberOfLines={3}>{post.content}</Text>
                  
                  {/* Post Images */}
                  {post.images && post.images.length > 0 && (
                    <View style={styles.postImagesContainer}>
                      {post.images.slice(0, 2).map((img, index) => (
                        <View key={index} style={styles.imageWrapper}>
                          <Image 
                            source={{ uri: img.url }} 
                            style={[
                              styles.postImage,
                              post.images.length === 1 && styles.postImageSingle,
                              post.images.length > 1 && styles.postImageMultiple
                            ]}
                            resizeMode="cover"
                          />
                          {index === 1 && post.images.length > 2 && (
                            <View style={styles.moreImagesOverlay}>
                              <Text style={styles.moreImagesText}>+{post.images.length - 2}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>#{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Post Footer */}
                <View style={styles.postFooter}>
                  <View style={styles.postStats}>
                    <TouchableOpacity 
                      style={styles.statItem}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleLikePost(post._id);
                      }}
                    >
                      <Ionicons 
                        name={post.isLiked ? "heart" : "heart-outline"} 
                        size={18} 
                        color={post.isLiked ? theme.colors.error : theme.colors.text.secondary} 
                      />
                      <Text style={styles.statText}>{post.likeCount || 0}</Text>
                    </TouchableOpacity>
                    <View style={styles.statItem}>
                      <Ionicons name="chatbubble-outline" size={18} color={theme.colors.text.secondary} />
                      <Text style={styles.statText}>{post.commentCount || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="eye-outline" size={18} color={theme.colors.text.secondary} />
                      <Text style={styles.statText}>{post.views || 0}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reportButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleReportPost(post._id);
                    }}
                  >
                    <Ionicons name="flag-outline" size={18} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Community Guidelines */}
        <View style={styles.guidelinesCard}>
          <Ionicons name="information-circle" size={24} color={theme.colors.info} />
          <View style={styles.guidelinesContent}>
            <Text style={styles.guidelinesTitle}>{t('forum.communityGuidelines')}</Text>
            <Text style={styles.guidelinesText}>
              {t('forum.guidelinesText')}
            </Text>
            <TouchableOpacity>
              <Text style={styles.guidelinesLink}>{t('forum.readFullGuidelines')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <View style={[styles.headerRow, { paddingTop: theme.spacing.md + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('forum.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {renderContent()}

      {/* Floating Action Button */}
      {!loading && !error && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  errorText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  createFirstButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  createFirstButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background.secondary,
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  createButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  searchIcon: {
    marginRight: theme.spacing.xs,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
  },
  categoriesContainer: {
    marginBottom: theme.spacing.sm,
  },
  categoriesContent: {
    paddingRight: theme.spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  sectionAction: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.primary,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  topicCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.sm,
    margin: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  topicName: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  topicCount: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
  postCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  pinnedPostCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
    backgroundColor: theme.colors.primary + '08',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  pinnedBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.semiBold,
    color: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  authorDetails: {
    flex: 1,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginRight: 4,
  },
  postTimestamp: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.semiBold,
    textTransform: 'uppercase',
  },
  postContent: {
    marginBottom: theme.spacing.sm,
  },
  postTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  postText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  postImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    marginHorizontal: -2,
  },
  imageWrapper: {
    position: 'relative',
    margin: 2,
  },
  postImage: {
    borderRadius: theme.borderRadius.medium,
    backgroundColor: theme.colors.background.secondary,
  },
  postImageSingle: {
    width: '100%',
    height: 200,
  },
  postImageMultiple: {
    width: 172,
    height: 120,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  tag: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  postFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    paddingTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  statText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  guidelinesCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.info + '10',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },
  guidelinesContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  guidelinesTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  guidelinesText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: theme.spacing.xs,
  },
  guidelinesLink: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.info,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

CommunityScreen.routeName = 'Community';
export default CommunityScreen;
