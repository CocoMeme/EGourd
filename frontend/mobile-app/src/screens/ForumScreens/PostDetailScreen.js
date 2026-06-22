import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { forumService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const PostDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { postId } = route.params;
  const { isGuest, logout } = useAuth();
  const { t } = useTranslation();
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { id: 'tips', label: t('forum.categories.tips'), color: theme.colors.success },
    { id: 'questions', label: t('forum.categories.qa'), color: theme.colors.info },
    { id: 'showcase', label: t('forum.categories.showcase'), color: theme.colors.warning },
    { id: 'discussion', label: t('forum.categories.discussion'), color: theme.colors.primary },
  ];

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await forumService.getPostById(postId);
      if (response.success) {
        setPost(response.data);
      } else {
        Alert.alert(t('errors.generic'), t('forum.postDetail.failedToLoadPost'));
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert(t('errors.generic'), t('forum.postDetail.failedToLoadPost'));
    } finally {
      setLoading(false);
    }
  };

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

  const handleLike = async () => {
    if (requireAccount('like posts')) return;
    try {
      const response = await forumService.toggleLike(postId);
      if (response.success) {
        setPost(prev => ({
          ...prev,
          likeCount: response.data.likes,
          isLiked: response.data.isLiked,
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleAddComment = async () => {
    if (requireAccount('comment on posts')) return;
    if (!commentText.trim()) {
      Alert.alert(t('forum.postDetail.emptyComment'), t('forum.postDetail.emptyCommentMessage'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await forumService.addComment(postId, commentText.trim());
      
      if (response.success) {
        setCommentText('');
        fetchPost(); // Refresh to get updated comments
      } else {
        Alert.alert(t('forum.postDetail.unableToComment'), response.message || t('forum.postDetail.failedToAddComment'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category) => {
    return categories.find(c => c.id === category)?.color || theme.colors.primary;
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

    // Otherwise show full date with time
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    // Show year only if different from current year
    if (year === currentYear) {
      return `${month} ${day} at ${displayHours}:${minutes} ${ampm}`;
    }
    return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="transparent" 
          translucent={true} 
        />
        <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('forum.postDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="transparent" 
          translucent={true} 
        />
        <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('forum.postDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.error} />
          <Text style={styles.errorText}>{t('forum.postDetail.postNotFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('forum.postDetail.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Post Content */}
          <View style={styles.postContainer}>
            {/* Author & Category */}
            <View style={styles.postHeader}>
              <View style={styles.authorInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={24} color={theme.colors.text.secondary} />
                </View>
                <View style={styles.authorDetails}>
                  <Text style={styles.authorName}>{post.author?.username || t('forum.anonymous')}</Text>
                  <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
                </View>
              </View>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(post.category) + '20' }]}>
                <Text style={[styles.categoryBadgeText, { color: getCategoryColor(post.category) }]}>
                  {categories.find(c => c.id === post.category)?.label.split(' ')[0]}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text style={styles.postTitle}>{post.title}</Text>

            {/* Content */}
            <Text style={styles.postContent}>{post.content}</Text>

            {/* Images */}
            {post.images && post.images.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.imagesScroll}
                contentContainerStyle={styles.imagesScrollContent}
              >
                {post.images.map((img, index) => (
                  <Image 
                    key={index}
                    source={{ uri: img.url }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats & Actions */}
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statButton} onPress={handleLike}>
                <Ionicons
                  name={post.isLiked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={post.isLiked ? theme.colors.error : theme.colors.text.secondary}
                />
                <Text style={styles.statText}>{post.likeCount || post.likes || 0}</Text>
              </TouchableOpacity>
              <View style={styles.statButton}>
                <Ionicons name="chatbubble-outline" size={24} color={theme.colors.text.secondary} />
                <Text style={styles.statText}>{post.commentCount || post.comments?.length || 0}</Text>
              </View>
              <View style={styles.statButton}>
                <Ionicons name="eye-outline" size={24} color={theme.colors.text.secondary} />
                <Text style={styles.statText}>{post.views || 0}</Text>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>
              {t('forum.postDetail.comments', { count: post.comments?.length || 0 })}
            </Text>

            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment, index) => (
                <View key={comment._id || index} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name="person" size={16} color={theme.colors.text.secondary} />
                    </View>
                    <View style={styles.commentAuthorInfo}>
                      <Text style={styles.commentAuthor}>
                        {comment.user?.username || t('forum.anonymous')}
                      </Text>
                      <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  {comment.likes > 0 && (
                    <View style={styles.commentLikes}>
                      <Ionicons name="heart" size={14} color={theme.colors.error} />
                      <Text style={styles.commentLikesText}>{comment.likes}</Text>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.noComments}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.text.secondary} />
                <Text style={styles.noCommentsText}>{t('forum.postDetail.noComments')}</Text>
                <Text style={styles.noCommentsSubtext}>{t('forum.postDetail.beFirstComment')}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        {isGuest ? (
          <TouchableOpacity
            style={styles.guestCommentPrompt}
            onPress={() => requireAccount('join the discussion')}
          >
            <Ionicons name="chatbubble-outline" size={18} color={theme.colors.text.secondary} />
            <Text style={styles.guestCommentText}>{t('forum.postDetail.signInToComment')}</Text>
          </TouchableOpacity>
        ) : post?.isLocked ? (
          <View style={styles.lockedCommentContainer}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.lockedCommentText}>{t('forum.postDetail.postLocked')}</Text>
          </View>
        ) : (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder={t('forum.postDetail.writeComment')}
              placeholderTextColor={theme.colors.text.secondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  header: {
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
  scrollView: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 8,
    borderBottomColor: theme.colors.background.secondary,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  postTime: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  categoryBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    textTransform: 'uppercase',
  },
  postTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    lineHeight: 30,
  },
  postContent: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 24,
    marginBottom: theme.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  tag: {
    backgroundColor: theme.colors.primary + '15',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  tagText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  imagesScroll: {
    marginVertical: theme.spacing.md,
  },
  imagesScrollContent: {
    paddingRight: theme.spacing.md,
  },
  postImage: {
    width: 300,
    height: 200,
    borderRadius: theme.borderRadius.medium,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
  },
  statButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xl,
  },
  statText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginLeft: 6,
  },
  commentsSection: {
    padding: theme.spacing.lg,
  },
  commentsTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  commentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.background.secondary,
  },
  commentHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  commentAuthorInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
  },
  commentTime: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  commentLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  commentLikesText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginLeft: 4,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  noCommentsText: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  noCommentsSubtext: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
    maxHeight: 100,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  lockedCommentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  lockedCommentText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  guestCommentPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background.secondary,
    gap: theme.spacing.sm,
  },
  guestCommentText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
});

PostDetailScreen.routeName = 'PostDetail';
export default PostDetailScreen;
