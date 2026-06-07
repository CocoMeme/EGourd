/**
 * ResultsScreen - Results screen for TM + Gemini combined analysis
 * Shows prediction results, quality metrics, harvest timeline, and charts
 * Handles loading state while analysis runs in background
 *
 * Replaces previous ResultsScreen and ResultsScreenTM
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { modelService, SCAN_MODES } from '../../services/modelService';
import { geminiService } from '../../services/geminiService';
import { scanService } from '../../services/scanService';
import { authService } from '../../services/authService';
import { guestStorageService } from '../../services/guestStorageService';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

// Variety colors
const VARIETY_COLORS = {
  'Bitter Gourd': '#27AE60',
  'Sponge Gourd': '#F39C12',
  'Bottle Gourd': '#3498DB',
  'Cucumber': '#8BC34A',
  'Squash': '#E67E22',
};

// Scientific names
const SCIENTIFIC_NAMES = {
  'Bitter Gourd': 'Momordica charantia',
  'Sponge Gourd': 'Luffa acutangula',
  'Bottle Gourd': 'Lagenaria siceraria',
  'Cucumber': 'Cucumis sativus',
  'Squash': 'Cucurbita moschata',
};

// Gender colors
const GENDER_COLORS = {
  male: '#4A90E2',
  female: '#E94B9E',
};

/**
 * Quality Metrics Bar Component
 */
const MetricBar = ({ label, value, color }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricBarContainer}>
      <View style={[styles.metricBar, { width: `${value || 0}%`, backgroundColor: color }]} />
    </View>
    <Text style={styles.metricValue}>{value || 0}%</Text>
  </View>
);

/**
 * Harvest Timeline Component (collapsible, collapsed by default)
 */
const HarvestTimeline = ({ data, backendData }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data && !backendData) return null;

  const stages = ['bud', 'blooming', 'peak_bloom', 'pollinated', 'fruiting', 'harvest'];
  const stageLabels = {
    bud: 'Bud',
    blooming: 'Blooming',
    peak_bloom: 'Peak',
    pollinated: 'Pollinated',
    fruiting: 'Fruiting',
    harvest: 'Harvest',
  };

  const currentStage = backendData?.currentStage || data?.currentStage;
  const currentIndex = stages.indexOf(currentStage);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: expanded ? 16 : 0 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Growth Timeline</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
      </TouchableOpacity>

      {expanded && (
        <>
          {currentStage && (
            <View style={styles.timeline}>
              {stages.map((stage, index) => (
                <View key={stage} style={styles.timelineStep}>
                  <View style={[
                    styles.timelineDot,
                    index <= currentIndex && styles.timelineDotActive,
                    index === currentIndex && styles.timelineDotCurrent,
                  ]}>
                    {index === currentIndex && (
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    )}
                  </View>
                  {index < stages.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      index < currentIndex && styles.timelineLineActive,
                    ]} />
                  )}
                  <Text style={[
                    styles.timelineLabel,
                    index <= currentIndex && styles.timelineLabelActive,
                    index === currentIndex && styles.timelineLabelCurrent,
                  ]}>
                    {stageLabels[stage]}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.harvestInfo}>
            <View style={styles.harvestRow}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.harvestText}>
                Harvest: <Text style={styles.harvestHighlight}>{backendData?.daysToHarvest || data?.daysToHarvest || '--'} days</Text>
              </Text>
            </View>

            {(backendData?.estimatedHarvestDate || data?.optimalHarvestWindow) && (
              <View style={styles.harvestRow}>
                <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.harvestText}>
                  Window: {backendData?.estimatedHarvestDate || data?.optimalHarvestWindow}
                </Text>
              </View>
            )}

            {backendData?.rationale && (
              <View style={styles.rationaleContainer}>
                <Text style={styles.rationaleTitle}>Rationale:</Text>
                <Text style={styles.rationaleText}>{backendData.rationale}</Text>
              </View>
            )}

            {backendData?.recommendations?.length > 0 && (
              <View style={styles.backendRecsContainer}>
                <Text style={styles.rationaleTitle}>AI Recommendations:</Text>
                {backendData.recommendations.map((rec, i) => (
                  <Text key={i} style={styles.backendRecItem}>• {rec}</Text>
                ))}
              </View>
            )}

            {data?.pollinationReady && (
              <View style={[styles.harvestRow, styles.pollinationReady]}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={[styles.harvestText, { color: '#4CAF50' }]}>
                  Ready for pollination! Best time: {data.bestPollinationTime}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
};

/**
 * Quality Metrics Chart Component
 */
const getScoreColor = (score) => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#8BC34A';
  if (score >= 40) return '#FFEB3B';
  if (score >= 20) return '#FF9800';
  return '#F44336';
};

/**
 * Animated Metric Bar Component
 */
const AnimatedMetricBar = ({ label, value }) => {
  // Normalize: Gemini sometimes returns 0-1 floats instead of 0-100 integers
  const normalizedValue = value != null && value > 0 && value <= 1
    ? Math.round(value * 100)
    : Math.round(value || 0);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: normalizedValue,
      duration: 1000,
      delay: 300,
      useNativeDriver: false, // width doesn't support native driver
    }).start();
  }, [normalizedValue]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      {/* Label on left, fixed width */}
      <Text style={{ width: 90, fontSize: 13, color: '#555', fontWeight: '500', textAlign: 'right', marginRight: 12 }}>
        {label}
      </Text>

      {/* Bar Container - Longer width */}
      <View style={{ flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' }}>
        <Animated.View style={{
          width: animatedWidth.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          height: '100%',
          backgroundColor: getScoreColor(normalizedValue),
          borderRadius: 5,
        }} />
      </View>

      {/* Value on right */}
      <Text style={{ width: 35, fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'right', marginLeft: 8 }}>
        {normalizedValue}
      </Text>
    </View>
  );
};

