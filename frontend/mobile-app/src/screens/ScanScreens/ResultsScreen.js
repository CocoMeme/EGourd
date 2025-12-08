import React, { useState, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { scanService } from '../../services';

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

export const ResultsScreen = ({ route, navigation }) => {
  const { 
    imageUri, 
    prediction, 
    scanId,
    validationStatus = 'tflite_only',
    tflitePrediction,
    geminiPrediction,
    comparisonResult,
    userChoice,
  } = route.params;
  const [isSaving, setIsSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const isHistoryView = !!scanId;

  // State for collapsible sections
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showVarietyInfo, setShowVarietyInfo] = useState(false);
  const [showActionTips, setShowActionTips] = useState(false);

  // Get variety color
  const getVarietyColor = (variety) => {
    return VARIETY_COLORS[variety] || theme.colors.primary;
  };

  // Get variety icon
  const getVarietyIcon = (variety) => {
    if (variety === 'Ampalaya Bilog') return 'leaf-outline';
    if (variety === 'Patola') return 'leaf';
    if (variety === 'Upo (Smooth)') return 'leaf-outline';
    return 'leaf-outline';
  };

  // Get variety info
  const getVarietyInfo = (variety) => {
    const info = {
      'Ampalaya Bilog': {
        scientificName: 'Momordica charantia',
        commonName: 'Bitter Gourd - Round Variety',
        harvestTime: '60-80 days',
        pollinationTime: '6-9 AM',
        benefits: 'High in Vitamin C, helps manage blood sugar',
      },
      'Patola': {
        scientificName: 'Luffa acutangula',
        commonName: 'Sponge Gourd / Loofah',
        harvestTime: '50-70 days',
        pollinationTime: '6-8 AM',
        benefits: 'Rich in fiber, supports digestive health',
      },
      'Upo (Smooth)': {
        scientificName: 'Lagenaria siceraria',
        commonName: 'Bottle Gourd - Smooth Variety',
        harvestTime: '70-90 days',
        pollinationTime: '6-9 AM (night blooming)',
        benefits: 'Low calorie, high water content, cooling effect',
      },
    };
    return info[variety] || info['Ampalaya Bilog'];
  };

  // Get action tips based on gender and variety
  const getActionTips = (gender, variety) => {
    if (gender === 'male') {
      return {
        title: 'Tips for Male Flowers',
        tips: [
          'Male flowers appear first in the season',
          'They produce pollen for fertilization',
          'Can be harvested and used in cooking',
          'Usually appear in clusters',
        ],
      };
    } else {
      return {
        title: 'Tips for Female Flowers',
        tips: [
          'Hand pollinate early morning (6-9 AM)',
          'Use soft brush to transfer pollen',
          'Protect developing fruit from pests',
          'Ensure adequate water and nutrients',
        ],
      };
    }
  };

  // Helper: Get confidence level and color
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 90) return { label: 'Very High', color: '#2ECC71', icon: 'checkmark-circle' };
    if (confidence >= 75) return { label: 'High', color: '#3498DB', icon: 'checkmark-circle-outline' };
    if (confidence >= 60) return { label: 'Moderate', color: '#F39C12', icon: 'alert-circle' };
    return { label: 'Low', color: '#E74C3C', icon: 'warning' };
  };

  // Helper: Get validation status info
  const getValidationStatusInfo = (status) => {
    switch (status) {
      case 'validated':
        return { 
          icon: 'shield-checkmark', 
          label: 'AI Validated', 
          color: '#2ECC71',
          description: 'Both models agree'
        };
      case 'manual_override':
        return { 
          icon: 'hand-left-outline', 
          label: 'User Selected', 
          color: '#3498DB',
          description: 'You chose between predictions'
        };
      case 'tflite_only':
        return { 
          icon: 'phone-portrait-outline', 
          label: 'Quick Scan', 
          color: '#F39C12',
          description: 'On-device analysis'
        };
      case 'conflict':
        return { 
          icon: 'alert-circle-outline', 
          label: 'Needs Review', 
          color: '#E74C3C',
          description: 'Models disagreed'
        };
      default:
        return { 
          icon: 'information-circle-outline', 
          label: 'Analyzed', 
          color: '#95A5A6',
          description: 'Standard scan'
        };
    }
  };

  // Handler: Delete scan
  const handleDelete = async () => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await scanService.deleteScan(scanId);
              Alert.alert('Success', 'Scan deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete scan');
            }
          }
        }
      ]
    );
  };

  // Handler: Save scan to backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const scanData = {
        prediction: prediction.gender,
        confidence: prediction.confidence,
        diseaseInfo: {}, // Placeholder for future disease detection
        location: null, // Placeholder for location data
        notes: '',
        
        // Include Gemini validation data if available
        variety: prediction.variety || null,
        validationStatus: validationStatus || 'tflite_only',
        aiPrediction: {
          finalSource: validationStatus === 'validated' 
            ? (comparisonResult?.recommendation || 'tflite')
            : (validationStatus === 'manual_override' ? userChoice : 'tflite'),
          
          // TFLite prediction data
          tflite: tflitePrediction ? {
            variety: tflitePrediction.variety,
            gender: tflitePrediction.gender,
            confidence: tflitePrediction.confidence,
            modelVersion: tflitePrediction.modelVersion,
            processingTime: tflitePrediction.processingTime,
            modelType: tflitePrediction.modelType
          } : null,
          
          // Gemini prediction data (if available)
          gemini: geminiPrediction ? {
            variety: geminiPrediction.variety,
            gender: geminiPrediction.gender,
            confidence: geminiPrediction.confidence,
            reasoning: geminiPrediction.geminiData?.reasoning,
            keyFeatures: geminiPrediction.geminiData?.keyFeatures || [],
            processingTime: geminiPrediction.processingTime,
            modelVersion: geminiPrediction.modelVersion
          } : null,
          
          // Comparison result (if both models ran)
          comparison: comparisonResult ? {
            modelsAgree: comparisonResult.agree,
            varietyMatch: comparisonResult.varietyMatch,
            genderMatch: comparisonResult.genderMatch,
            confidenceGap: comparisonResult.confidenceGap,
            recommendation: comparisonResult.recommendation
          } : null
        }
      };

      await scanService.saveScan(scanData, imageUri);
      
      Alert.alert(
        'Success! 🎉',
        'Scan saved to your history!',
        [
          {
            text: 'View History',
            onPress: () => navigation.navigate('Profile', { 
              screen: 'ProfileMain', 
              params: { initialTab: 'history' } 
            })
          },
          {
            text: 'Take Another',
            onPress: () => navigation.navigate('CameraMain')
          }
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Save Failed',
        'Failed to save scan. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Retake photo
  const handleRetake = () => {
    navigation.navigate('CameraMain');
  };

  // Handler: Share results
  const handleShare = () => {
    Alert.alert(
      'Share Results',
      'Sharing feature coming soon!',
      [{ text: 'OK' }]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleRetake} style={styles.headerButton}>
            <Ionicons name="camera-outline" size={22} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={22} color="#000000" />
          </TouchableOpacity>
          {isHistoryView ? (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={22} color="#000000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.headerButton}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Ionicons name="save-outline" size={22} color="#000000" />
              )}
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, isHistoryView, isSaving]);

  const confidenceInfo = getConfidenceLevel(prediction.confidence);
  const varietyColor = getVarietyColor(prediction.variety);
  const varietyIcon = getVarietyIcon(prediction.variety);
  const varietyInfo = getVarietyInfo(prediction.variety);
  const actionTips = getActionTips(prediction.gender, prediction.variety);
  const validationInfo = getValidationStatusInfo(validationStatus);

  return (
    <ScrollView style={styles.container}>
      {/* Image Preview - Clean, No Overlays */}
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image} 
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
        />
        
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={styles.contentContainer}>
        
        {/* Primary Result Card */}
        <View style={styles.card}>
          {/* Gender and Variety in Same Row */}
          <View style={styles.headerRow}>
            {/* Gender - Left */}
            <View style={styles.genderSection}>
              <Ionicons 
                name={prediction.gender === 'male' ? 'male' : 'female'} 
                size={28} 
                color={GENDER_COLORS[prediction.gender]} 
              />
              <View style={styles.genderTextContainer}>
                <Text style={styles.genderLabelSmall}>Gender</Text>
                <Text style={[styles.genderValue, { color: GENDER_COLORS[prediction.gender] }]}>
                  {prediction.gender.charAt(0).toUpperCase() + prediction.gender.slice(1)}
                </Text>
              </View>
            </View>

            {/* Variety - Right */}
            <View style={styles.varietySection}>
              <Ionicons name={varietyIcon} size={28} color={varietyColor} />
              <View style={styles.varietyTextContainer}>
                <Text style={styles.varietyLabelSmall}>Variety</Text>
                <Text style={[styles.varietyValue, { color: varietyColor }]}>
                  {prediction.variety}
                </Text>
              </View>
            </View>
          </View>

          {/* Confidence Bar */}
          <View style={styles.confidenceSection}>
            <View style={styles.confidenceHeader}>
              <Text style={styles.confidenceLabelText}>Confidence</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: confidenceInfo.color }]}>
                <Ionicons name={confidenceInfo.icon} size={14} color="#FFFFFF" />
                <Text style={styles.confidenceBadgeText}>{confidenceInfo.label}</Text>
              </View>
            </View>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${prediction.confidence}%`,
                    backgroundColor: confidenceInfo.color
                  }
                ]} 
              />
            </View>
            <Text style={[styles.confidencePercentText, { color: confidenceInfo.color }]}>
              {prediction.confidence.toFixed(1)}%
            </Text>
          </View>

          {/* Validation Status */}
          {validationStatus && (
            <View style={styles.validationRow}>
              <Ionicons name={validationInfo.icon} size={18} color={validationInfo.color} />
              <View style={styles.validationTextContainer}>
                <Text style={[styles.validationLabel, { color: validationInfo.color }]}>
                  {validationInfo.label}
                </Text>
                <Text style={styles.validationDescription}>
                  {validationInfo.description}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Gemini AI Analysis Card */}
        {geminiPrediction && geminiPrediction.geminiData && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="sparkles" size={24} color="#4285F4" />
              <Text style={[styles.cardTitle, { color: '#4285F4' }]}>AI Analysis</Text>
            </View>
            
            {geminiPrediction.geminiData.reasoning && (
              <View style={styles.aiReasoningBox}>
                <Text style={styles.aiReasoningText}>
                  "{geminiPrediction.geminiData.reasoning}"
                </Text>
              </View>
            )}
            
            {geminiPrediction.geminiData.keyFeatures && geminiPrediction.geminiData.keyFeatures.length > 0 && (
              <View style={styles.keyFeaturesContainer}>
                <Text style={styles.keyFeaturesTitle}>Key Observations:</Text>
                {geminiPrediction.geminiData.keyFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark" size={16} color="#4285F4" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            )}

            {comparisonResult && !comparisonResult.agree && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#FF9800" />
                <Text style={styles.warningText}>
                  Models disagreed. {userChoice === 'gemini' ? 'You selected AI analysis' : 'You selected on-device analysis'}.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Variety Information Card - Collapsible */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setShowVarietyInfo(!showVarietyInfo)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleTitleRow}>
              <View style={styles.collapsibleTitleLeft}>
                <Ionicons name="information-circle-outline" size={22} color={varietyColor} />
                <Text style={styles.collapsibleTitle}>About This Variety</Text>
              </View>
              <Ionicons 
                name={showVarietyInfo ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </View>
          </TouchableOpacity>

          {showVarietyInfo && (
            <View style={styles.collapsibleContent}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="leaf-outline" size={20} color={theme.colors.text.secondary} />
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemLabel}>Scientific Name</Text>
                    <Text style={styles.infoItemValue}>{varietyInfo.scientificName}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemLabel}>Harvest Time</Text>
                    <Text style={styles.infoItemValue}>{varietyInfo.harvestTime}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="sunny-outline" size={20} color={theme.colors.text.secondary} />
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemLabel}>Best Pollination</Text>
                    <Text style={styles.infoItemValue}>{varietyInfo.pollinationTime}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="nutrition-outline" size={20} color={theme.colors.text.secondary} />
                  <View style={styles.infoItemText}>
                    <Text style={styles.infoItemLabel}>Health Benefits</Text>
                    <Text style={styles.infoItemValue}>{varietyInfo.benefits}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Action Tips Card - Collapsible */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setShowActionTips(!showActionTips)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleTitleRow}>
              <View style={styles.collapsibleTitleLeft}>
                <Ionicons name="bulb-outline" size={22} color="#F39C12" />
                <Text style={styles.collapsibleTitle}>{actionTips.title}</Text>
              </View>
              <Ionicons 
                name={showActionTips ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </View>
          </TouchableOpacity>

          {showActionTips && (
            <View style={styles.collapsibleContent}>
              <View style={styles.tipsContainer}>
                {actionTips.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Ionicons name="arrow-forward" size={16} color="#F39C12" />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.learnMoreButton}>
                <Ionicons name="book-outline" size={18} color={theme.colors.primary} />
                <Text style={styles.learnMoreText}>Learn More</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Technical Details - Collapsible */}
        <View style={styles.card}>
          <TouchableOpacity 
            style={styles.collapsibleHeader}
            onPress={() => setShowTechnicalDetails(!showTechnicalDetails)}
            activeOpacity={0.7}
          >
            <View style={styles.collapsibleTitleRow}>
              <View style={styles.collapsibleTitleLeft}>
                <Ionicons name="code-outline" size={22} color={theme.colors.text.secondary} />
                <Text style={styles.collapsibleTitle}>Technical Details</Text>
              </View>
              <Ionicons 
                name={showTechnicalDetails ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </View>
          </TouchableOpacity>

          {showTechnicalDetails && (
            <View style={styles.collapsibleContent}>
              <View style={styles.technicalDetailsContainer}>
              <View style={styles.technicalRow}>
                <Ionicons name="phone-portrait-outline" size={18} color={theme.colors.text.secondary} />
                <Text style={styles.technicalLabel}>TFLite Model:</Text>
                <Text style={styles.technicalValue}>v{prediction.modelVersion}</Text>
              </View>

              {geminiPrediction && (
                <View style={styles.technicalRow}>
                  <Ionicons name="cloud-outline" size={18} color={theme.colors.text.secondary} />
                  <Text style={styles.technicalLabel}>Gemini AI:</Text>
                  <Text style={styles.technicalValue}>{geminiPrediction.modelVersion}</Text>
                </View>
              )}

              <View style={styles.technicalRow}>
                <Ionicons name="speedometer-outline" size={18} color={theme.colors.text.secondary} />
                <Text style={styles.technicalLabel}>Processing:</Text>
                <Text style={styles.technicalValue}>{prediction.processingTime}ms</Text>
              </View>

              <View style={styles.technicalRow}>
                <Ionicons name="calendar-outline" size={18} color={theme.colors.text.secondary} />
                <Text style={styles.technicalLabel}>Timestamp:</Text>
                <Text style={styles.technicalValue}>
                  {new Date(prediction.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
            </View>
          )}
        </View>

      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },

  // Content Container
  contentContainer: {
    padding: theme.spacing.md,
  },

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardHeaderText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
  },

  // Gender and Variety Row (Same Line)
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: theme.spacing.md,
  },
  genderSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  genderTextContainer: {
    flex: 1,
  },
  genderLabelSmall: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  genderValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  varietySection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  varietyTextContainer: {
    flex: 1,
  },
  varietyLabelSmall: {
    fontSize: 11,
    color: theme.colors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  varietyValue: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Confidence Section
  confidenceSection: {
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  confidenceLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.small,
    gap: 4,
  },
  confidenceBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: theme.borderRadius.small,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: theme.borderRadius.small,
  },
  confidencePercentText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },

  // Validation Status
  validationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  validationTextContainer: {
    flex: 1,
  },
  validationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  validationDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },

  // AI Analysis Card
  aiReasoningBox: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#4285F4',
    borderRadius: theme.borderRadius.small,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  aiReasoningText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  keyFeaturesContainer: {
    marginTop: theme.spacing.xs,
  },
  keyFeaturesTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: theme.spacing.xs,
  },
  featureText: {
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: '#FFF9E6',
    borderRadius: theme.borderRadius.small,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    flex: 1,
  },

  // Collapsible Sections
  collapsibleHeader: {
    marginBottom: 0,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  collapsibleTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  collapsibleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  collapsibleContent: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  // Variety Information
  infoGrid: {
    gap: theme.spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  infoItemText: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  infoItemValue: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },

  // Action Tips
  tipsContainer: {
    gap: theme.spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  tipText: {
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 1,
    lineHeight: 18,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  learnMoreText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Technical Details
  technicalDetailsContainer: {
    gap: theme.spacing.sm,
  },
  technicalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  technicalLabel: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  technicalValue: {
    fontSize: 13,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },

  // Other Styles
  bottomSpacing: {
    height: theme.spacing.xl,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
});

