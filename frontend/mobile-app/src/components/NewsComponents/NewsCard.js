import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

const { width } = Dimensions.get('window');

export const NewsCard = ({ 
  news, 
  onPress, 
  compact = false 
}) => {
  const { t } = useTranslation();
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

  const formatDate = (date) => {
    const newsDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - newsDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return t('news.today');
    if (diffDays < 2) return t('news.yesterday');
    if (diffDays < 7) return t('news.daysAgo', { count: diffDays });
    
    return newsDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: newsDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={getCategoryColor(news.category)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactIconContainer}
        >
          <Ionicons 
            name={getCategoryIcon(news.category)}
            size={20}
            color="#FFFFFF"
          />
        </LinearGradient>
        
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {news.title}
            </Text>
            {news.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>{t('news.new')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.compactDate}>{formatDate(news.releaseDate)}</Text>
        </View>
        
        <Ionicons 
          name="chevron-forward"
          size={20}
          color={theme.colors.text.secondary}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={getCategoryColor(news.category)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={getCategoryIcon(news.category)}
              size={24}
              color="#FFFFFF"
            />
          </View>
          
          <View style={styles.badges}>
            {news.isNew && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t('news.new')}</Text>
              </View>
            )}
            {news.display?.isPinned && (
              <Ionicons 
                name="pin"
                size={18}
                color="#FFFFFF"
                style={styles.pinIcon}
              />
            )}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {news.title}
        </Text>
        
        <Text style={styles.description} numberOfLines={3}>
          {news.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.metaInfo}>
            <Ionicons 
              name="calendar-outline"
              size={14}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.date}>
              {formatDate(news.releaseDate)}
            </Text>
            
            {news.version?.modelVersion && (
              <>
                <Ionicons 
                  name="pricetag-outline"
                  size={14}
                  color="rgba(255,255,255,0.8)"
                  style={styles.versionIcon}
                />
                <Text style={styles.version}>
                  {news.version.modelVersion}
                </Text>
              </>
            )}
          </View>

          <View style={styles.engagement}>
            <Ionicons 
              name="eye-outline"
              size={14}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.views}>
              {news.engagement?.views || 0}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Full card styles
  card: {
    marginBottom: theme.spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardGradient: {
    padding: theme.spacing.md,
    minHeight: 160,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  pinIcon: {
    marginLeft: theme.spacing.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: theme.spacing.md,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  versionIcon: {
    marginLeft: theme.spacing.sm,
  },
  version: {
    fontSize: 12,
    fontFamily: theme.fonts.semiBold,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },
  engagement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  views: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 4,
  },

  // Compact card styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.sm,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  newBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  compactDate: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
});
