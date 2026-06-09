/**
 * SeasonalInsightsScreen
 * ======================
 *
 * Full-page seasonal pollination insights with analysis.
 * Shows monthly pollination charts, season comparisons,
 * gourd-specific growing tips, and actionable recommendations.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { plantService } from '../../services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const GOURD_COLORS = {
  bitter_gourd: '#27AE60',
  bottle_gourd: '#3498DB',
  sponge_gourd: '#F39C12',
  cucumber: '#8BC34A',
  kalabasa: '#E67E22',
};

const GOURD_ICONS = {
  bitter_gourd: '🥒',
  bottle_gourd: '🍐',
  sponge_gourd: '🧽',
  cucumber: '🥒',
  kalabasa: '🎃',
};

// Philippine growing tips per gourd
const GOURD_TIPS = {
  bitter_gourd: {
    name: 'Bitter Gourd',
    optimalTemp: '25–32°C',
    season: 'Thrives in both wet and dry seasons',
    spacing: '1–2 meters between plants',
    tips: [
      'Plant during early wet season (June–July) for best yields',
      'Needs consistent watering — at least 2.5 cm per week',
      'Train vines on trellises for better air circulation',
      'Harvest 2–3 months after planting when fruits are still green',
      'Male flowers appear first; female flowers follow in 1–2 weeks',
    ],
    pollination: 'Primarily insect-pollinated (bees). Hand-pollinate early morning (6–9 AM) when female flowers open.',
  },
  bottle_gourd: {
    name: 'Bottle Gourd',
    optimalTemp: '24–35°C',
    season: 'Best planted during dry season (Dec–May)',
    spacing: '2–3 meters between plants',
    tips: [
      'Very vigorous vine — provide sturdy trellis support',
      'Prefers well-drained, loamy soil with pH 6.0–6.7',
      'Apply organic fertilizer every 2 weeks during growing phase',
      'Harvest young and tender (30–40 cm) for best eating quality',
      'Can produce fruits for 3–4 months once established',
    ],
    pollination: 'Flowers open in the evening. Hand-pollinate late afternoon or early evening for best success.',
  },
  sponge_gourd: {
    name: 'Sponge Gourd',
    optimalTemp: '25–30°C',
    season: 'Best during wet season with good sunlight',
    spacing: '1.5–2 meters between plants',
    tips: [
      'Needs full sunlight — minimum 6 hours daily',
      'Regular watering but avoid waterlogged soil',
      'Harvest young for eating; let mature for sponge production',
      'Prone to downy mildew in very wet conditions — ensure air flow',
      'Side-dress with nitrogen fertilizer at flowering stage',
    ],
    pollination: 'Bee-pollinated. Hand-pollinate in early morning. Male flowers are abundant; identify female by the small fruit below the flower.',
  },
  cucumber: {
    name: 'Cucumber',
    optimalTemp: '22–30°C',
    season: 'Year-round in tropical climates',
    spacing: '0.5–1 meter between plants',
    tips: [
      'Fast grower — harvest starts 40–50 days after planting',
      'Sensitive to waterlogging; use raised beds in wet season',
      'Mulch around base to retain moisture and reduce weeds',
      'Pick fruits frequently to encourage continuous production',
      'Watch for aphids and cucumber beetles',
    ],
    pollination: 'Insect-pollinated. Each plant produces many male flowers. Hand-pollinate morning (6–10 AM) for greenhouse or covered setups.',
  },
  kalabasa: {
    name: 'Squash',
    optimalTemp: '24–32°C',
    season: 'Excellent in wet season; also grows in dry with irrigation',
    spacing: '2–3 meters between plants (sprawling vine)',
    tips: [
      'Heavy feeder — enrich soil with compost before planting',
      'Needs ample space or strong trellis for climbing varieties',
      'Fruit matures in 90–120 days; skin hardens when ready',
      'Store harvested fruits in cool, dry place for months',
      'Pinch growing tips after 4–5 fruits set to focus energy',
    ],
    pollination: 'Large flowers attract bees. Hand-pollinate early morning (6–9 AM). Female flowers have a bulbous base — transfer pollen from fresh male flowers.',
  },
};

export const SeasonalInsightsScreen = ({ navigation }) => {
  const [seasonalData, setSeasonalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGourd, setSelectedGourd] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await plantService.getSeasonalPollinationStats();
      if (response.success) {
        setSeasonalData(response.data);
        // Auto-select the gourd with most data, or first one
        const best = response.data.gourdTypes?.reduce(
          (max, g) => {
            const total = g.data.reduce((s, v) => s + v, 0);
            return total > max.total ? { type: g.type, total } : max;
          },
          { type: response.data.gourdTypes?.[0]?.type, total: 0 }
        );
        setSelectedGourd(best.type);
      }
    } catch (err) {
      console.error('Error fetching seasonal data:', err);
      setError('Unable to load seasonal data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const currentMonth = new Date().getMonth();
  const currentSeason = currentMonth >= 5 && currentMonth <= 10 ? 'wet' : 'dry';

  const selectedGourdData = useMemo(() => {
    if (!seasonalData?.gourdTypes || !selectedGourd) return null;
    return seasonalData.gourdTypes.find((g) => g.type === selectedGourd);
  }, [seasonalData, selectedGourd]);

  const analysis = useMemo(() => {
    if (!selectedGourdData) return null;
    const data = selectedGourdData.data;
    const total = data.reduce((s, v) => s + v, 0);
    const maxVal = Math.max(...data);
    const bestMonthIdx = data.indexOf(maxVal);
    const wetTotal = data.slice(5, 11).reduce((s, v) => s + v, 0);
    const dryTotal = data.slice(0, 5).reduce((s, v) => s + v, 0) + (data[11] || 0);
    const avgPerMonth = total / 12;
    const activeMonths = data.filter((v) => v > 0).length;

    return {
      total,
      maxVal,
      bestMonth: maxVal > 0 ? FULL_MONTHS[bestMonthIdx] : null,
      wetTotal,
      dryTotal,
      preferredSeason: wetTotal > dryTotal ? 'Wet Season' : dryTotal > wetTotal ? 'Dry Season' : 'Both Seasons',
      avgPerMonth: avgPerMonth.toFixed(1),
      activeMonths,
      hasData: total > 0,
    };
  }, [selectedGourdData]);

  // Overall summary across all gourds
  const overallSummary = useMemo(() => {
    if (!seasonalData?.gourdTypes) return null;
    const totals = seasonalData.gourdTypes.map((g) => ({
      type: g.type,
      label: g.label,
      total: g.data.reduce((s, v) => s + v, 0),
    }));
    const grandTotal = totals.reduce((s, g) => s + g.total, 0);
    const topGourd = totals.reduce((max, g) => (g.total > max.total ? g : max), totals[0]);
    return { totals, grandTotal, topGourd };
  }, [seasonalData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading seasonal insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <Ionicons name="cloud-offline-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const maxChartVal = selectedGourdData ? Math.max(...selectedGourdData.data, 1) : 1;
  const tips = GOURD_TIPS[selectedGourd];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header navigation={navigation} />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />
        }
      >
        {/* Current Season Banner */}
        <View style={[styles.seasonBanner, currentSeason === 'wet' ? styles.wetBanner : styles.dryBanner]}>
          <View style={styles.seasonBannerLeft}>
            <Ionicons
              name={currentSeason === 'wet' ? 'rainy-outline' : 'sunny-outline'}
              size={28}
              color="#fff"
            />
            <View>
              <Text style={styles.seasonBannerTitle}>
                {currentSeason === 'wet' ? 'Wet Season' : 'Dry Season'}
              </Text>
              <Text style={styles.seasonBannerSubtitle}>
                {FULL_MONTHS[currentMonth]} — {currentSeason === 'wet' ? 'Jun to Nov' : 'Dec to May'}
              </Text>
            </View>
          </View>
          <Ionicons name="leaf-outline" size={20} color="rgba(255,255,255,0.6)" />
        </View>

        {/* Overall Summary */}
        {overallSummary && overallSummary.grandTotal > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Overall Performance</Text>
            <View style={styles.summaryRow}>
              <SummaryBox
                icon="checkmark-circle"
                color={theme.colors.success}
                value={overallSummary.grandTotal}
                label="Total Pollinations"
              />
              <SummaryBox
                icon="trophy"
                color="#F39C12"
                value={overallSummary.topGourd.label}
                label="Most Successful"
                isText
              />
            </View>
            {/* Mini bar chart of total per gourd */}
            <View style={styles.miniBarChart}>
              {overallSummary.totals.map((g) => (
                <View key={g.type} style={styles.miniBarRow}>
                  <Text style={styles.miniBarLabel}>{g.label}</Text>
                  <View style={styles.miniBarTrack}>
                    <View
                      style={[
                        styles.miniBarFill,
                        {
                          width: overallSummary.grandTotal > 0
                            ? `${(g.total / overallSummary.grandTotal) * 100}%`
                            : '0%',
                          backgroundColor: GOURD_COLORS[g.type],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.miniBarValue}>{g.total}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gourd Type Selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.sectionTitle}>Gourd Analysis</Text>
          <Text style={styles.sectionSubtitle}>Select a gourd type to see detailed insights</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gourdSelectorContent}
          >
            {seasonalData?.gourdTypes?.map((gourd) => {
              const isActive = selectedGourd === gourd.type;
              return (
                <TouchableOpacity
                  key={gourd.type}
                  style={[
                    styles.gourdChip,
                    isActive && { backgroundColor: GOURD_COLORS[gourd.type], borderColor: GOURD_COLORS[gourd.type] },
                  ]}
                  onPress={() => setSelectedGourd(gourd.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.gourdChipIcon}>{GOURD_ICONS[gourd.type]}</Text>
                  <Text style={[styles.gourdChipText, isActive && styles.gourdChipTextActive]}>
                    {gourd.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Monthly Chart */}
        {selectedGourdData && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.chartTitle}>Monthly Pollination Success</Text>
                <Text style={styles.chartSubMessage}>This is the pollination that has been successfully harvested</Text>
              </View>
              {selectedGourdData.peakMonths?.length > 0 && (
                <View style={[styles.peakBadge, { backgroundColor: `${GOURD_COLORS[selectedGourd]}18` }]}>
                  <Ionicons name="trending-up" size={14} color={GOURD_COLORS[selectedGourd]} />
                  <Text style={[styles.peakBadgeText, { color: GOURD_COLORS[selectedGourd] }]}>
                    Peak: {selectedGourdData.peakMonths.join(', ')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.chart}>
              {MONTHS.map((month, index) => {
                const value = selectedGourdData.data[index] || 0;
                const heightPercent = maxChartVal > 0 ? (value / maxChartVal) * 100 : 0;
                const isCurrentMonth = index === currentMonth;
                const isPeak = selectedGourdData.peakMonths?.includes(month);

                return (
                  <View key={month} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      {value > 0 && <Text style={styles.barValue}>{value}</Text>}
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${Math.max(heightPercent, 3)}%`,
                            backgroundColor: isPeak
                              ? GOURD_COLORS[selectedGourd]
                              : value > 0
                                ? `${GOURD_COLORS[selectedGourd]}80`
                                : '#E0E0E0',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.monthLabel, isCurrentMonth && styles.currentMonthLabel]}>
                      {month}
                    </Text>
                    {isCurrentMonth && <View style={[styles.currentDot, { backgroundColor: GOURD_COLORS[selectedGourd] }]} />}
                  </View>
                );
              })}
            </View>

            {/* Chart Legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: GOURD_COLORS[selectedGourd] }]} />
                <Text style={styles.legendText}>Peak months</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: `${GOURD_COLORS[selectedGourd]}80` }]} />
                <Text style={styles.legendText}>Active months</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendBox, { backgroundColor: '#E0E0E0' }]} />
                <Text style={styles.legendText}>No data</Text>
              </View>
            </View>
          </View>
        )}

        {/* Season Comparison */}
        {analysis?.hasData && (
          <View style={styles.comparisonCard}>
            <Text style={styles.sectionTitle}>Season Comparison</Text>
            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonBox, styles.wetBox]}>
                <Ionicons name="rainy-outline" size={24} color="#3498DB" />
                <Text style={styles.comparisonValue}>{analysis.wetTotal}</Text>
                <Text style={styles.comparisonLabel}>Wet Season</Text>
                <Text style={styles.comparisonSub}>Jun – Nov</Text>
              </View>
              <View style={styles.comparisonVs}>
                <Text style={styles.vsText}>vs</Text>
              </View>
              <View style={[styles.comparisonBox, styles.dryBox]}>
                <Ionicons name="sunny-outline" size={24} color="#F39C12" />
                <Text style={styles.comparisonValue}>{analysis.dryTotal}</Text>
                <Text style={styles.comparisonLabel}>Dry Season</Text>
                <Text style={styles.comparisonSub}>Dec – May</Text>
              </View>
            </View>
            <View style={styles.verdictBox}>
              <Ionicons name="analytics-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.verdictText}>
                {analysis.wetTotal === analysis.dryTotal
                  ? `${selectedGourdData?.label} performs equally in both seasons.`
                  : `${selectedGourdData?.label} performs better during the ${analysis.preferredSeason} with ${Math.abs(analysis.wetTotal - analysis.dryTotal)} more successful pollinations.`}
              </Text>
            </View>
          </View>
        )}

        {/* Key Stats */}
        {analysis && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Key Statistics</Text>
            <View style={styles.statsGrid}>
              <StatItem icon="bar-chart" label="Total Pollinations" value={analysis.total} />
              <StatItem icon="calendar" label="Best Month" value={analysis.bestMonth || 'N/A'} isText />
              <StatItem icon="time" label="Active Months" value={`${analysis.activeMonths}/12`} isText />
              <StatItem icon="pulse" label="Monthly Average" value={analysis.avgPerMonth} isText />
            </View>
          </View>
        )}

        {/* Growing Tips */}
        {tips && (
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsIcon}>{GOURD_ICONS[selectedGourd]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{tips.name}</Text>
                <Text style={styles.tipsSubtitle}>Growing Guide & Tips</Text>
              </View>
            </View>

            <View style={styles.tipsInfoRow}>
              <InfoPill icon="thermometer-outline" text={tips.optimalTemp} />
              <InfoPill icon="resize-outline" text={tips.spacing} />
            </View>

            <View style={styles.tipsMeta}>
              <Ionicons name="cloudy-outline" size={14} color={theme.colors.text.secondary} />
              <Text style={styles.tipsMetaText}>{tips.season}</Text>
            </View>

            {/* Pollination Advice */}
            <View style={styles.pollinationAdvice}>
              <View style={styles.pollinationAdviceHeader}>
                <Ionicons name="flower-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.pollinationAdviceTitle}>Pollination</Text>
              </View>
              <Text style={styles.pollinationAdviceText}>{tips.pollination}</Text>
            </View>

            {/* Tips List */}
            <View style={styles.tipsList}>
              {tips.tips.map((tip, idx) => (
                <View key={idx} style={styles.tipRow}>
                  <View style={[styles.tipBullet, { backgroundColor: GOURD_COLORS[selectedGourd] }]}>
                    <Text style={styles.tipBulletText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No Data Message */}
        {!analysis?.hasData && selectedGourdData && (
          <View style={styles.noDataCard}>
            <Ionicons name="leaf-outline" size={48} color="#ccc" />
            <Text style={styles.noDataTitle}>No Pollination Data Yet</Text>
            <Text style={styles.noDataText}>
              Start tracking your {selectedGourdData.label} pollinations to see seasonal trends and insights here.
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ─── Sub-Components ─── */

const Header = ({ navigation }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Season Insights</Text>
    <View style={{ width: 40 }} />
  </View>
);

const SummaryBox = ({ icon, color, value, label, isText }) => (
  <View style={styles.summaryBox}>
    <Ionicons name={icon} size={22} color={color} />
    <Text style={[styles.summaryValue, isText && styles.summaryValueText]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const StatItem = ({ icon, label, value, isText }) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={18} color={theme.colors.primary} />
    <Text style={[styles.statValue, isText && { fontSize: 16 }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoPill = ({ icon, text }) => (
  <View style={styles.infoPill}>
    <Ionicons name={icon} size={14} color={theme.colors.text.secondary} />
    <Text style={styles.infoPillText}>{text}</Text>
  </View>
);

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  errorText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },

  // Season Banner
  seasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
  },
  wetBanner: {
    backgroundColor: '#3498DB',
  },
  dryBanner: {
    backgroundColor: '#E67E22',
  },
  seasonBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seasonBannerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  seasonBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  summaryValueText: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },

  // Mini Bar Chart
  miniBarChart: {
    marginTop: 16,
    gap: 8,
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBarLabel: {
    width: 70,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  miniBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 2,
  },
  miniBarValue: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'right',
  },

  // Gourd Selector
  selectorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  gourdSelectorContent: {
    gap: 8,
    paddingVertical: 4,
  },
  gourdChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    gap: 6,
  },
  gourdChipIcon: {
    fontSize: 16,
  },
  gourdChipText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  gourdChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  chartSubMessage: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  peakBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 5,
    minHeight: 3,
  },
  barValue: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    fontWeight: '700',
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 9,
    color: theme.colors.text.secondary,
    marginTop: 6,
  },
  currentMonthLabel: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: theme.colors.text.secondary,
  },

  // Season Comparison
  comparisonCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  comparisonBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  wetBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.08)',
  },
  dryBox: {
    backgroundColor: 'rgba(243, 156, 18, 0.08)',
  },
  comparisonValue: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  comparisonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  comparisonSub: {
    fontSize: 11,
    color: theme.colors.text.secondary,
  },
  comparisonVs: {
    width: 30,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BDBDBD',
  },
  verdictBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 12,
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 10,
  },
  verdictText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 19,
  },

  // Key Stats
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statItem: {
    width: (SCREEN_WIDTH - 32 - 32 - 10) / 2,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipsIcon: {
    fontSize: 32,
  },
  tipsSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  tipsInfoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tipsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  tipsMetaText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  pollinationAdvice: {
    backgroundColor: `${theme.colors.primary}08`,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  pollinationAdviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pollinationAdviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  pollinationAdviceText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 19,
  },
  tipsList: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  tipBulletText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 19,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  infoPillText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },

  // No Data
  noDataCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 32,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  noDataText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default SeasonalInsightsScreen;
