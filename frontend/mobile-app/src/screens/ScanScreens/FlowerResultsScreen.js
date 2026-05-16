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
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { modelService } from '../../services/modelService';
import { geminiService } from '../../services/geminiService';
import { scanService } from '../../services/scanService';
import CircularProgress from '../../components/ScanComponents/CircularProgress';

const { width } = Dimensions.get('window');

// Variety colors
const VARIETY_COLORS = {
  'Ampalaya Bilog': '#27AE60',
  'Patola': '#F39C12',
  'Upo (Smooth)': '#3498DB',
  'Cucumber': '#8BC34A',
  'Kalabasa': '#E67E22',
};

// Scientific names
const SCIENTIFIC_NAMES = {
  'Ampalaya Bilog': 'Momordica charantia',
  'Patola': 'Luffa acutangula',
  'Upo (Smooth)': 'Lagenaria siceraria',
  'Cucumber': 'Cucumis sativus',
  'Kalabasa': 'Cucurbita moschata',
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
      useNativeDriver: false,
    }).start();
  }, [normalizedValue]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <Text style={{ width: 90, fontSize: 13, color: '#555', fontWeight: '500', textAlign: 'right', marginRight: 12 }}>
        {label}
      </Text>
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
      <Text style={{ width: 35, fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'right', marginLeft: 8 }}>
        {normalizedValue}
      </Text>
    </View>
  );
};

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
  const rightRotate = animatedScore.interpolate({
    inputRange: [0, 50, 100],
    outputRange: ['-180deg', '0deg', '0deg'],
  });

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
                transform: [{ rotate: rightRotate }],
              }} />
            </View>

            {/* Left Half Container */}
            <View style={{ position: 'absolute', width: 50, height: 100, left: 0, top: 0, overflow: 'hidden' }}>
              <Animated.View style={{
                width: 100, height: 100, borderRadius: 50, borderWidth: 10, borderColor: scoreColor,
                position: 'absolute', left: 0, top: 0,
                transform: [{ rotate: leftRotate }],
              }} />
            </View>

            {/* Inner White Circle to make it a Donut */}
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

const ObservationsCard = ({ observations }) => {
  if (!observations) return null;
  const [expanded, setExpanded] = useState(false); // Collapsed by default

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: expanded ? 16 : 0 }}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Observations</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
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
 * Final Verdict Card — Gemini-only display with circular progress ring
 */
const FinalVerdictCard = ({ geminiPrediction }) => {
  const geminiConfidence = Math.round(geminiPrediction?.confidence || 0);
  const geminiLabel = geminiPrediction
    ? `${geminiPrediction.gender ? geminiPrediction.gender.charAt(0).toUpperCase() + geminiPrediction.gender.slice(1) + ' ' : ''}${geminiPrediction.variety || ''}`.trim()
    : null;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
      <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' }}>Gemini AI</Text>
      {geminiPrediction ? (
        <CircularProgress value={geminiConfidence} color="#9C27B0" size={70}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#9C27B0' }}>{geminiConfidence}%</Text>
        </CircularProgress>
      ) : (
        <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: '#E8E8E8' }}>
          <Text style={{ fontSize: 14, color: '#CCC' }}>--</Text>
        </View>
      )}
      {geminiLabel ? (
        <Text style={{ fontSize: 11, color: '#555', marginTop: 6, textAlign: 'center', fontWeight: '600' }} numberOfLines={2}>{geminiLabel}</Text>
      ) : null}
    </View>
  );
};

/**
 * Main Results Screen Component
 */
