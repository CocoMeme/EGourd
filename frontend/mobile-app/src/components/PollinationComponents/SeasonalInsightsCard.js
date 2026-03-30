/**
 * SeasonalInsightsCard
 * ====================
 * 
 * Displays seasonal pollination statistics by gourd type
 * Shows monthly successful pollinations to help farmers know peak seasons
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { plantService } from '../../services';

// Gourd colors
const GOURD_COLORS = {
  bitter_gourd: '#27AE60',
  bottle_gourd: '#3498DB',
  sponge_gourd: '#F39C12',
  cucumber: '#8BC34A',
  kalabasa: '#E67E22',
};

// Month abbreviations
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const SeasonalInsightsCard = ({ onViewDetails }) => {
  const [seasonalData, setSeasonalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGourd, setSelectedGourd] = useState('bitter_gourd');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchSeasonalData();
  }, []);

  const fetchSeasonalData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await plantService.getSeasonalPollinationStats();
      if (response.success) {
        setSeasonalData(response.data);
      }
    } catch (err) {
      console.error('Error fetching seasonal data:', err);
      setError('Unable to load seasonal data');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedGourdData = () => {
    if (!seasonalData?.gourdTypes) return null;
    return seasonalData.gourdTypes.find(g => g.type === selectedGourd);
  };

  const getMaxValue = () => {
    const gourdData = getSelectedGourdData();
    if (!gourdData) return 1;
    return Math.max(...gourdData.data, 1);
  };

  const currentMonth = new Date().getMonth();

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading seasonal insights...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={24} color="#999" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchSeasonalData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selectedData = getSelectedGourdData();
  const maxValue = getMaxValue();

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Gourd Season Insights</Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.colors.text.secondary} 
        />
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Gourd Type Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.gourdSelector}
            contentContainerStyle={styles.gourdSelectorContent}
          >
            {seasonalData?.gourdTypes?.map((gourd) => (
              <TouchableOpacity
                key={gourd.type}
                style={[
                  styles.gourdTab,
                  selectedGourd === gourd.type && styles.gourdTabActive,
                  { borderColor: GOURD_COLORS[gourd.type] }
                ]}
                onPress={() => setSelectedGourd(gourd.type)}
              >
                <View 
                  style={[
                    styles.gourdDot,
                    { backgroundColor: GOURD_COLORS[gourd.type] }
                  ]} 
                />
                <Text 
                  style={[
                    styles.gourdTabText,
                    selectedGourd === gourd.type && styles.gourdTabTextActive
                  ]}
                >
                  {gourd.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Peak Season Info */}
          {selectedData?.peakMonths?.length > 0 && (
            <View style={[styles.peakBadge, { backgroundColor: `${GOURD_COLORS[selectedGourd]}15` }]}>
              <Ionicons name="trending-up" size={16} color={GOURD_COLORS[selectedGourd]} />
              <Text style={[styles.peakText, { color: GOURD_COLORS[selectedGourd] }]}>
                Peak Season: {selectedData.peakMonths.join(', ')}
              </Text>
            </View>
          )}

          {/* Monthly Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Successful Pollinations by Month</Text>
            
            <View style={styles.chart}>
              {MONTHS.map((month, index) => {
                const value = selectedData?.data?.[index] || 0;
                const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const isCurrentMonth = index === currentMonth;
                
                return (
                  <View key={month} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View 
                        style={[
                          styles.bar,
                          { 
                            height: `${Math.max(heightPercent, 2)}%`,
                            backgroundColor: GOURD_COLORS[selectedGourd],
                            opacity: value > 0 ? 1 : 0.2,
                          }
                        ]} 
                      />
                      {value > 0 && (
                        <Text style={styles.barValue}>{value}</Text>
                      )}
                    </View>
                    <Text style={[
                      styles.monthLabel,
                      isCurrentMonth && styles.currentMonthLabel
                    ]}>
                      {month}
                    </Text>
                    {isCurrentMonth && (
                      <View style={styles.currentIndicator} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Ionicons name="bulb-outline" size={16} color="#F39C12" />
            <Text style={styles.tipsText}>
              {selectedData?.peakMonths?.length > 0 
                ? `Best time to grow ${selectedData.label}: ${selectedData.peakMonths[0]} - ${selectedData.peakMonths[selectedData.peakMonths.length - 1]}`
                : `No seasonal data yet for ${selectedData?.label}. Start tracking your pollinations!`
              }
            </Text>
          </View>
        </>
      )}

      {/* Collapsed Preview */}
      {!expanded && (
        <View style={styles.collapsedPreview}>
          <View style={styles.gourdLegend}>
            {seasonalData?.gourdTypes?.map((gourd) => (
              <View key={gourd.type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: GOURD_COLORS[gourd.type] }]} />
                <Text style={styles.legendText}>{gourd.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.tapToExpand}>Tap to see seasonal chart</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  errorText: {
    color: '#999',
    fontSize: 14,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    marginTop: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  gourdSelector: {
    marginTop: 16,
    marginBottom: 12,
  },
  gourdSelectorContent: {
    gap: 8,
  },
  gourdTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: theme.colors.background.secondary,
    gap: 6,
  },
  gourdTabActive: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 2,
  },
  gourdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gourdTabText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  gourdTabTextActive: {
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  peakText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: 8,
  },
  chartTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 16,
    borderRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    position: 'absolute',
    top: -14,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    marginTop: 6,
  },
  currentMonthLabel: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  currentIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },
  collapsedPreview: {
    marginTop: 12,
  },
  gourdLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  tapToExpand: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default SeasonalInsightsCard;
