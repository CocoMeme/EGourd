import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';

export const StatCard = ({ 
  icon, 
  value, 
  label, 
  color, 
  gradientColors, 
  onPress,
  details = [],
  detailsTitle = '',
  isExpanded = false 
}) => {
  const { t } = useTranslation();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress} 
      activeOpacity={0.8}
      disabled={!onPress}
    >
      <Animated.View style={[
        styles.innerContainer, 
        isExpanded && styles.innerContainerExpanded,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        {/* Gradient Header */}
        <LinearGradient
          colors={gradientColors || [color, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={isExpanded ? 36 : 28} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.value, isExpanded && styles.valueExpanded]}>{value}</Text>
              <Text style={[styles.label, isExpanded && styles.labelExpanded]}>{label}</Text>
            </View>
          </View>
          
          {/* Decorative circles for header */}
          <View style={styles.decorativeCircle} />
        </LinearGradient>

        {/* White Body */}
        <View style={styles.bodyContainer}>
          {/* Details Section */}
          {isExpanded && details.length > 0 && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>{detailsTitle}</Text>
              <View style={styles.detailsList}>
                {details.map((detail, index) => (
                  <View key={index} style={styles.detailRow}>
                    <View style={styles.detailBullet}>
                      <View style={[styles.detailDot, { backgroundColor: color }]} />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailResult} numberOfLines={1}>
                        {detail.result}
                      </Text>
                      <Text style={styles.detailDate}>{detail.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Empty State for Expanded Cards Without Details */}
          {isExpanded && details.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyContent}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={40} 
                  color={theme.colors.text.tertiary} 
                />
                <Text style={styles.emptyText}>
                  {t('home.tapToViewAll', { label: label?.toLowerCase() || '' })}
                </Text>
              </View>
            </View>
          )}
          
          {/* Decorative circle for body */}
          <View style={[styles.decorativeCircle, styles.decorativeCircle2]} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  innerContainerExpanded: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradientHeader: {
    padding: theme.spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  value: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    marginBottom: theme.spacing.xs - 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  valueExpanded: {
    fontSize: 32,
    marginBottom: theme.spacing.xs - 2,
  },
  label: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
  },
  labelExpanded: {
    fontSize: 14,
    textAlign: 'left',
    fontFamily: theme.fonts.semiBold,
    color: '#FFFFFF',
  },
  bodyContainer: {
    backgroundColor: '#FFFFFF',
    padding: theme.spacing.md,
    minHeight: 160,
    position: 'relative',
  },
  detailsSection: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsList: {
    gap: theme.spacing.xs - 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.small,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  detailBullet: {
    width: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 2,
  },
  detailDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  detailTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  detailResult: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
    flex: 1,
  },
  detailDate: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    minWidth: 70,
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },
  decorativeCircle2: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    bottom: -40,
    left: -30,
    top: 'auto',
    right: 'auto',
  },
});
