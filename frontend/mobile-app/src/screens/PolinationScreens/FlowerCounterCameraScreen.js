/**
 * FlowerCounterCameraScreen - Flower Counter for Record Flowering
 * Real-time flower detection using TM model for counting male/female flowers
 * Features: Real-time scanning, Shows gourd type + gender, Add to Count button
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { modelService } from '../../services/modelService';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { useTranslation } from 'react-i18next';

const SCAN_INTERVAL = 200; // 200ms between predictions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gourd type mapping from TM labels to plant gourd types
const GOURD_TYPE_MAPPING = {
  'Bitter Gourd': 'bitter_gourd',
  'Sponge Gourd': 'sponge_gourd',
  'Bottle Gourd': 'bottle_gourd',
  'Cucumber': 'cucumber',
  'Squash': 'kalabasa',
};

export const FlowerCounterCameraScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const GOURD_TYPE_DISPLAY = {
    bitter_gourd: t('flowerCounter.gourdTypes.bitter_gourd'),
    bottle_gourd: t('flowerCounter.gourdTypes.bottle_gourd'),
    cucumber: t('flowerCounter.gourdTypes.cucumber'),
    kalabasa: t('flowerCounter.gourdTypes.kalabasa'),
  };
  const { onFlowerDetected, plantGourdType, plantName } = route.params || {};
  
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();

  // Model State
  const [isModelReady, setIsModelReady] = useState(false);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [isStable, setIsStable] = useState(false);

  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const recentPredictions = useRef([]);

  // Initialize model
  useEffect(() => {
    const initializeModel = async () => {
      setIsModelReady(false);
      stopScanning();

      try {
        console.log('🌸 Initializing TM model for flower counter...');
        await modelService.initialize();
        setIsModelReady(true);
        console.log('✅ TM model ready for flower counting');

        // Warm up
        await modelService.warmUp();
      } catch (error) {
        console.error('❌ TM model initialization failed:', error);
        Alert.alert(
          t('camera.modelError'),
          t('camera.modelError'),
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      }
    };

    initializeModel();

    return () => {
      stopScanning();
      recentPredictions.current = [];
    };
  }, []);

  // Handle screen focus
  useFocusEffect(
    useCallback(() => {
      console.log('🌸 FlowerCounterCamera focused');
      recentPredictions.current = [];
      setCurrentPrediction(null);
      setIsStable(false);

      // Hide tab bar
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });

      if (isModelReady && !scanIntervalRef.current) {
        startScanning();
      }

      return () => {
        console.log('🌸 FlowerCounterCamera unfocused');
        stopScanning();
        
        // Restore tab bar
        navigation.getParent()?.setOptions({
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.background.secondary,
            height: 70,
            paddingBottom: 12,
            paddingTop: 8,
          }
        });
      };
    }, [isModelReady, navigation])
  );

  // Start scanning when model is ready
  useEffect(() => {
    if (isModelReady && !isScanning) {
      startScanning();
    }
  }, [isModelReady]);

  /**
   * Extract gourd type from TM label
   */
  const getGourdTypeFromLabel = (label) => {
    if (!label) return null;
    if (label.includes('Ampalaya')) return 'Bitter Gourd';
    if (label.includes('Patola')) return 'Sponge Gourd';
    if (label.includes('Upo')) return 'Bottle Gourd';
    if (label.includes('Cucumber')) return 'Cucumber';
    if (label.includes('Kalabasa')) return 'Squash';
    return null;
  };

  /**
   * Extract gender from TM label
   */
  const getGenderFromLabel = (label) => {
    if (!label) return null;
    if (label.includes('Male')) return 'male';
    if (label.includes('Female')) return 'female';
    return null;
  };

  /**
   * Start real-time scanning
   */
  const startScanning = useCallback(() => {
    // Stop any existing scan before starting new one
    if (scanIntervalRef.current) {
      stopScanning();
    }

    console.log('🎥 Starting flower detection scanning...');
    setIsScanning(true);
    scanIntervalRef.current = true;

    const scanLoop = async () => {
      if (!scanIntervalRef.current) return;

      if (!cameraRef.current || !isModelReady) {
        setTimeout(scanLoop, SCAN_INTERVAL);
        return;
      }

      const frameStartTime = Date.now();

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
          base64: false,
          exif: false,
          isImageMirror: false,
          shutterSound: false,
        });

        if (!scanIntervalRef.current) return;

        const result = await modelService.quickPredict(photo.uri, photo.width, photo.height);

        if (!scanIntervalRef.current) return;

        const currentLabel = result.topPrediction.label;
        const currentConfidence = result.topPrediction.percentage;
        const gourdType = getGourdTypeFromLabel(currentLabel);
        const gender = getGenderFromLabel(currentLabel);

        // Track recent predictions for stability
        recentPredictions.current.push({
          label: currentLabel,
          confidence: currentConfidence,
          gourdType,
          gender
        });
        if (recentPredictions.current.length > 5) {
          recentPredictions.current.shift();
        }

        // Check for stable prediction (3 consecutive same predictions)
        const recent = recentPredictions.current;
        const lastThree = recent.slice(-3);
        const stableNow = lastThree.length >= 3 && 
          lastThree.every(p => p.label === currentLabel) &&
          currentLabel !== 'Not Flower' &&
          currentConfidence >= 60;

        setIsStable(stableNow);
        setCurrentPrediction({
          label: currentLabel,
          confidence: currentConfidence,
          gourdType,
          gender,
          isFlower: currentLabel !== 'Not Flower' && gender !== null
        });

      } catch (error) {
        console.log('Scan error (ignored):', error.message);
      }

      if (scanIntervalRef.current) {
        const elapsed = Date.now() - frameStartTime;
        const delay = Math.max(0, SCAN_INTERVAL - elapsed);
        setTimeout(scanLoop, delay);
      }
    };

    scanLoop();
  }, [isModelReady]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      console.log('🛑 Stopping flower detection');
      scanIntervalRef.current = false;
      setIsScanning(false);
    }
  }, []);

  /**
   * Handle Add to Count button
   */
  const handleAddToCount = () => {
    if (!currentPrediction?.isFlower || !isStable) {
      Alert.alert(t('flowerCounter.notReady'), t('flowerCounter.notReadyMessage'));
      return;
    }

    const { gender, gourdType } = currentPrediction;
    
    // Validate gourd type matches the plant (if plantGourdType is provided)
    if (plantGourdType && gourdType) {
      const detectedGourdType = GOURD_TYPE_MAPPING[gourdType] || gourdType?.toLowerCase()?.replace(' ', '_');
      
      if (detectedGourdType && detectedGourdType !== plantGourdType) {
        const expectedName = GOURD_TYPE_DISPLAY[plantGourdType] || plantGourdType;
        Alert.alert(
          t('pollination.wrongFlowerType'),
          t('pollination.wrongFlowerTypeMessage', { detectedType: gourdType, plantType: expectedName }),
          [{ text: t('flowerCounter.tryAgain') }]
        );
        return;
      }
    }
    
    // Stop scanning
    stopScanning();

    // Callback to parent with detected flower info
    if (onFlowerDetected) {
      onFlowerDetected({ gender, gourdType });
    }

    // Go back to the modal
    navigation.goBack();
  };

  /**
   * Get confidence color
   */
  const getConfidenceColor = (percentage) => {
    if (percentage >= 70) return '#4CAF50';
    if (percentage >= 50) return '#FFA500';
    return '#F44336';
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.text.secondary} />
          <Text style={styles.permissionText}>{t('camera.cameraPermissionRequired')}</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('camera.grantPermission')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  // Get expected plant display name
  const expectedPlantName = plantName || (plantGourdType ? GOURD_TYPE_DISPLAY[plantGourdType] : null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <CustomHeader
        variant="scanner"
        onBackPress={() => navigation.goBack()}
        centerComponent={() => (
          <View style={styles.headerBadge}>
            <Text style={styles.headerTitle}>{t('flowerCounter.title')}</Text>
            {expectedPlantName && (
              <Text style={styles.headerSubtitle}>{t('flowerCounter.forPlant', { name: expectedPlantName })}</Text>
            )}
          </View>
        )}
        rightComponent={() => (
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      />

      {/* Camera Viewport */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          animateShutter={false}
        />
        
        {/* Stable Indicator Overlay */}
        {isStable && currentPrediction?.isFlower && (
          <View style={styles.stableOverlay}>
            <View style={styles.stableBorder} />
          </View>
        )}
      </View>

      {/* Detection Results */}
      <View style={styles.resultsContainer}>
        {!isModelReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>{t('flowerCounter.loadingModel')}</Text>
          </View>
        ) : !currentPrediction ? (
          <View style={styles.waitingContainer}>
            <Ionicons name="flower-outline" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.waitingText}>{t('flowerCounter.pointCamera')}</Text>
          </View>
        ) : (
          <View style={styles.detectionResult}>
            {/* Gourd Type with Match Indicator */}
            {currentPrediction.gourdType && (() => {
              const detectedType = GOURD_TYPE_MAPPING[currentPrediction.gourdType];
              const isMatch = !plantGourdType || detectedType === plantGourdType;
              
              return (
                <View style={[
                  styles.gourdTypeRow,
                  !isMatch && styles.gourdTypeMismatch
                ]}>
                  <Ionicons 
                    name={isMatch ? "leaf" : "warning"} 
                    size={20} 
                    color={isMatch ? "#4CAF50" : "#FF9800"} 
                  />
                  <Text style={[
                    styles.gourdTypeText,
                    !isMatch && styles.gourdTypeTextMismatch
                  ]}>
                    {currentPrediction.gourdType}
                  </Text>
                  {!isMatch && plantGourdType && (
                    <Text style={styles.mismatchText}>
                      ({t('flowerCounter.forPlant', { name: GOURD_TYPE_DISPLAY[plantGourdType] })})
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Gender Detection */}
            <View style={styles.genderContainer}>
              {currentPrediction.isFlower ? (
                <>
                  <Ionicons 
                    name={currentPrediction.gender === 'male' ? 'male' : 'female'} 
                    size={48} 
                    color={currentPrediction.gender === 'male' ? '#2196F3' : '#E91E63'} 
                  />
                  <Text style={[
                    styles.genderText,
                    { color: currentPrediction.gender === 'male' ? '#2196F3' : '#E91E63' }
                  ]}>
                    {currentPrediction.gender === 'male' ? t('flowerCounter.maleFlower') : t('flowerCounter.femaleFlower')}
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="help-circle" size={48} color="#9E9E9E" />
                  <Text style={styles.notFlowerText}>{t('flowerCounter.notAFlower')}</Text>
                </>
              )}
            </View>

            {/* Confidence */}
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>{t('camera.confidence')}:</Text>
              <Text style={[
                styles.confidenceValue,
                { color: getConfidenceColor(currentPrediction.confidence) }
              ]}>
                {currentPrediction.confidence.toFixed(1)}%
              </Text>
            </View>

            {/* Stability Indicator */}
            <View style={styles.stabilityRow}>
              <View style={[
                styles.stabilityDot,
                { backgroundColor: isStable ? '#4CAF50' : '#FFA500' }
              ]} />
              <Text style={styles.stabilityText}>
                {isStable ? t('flowerCounter.stable') : t('flowerCounter.stabilizing')}
              </Text>
            </View>
          </View>
        )}

        {/* Add to Count Button */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[
              styles.addButton,
              (!isStable || !currentPrediction?.isFlower) && styles.addButtonDisabled
            ]}
            onPress={handleAddToCount}
            disabled={!isStable || !currentPrediction?.isFlower}
          >
            <Ionicons 
              name="add-circle" 
              size={24} 
              color={isStable && currentPrediction?.isFlower ? '#fff' : 'rgba(255,255,255,0.5)'} 
            />
            <Text style={[
              styles.addButtonText,
              (!isStable || !currentPrediction?.isFlower) && styles.addButtonTextDisabled
            ]}>
              {t('flowerCounter.addToCount')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.hintText}>
            {t('flowerCounter.hint')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerBadge: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  flipButton: {
    padding: 8,
  },
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  stableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stableBorder: {
    width: '80%',
    height: '80%',
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 12,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
    fontSize: 16,
  },
  detectionResult: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  gourdTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gourdTypeMismatch: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
  },
  gourdTypeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  gourdTypeTextMismatch: {
    color: '#FF9800',
  },
  mismatchText: {
    color: '#FF9800',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  genderContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  genderText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  notFlowerText: {
    color: '#9E9E9E',
    fontSize: 20,
    marginTop: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confidenceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginRight: 8,
  },
  confidenceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  stabilityText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  bottomControls: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 12,
  },
  addButtonDisabled: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  addButtonTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
});