/**
 * Quality Metrics Chart Component (collapsible, collapsed by default)
 */
const QualityMetricsChart = ({ metrics }) => {
  const [expanded, setExpanded] = useState(false);
  if (!metrics) return null;

  const metricsList = [
    { label: 'Petal Quality', value: metrics.petalQuality },
    { label: 'Color Score', value: metrics.colorScore },
    { label: 'Development', value: metrics.developmentScore },
    { label: 'Health Score', value: metrics.healthScore },
    { label: 'Pollination', value: metrics.pollinationPotential },
  ];

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: expanded ? 16 : 0 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Quality Metrics</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
      </TouchableOpacity>
      {expanded && (
        <View style={{ paddingVertical: 10 }}>
          {metricsList.map((metric, i) => (
            <AnimatedMetricBar
              key={i}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Flower Quality Card Component with Animated Donut
 */
const FlowerQualityCard = ({ quality }) => {
  if (!quality) return null;

  const animatedScore = useRef(new Animated.Value(0)).current;
  const rawScore = quality.overallScore || 0;
  // Normalize: Gemini sometimes returns 0-1 floats instead of 0-100 integers
  const score = rawScore > 0 && rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);

  useEffect(() => {
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1500,
      delay: 500,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const scoreColor = getScoreColor(score);

  // Rotation logic for semi-circles
  // Right half stays at 0deg if score > 50, else rotates from -180 to 0
  const rightRotate = animatedScore.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '0deg', '0deg'],
  });

  // Left half stays at -180deg if score < 50, else rotates from -180 to 0
  const leftRotate = animatedScore.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '-180deg', '0deg'],
  });

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Flower Quality</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Donut Chart Simulation (Left) */}
        <View style={{ alignItems: 'center', width: '40%' }}>
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
            backgroundColor: '#F5F5F5',
            position: 'relative',
          }}>
            {/* Background/Track */}
            <View style={{ position: 'absolute', width: '100%', height: '100%', borderWidth: 10, borderColor: '#E0E0E0', borderRadius: 50 }} />

            {/* Right Half Container */}
            <View style={{ position: 'absolute', width: 50, height: 100, right: 0, top: 0, overflow: 'hidden' }}>
              <Animated.View style={{
                width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: scoreColor,
                position: 'absolute', right: 0, top: 0,
                transform: [{ translateX: 0 }, { rotate: rightRotate }],
              }} />
            </View>

            {/* Left Half Container */}
            <View style={{ position: 'absolute', width: 50, height: 100, left: 0, top: 0, overflow: 'hidden' }}>
              <Animated.View style={{
                width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: scoreColor,
                position: 'absolute', left: 0, top: 0,
                transform: [{ translateX: 0 }, { rotate: leftRotate }],
              }} />
            </View>

            {/* Inner White Circle (The "Hole") */}
            <View style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#333' }}>{score}</Text>
              <Text style={{ fontSize: 8, color: '#888', textTransform: 'uppercase' }}>Score</Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: scoreColor, textAlign: 'center' }}>
            {quality.petalCondition?.toUpperCase() || 'UNKNOWN'}
          </Text>
          <Text style={{ fontSize: 10, color: '#666' }}>Overall Condition</Text>
        </View>

        {/* Details (Right) */}
        <View style={{ marginLeft: 24, flex: 1 }}>
          <View style={{ backgroundColor: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Size Assessment</Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: '#333' }}>{quality.sizeAssessment}</Text>
          </View>

          {quality.healthIndicators?.length > 0 && (
            <View style={{ backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#4CAF50', marginBottom: 4 }}>Health Indicators</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {quality.healthIndicators.map((ind, i) => (
                  <Text key={i} style={{ fontSize: 12, fontWeight: '500', color: '#2E7D32' }}>• {ind}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Observations Card Component
 */
const ObservationsCard = ({ observations }) => {
  if (!observations) return null;
  const [expanded, setExpanded] = useState(false); // Collapsed by default

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: expanded ? 16 : 0 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>AI Reasoning</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
      </TouchableOpacity>

      {expanded && (
        <View style={{ gap: 12 }}>
          {observations.strengths?.length > 0 && (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#4CAF50', marginHorizontal: 0, marginBottom: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="thumbs-up" size={18} color="#4CAF50" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 }}>Strengths</Text>
              </View>
              {observations.strengths.map((item, i) => (
                <Text key={i} style={{ fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 }}>• {item}</Text>
              ))}
            </View>
          )}

          {observations.concerns?.length > 0 && (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#FF9800', marginHorizontal: 0, marginBottom: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="warning" size={18} color="#FF9800" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 }}>Concerns</Text>
              </View>
              {observations.concerns.map((item, i) => (
                <Text key={i} style={{ fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 }}>• {item}</Text>
              ))}
            </View>
          )}

          {observations.recommendations?.length > 0 && (
            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#2196F3', marginHorizontal: 0, marginBottom: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="bulb" size={18} color="#2196F3" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 }}>Recommendations</Text>
              </View>
              {observations.recommendations.map((item, i) => (
                <Text key={i} style={{ fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 }}>• {item}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Circular Progress Ring — pure RN, no SVG dependency
 */
const CircularProgress = ({ value, color, size = 60, backgroundColor = '#FFF', children }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: clamped,
      duration: 1000,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, [clamped]);

  const bw = Math.max(5, Math.round(size * 0.09));
  const innerSize = size - bw * 2;

  const rightRotate = animatedProgress.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '0deg', '0deg'],
  });
  const leftRotate = animatedProgress.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '-180deg', '0deg'],
  });

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, justifyContent: 'center', alignItems: 'center' }}>
      {/* Track */}
      <View style={{ position: 'absolute', width: size, height: size, borderWidth: bw, borderColor: '#E8E8E8', borderRadius: size / 2 }} />
      {/* Right half */}
      <View style={{ position: 'absolute', width: size / 2, height: size, right: 0, overflow: 'hidden' }}>
        <Animated.View style={{
          width: size, height: size, borderRadius: size / 2, borderWidth: bw, borderColor: color,
          position: 'absolute', right: 0,
          transform: [{ rotate: rightRotate }],
        }} />
      </View>
      {/* Left half */}
      <View style={{ position: 'absolute', width: size / 2, height: size, left: 0, overflow: 'hidden' }}>
        <Animated.View style={{
          width: size, height: size, borderRadius: size / 2, borderWidth: bw, borderColor: color,
          position: 'absolute', left: 0,
          transform: [{ rotate: leftRotate }],
        }} />
      </View>
      {/* Inner circle */}
      <View style={{ width: innerSize, height: innerSize, borderRadius: innerSize / 2, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
};

/**
 * Final Verdict Card — Gemini-only display with circular progress ring
 */
const FinalVerdictCard = ({ geminiPrediction, isGeminiLoading }) => {
  const geminiConfidence = Math.round(geminiPrediction?.confidence || 0);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' }}>Gemini AI</Text>
      {geminiPrediction ? (
        <CircularProgress value={geminiConfidence} color="#9C27B0" size={70}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#9C27B0' }}>{geminiConfidence}%</Text>
        </CircularProgress>
      ) : isGeminiLoading ? (
        <SkeletonLoader width={70} height={70} style={{ borderRadius: 35 }} />
      ) : (
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#E8E8E8' }}>
          <Text style={{ fontSize: 14, color: '#CCC' }}>--</Text>
        </View>
      )}
    </View>
  );
};

/**
 * Skeleton Loader Component for loading states
 */
const SkeletonLoader = ({ width = '100%', height = 20, style = {} }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[{
        width,
        height,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        opacity,
      }, style]}
    />
  );
};

/**
 * Skeleton Card Component for section loading
 */
const SkeletonCard = ({ title, lines = 3 }) => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.header}>
      <Text style={skeletonStyles.title}>{title}</Text>
      <ActivityIndicator size="small" color={theme.colors.primary} />
    </View>
    <View style={skeletonStyles.content}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={12}
          style={{ marginBottom: i < lines - 1 ? 12 : 0 }}
        />
      ))}
    </View>
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 6,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    gap: 8,
  },
});

