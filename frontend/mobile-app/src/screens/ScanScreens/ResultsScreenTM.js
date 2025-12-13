/**
 * ResultsScreenTM - Results screen for TM + Gemini combined analysis
 * Shows prediction results, quality metrics, harvest timeline, and charts
 * Handles loading state while analysis runs in background
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { modelServiceTM } from '../../services/modelServiceTM';
import { geminiService } from '../../services/geminiService';

const { width } = Dimensions.get('window');

// Variety colors
const VARIETY_COLORS = {
  'Ampalaya Bilog': '#27AE60',
  'Patola': '#F39C12',
  'Upo (Smooth)': '#3498DB',
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
 * Harvest Timeline Component
 */
const HarvestTimeline = ({ data }) => {
  if (!data) return null;

  const stages = ['bud', 'blooming', 'peak_bloom', 'pollinated', 'fruiting', 'harvest'];
  const stageLabels = {
    bud: 'Bud',
    blooming: 'Blooming',
    peak_bloom: 'Peak',
    pollinated: 'Pollinated',
    fruiting: 'Fruiting',
    harvest: 'Harvest',
  };

  const currentIndex = stages.indexOf(data.currentStage);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="time-outline" size={18} color="#FFF" /> Growth Timeline
      </Text>

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

      <View style={styles.harvestInfo}>
        <View style={styles.harvestRow}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.harvestText}>
            Est. harvest: <Text style={styles.harvestHighlight}>{data.daysToHarvest} days</Text>
          </Text>
        </View>
        <View style={styles.harvestRow}>
          <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.harvestText}>
            Window: {data.optimalHarvestWindow}
          </Text>
        </View>
        {data.pollinationReady && (
          <View style={[styles.harvestRow, styles.pollinationReady]}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={[styles.harvestText, { color: '#4CAF50' }]}>
              Ready for pollination! Best time: {data.bestPollinationTime}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * Quality Metrics Chart Component
 */
const QualityMetricsChart = ({ metrics }) => {
  if (!metrics) return null;

  const metricsList = [
    { label: 'Petal Quality', value: metrics.petalQuality, color: '#4CAF50' },
    { label: 'Color Score', value: metrics.colorScore, color: '#2196F3' },
    { label: 'Development', value: metrics.developmentScore, color: '#FF9800' },
    { label: 'Health Score', value: metrics.healthScore, color: '#E91E63' },
    { label: 'Pollination Potential', value: metrics.pollinationPotential, color: '#9C27B0' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="stats-chart" size={18} color="#FFF" /> Quality Metrics
      </Text>
      {metricsList.map((metric) => (
        <MetricBar key={metric.label} {...metric} />
      ))}
    </View>
  );
};

/**
 * Flower Quality Card Component
 */
const FlowerQualityCard = ({ quality }) => {
  if (!quality) return null;

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="flower" size={18} color="#FFF" /> Flower Quality
      </Text>

      <View style={styles.qualityGrid}>
        <View style={styles.qualityItem}>
          <Text style={styles.qualityScore}>{quality.overallScore}</Text>
          <Text style={styles.qualityLabel}>Overall Score</Text>
        </View>
        <View style={styles.qualityItem}>
          <Text style={[styles.qualityCondition, { color: getConditionColor(quality.petalCondition) }]}>
            {quality.petalCondition?.toUpperCase()}
          </Text>
          <Text style={styles.qualityLabel}>Petal Condition</Text>
        </View>
        <View style={styles.qualityItem}>
          <Text style={styles.qualityCondition}>{quality.sizeAssessment?.toUpperCase()}</Text>
          <Text style={styles.qualityLabel}>Size</Text>
        </View>
      </View>

      {quality.healthIndicators?.length > 0 && (
        <View style={styles.healthIndicators}>
          <Text style={styles.healthTitle}>Health Indicators:</Text>
          <View style={styles.tagsContainer}>
            {quality.healthIndicators.map((indicator, i) => (
              <View key={i} style={styles.healthTag}>
                <Text style={styles.healthTagText}>{indicator}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Observations Card Component
 */
const ObservationsCard = ({ observations }) => {
  if (!observations) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="eye" size={18} color="#FFF" /> AI Observations
      </Text>

      {observations.strengths?.length > 0 && (
        <View style={styles.observationSection}>
          <View style={styles.observationHeader}>
            <Ionicons name="thumbs-up" size={16} color="#4CAF50" />
            <Text style={[styles.observationTitle, { color: '#4CAF50' }]}>Strengths</Text>
          </View>
          {observations.strengths.map((item, i) => (
            <Text key={i} style={styles.observationItem}>• {item}</Text>
          ))}
        </View>
      )}

      {observations.concerns?.length > 0 && (
        <View style={styles.observationSection}>
          <View style={styles.observationHeader}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={[styles.observationTitle, { color: '#FF9800' }]}>Concerns</Text>
          </View>
          {observations.concerns.map((item, i) => (
            <Text key={i} style={styles.observationItem}>• {item}</Text>
          ))}
        </View>
      )}

      {observations.recommendations?.length > 0 && (
        <View style={styles.observationSection}>
          <View style={styles.observationHeader}>
            <Ionicons name="bulb" size={16} color="#2196F3" />
            <Text style={[styles.observationTitle, { color: '#2196F3' }]}>Recommendations</Text>
          </View>
          {observations.recommendations.map((item, i) => (
            <Text key={i} style={styles.observationItem}>• {item}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

/**
 * Confidence Comparison Component
 */
const ConfidenceComparison = ({ tmPrediction, geminiPrediction, comparisonResult }) => {
  return (
    <View style={styles.confidenceCard}>
      <Text style={styles.confidenceTitle}>Model Confidence</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>TM Model</Text>
        <View style={styles.confidenceBarBg}>
          <View style={[
            styles.confidenceBar,
            { width: `${tmPrediction?.confidence || 0}%`, backgroundColor: '#2196F3' }
          ]} />
        </View>
        <Text style={styles.confidenceValue}>{tmPrediction?.confidence?.toFixed(1)}%</Text>
      </View>

      {geminiPrediction && (
        <View style={styles.confidenceRow}>
          <Text style={styles.confidenceLabel}>Gemini AI</Text>
          <View style={styles.confidenceBarBg}>
            <View style={[
              styles.confidenceBar,
              { width: `${geminiPrediction.confidence}%`, backgroundColor: '#9C27B0' }
            ]} />
          </View>
          <Text style={styles.confidenceValue}>{geminiPrediction.confidence?.toFixed(1)}%</Text>
        </View>
      )}

      {comparisonResult && (
        <View style={[
          styles.agreementBadge,
          { backgroundColor: comparisonResult.agree ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 152, 0, 0.2)' }
        ]}>
          <Ionicons
            name={comparisonResult.agree ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={comparisonResult.agree ? '#4CAF50' : '#FF9800'}
          />
          <Text style={[
            styles.agreementText,
            { color: comparisonResult.agree ? '#4CAF50' : '#FF9800' }
          ]}>
            {comparisonResult.agree ? 'Models Agree ✓' : 'Models Differ - Review Recommended'}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * Main Results Screen Component
 */
export const ResultsScreenTM = ({ route, navigation }) => {
  // Logic Preservation: Retrieve width and height to pass to model service for distortion fix
  const { imageUri, isLoading: initialLoading, width, height } = route.params;

  // Loading and analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(initialLoading || false);
  const [loadingStage, setLoadingStage] = useState('Initializing...');
  const [analysisError, setAnalysisError] = useState(null);

  // Results state
  const [tmPrediction, setTmPrediction] = useState(route.params.tmPrediction || null);
  const [geminiPrediction, setGeminiPrediction] = useState(route.params.geminiPrediction || null);
  const [comparisonResult, setComparisonResult] = useState(route.params.comparisonResult || null);
  const [prediction, setPrediction] = useState(route.params.prediction || null);

  const [imageLoading, setImageLoading] = useState(true);

  // Animation for loading
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Helper functions
  const getVarietyFromLabel = (label) => {
    if (!label) return null;
    if (label.includes('Ampalaya')) return 'Ampalaya Bilog';
    if (label.includes('Patola')) return 'Patola';
    if (label.includes('Upo')) return 'Upo (Smooth)';
    if (label === 'Not Flower') return null;
    return null;
  };

  const getGenderFromLabel = (label) => {
    if (!label) return 'unknown';
    if (label.includes('Male')) return 'male';
    if (label.includes('Female')) return 'female';
    return 'unknown';
  };

  // Run analysis when screen loads (if in loading state)
  useEffect(() => {
    if (initialLoading && imageUri) {
      runAnalysis();
    } else {
      // Fade in results immediately if already loaded
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  // Spin animation for loading
  useEffect(() => {
    if (isAnalyzing) {
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
  }, [isAnalyzing]);

  /**
   * Run TM + Gemini analysis
   */
  const runAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      // Step 1: TM Model Prediction
      setLoadingStage('Analyzing with TM model...');
      console.log('🤖 Running TM prediction...');

      // Logic Preservation: Pass width and height to fix aspect ratio distortion
      const tmResult = await modelServiceTM.quickPredict(imageUri, width, height);
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

      const tmPred = {
        variety: getVarietyFromLabel(topTmPrediction.label),
        gender: getGenderFromLabel(topTmPrediction.label),
        confidence: topTmPrediction.percentage,
        rawScore: topTmPrediction.probability,
        label: topTmPrediction.label,
        isNotFlower: topTmPrediction.label === 'Not Flower',
        allPredictions: tmResult.predictions,
        source: 'tflite',
        modelType: 'Teachable Machine',
        processingTime: tmResult.processingTime,
      };
      setTmPrediction(tmPred);

      // Step 2: Gemini AI Analysis
      let geminiPred = null;
      let comparison = null;

      setLoadingStage('Running Gemini AI analysis...');

      try {
        console.log('🌐 Initializing Gemini...');
        await geminiService.initialize();

        if (geminiService.isAvailable()) {
          // Logic Preservation: Check confidence before analyzing to save quota (optional but recommended)
          // Since user said "keep all progress on logic", I will keep context passing logic

          console.log('🔍 Running Gemini analysis...');
          // Logic Preservation: Pass tmPred to give context to Gemini (Conflict Resolution Fix)
          geminiPred = await geminiService.analyzeFlower(imageUri, tmPred);

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
        } else {
          console.log('⚠️ Gemini not available, using TM only');
        }
      } catch (geminiError) {
        console.warn('⚠️ Gemini analysis failed:', geminiError.message);
        // Continue with TM prediction only
      }

      // Set final prediction
      const finalPred = geminiPred || {
        ...tmPred,
        geminiData: null,
      };
      setPrediction(finalPred);

      setLoadingStage('Complete!');

      // Fade in results
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('❌ Analysis failed:', error);
      setAnalysisError(error.message);
    } finally {
      setIsAnalyzing(false);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <View style={styles.headerRight}>
          {hasGeminiData && !isAnalyzing && (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={14} color="#FFD700" />
              <Text style={styles.aiBadgeText}>AI Enhanced</Text>
            </View>
          )}
        </View>
      </View>

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

        {/* Results Content - Only show when not loading and no error */}
        {!isAnalyzing && !analysisError && prediction && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Main Result Card */}
            <View style={[styles.mainResultCard, { borderLeftColor: varietyColor }]}>
              {isNotFlower ? (
                <View style={styles.notFlowerResult}>
                  <Ionicons name="close-circle" size={64} color="#F44336" />
                  <Text style={styles.notFlowerText}>Not a Gourd Flower</Text>
                  <Text style={styles.notFlowerSubtext}>
                    The image doesn't appear to be a gourd flower. Try capturing a clearer image of the flower.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.resultHeader}>
                    <View style={[styles.genderIcon, { backgroundColor: `${genderColor}20` }]}>
                      <Ionicons
                        name={displayGender === 'male' ? 'male' : 'female'}
                        size={40}
                        color={genderColor}
                      />
                    </View>
                    <View style={styles.resultTextContainer}>
                      <Text style={styles.varietyText}>{displayVariety}</Text>
                      <Text style={[styles.genderText, { color: genderColor }]}>
                        {displayGender.charAt(0).toUpperCase() + displayGender.slice(1)} Flower
                      </Text>
                    </View>
                  </View>

                  {/* Confidence Comparison */}
                  <ConfidenceComparison
                    tmPrediction={tmPrediction}
                    geminiPrediction={geminiPrediction}
                    comparisonResult={comparisonResult}
                  />
                </>
              )}
            </View>

            {/* Gemini Enhanced Data (only show if flower detected) */}
            {hasGeminiData && !isNotFlower && (
              <>
                {/* Harvest Timeline */}
                <HarvestTimeline data={geminiData.harvestPrediction} />

                {/* Quality Metrics Chart */}
                <QualityMetricsChart metrics={geminiData.qualityMetrics} />

                {/* Flower Quality Card */}
                <FlowerQualityCard quality={geminiData.flowerQuality} />

                {/* AI Observations */}
                <ObservationsCard observations={geminiData.observations} />

                {/* AI Reasoning */}
                {geminiData.reasoning && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>
                      <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" /> AI Reasoning
                    </Text>
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
              </>
            )}

            {/* TM Only Notice */}
            {!hasGeminiData && !isNotFlower && (
              <View style={styles.tmOnlyNotice}>
                <Ionicons name="information-circle" size={24} color="#FF9800" />
                <Text style={styles.tmOnlyText}>
                  Quick scan completed using TM model only. Gemini AI analysis was unavailable.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.scanAgainButton, isAnalyzing && styles.buttonDisabled]}
            onPress={() => navigation.goBack()}
            disabled={isAnalyzing}
          >
            <Ionicons name="camera" size={20} color="#FFF" />
            <Text style={styles.scanAgainText}>Scan Again</Text>
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
    backgroundColor: '#121212',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1E1E1E',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    minWidth: 100,
    alignItems: 'flex-end',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  // Image
  imageContainer: {
    width: width,
    height: width * 0.75,
    backgroundColor: '#000',
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
    resizeMode: 'cover',
  },

  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },

  // Loading Container
  loadingContainer: {
    padding: 16,
  },
  loadingCard: {
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    minHeight: 200,
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingStageText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },

  // Error Card
  errorCard: {
    backgroundColor: '#1E1E1E',
    margin: 16,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorTitle: {
    color: '#F44336',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.6)',
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
    backgroundColor: '#1E1E1E',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
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
    color: '#FFF',
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
    color: 'rgba(255,255,255,0.6)',
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
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  confidenceTitle: {
    color: 'rgba(255,255,255,0.6)',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    width: 70,
  },
  confidenceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    color: '#FFF',
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
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  timelineLineActive: {
    backgroundColor: theme.colors.primary,
  },
  timelineLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  timelineLabelCurrent: {
    color: '#4CAF50',
    fontWeight: '600',
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  harvestHighlight: {
    color: '#4CAF50',
    fontWeight: '600',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    width: 110,
  },
  metricBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  metricBar: {
    height: '100%',
    borderRadius: 5,
  },
  metricValue: {
    color: '#FFF',
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
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  qualityCondition: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  qualityLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  healthIndicators: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  healthTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthTag: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 24,
    marginBottom: 4,
    lineHeight: 20,
  },

  // Reasoning
  reasoningText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  featureTag: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tmOnlyText: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 20,
  },

  // Action Buttons
  actionButtons: {
    padding: 16,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
  },
  scanAgainText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResultsScreenTM;
