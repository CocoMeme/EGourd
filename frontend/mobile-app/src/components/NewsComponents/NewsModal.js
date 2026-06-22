import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Markdown from 'react-native-markdown-display';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

const { width, height } = Dimensions.get('window');

export const NewsModal = ({ 
  visible, 
  news, 
  onClose,
  onMarkAsRead 
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  // Pan responder for swipe down gesture
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond if swiping down (positive dy)
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped down more than 50px, close the modal
        if (gestureState.dy > 50) {
          Animated.timing(translateY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            // Reset after closing
            setTimeout(() => {
              translateY.setValue(0);
            }, 100);
          });
        } else {
          // Bounce back
          Animated.spring(translateY, {
            toValue: 0,
            tension: 40,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // Start animation immediately from bottom
      translateY.setValue(height);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && news) {
      console.log('📰 NewsModal opened with:', {
        id: news._id,
        title: news.title,
        hasBody: !!news.body,
        bodyLength: news.body?.length,
        bodyPreview: news.body?.substring(0, 100),
        category: news.category,
        hasDescription: !!news.description,
        descriptionLength: news.description?.length,
        descriptionPreview: news.description?.substring(0, 50),
        hasTags: news.tags?.length > 0,
        hasMetadata: !!news.metadata,
        timestamp: Date.now()
      });
      
      // Log the actual content being passed to Markdown
      if (news.body) {
        console.log('🔍 Markdown will render:', news.body.length, 'characters');
      }
    }
  }, [visible, news]);

  useEffect(() => {
    if (visible && news && onMarkAsRead) {
      // Mark as read after a short delay
      const timer = setTimeout(() => {
        onMarkAsRead(news._id);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [visible, news]);

  if (!news) return null;

  const getCategoryColor = (category) => {
    const colors = {
      model_update: ['#667eea', '#764ba2'],
      feature: ['#f093fb', '#f5576c'],
      bug_fix: ['#fa709a', '#fee140'],
      maintenance: ['#30cfd0', '#330867'],
      announcement: ['#a8edea', '#fed6e3'],
      improvement: ['#ff9a56', '#ff6a00'],
      security: ['#ff0844', '#ffb199'],
      other: [theme.colors.primary, theme.colors.secondary]
    };
    return colors[category] || [theme.colors.primary, theme.colors.secondary];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      model_update: 'analytics-outline',
      feature: 'star-outline',
      bug_fix: 'bug-outline',
      maintenance: 'construct-outline',
      announcement: 'megaphone-outline',
      improvement: 'trending-up-outline',
      security: 'shield-checkmark-outline',
      other: 'information-circle-outline'
    };
    return icons[category] || 'information-circle-outline';
  };

  const formatDate = (date) => {
    const newsDate = new Date(date);
    return newsDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const markdownStyles = {
    body: {
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.text.primary,
      fontFamily: theme.fonts.regular,
    },
    heading1: {
      fontSize: 24,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    heading2: {
      fontSize: 20,
      fontFamily: theme.fonts.bold,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    heading3: {
      fontSize: 18,
      fontFamily: theme.fonts.semiBold,
      color: theme.colors.text.primary,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    paragraph: {
      marginBottom: theme.spacing.sm,
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.text.primary,
      fontFamily: theme.fonts.regular,
    },
    strong: {
      fontFamily: theme.fonts.bold,
      color: theme.colors.text.primary,
    },
    em: {
      fontFamily: theme.fonts.medium,
      fontStyle: 'italic',
    },
    bullet_list: {
      marginBottom: theme.spacing.sm,
    },
    ordered_list: {
      marginBottom: theme.spacing.sm,
    },
    list_item: {
      marginBottom: theme.spacing.xs,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    code_inline: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontFamily: 'Courier',
      fontSize: 14,
    },
    code_block: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 8,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      fontFamily: 'Courier',
      fontSize: 13,
    },
    blockquote: {
      backgroundColor: theme.colors.background.secondary,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
      paddingLeft: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }]
            }
          ]}
        >
          {/* Header with gradient - ENTIRE HEADER IS SWIPEABLE */}
          <LinearGradient
            colors={getCategoryColor(news.category)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            {/* Swipe indicator at the very top */}
            <View style={styles.swipeIndicatorContainer}>
              <View style={styles.swipeIndicator} />
            </View>

            {/* Make the entire header swipeable */}
            <View {...panResponder.panHandlers}>
              <View style={styles.headerTop}>
                <View style={styles.iconBadge}>
                  <Ionicons 
                    name={getCategoryIcon(news.category)}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons 
                    name="close"
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

            <Text style={styles.title}>{news.title}</Text>
            
            <View style={styles.headerMeta}>
              <View style={styles.metaItem}>
                <Ionicons 
                  name="calendar-outline"
                  size={14}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.metaText}>
                  {formatDate(news.releaseDate)}
                </Text>
              </View>
              
              {news.version?.modelVersion && (
                <View style={styles.metaItem}>
                  <Ionicons 
                    name="pricetag-outline"
                    size={14}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.metaText}>
                    {news.version.modelVersion}
                  </Text>
                </View>
              )}

              {news.metadata?.datasetSize && (
                <View style={styles.metaItem}>
                  <Ionicons 
                    name="server-outline"
                    size={14}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.metaText}>
                    {news.metadata.datasetSize}
                  </Text>
                </View>
              )}
            </View>
            </View>
          </LinearGradient>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Description */}
            {news.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionLabel}>{t('news.description')}</Text>
                <Text style={styles.description}>
                  {news.description}
                </Text>
              </View>
            )}

            {/* Body with Markdown */}
            {news.body ? (
              <View style={styles.bodyContainer}>
                <Text style={styles.sectionLabel}>{t('news.fullArticle')}</Text>
                <Markdown style={markdownStyles}>
                  {news.body}
                </Markdown>
                {/* Debug: Show if markdown rendered */}
                <Text style={styles.debugText}>
                  {t('news.markdownContent', { chars: news.body.length })}
                </Text>
              </View>
            ) : (
              <Text style={styles.noContent}>{t('news.noContent')}</Text>
            )}

            {/* Metadata Section */}
            {news.metadata?.improvements && news.metadata.improvements.length > 0 && (
              <View style={styles.metadataSection}>
                <Text style={styles.metadataTitle}>{t('news.keyImprovements')}</Text>
                {news.metadata.improvements.map((improvement, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Ionicons 
                      name="checkmark-circle"
                      size={18}
                      color={theme.colors.success}
                    />
                    <Text style={styles.improvementText}>{improvement}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Technical Details */}
            {news.metadata?.technicalDetails && (
              <View style={styles.metadataSection}>
                <Text style={styles.metadataTitle}>{t('news.technicalDetails')}</Text>
                <Text style={styles.technicalText}>
                  {news.metadata.technicalDetails}
                </Text>
              </View>
            )}

            {/* Tags */}
            {news.tags && news.tags.length > 0 && (
              <View style={styles.tagsSection}>
                {news.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    overflow: 'hidden',
  },
  swipeIndicatorContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
    lineHeight: 32,
  },
  headerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  descriptionContainer: {
    marginBottom: theme.spacing.lg,
  },
  description: {
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
  bodyContainer: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  metadataSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
  },
  metadataTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  improvementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  improvementText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.xs,
    flex: 1,
    lineHeight: 20,
  },
  technicalText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  tagsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.lg,
    marginHorizontal: -4,
  },
  tag: {
    backgroundColor: theme.colors.background.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  tagText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  noContent: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  debugText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
});