export const FlowerResultsScreen = ({ route, navigation }) => {
  // Mode: View (loading existing scan)
  const { scan } = route.params;

  // Local state for UI
  const [currentScan, setCurrentScan] = useState(scan || null);

  // Parsed state for UI components
  const [tmPrediction, setTmPrediction] = useState(null);
  const [geminiPrediction, setGeminiPrediction] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [prediction, setPrediction] = useState(null);
  // Backend prediction is now part of geminiPrediction structure or parsed directly
  const [backendPrediction, setBackendPrediction] = useState(null);

  // Rename & Menu State
  const [modalVisible, setModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [newName, setNewName] = useState(scan?.name || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const [imageLoading, setImageLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize Data from Scan
  useEffect(() => {
    if (currentScan) {
      // 1. TFLite Data
      if (currentScan.aiPrediction?.tflite) {
        setTmPrediction({
          ...currentScan.aiPrediction.tflite,
          source: 'tflite',
        });
      }

      // 2. Gemini Data
      if (currentScan.aiPrediction?.gemini) {
        const gData = currentScan.aiPrediction.gemini;
        setGeminiPrediction({
          ...gData,
          geminiData: { // Wrap nested data to match UI expectation
            reasoning: gData.reasoning,
            keyFeatures: gData.keyFeatures,
            flowerQuality: gData.flowerQuality,
            harvestPrediction: gData.harvestPrediction,
            qualityMetrics: gData.qualityMetrics,
            observations: gData.observations,
          },
        });
      }

      // 2b. Backend Harvest Prediction (stored separately from Gemini data)
      // Priority: Backend prediction > Gemini's harvest prediction (fallback)
      if (currentScan.aiPrediction?.harvestPrediction) {
        setBackendPrediction(currentScan.aiPrediction.harvestPrediction);
      } else if (currentScan.aiPrediction?.gemini?.harvestPrediction) {
        // Fallback to Gemini's harvest prediction if no backend prediction exists
        setBackendPrediction(currentScan.aiPrediction.gemini.harvestPrediction);
      }

      // 3. Comparison
      if (currentScan.aiPrediction?.comparison) {
        setComparisonResult({
          agree: currentScan.aiPrediction.comparison.modelsAgree,
          varietyMatch: currentScan.aiPrediction.comparison.varietyMatch,
          genderMatch: currentScan.aiPrediction.comparison.genderMatch,
          confidenceGap: currentScan.aiPrediction.comparison.confidenceGap,
          recommendedSource: currentScan.aiPrediction.comparison.recommendation,
        });
      }

      // 4. Main Prediction
      setPrediction({
        variety: currentScan.variety,
        gender: currentScan.prediction,
        confidence: currentScan.confidence,
        isNotFlower: currentScan.variety === null && (currentScan.prediction === 'unknown' || currentScan.prediction === 'not_flower'),
      });

      // Start fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [currentScan]);

  const handleBack = () => {
    navigation.goBack();
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await scanService.deleteScan(currentScan._id);
      setIsDeleting(false);
      setDeleteModalVisible(false);
      navigation.goBack();
    } catch (error) {
      setIsDeleting(false);
      Alert.alert("Error", "Failed to delete scan");
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    setIsRenaming(true);
    try {
      await scanService.updateScan(currentScan._id, { name: newName });
      setCurrentScan(prev => ({ ...prev, name: newName }));
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update name");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleOptionsPress = () => {
    setOptionsVisible(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Computed values
  const geminiData = geminiPrediction?.geminiData;
  const hasGeminiData = !!geminiData;

  // Get color based on variety
  const varietyColor = VARIETY_COLORS[prediction?.variety] || theme.colors.primary;
  const genderColor = GENDER_COLORS[prediction?.gender] || '#9E9E9E';

  // Determine display values
  const displayVariety = prediction?.variety || tmPrediction?.variety || 'Unknown';
  const displayGender = prediction?.gender || tmPrediction?.gender || 'unknown';
  const isNotFlower = prediction?.isNotFlower || tmPrediction?.isNotFlower;

  return (
    <View style={styles.container}>
      {/* Header using CustomHeader for consistency */}
      <CustomHeader
        variant="results"
        title={currentScan?.name || "Scan Result"}
        onBackPress={handleBack}
        rightComponent={() => (
          <TouchableOpacity onPress={handleOptionsPress} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        )}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageLoading && (
            <ActivityIndicator size="large" color="#FFF" style={styles.imageLoader} />
          )}
          <Image
            source={{ uri: currentScan?.imageUrl }}
            style={styles.image}
            onLoadEnd={() => setImageLoading(false)}
          />
        </View>

        {/* Results Content */}
        {prediction && (
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
                  </View>

                  {/* Final Verdict */}
                  <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee' }}>
                    <FinalVerdictCard
                      geminiPrediction={geminiPrediction}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Scan Metadata Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginHorizontal: 16, marginBottom: 8 }}>
              {/* Scan type badge */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Ionicons name="flower-outline" size={11} color="#1565C0" />
                <Text style={{ fontSize: 11, color: '#1565C0', fontWeight: '600', marginLeft: 3 }}>Flower</Text>
              </View>
              {/* Validation status badge */}
              {currentScan?.validationStatus && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: currentScan.validationStatus === 'validated' ? '#E8F5E9' : currentScan.validationStatus === 'conflict' ? '#FFF3E0' : '#F5F5F5',
                  paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                }}>
                  <Ionicons
                    name={currentScan.validationStatus === 'validated' ? 'checkmark-circle' : currentScan.validationStatus === 'conflict' ? 'alert-circle' : 'phone-portrait-outline'}
                    size={11}
                    color={currentScan.validationStatus === 'validated' ? '#2E7D32' : currentScan.validationStatus === 'conflict' ? '#E65100' : '#757575'}
                  />
                  <Text style={{
                    fontSize: 11, fontWeight: '600', marginLeft: 3,
                    color: currentScan.validationStatus === 'validated' ? '#2E7D32' : currentScan.validationStatus === 'conflict' ? '#E65100' : '#757575',
                  }}>
                    {currentScan.validationStatus === 'tflite_only' ? 'TFLite Only'
                      : currentScan.validationStatus === 'validated' ? 'Validated'
                      : currentScan.validationStatus === 'manual_override' ? 'Manual Override'
                      : 'Conflict'}
                  </Text>
                </View>
              )}
              {/* Date */}
              {currentScan?.date && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="time-outline" size={11} color="#999" />
                  <Text style={{ fontSize: 11, color: '#999', marginLeft: 3 }}>{formatDate(currentScan.date)}</Text>
                </View>
              )}
            </View>

            {/* Gemini Enhanced Data (only show if flower detected) */}
            {hasGeminiData && !isNotFlower && (
              <>
                {/* Harvest Timeline - Only for Female Flowers */}
                {scan?.prediction === 'female' && (
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
                              <View key={i} style={[styles.featureTag, { backgroundColor: varietyColor + '18', borderColor: varietyColor + '55', borderWidth: 1 }]}>
                                <Text style={[styles.featureTagText, { color: varietyColor }]}>{feature}</Text>
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

        {/* Action Buttons Removed */}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        transparent={true}
        visible={optionsVisible}
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.optionsMenu}>
            <View style={styles.optionDateContainer}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.optionDateText}>
                {formatDate(currentScan?.date || currentScan?.createdAt)}
              </Text>
            </View>
            <View style={styles.optionDivider} />
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsVisible(false);
                setModalVisible(true);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color="#333" />
              <Text style={styles.optionText}>Rename</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setOptionsVisible(false);
                handleDelete();
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#F44336" />
              <Text style={[styles.optionText, { color: '#F44336' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rename Scan</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter name"
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.renameSaveButton, isRenaming && styles.buttonDisabled]}
                    onPress={handleRename}
                    disabled={isRenaming}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Scan</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this scan? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton, isDeleting && styles.buttonDisabled]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 16,
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
    borderRadius: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 6,
    gap: 12,
  },
  tmOnlyText: {
    flex: 1,
    color: '#E65100',
    fontSize: 13,
    lineHeight: 20,
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
    borderRadius: 6,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  renameSaveButton: {
    backgroundColor: theme.colors.primary,
  },
  deleteConfirmButton: {
    backgroundColor: '#F44336',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Options Menu Styles
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  optionsMenu: {
    position: 'absolute',
    top: 60, // Adjust based on header height
    right: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    padding: 8,
  },
  optionDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  optionDateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});

export default FlowerResultsScreen;
