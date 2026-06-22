/**
 * CameraScreen.test - Developer Mode Scanner
 * Real-time classification using TM floating point model
 * Supports: Flower and Leaf scanning modes
 * 
 * DEVELOPER MODE FEATURE:
 * - Fresh capture: Takes new photo at capture moment (not cached frames)
 * - Multi-run prediction: Runs model 5 times and averages results for accuracy
 * - Skeleton loading: Shows analyzing state during multi-run prediction
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { modelService, SCAN_MODES } from '../../services/modelService';
import { geminiService } from '../../services/geminiService';
import { CustomHeader } from '../../components/CustomComponents/CustomHeader';
import { useTranslation } from 'react-i18next';

const SCAN_INTERVAL = 200; // 200ms between predictions (fast like TM)
const TOP_N = 3; // Show top 3 predictions
const STABLE_FRAME_GATE = 5; // Consecutive matching frames required for stability hint
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CameraScreenTest = ({ navigation }) => {
  const { t } = useTranslation();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();

  // Model State
  const [isModelReady, setIsModelReady] = useState(false);

  // Camera State
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [processingTime, setProcessingTime] = useState(0);
  const [isStable, setIsStable] = useState(false); // Track if prediction is stable

  // Capture State
  const [isCapturing, setIsCapturing] = useState(false)

  // Scan Mode State
  const [scanMode, setScanMode] = useState(SCAN_MODES.FLOWER);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isModelReadyRef = useRef(false); // Ref to avoid stale closure in scan loop
  const isCameraReadyRef = useRef(false); // Ref to track camera readiness in scan loop

  // LOGIC PRESERVATION: Store dimensions to fix distortion
  const lastFrameUri = useRef({ uri: null, width: 0, height: 0 });

  // Stability tracking — counter for the green "Ready to capture" pill hint.
  // Capture itself no longer gates on TFLite; Gemini is the authority on
  // "Not a Gourd Flower/Leaf", so we only need a hint, not a frame selector.
  const consecutiveLabelCount = useRef(0);
  const lastLabel = useRef(null);

  // Animated values for smooth transitions
  const animatedBars = useRef({});
  const animatedPositions = useRef({});

  /**
   * Stop scanning - defined first as it has no dependencies
   */
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      console.log('🛑 Stopping TM scanning');
      scanIntervalRef.current = false; // Signal the recursive loop to stop
      setIsScanning(false);
    }
  }, []);

  /**
   * Handle scan mode switching between Flower and Leaf
   */
  const handleScanModeSwitch = useCallback(async (newMode) => {
    if (newMode === scanMode || isSwitchingMode) return;

    console.log(`🔄 Switching scan mode to: ${newMode}`);
    setIsSwitchingMode(true);
    stopScanning();
    setPredictions([]);
    setIsStable(false);

    // Reset tracking refs - IMPORTANT: Reset ALL frame refs to prevent stale frames from previous mode
    consecutiveLabelCount.current = 0;
    lastLabel.current = null;
    lastFrameUri.current = { uri: null, width: 0, height: 0 }; // Clear stale frames from previous mode
    animatedBars.current = {};
    animatedPositions.current = {};

    try {
      setIsModelReady(false);
      isModelReadyRef.current = false;
      setScanMode(newMode);

      // Switch model
      await modelService.setScanMode(newMode);
      await modelService.warmUp();

      setIsModelReady(true);
      isModelReadyRef.current = true;
      console.log(`✅ Switched to ${newMode} mode`);

      // Start scanning immediately if camera is ready
      if (isCameraReadyRef.current && !scanIntervalRef.current) {
        console.log('🚀 Starting scanning after mode switch');
        startScanning();
      }
    } catch (error) {
      console.error(`❌ Failed to switch to ${newMode} mode:`, error);
      Alert.alert(t('camera.failedToSwitchMode'), t('camera.failedToSwitchMode', { mode: newMode }));
      // Revert to previous mode
      setScanMode(scanMode);
    } finally {
      setIsSwitchingMode(false);
    }
  }, [scanMode, isSwitchingMode, stopScanning, startScanning]);

  /**
   * Start real-time scanning using recursive loop (smoother than setInterval)
   * Defined before useEffects that depend on it
   */
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      scanIntervalRef.current = false; // Signal to stop any existing loop
    }

    console.log('🎥 Starting TM real-time scanning (recursive loop)...');
    setIsScanning(true);
    scanIntervalRef.current = true; // Use as running flag

    const scanLoop = async () => {
      // Check if we should stop
      if (!scanIntervalRef.current) return;

      // Skip if camera not ready or paused (use ref to avoid stale closure)
      if (!cameraRef.current || !isModelReadyRef.current || !isCameraReadyRef.current || isPaused) {
        // Schedule next iteration after delay
        setTimeout(scanLoop, SCAN_INTERVAL);
        return;
      }

      const frameStartTime = Date.now();

      try {
        // Capture frame with decent quality for accurate predictions
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,  // Balance between speed and accuracy
          skipProcessing: true,
          base64: false,
          exif: false,
          isImageMirror: false,
          shutterSound: false,
        });

        // Check if stopped during async capture
        if (!scanIntervalRef.current) return;

        // Save the last frame URI for instant capture
        lastFrameUri.current = { uri: photo.uri, width: photo.width, height: photo.height };

        // Run prediction
        const result = await modelService.quickPredict(photo.uri, photo.width, photo.height);

        // Check if stopped during prediction
        if (!scanIntervalRef.current) return;

        // DEBUG: Log real-time prediction
        console.log('🔴 REALTIME:', result.topPrediction.label, `(${result.topPrediction.percentage.toFixed(1)}%)`, '| Frame:', photo.uri.slice(-20));

        // Track stability: count consecutive same predictions (pill hint only)
        const currentLabel = result.topPrediction.label;
        const currentConfidence = result.topPrediction.percentage;

        if (currentLabel === lastLabel.current) {
          consecutiveLabelCount.current = Math.min(
            consecutiveLabelCount.current + 1,
            STABLE_FRAME_GATE
          );
        } else {
          lastLabel.current = currentLabel;
          consecutiveLabelCount.current = 1;
        }

        const stableNow = consecutiveLabelCount.current >= STABLE_FRAME_GATE;

        // Mode-aware rejection label check
        const rejectionLabel = scanMode === SCAN_MODES.LEAF ? 'Not Leaf' : 'Not Flower';

        // Update UI stability indicator (informational hint — does not gate capture)
        setIsStable(stableNow && currentLabel !== rejectionLabel);

        // Update predictions with animations
        const topPredictions = result.predictions.slice(0, TOP_N);

        // Animate bars and positions smoothly
        topPredictions.forEach((pred, index) => {
          const key = pred.label;

          // Initialize animated values if they don't exist
          if (!animatedBars.current[key]) {
            animatedBars.current[key] = new Animated.Value(0);
          }
          if (!animatedPositions.current[key]) {
            animatedPositions.current[key] = new Animated.Value(index * 100);
          }

          // Animate bar width
          Animated.timing(animatedBars.current[key], {
            toValue: pred.percentage,
            duration: 180, // Smoother transition
            useNativeDriver: false,
          }).start();

          // Animate position (for smooth reordering)
          Animated.timing(animatedPositions.current[key], {
            toValue: index * 60, // Height of each row
            duration: 200,
            useNativeDriver: true,
          }).start();
        });

        setPredictions(topPredictions);
        setProcessingTime(result.processingTime);

      } catch (error) {
        console.log('TM scan error (ignored):', error.message);
      }

      // Schedule next frame: wait remaining time if frame was fast, otherwise continue immediately
      if (scanIntervalRef.current) {
        const elapsed = Date.now() - frameStartTime;
        const delay = Math.max(0, SCAN_INTERVAL - elapsed);
        setTimeout(scanLoop, delay);
      }
    };

    // Start the loop
    scanLoop();
  }, [isPaused, scanMode]);

  // Initialize model
  useEffect(() => {
    const initializeModel = async () => {
      setIsModelReady(false);
      stopScanning();

      try {
        console.log(`🧪 Initializing ${scanMode} model...`);
        await modelService.setScanMode(scanMode);
        setIsModelReady(true);
        isModelReadyRef.current = true; // Sync ref for scan loop
        console.log(`✅ ${scanMode} model ready`);

        // Warm up
        await modelService.warmUp();
        console.log(`🔥 ${scanMode} model warmed up`);
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
      isModelReadyRef.current = false; // Reset ref on cleanup
      // Memory cleanup
      consecutiveLabelCount.current = 0;
      lastLabel.current = null;
      lastFrameUri.current = { uri: null, width: 0, height: 0 };
      animatedBars.current = {};
      animatedPositions.current = {};
    };
  }, [stopScanning]);

  // Reset state and restart scanning when screen comes into focus
  // Also hide tab bar when on this screen
  useFocusEffect(
    useCallback(() => {
      console.log('📱 CameraScreen.test focused - resetting state');
      setIsCapturing(false);
      setIsStable(false);

      // Hide tab bar when on camera screen
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });

      // Reset frame tracking for fresh scan
      consecutiveLabelCount.current = 0;
      lastLabel.current = null;
      lastFrameUri.current = { uri: null, width: 0, height: 0 };

      // Small delay to allow camera to reinitialize after returning from another screen
      const startDelay = setTimeout(() => {
        // Restart scanning if model and camera are ready
        if (isModelReadyRef.current && isCameraReadyRef.current && !scanIntervalRef.current) {
          console.log('📱 Model and camera ready on focus, starting scan');
          startScanning();
        }
      }, 300);

      return () => {
        clearTimeout(startDelay);
        // IMPORTANT: Stop scanning when screen loses focus
        console.log('📱 CameraScreen unfocused - stopping scanning');
        stopScanning();

        // Show tab bar again when leaving
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
    }, [startScanning, stopScanning, navigation])
  );

  // Start scanning when both model and camera become ready
  useEffect(() => {
    if (isModelReady && isCameraReady && !scanIntervalRef.current && !isPaused && !isCapturing) {
      console.log('🚀 Model and camera ready, starting scanning...');
      startScanning();
    }
  }, [isModelReady, isCameraReady, isPaused, isCapturing, startScanning]);

  /**
   * Helper: Extract variety from TM label
   */
  const getVarietyFromLabel = (label) => {
    if (!label) return null;
    if (label.includes('Ampalaya')) return 'Bitter Gourd';
    if (label.includes('Patola')) return 'Sponge Gourd';
    if (label.includes('Upo')) return 'Bottle Gourd';
    if (label.includes('Cucumber')) return 'Cucumber';
    if (label === 'Not Flower') return null;
    return null;
  };

  /**
   * Helper: Extract gender from TM label
   */
  const getGenderFromLabel = (label) => {
    if (!label) return 'unknown';
    if (label.includes('Male')) return 'male';
    if (label.includes('Female')) return 'female';
    return 'unknown';
  };

  /**
   * Handle Capture - Developer mode: always takes a fresh photo at the moment
   * of capture (no best-frame selection). TFLite's "Not a Gourd Flower/Leaf"
   * verdict is intentionally NOT a gate — Gemini is the final authority.
   * The dev screen does not perform HQ re-capture (it uses the fresh photo as-is).
   */
  const handleCapture = async () => {
    if (isCapturing) return;

    // Set capturing flag to prevent double-taps
    setIsCapturing(true);

    // Stop scanning FIRST
    stopScanning();

    console.log('📸 Capturing image...');

    let imageUri = null;
    let imageWidth = 0;
    let imageHeight = 0;

    if (lastFrameUri.current.uri) {
      // Reuse the most recent scan-loop frame if we have one
      imageUri = lastFrameUri.current.uri;
      imageWidth = lastFrameUri.current.width;
      imageHeight = lastFrameUri.current.height;
      console.log('🟢 CAPTURE: LAST FRAME');
    } else {
      // No cached frame — take a fresh one
      console.log('⚠️ No cached frame, taking fresh photo...');
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
          base64: false,
          exif: false,
          shutterSound: false,
        });
        imageUri = photo.uri;
        imageWidth = photo.width;
        imageHeight = photo.height;
        console.log('🟢 CAPTURE: FRESH (no scan frame available)');
      } catch (error) {
        console.error('❌ Capture failed:', error);
        Alert.alert(t('camera.captureFailed'), t('camera.captureFailedMessage'));
        setIsCapturing(false);
        startScanning();
        return;
      }
    }

    if (imageUri) {
      console.log('🟢 CAPTURE: URI:', imageUri.slice(-40));
    }

    // Navigate IMMEDIATELY - no waiting!
    setIsCapturing(false);
    navigation.navigate(
      scanMode === SCAN_MODES.LEAF ? 'LeafPrediction' : 'FlowerPrediction',
      {
        imageUri: imageUri,
        width: imageWidth,
        height: imageHeight,
        isLoading: true,
        returnTo: 'CameraMain',
        scanMode: scanMode,
      }
    );
    // Note: isCapturing will be reset by useFocusEffect when returning
  };

  // Handle camera ready callback - MUST be before early returns to maintain hooks order
  const handleCameraReady = useCallback(() => {
    console.log('📷 Camera is ready');
    setIsCameraReady(true);
    isCameraReadyRef.current = true;
  }, []);

  const toggleCameraFacing = useCallback(() => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  }, []);

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

  // Get color for confidence level
  const getConfidenceColor = (percentage, isUncertain) => {
    if (isUncertain) return '#9E9E9E'; // Gray for uncertain
    if (percentage >= 70) return '#4CAF50'; // Green
    if (percentage >= 40) return '#FFA500'; // Orange
    return '#F44336'; // Red
  };

  // Render Main Result Card
  const renderMainResult = () => {
    if (predictions.length === 0) return null;

    const top = predictions[0];
    const isNotFlower = top.label === 'Not Flower';
    const isLowConfidence = top.percentage < 70;
    const color = getConfidenceColor(top.percentage, isNotFlower || isLowConfidence);

    return (
      <View style={styles.mainResultCard}>
        <View style={[styles.iconContainer, { backgroundColor: isNotFlower ? 'rgba(158, 158, 158, 0.2)' : 'rgba(76, 175, 80, 0.2)' }]}>
          <Ionicons
            name={isNotFlower ? "help-circle" : "leaf"}
            size={32}
            color={color}
          />
        </View>
        <View style={styles.mainResultTextContainer}>
          <Text style={styles.mainResultLabel} numberOfLines={1}>
            {top.label}
          </Text>
          <Text style={[styles.mainResultConfidence, { color }]}>
            {top.percentage.toFixed(1)}% {t('camera.confidence')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* 1. Header using CustomHeader scanner variant */}
      <CustomHeader
        variant="scanner"
        onBackPress={() => navigation.goBack()}
        centerComponent={() => (
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                scanMode === SCAN_MODES.FLOWER && styles.segmentButtonActive
              ]}
              onPress={() => handleScanModeSwitch(SCAN_MODES.FLOWER)}
              disabled={isSwitchingMode}
            >
              <Ionicons
                name="flower-outline"
                size={16}
                color={scanMode === SCAN_MODES.FLOWER ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[
                styles.segmentText,
                scanMode === SCAN_MODES.FLOWER && styles.segmentTextActive
              ]}>{t('camera.flower')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                scanMode === SCAN_MODES.LEAF && styles.segmentButtonActive
              ]}
              onPress={() => handleScanModeSwitch(SCAN_MODES.LEAF)}
              disabled={isSwitchingMode}
            >
              <Ionicons
                name="leaf-outline"
                size={16}
                color={scanMode === SCAN_MODES.LEAF ? '#FFFFFF' : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[
                styles.segmentText,
                scanMode === SCAN_MODES.LEAF && styles.segmentTextActive
              ]}>{t('camera.leaf')}</Text>
            </TouchableOpacity>
          </View>
        )}
        rightComponent={() => (
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      />

      {/* 2. Camera Viewport (Square 1:1) */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          animateShutter={false}
          onCameraReady={handleCameraReady}
        />
      </View>

      {/* 3. Predictions (Fills remaining space) */}
      <View style={styles.predictionsContainer}>
        {!isModelReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>{t('camera.loadingModel')}</Text>
          </View>
        ) : predictions.length === 0 ? (
          <View style={styles.waitingContainer}>
            <Ionicons name="scan" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.waitingText}>{t('camera.waitingForPredictions')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.predictionsHeader}>
              <Text style={styles.predictionsTitle}>
                {isPaused ? t('camera.analysisPaused') : t('camera.realTimeAnalysis')}
              </Text>
              {isPaused && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedText}>{t('camera.paused')}</Text>
                </View>
              )}
            </View>

            {/* Main Result Card */}
            {renderMainResult()}

            {/* Secondary Predictions */}
            <View style={styles.secondaryPredictions}>
              <Text style={styles.secondaryTitle}>{t('camera.otherPossibilities')}</Text>
              {predictions.slice(1, TOP_N).map((pred, index) => {
                const key = pred.label;
                const animatedWidth = animatedBars.current[key] || new Animated.Value(pred.percentage);

                return (
                  <View key={pred.label} style={styles.secondaryRow}>
                    <Text style={styles.secondaryLabel} numberOfLines={1}>{pred.label}</Text>
                    <View style={styles.secondaryBarContainer}>
                      <Animated.View
                        style={[
                          styles.secondaryBar,
                          {
                            width: animatedWidth.interpolate({
                              inputRange: [0, 100],
                              outputRange: ['0%', '100%']
                            }),
                            backgroundColor: getConfidenceColor(pred.percentage, false)
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.secondaryPercentage}>{pred.percentage.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Capture Button at Bottom of Predictions */}
        <View style={styles.bottomControls}>
          <TouchableOpacity
            onPress={handleCapture}
            style={[
              styles.captureButton,
              (!isModelReady || isCapturing) && styles.captureButtonDisabled,
              isStable && styles.captureButtonStable
            ]}
            disabled={!isModelReady || isCapturing}
          >
            <View style={[styles.captureInner, isStable && styles.captureInnerStable]}>
              <Ionicons name="camera" size={28} color={isStable ? "#4CAF50" : "#000"} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // Segmented Control for mode switching
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 3,
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 17,
    gap: 4,
  },
  segmentButtonActive: {
    backgroundColor: '#4CAF50',
  },
  segmentText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  flipButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Camera Container
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  camera: {
    flex: 1,
  },

  // Predictions container
  predictionsContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    marginTop: -24,
    zIndex: 20,
  },
  predictionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  predictionsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  pausedBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pausedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Main Result Card
  mainResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainResultTextContainer: {
    flex: 1,
  },
  mainResultLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  mainResultConfidence: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Secondary Predictions
  secondaryPredictions: {
    gap: 12,
  },
  secondaryTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    width: '40%',
  },
  secondaryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  secondaryBar: {
    height: '100%',
    borderRadius: 4,
  },
  secondaryPercentage: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    width: 45,
    textAlign: 'right',
    fontFamily: 'monospace',
  },

  // Bottom Controls (Capture Button)
  bottomControls: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },

  // Loading state
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: theme.spacing.md,
    fontSize: 14,
  },

  // Waiting state
  waitingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  waitingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: theme.spacing.md,
    fontSize: 14,
  },

  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  permissionText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Stable state styles
  captureButtonStable: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  captureInnerStable: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
});
