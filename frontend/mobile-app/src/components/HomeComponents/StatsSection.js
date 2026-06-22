import React, { useRef, useState } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../styles';
import { StatCard } from './StatCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_HORIZONTAL_MARGIN = theme.spacing.sm;
const CARD_WIDTH = SCREEN_WIDTH - (theme.spacing.sm * 2) - (CARD_HORIZONTAL_MARGIN * 2);
const SNAP_WIDTH = CARD_WIDTH + (CARD_HORIZONTAL_MARGIN * 2);

export const StatsSection = ({ 
  totalScans, 
  readyGourds, 
  pollinationsCount, 
  onStatsPress,
  recentScans = [] 
}) => {
  const { t } = useTranslation();
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get last 5 scans with dates
  const recentScansData = recentScans.slice(0, 5).map(scan => ({
    result: scan.result,
    date: new Date(scan.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }));

  const statsData = [
    {
      id: 'total',
      icon: 'qrcode-scan',
      value: totalScans || 0,
      label: t('home.totalScans'),
      color: theme.colors.info,
      gradientColors: [theme.colors.info, '#2874a6'],
      details: recentScansData,
      detailsTitle: t('home.recentScans')
    },
    {
      id: 'ready',
      icon: 'check-circle',
      value: readyGourds || 0,
      label: t('home.readyForHarvest'),
      color: theme.colors.primary,
      gradientColors: [theme.colors.primary, '#4a8a3f'],
      details: [],
      detailsTitle: t('home.readyGourds')
    },
    {
      id: 'pollinations',
      icon: 'flower-outline',
      value: pollinationsCount || 0,
      label: t('home.activePollinations'),
      color: theme.colors.secondary,
      gradientColors: [theme.colors.secondary, '#c9c940'],
      details: [],
      detailsTitle: t('home.activePollinations')
    },
  ];

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const renderItem = ({ item }) => (
    <View style={styles.cardWrapper}>
      <StatCard
        icon={item.icon}
        value={item.value}
        label={item.label}
        color={item.color}
        gradientColors={item.gradientColors}
        onPress={() => onStatsPress?.(item.id)}
        details={item.details}
        detailsTitle={item.detailsTitle}
        isExpanded={true}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={statsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_WIDTH}
        decelerationRate="fast"
        snapToAlignment="start"
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        contentContainerStyle={styles.flatListContent}
      />
      
      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {statsData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -theme.spacing.sm,
    marginVertical: theme.spacing.xs - 2,
  },
  flatListContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: CARD_HORIZONTAL_MARGIN,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  paginationDotActive: {
    width: 16,
    backgroundColor: theme.colors.primary,
    opacity: 1,
  },
});