/**
 * Main Results Screen Component
 */
export const FlowerPredictionScreen = ({ route, navigation }) => {
  const { isGuest } = useAuth();
  // Logic Preservation: Retrieve width and height to pass to model service for distortion fix
  const { imageUri, isLoading: initialLoading, width, height, scanMode = SCAN_MODES.FLOWER } = route.params ?? {};
  const isLeafMode = scanMode === SCAN_MODES.LEAF;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Loading and analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(initialLoading || false);
  const [isTmComplete, setIsTmComplete] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [analysisError, setAnalysisError] = useState(null);

  // Results state
  const [tmPrediction, setTmPrediction] = useState(route.params.tmPrediction || null);
  const [geminiPrediction, setGeminiPrediction] = useState(route.params.geminiPrediction || null);
  const [comparisonResult, setComparisonResult] = useState(route.params.comparisonResult || null);
  const [prediction, setPrediction] = useState(route.params.prediction || null);
  const [backendPrediction, setBackendPrediction] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [savedScanId, setSavedScanId] = useState(null);

  const [imageLoading, setImageLoading] = useState(true);

  // Animation for loading
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    if (route.params?.returnTo) {
      navigation.navigate(route.params.returnTo);
    } else {
      navigation.goBack();
    }
  };

  const handleScanAgain = () => {
    // If we came from Home (or other non-camera tab), we should switch to Camera tab
    if (route.params?.returnTo && route.params?.returnTo !== 'CameraMain') {
      navigation.navigate('Camera', { screen: 'CameraMain' });
    } else {
      navigation.goBack();
    }
  };

  /**
   * Retry Gemini AI analysis
   * Called when user taps retry button after Gemini failed
   */
  const handleRetryGemini = async () => {
    if (!tmPrediction || tmPrediction.isNotFlower || isGeminiLoading) return;

    console.log('🔄 Retrying Gemini analysis...');
    setIsGeminiLoading(true);
    setLoadingStage('Retrying Gemini AI analysis...');

    let geminiPred = null;
    let comparison = null;

    try {
      await geminiService.initialize();

      if (geminiService.isAvailable()) {
        geminiPred = await geminiService.analyzeFlower(imageUri, tmPrediction);
        if (!isMounted.current) return;

        if (geminiPred) {
          console.log('✅ Gemini retry successful!');
          setGeminiPrediction(geminiPred);

          // Compare predictions
          comparison = geminiService.comparePredictions(tmPrediction, geminiPred);
          setComparisonResult(comparison);

          // Update final prediction
          setPrediction(geminiPred);
        }
      }
    } catch (error) {
      console.warn('⚠️ Gemini retry failed:', error.message);
      if (isMounted.current) Alert.alert(
        'AI Analysis Unavailable',
        'The Gemini AI service is temporarily unavailable. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      if (isMounted.current) setIsGeminiLoading(false);
    }

    // Also retry backend harvest prediction if Gemini succeeded
    const finalPred = geminiPred || tmPrediction;
    if (finalPred && !finalPred.isNotFlower) {
      try {
        const bPrediction = await scanService.getHarvestPrediction(
          {
            prediction: finalPred.gender,
            variety: finalPred.variety,
            confidence: finalPred.confidence
          },
          { date: new Date().toISOString() }
        );
        if (!isMounted.current) return;
        setBackendPrediction(bPrediction);
      } catch (backendError) {
        console.warn('⚠️ Backend harvest prediction failed:', backendError.message);
      }
    }
  };

  // Handler: Save scan to backend
  const handleSave = async () => {
    if (!prediction) return;
    setIsSaving(true);
    try {
      // Determine if harvest data should be saved (only for female flowers)
      const isFemale = prediction.gender === 'female';
      const harvestData = isFemale ? backendPrediction : null;

      console.log('💾 Saving scan:', {
        gender: prediction.gender,
        isFemale,
        hasBackendPrediction: !!backendPrediction,
        backendPredictionData: backendPrediction,
        willSaveHarvest: !!harvestData
      });

      // Construct payload compatible with backend
      const scanData = {
        prediction: prediction.gender || 'unknown',
        confidence: prediction.confidence || 0,
        scanType: isLeafMode ? 'leaf' : 'flower', // Important: Set scan type for analytics

        // Extended data
        variety: prediction.variety || null,
        validationStatus: hasGeminiData ? 'validated' : 'tflite_only',

        aiPrediction: {
          finalSource: hasGeminiData ? 'gemini' : 'tflite',
          tflite: {
            variety: tmPrediction?.variety,
            gender: tmPrediction?.gender,
            confidence: tmPrediction?.confidence,
            modelType: tmPrediction?.modelType,
            processingTime: tmPrediction?.processingTime,
          },
          gemini: geminiPrediction ? {
            variety: geminiPrediction.variety,
            gender: geminiPrediction.gender,
            confidence: geminiPrediction.confidence,
            reasoning: geminiPrediction.geminiData?.reasoning,
            keyFeatures: geminiPrediction.geminiData?.keyFeatures || [],
            modelVersion: geminiPrediction.modelVersion || 'gemini-2.5-flash',
            processingTime: geminiPrediction.processingTime,
            // Extended Gemini analysis data
            flowerQuality: geminiPrediction.geminiData?.flowerQuality,
            // Only save Gemini's harvest prediction for female flowers
            harvestPrediction: isFemale ? geminiPrediction.geminiData?.harvestPrediction : null,
            qualityMetrics: geminiPrediction.geminiData?.qualityMetrics,
            observations: geminiPrediction.geminiData?.observations,
          } : null,
          // Backend-specific harvest prediction (only for female flowers)
          ...(isFemale && harvestData ? { harvestPrediction: harvestData } : {}),
          comparison: comparisonResult ? {
            modelsAgree: comparisonResult.agree,
            varietyMatch: comparisonResult.varietyMatch,
            genderMatch: comparisonResult.genderMatch,
            confidenceGap: comparisonResult.confidenceGap,
            recommendation: comparisonResult.recommendation,
          } : null,
        }
      };

      if (isGuest) {
        await guestStorageService.saveLocalScan(scanData, imageUri);
        if (!isMounted.current) return;
        Alert.alert(
          'Saved Locally! 🎉',
          'Scan saved on your device. Sign in to sync it to your account.',
          [{ text: 'OK', onPress: () => handleBack() }]
        );
      } else {
        const savedScan = await scanService.saveScan(scanData, imageUri);
        if (!isMounted.current) return;
        const user = await authService.getCurrentUser();
        
        if (user?.preferences?.geminiEmbeddingEnabled) {
          setSavedScanId(savedScan?.scan?._id || savedScan?._id);
          setShowFeedbackModal(true);
        } else {
          Alert.alert(
            'Success! 🎉',
            'Scan saved to your history!',
            [{ text: 'OK', onPress: () => handleBack() }]
          );
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Save Failed', 'Failed to save scan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      await authService.authenticatedRequest(`/scans/${savedScanId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedbackData)
      });
      setShowFeedbackModal(false);
      Alert.alert('Success! 🎉', 'Scan and feedback saved to your history!', [{ text: 'OK', onPress: () => handleBack() }]);
    } catch (e) {
      console.error('Failed to save feedback:', e);
      setShowFeedbackModal(false);
      Alert.alert('Feedback Failed', 'Scan was saved but feedback could not be submitted. Please try again later.', [{ text: 'OK', onPress: () => handleBack() }]);
    }
  };

  // Helper functions
  const getVarietyFromLabel = (label) => {
    if (!label) return null;

    // Leaf mode: extract variety from leaf labels
    if (isLeafMode) {
      if (label.includes('Ampalaya')) return 'Bitter Gourd';
      if (label.includes('Patola')) return 'Sponge Gourd';
      if (label.includes('Upo')) return 'Bottle Gourd';
      if (label.includes('Kalabasa')) return 'Squash';
      if (label.includes('Pipino')) return 'Cucumber';
      return label.replace(' Leaves', ''); // Fallback: remove " Leaves" suffix
    }

    // Flower mode
    if (label.includes('Ampalaya')) return 'Bitter Gourd';
    if (label.includes('Patola')) return 'Sponge Gourd';
    if (label.includes('Upo')) return 'Bottle Gourd';
    if (label.includes('Cucumber')) return 'Cucumber';
    if (label === 'Not Flower') return null;
    return null;
  };

  const getGenderFromLabel = (label) => {
    if (!label) return 'unknown';
    // Leaf mode: no gender
    if (isLeafMode) return 'n/a';
    // Flower mode
    if (label.includes('Male')) return 'male';
    if (label.includes('Female')) return 'female';
    return 'unknown';
  };

  // Sync state when route params change (important for navigation from history)
  useEffect(() => {
    // Check if we received pre-computed prediction from Developer Mode (multi-run format)
    if (route.params.tmPrediction && route.params.tmPrediction.runs) {
      console.log('🔬 [DEV MODE] Using pre-computed prediction from CameraScreen.test');
      const preComputed = route.params.tmPrediction;

      const tmPred = {
        variety: getVarietyFromLabel(preComputed.topPrediction.label),
        gender: getGenderFromLabel(preComputed.topPrediction.label),
        confidence: preComputed.topPrediction.percentage,
        rawScore: preComputed.topPrediction.probability,
        label: preComputed.topPrediction.label,
        isNotFlower: preComputed.topPrediction.label === 'Not Flower',
        allPredictions: preComputed.predictions,
        source: 'tflite',
        modelType: `Teachable Machine (Flower) - ${preComputed.runs} runs averaged`,
        processingTime: preComputed.processingTime,
      };

      setTmPrediction(tmPred);
      setPrediction(tmPred);
      setIsTmComplete(true);
      setIsAnalyzing(false);
      setIsGeminiLoading(false);
      setAnalysisError(null);
      setBackendPrediction(null);

      // Fade in results
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Still run Gemini analysis if available
      if (geminiService.isAvailable() && !tmPred.isNotFlower) {
        runGeminiAnalysisOnly(tmPred);
      }
      return;
    }

    // Original logic - no dev mode check needed anymore
    // Update all states from route params
    setTmPrediction(route.params.tmPrediction || null);
    setGeminiPrediction(route.params.geminiPrediction || null);
    setComparisonResult(route.params.comparisonResult || null);
    setPrediction(route.params.prediction || null);
    setIsAnalyzing(route.params.isLoading || false);
    setIsTmComplete(!!route.params.tmPrediction);
    setIsGeminiLoading(false);
    setAnalysisError(null);
    setBackendPrediction(null);

    // Reset fade animation
    fadeAnim.setValue(0);

    if (route.params.isLoading && route.params.imageUri) {
      runAnalysis();
    } else {
      // Fade in results immediately if already loaded
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [route.params.imageUri, route.params.scanId]); // Re-run when image or scan ID changes

  // Spin animation for loading (works for both TM and Gemini loading)
  useEffect(() => {
    if (isAnalyzing || isGeminiLoading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isAnalyzing, isGeminiLoading]);

  // Update loading message if analysis takes a while (e.g. waking up server or switching API keys)
  useEffect(() => {
    let timer;
    if (isAnalyzing) {
      timer = setTimeout(() => {
        setLoadingStage((prev) =>
          prev === 'Complete!' ? prev : 'Optimizing results (taking a bit longer)...'
        );
      }, 12000); // 12 seconds
    }
    return () => clearTimeout(timer);
  }, [isAnalyzing]);

  /**
   * Run TM + Gemini analysis
   * TM results are shown immediately, Gemini runs in background
   */
  const runAnalysis = async () => {
    let tmPred = null;

    try {
      setIsAnalyzing(true);
      setIsTmComplete(false);
      setIsGeminiLoading(false);
      setAnalysisError(null);

      // Step 1: TM Model Prediction (Show immediately when done)
      setLoadingStage('Analyzing with TM model...');
      console.log('🤖 Running TM prediction...');

      // Logic Preservation: Pass width and height to fix aspect ratio distortion
      const tmResult = await modelService.quickPredict(imageUri, width, height);
      if (!isMounted.current) return;
      const topTmPrediction = tmResult.topPrediction;

      // DEBUG: Detailed TM prediction logging
      console.log('🟡 ====== TM PREDICTION IN RESULTS ======');
      console.log('🟡 Image URI:', imageUri.slice(-40));
      console.log('🟡 Top Prediction:', topTmPrediction.label, `(${topTmPrediction.percentage.toFixed(1)}%)`);
      console.log('🟡 All Predictions:');
      tmResult.predictions.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.label}: ${p.percentage.toFixed(1)}%`);
      });
      console.log('🟡 ======================================');

      tmPred = {
        variety: getVarietyFromLabel(topTmPrediction.label),
        gender: getGenderFromLabel(topTmPrediction.label),
        confidence: topTmPrediction.percentage,
        rawScore: topTmPrediction.probability,
        label: topTmPrediction.label,
        isNotFlower: topTmPrediction.label === 'Not Flower',
        allPredictions: tmResult.predictions,
        source: 'tflite',
        modelType: isLeafMode ? 'Teachable Machine (Leaf)' : 'Teachable Machine (Flower)',
        processingTime: tmResult.processingTime,
        scanMode: scanMode, // Track scan mode in prediction
      };

      // Show TM results immediately
      setTmPrediction(tmPred);
      setPrediction({ ...tmPred, geminiData: null });
      setIsTmComplete(true);
      setIsAnalyzing(false); // Stop main loading, show TM results

      // Fade in TM results
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Skip Gemini if not a flower OR if in leaf mode (Gemini is flower-specific)
      if (tmPred.isNotFlower || isLeafMode) {
        console.log(`⏭️ Skipping Gemini - ${isLeafMode ? 'Leaf mode' : 'Not a flower detected'}`);
        return;
      }

      // Step 2: Gemini AI Analysis (runs in background)
      setIsGeminiLoading(true);
      setLoadingStage('Running Gemini AI analysis...');

      let geminiPred = null;
      let comparison = null;

      try {
        console.log('🌐 Initializing Gemini...');
        await geminiService.initialize();

        if (geminiService.isAvailable()) {
          console.log('🔍 Running Gemini analysis...');
          // Logic Preservation: Pass tmPred to give context to Gemini (Conflict Resolution Fix)
          geminiPred = await geminiService.analyzeFlower(imageUri, tmPred);
          if (!isMounted.current) return;

          // DEBUG: Detailed Gemini prediction logging
          console.log('🟣 ====== GEMINI PREDICTION ======');
          if (geminiPred) {
            console.log('🟣 Variety:', geminiPred.variety);
            console.log('🟣 Gender:', geminiPred.gender);
            console.log('🟣 Confidence:', geminiPred.confidence + '%');
            console.log('🟣 Is Not Flower:', geminiPred.isNotFlower);
            console.log('🟣 Reasoning:', geminiPred.geminiData?.reasoning?.slice(0, 100) + '...');
          }
          console.log('🟣 ================================');
          setGeminiPrediction(geminiPred);

          // Compare predictions if both available
          if (geminiPred && !tmPred.isNotFlower) {
            comparison = geminiService.comparePredictions(tmPred, geminiPred);
            console.log('📊 Comparison result:', comparison);
            setComparisonResult(comparison);
          }

          // Update final prediction with Gemini data
          if (geminiPred) {
            setPrediction(geminiPred);
          }
        } else {
          console.log('⚠️ Gemini not available, using TM only');
        }
      } catch (geminiError) {
        console.warn('⚠️ Gemini analysis failed:', geminiError.message);
        // Continue with TM prediction only - already shown
      } finally {
        if (isMounted.current) setIsGeminiLoading(false);
      }

      // Step 3: Backend Harvest Prediction (Enhanced)
      const finalPred = geminiPred || tmPred;
      if (finalPred && !finalPred.isNotFlower) {
        try {
          setLoadingStage('Refining harvest prediction...');
          const bPrediction = await scanService.getHarvestPrediction(
            {
              prediction: finalPred.gender,
              variety: finalPred.variety,
              confidence: finalPred.confidence
            },
            {
              date: new Date().toISOString(),
            }
          );
          if (!isMounted.current) return;
          setBackendPrediction(bPrediction);
        } catch (backendError) {
          console.warn('⚠️ Backend harvest prediction failed:', backendError.message);
        }
      }

      setLoadingStage('Complete!');

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setAnalysisError(error.message);
      setIsAnalyzing(false);
      setIsGeminiLoading(false);
    }
  };

  /**
   * Run Gemini analysis only (for Dev Mode where TM is pre-computed)
   */
  const runGeminiAnalysisOnly = async (tmPred) => {
    setIsGeminiLoading(true);
    setLoadingStage('Validating with AI...');
    console.log('🤖 Running Gemini flower analysis...');

    try {
      const geminiPred = await geminiService.analyzeFlower(imageUri, tmPred);
      if (!isMounted.current) return;
      console.log('✅ Gemini Flower Analysis complete');

      if (geminiPred) {
        setGeminiPrediction(geminiPred);

        // Compare predictions
        const comparison = geminiService.comparePredictions(tmPred, geminiPred);
        setComparisonResult(comparison);

        // Update final prediction with Gemini data
        setPrediction(geminiPred);
      }

      // Backend harvest prediction
      const finalPred = geminiPred || tmPred;
      if (finalPred && !finalPred.isNotFlower) {
        try {
          setLoadingStage('Refining harvest prediction...');
          const bPrediction = await scanService.getHarvestPrediction(
            {
              prediction: finalPred.gender,
              variety: finalPred.variety,
              confidence: finalPred.confidence
            },
            { date: new Date().toISOString() }
          );
          if (!isMounted.current) return;
          setBackendPrediction(bPrediction);
        } catch (backendError) {
          console.warn('⚠️ Backend harvest prediction failed:', backendError.message);
        }
      }
    } catch (geminiError) {
      console.error('❌ Gemini flower analysis failed:', geminiError);
    } finally {
      if (isMounted.current) setIsGeminiLoading(false);
    }
  };

  const geminiData = geminiPrediction?.geminiData;
  const hasGeminiData = !!geminiData;

  // Get color based on variety
  const varietyColor = VARIETY_COLORS[prediction?.variety] || theme.colors.primary;
  const genderColor = GENDER_COLORS[prediction?.gender] || '#9E9E9E';

  // Determine display values
  const displayVariety = prediction?.variety || tmPrediction?.variety || 'Unknown';
  const displayGender = prediction?.gender || tmPrediction?.gender || 'unknown';
  const isNotFlower = prediction?.isNotFlower || tmPrediction?.isNotFlower;

  // Spin interpolation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header using CustomHeader for consistency */}
      <CustomHeader
        variant="results"
        title="Scan Results"
        onBackPress={handleBack}
        rightComponent={() => {
          if (isGeminiLoading) {
            return (
              <View style={[styles.aiBadge, { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }]}>
                <ActivityIndicator size={12} color="#1976D2" />
                <Text style={[styles.aiBadgeText, { color: '#1976D2' }]}>AI</Text>
              </View>
            );
          }
          if (hasGeminiData) {
            return (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={14} color="#FFB300" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            );
          }
          return null;
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageLoading && (
            <ActivityIndicator size="large" color="#FFF" style={styles.imageLoader} />
          )}
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            onLoadEnd={() => setImageLoading(false)}
          />

          {/* Loading Overlay on Image */}
          {isAnalyzing && (
            <View style={styles.loadingOverlay}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="sync" size={48} color="#FFF" />
              </Animated.View>
              <Text style={styles.loadingText}>{loadingStage}</Text>
            </View>
          )}
        </View>

        {/* Error State */}
        {analysisError && !isAnalyzing && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorText}>{analysisError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={runAnalysis}>
              <Ionicons name="refresh" size={20} color="#FFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State - Show placeholder cards */}
        {isAnalyzing && (
          <Animated.View style={[styles.loadingContainer, { opacity: 1 }]}>
            <View style={[styles.mainResultCard, styles.loadingCard]}>
              <View style={styles.loadingContent}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingStageText}>{loadingStage}</Text>
                <Text style={styles.loadingSubtext}>Please wait while we analyze your flower...</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Results Content - Show when TM is complete (even if Gemini is still loading) */}
        {isTmComplete && !analysisError && prediction && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Main Result Card */}
            <View style={styles.mainResultCard}>
              {isNotFlower ? (
                <View style={styles.notFlowerResult}>
                  <Ionicons name="close-circle" size={64} color="#F44336" />
                  <Text style={styles.notFlowerText}>Not a Gourd Flower</Text>
                  <Text style={styles.notFlowerSubtext}>
                    The image doesn't appear to be a gourd flower. Try capturing a clearer image of the flower.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 100, alignItems: 'center', paddingRight: 8 }}>
                    {isGeminiLoading ? (
                      <>
                        <SkeletonLoader width={48} height={48} style={{ borderRadius: 24, marginBottom: 8 }} />
                        <SkeletonLoader width={80} height={14} style={{ borderRadius: 4, marginBottom: 4 }} />
                        <SkeletonLoader width={60} height={10} style={{ borderRadius: 4 }} />
                      </>
                    ) : (
                      <>
                        <View style={[styles.genderIcon, { backgroundColor: 'transparent', marginBottom: 8, marginRight: 0 }]}>
                          <Ionicons
                            name={displayGender === 'male' ? 'male' : 'female'}
                            size={40}
                            color={genderColor}
                          />
                        </View>
                        <Text style={[styles.varietyText, { textAlign: 'center', fontSize: 14 }]}>{displayVariety?.toUpperCase()}</Text>
                        {displayVariety && SCIENTIFIC_NAMES[displayVariety] && (
                          <Text style={{ fontSize: 10, color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 2 }}>
                            {SCIENTIFIC_NAMES[displayVariety]}
                          </Text>
                        )}
                      </>
                    )}
                  </View>

                  {/* Final Verdict */}
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' }}>
                    <FinalVerdictCard
                      geminiPrediction={geminiPrediction}
                      isGeminiLoading={isGeminiLoading}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Gemini Enhanced Data - Show when available */}
            {hasGeminiData && !isNotFlower && (
              <>
                {/* Harvest Timeline - Only for Female Flowers */}
                {prediction?.gender === 'female' && (
                  <HarvestTimeline
                    data={geminiData.harvestPrediction}
                    backendData={backendPrediction}
                  />
                )}

                {/* Quality Metrics Chart */}
                <QualityMetricsChart metrics={geminiData.qualityMetrics} genderColor={genderColor} />

                {/* Flower Quality Card */}
                <FlowerQualityCard quality={geminiData.flowerQuality} />

                {/* AI Observations */}
                <ObservationsCard observations={geminiData.observations} />

                {/* AI Reasoning */}
                {geminiData.reasoning && (
                  <View style={styles.card}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: reasoningExpanded ? 12 : 0 }}
                      onPress={() => setReasoningExpanded(!reasoningExpanded)}
                    >
                      <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>AI Reasoning</Text>
                      <Ionicons name={reasoningExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>

                    {reasoningExpanded && (
                      <View>
                        <Text style={styles.reasoningText}>{geminiData.reasoning}</Text>
                        {geminiData.keyFeatures?.length > 0 && (
                          <View style={styles.tagsContainer}>
                            {geminiData.keyFeatures.map((feature, i) => (
                              <View key={i} style={styles.featureTag}>
                                <Text style={styles.featureTagText}>{feature}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Skeleton — only on the Gemini AI Insights card while loading */}
            {isGeminiLoading && !isNotFlower && (
              <SkeletonCard title="AI Insights" lines={4} />
            )}

            {/* TM Only Notice - Show only when Gemini finished but no data */}
            {!hasGeminiData && !isGeminiLoading && !isNotFlower && (
              <View style={styles.tmOnlyNotice}>
                <View style={styles.tmOnlyContent}>
                  <Ionicons name="information-circle" size={24} color="#FF9800" />
                  <Text style={styles.tmOnlyText}>
                    Quick scan completed using TM model only. Gemini AI analysis was unavailable.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.retryGeminiButton}
                  onPress={handleRetryGemini}
                >
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retryGeminiText}>Retry AI</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.scanAgainButton]}
            onPress={handleScanAgain}
            disabled={isSaving}
          >
            <Ionicons name="camera" size={20} color="#FFF" />
            <Text style={styles.actionButtonText}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, (!isTmComplete || isSaving) && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={!isTmComplete || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFF" />
                <Text style={styles.actionButtonText}>Save Result</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },

  // AI Badge (used in CustomHeader rightComponent)
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  aiBadgeText: {
    color: '#F57C00',
    fontSize: 11,
    fontWeight: '700',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Image
  imageContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageLoader: {
    position: 'absolute',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // Changed to contain to see full image
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Light overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },

  // Loading Container
  loadingContainer: {
    padding: 16,
  },
  loadingCard: {
    borderLeftColor: theme.colors.primary,
    minHeight: 200,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingStageText: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Error Card
  errorCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 6,
    padding: 30,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Button disabled state
  buttonDisabled: {
    opacity: 0.5,
  },

  // Main Result Card
  mainResultCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 6,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resultTextContainer: {
    flex: 1,
  },
  varietyText: {
    color: '#333',
    fontSize: 24,
    fontWeight: '700',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },

  // Not Flower Result
  notFlowerResult: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  notFlowerText: {
    color: '#F44336',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  notFlowerSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },

  // Confidence Card
  confidenceCard: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confidenceTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confidenceLabel: {
    color: '#666',
    fontSize: 12,
    width: 70,
  },
  confidenceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    width: 45,
    textAlign: 'right',
  },
  agreementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  agreementText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 6,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  sectionTitle: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotActive: {
    backgroundColor: theme.colors.primary,
  },
  timelineDotCurrent: {
    backgroundColor: '#4CAF50',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  timelineLine: {
    position: 'absolute',
    top: 9,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: '#E0E0E0',
  },
  timelineLineActive: {
    backgroundColor: theme.colors.primary,
  },
  timelineLabel: {
    color: '#999999',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#555555',
    fontWeight: '600',
  },
  timelineLabelCurrent: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  harvestInfo: {
    gap: 8,
  },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  harvestText: {
    color: '#555555',
    fontSize: 14,
  },
  harvestHighlight: {
    color: '#333333',
    fontWeight: '700',
  },
  rationaleContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  rationaleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  rationaleText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  backendRecsContainer: {
    marginTop: 10,
  },
  backendRecItem: {
    fontSize: 13,
    color: '#555',
    marginBottom: 2,
  },
  pollinationReady: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },

  // Quality Metrics
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    color: '#555555',
    fontSize: 12,
    width: 110,
  },
  metricBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  metricBar: {
    height: '100%',
    borderRadius: 5,
  },
  metricValue: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },

  // Quality Grid
  qualityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qualityItem: {
    alignItems: 'center',
  },
  qualityScore: {
    color: '#333333',
    fontSize: 28,
    fontWeight: '700',
  },
  qualityCondition: {
    fontSize: 16,
    fontWeight: '600',
  },
  qualityLabel: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  healthIndicators: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  healthTitle: {
    color: '#555555',
    fontSize: 12,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  healthTagText: {
    color: '#4CAF50',
    fontSize: 12,
  },

  // Observations
  observationSection: {
    marginBottom: 16,
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  observationTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  observationItem: {
    color: '#555555',
    fontSize: 13,
    marginLeft: 24,
    marginBottom: 4,
    lineHeight: 20,
  },

  // Reasoning
  reasoningText: {
    color: '#444444',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  featureTag: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  featureTagText: {
    color: '#2196F3',
    fontSize: 12,
  },

  // TM Only Notice
  tmOnlyNotice: {
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 6,
    gap: 12,
  },
  tmOnlyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tmOnlyText: {
    flex: 1,
    color: '#E65100',
    fontSize: 13,
    lineHeight: 20,
  },
  retryGeminiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 6,
  },
  retryGeminiText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Action Buttons
  actionButtons: {
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  scanAgainButton: {
    backgroundColor: '#333333',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FlowerPredictionScreen;
