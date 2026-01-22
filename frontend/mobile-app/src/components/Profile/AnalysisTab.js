import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';
import { theme } from '../../styles';
import { analyticsService, authService } from '../../services';

const { width } = Dimensions.get('window');
const chartWidth = width - 48; // Account for padding

export const AnalysisTab = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [selectedRange, setSelectedRange] = useState('30days');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, flower, leaf

  useEffect(() => {
    loadAnalytics();
  }, [selectedRange, selectedFilter]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      
      const dateRanges = analyticsService.getDateRangePresets();
      const range = dateRanges[selectedRange];
      
      const filters = {
        startDate: range.startDate,
        endDate: range.endDate,
      };

      if (selectedFilter !== 'all') {
        filters.scanType = selectedFilter;
      }

      const data = await analyticsService.getAnalytics(user._id, filters);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const renderSummaryCard = (title, value, subtitle, icon, color, trend) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <View style={styles.summaryCardHeader}>
        <Ionicons name={icon} size={24} color={color} />
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
            <Ionicons 
              name={trend >= 0 ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={trend >= 0 ? '#4CAF50' : '#F44336'} 
            />
            <Text style={[styles.trendText, { color: trend >= 0 ? '#4CAF50' : '#F44336' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryTitle}>{title}</Text>
      {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderInsightCard = (insight) => {
    const colors = {
      success: ['#4CAF50', '#66BB6A'],
      warning: ['#FF9800', '#FFB74D'],
      info: ['#2196F3', '#42A5F5'],
    };

    return (
      <LinearGradient
        key={insight.message}
        colors={colors[insight.type]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.insightCard}
      >
        <Ionicons name={insight.icon} size={24} color="#FFFFFF" />
        <Text style={styles.insightText}>{insight.message}</Text>
      </LinearGradient>
    );
  };

  const renderHarvestItem = (harvest) => (
    <View key={harvest.id} style={styles.harvestItem}>
      <View style={styles.harvestInfo}>
        <Text style={styles.harvestName}>{harvest.name || harvest.variety}</Text>
        <Text style={styles.harvestStage}>{harvest.currentStage}</Text>
      </View>
      <View style={styles.harvestDays}>
        <Text style={styles.harvestDaysNumber}>{harvest.daysToHarvest}</Text>
        <Text style={styles.harvestDaysLabel}>days</Text>
      </View>
    </View>
  );

  if (loading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Analyzing your data...</Text>
      </View>
    );
  }

  if (!analytics || analytics.summary.totalScans === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={80} color={theme.colors.text.disabled} />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptySubtitle}>Start scanning to see your analytics</Text>
      </View>
    );
  }

  // Prepare chart data
  const timeSeriesData = analytics.timeSeries.map((item, index) => ({
    value: item.count,
    label: new Date(item.date).getDate().toString(),
    dataPointText: item.count.toString(),
    frontColor: theme.colors.primary,
    spacing: index === 0 ? 0 : 10,
  }));

  const varietyPieData = Object.entries(analytics.distributions.variety).map(([variety, count], index) => {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    return {
      value: count,
      color: colors[index % colors.length],
      text: `${((count / analytics.summary.totalScans) * 100).toFixed(0)}%`,
      label: variety,
    };
  });

  const genderData = [
    {
      value: analytics.distributions.gender.male,
      label: 'Male',
      frontColor: '#2196F3',
      spacing: 2,
    },
    {
      value: analytics.distributions.gender.female,
      label: 'Female',
      frontColor: '#E91E63',
      spacing: 2,
    },
  ];

  const confidenceData = [
    { value: analytics.distributions.confidence.high, label: 'High', frontColor: '#4CAF50' },
    { value: analytics.distributions.confidence.medium, label: 'Medium', frontColor: '#FF9800', spacing: 2 },
    { value: analytics.distributions.confidence.low, label: 'Low', frontColor: '#F44336', spacing: 2 },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['7days', '30days', '90days', 'all'].map((range) => {
            const labels = { '7days': '7 Days', '30days': '30 Days', '90days': '90 Days', 'all': 'All Time' };
            return (
              <TouchableOpacity
                key={range}
                style={[styles.filterChip, selectedRange === range && styles.filterChipActive]}
                onPress={() => setSelectedRange(range)}
              >
                <Text style={[styles.filterChipText, selectedRange === range && styles.filterChipTextActive]}>
                  {labels[range]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.typeFilterContainer}>
          {['all', 'flower', 'leaf'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeFilter, selectedFilter === type && styles.typeFilterActive]}
              onPress={() => setSelectedFilter(type)}
            >
              <Ionicons
                name={type === 'all' ? 'apps' : type === 'flower' ? 'flower' : 'leaf'}
                size={16}
                color={selectedFilter === type ? '#FFFFFF' : theme.colors.text.secondary}
              />
              <Text style={[styles.typeFilterText, selectedFilter === type && styles.typeFilterTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summarySection}>
        {renderSummaryCard(
          'Total Scans',
          analytics.summary.totalScans,
          null,
          'scan-outline',
          theme.colors.primary,
          parseFloat(analytics.summary.weeklyComparison.percentChange)
        )}
        {renderSummaryCard(
          'Avg Confidence',
          `${analytics.summary.avgConfidence}%`,
          null,
          'shield-checkmark-outline',
          '#2196F3'
        )}
        {renderSummaryCard(
          'This Week',
          analytics.summary.weeklyComparison.thisWeek,
          `${analytics.summary.weeklyComparison.change >= 0 ? '+' : ''}${analytics.summary.weeklyComparison.change} from last week`,
          'calendar-outline',
          '#FF9800'
        )}
        {renderSummaryCard(
          'Success Rate',
          `${(((analytics.distributions.confidence.high + analytics.distributions.confidence.medium) / analytics.summary.totalScans) * 100).toFixed(0)}%`,
          'High & Medium confidence',
          'checkmark-circle-outline',
          '#4CAF50'
        )}
      </View>

      {/* Insights */}
      {analytics.insights && analytics.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          {analytics.insights.map(renderInsightCard)}
        </View>
      )}

      {/* Activity Chart */}
      {timeSeriesData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan Activity</Text>
          <View style={styles.chartCard}>
            <BarChart
              data={timeSeriesData}
              width={chartWidth - 40}
              height={200}
              barWidth={20}
              spacing={12}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={{ color: theme.colors.text.secondary, fontSize: 10 }}
              noOfSections={4}
              maxValue={Math.max(...timeSeriesData.map(d => d.value)) + 2}
              isAnimated
              animationDuration={800}
            />
          </View>
        </View>
      )}

      {/* Variety Distribution */}
      {varietyPieData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variety Distribution</Text>
          <View style={styles.chartCard}>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={varietyPieData}
                donut
                radius={80}
                innerRadius={50}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterValue}>{analytics.summary.totalScans}</Text>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legendContainer}>
              {varietyPieData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                  <Text style={styles.legendValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Gender Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gender Distribution</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={genderData}
            width={chartWidth - 40}
            height={180}
            barWidth={60}
            spacing={40}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.text.secondary }}
            noOfSections={4}
            isAnimated
            showValuesAsTopLabel
          />
        </View>
      </View>

      {/* Confidence Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Confidence Levels</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={confidenceData}
            width={chartWidth - 40}
            height={180}
            barWidth={50}
            spacing={30}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: theme.colors.text.secondary }}
            noOfSections={4}
            isAnimated
            showValuesAsTopLabel
          />
          <View style={styles.confidenceLegend}>
            <View style={styles.confidenceItem}>
              <View style={[styles.confidenceDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.confidenceLegendText}>High (≥85%)</Text>
            </View>
            <View style={styles.confidenceItem}>
              <View style={[styles.confidenceDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.confidenceLegendText}>Medium (70-85%)</Text>
            </View>
            <View style={styles.confidenceItem}>
              <View style={[styles.confidenceDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.confidenceLegendText}>Low (&lt;70%)</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Upcoming Harvests */}
      {analytics.upcomingHarvests && analytics.upcomingHarvests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Harvests</Text>
          <View style={styles.chartCard}>
            {analytics.upcomingHarvests.map(renderHarvestItem)}
          </View>
        </View>
      )}

      {/* Quality Metrics (if available) */}
      {analytics.qualityMetrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Average Quality Metrics</Text>
          <View style={styles.chartCard}>
            {Object.entries(analytics.qualityMetrics).map(([key, value]) => (
              <View key={key} style={styles.qualityMetricRow}>
                <Text style={styles.qualityMetricLabel}>
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Text>
                <View style={styles.qualityMetricBar}>
                  <View style={[styles.qualityMetricFill, { width: `${value}%`, backgroundColor: theme.colors.primary }]} />
                </View>
                <Text style={styles.qualityMetricValue}>{value.toFixed(0)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
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
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  filterSection: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  filterScroll: {
    marginBottom: theme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  typeFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeFilter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  typeFilterActive: {
    backgroundColor: theme.colors.primary,
  },
  typeFilterText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  typeFilterTextActive: {
    color: '#FFFFFF',
  },
  summarySection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginVertical: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.secondary,
  },
  summarySubtitle: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.disabled,
    marginTop: 4,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: '#FFFFFF',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  pieCenterLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
  legendContainer: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.primary,
  },
  legendValue: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  confidenceLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  confidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  confidenceLegendText: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
  },
  harvestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  harvestInfo: {
    flex: 1,
  },
  harvestName: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
  },
  harvestStage: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  harvestDays: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  harvestDaysNumber: {
    fontSize: 20,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primary,
  },
  harvestDaysLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.primary,
  },
  qualityMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  qualityMetricLabel: {
    width: 120,
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.text.primary,
  },
  qualityMetricBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  qualityMetricFill: {
    height: '100%',
    borderRadius: 4,
  },
  qualityMetricValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text.primary,
  },
  bottomSpacing: {
    height: 40,
  },
});
