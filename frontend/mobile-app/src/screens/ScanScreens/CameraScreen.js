/**
 * CameraScreen - Teachable Machine Scanner
 * Real-time classification using TM floating point model
 * Supports: Flower and Leaf scanning modes
 * Features: Real-time scanning, Capture with Gemini AI analysis
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

const SCAN_INTERVAL = 200; // 200ms between predictions (fast like TM)
const CONFIDENCE_THRESHOLD = 0.60; // Minimum confidence to display a detection
const PREDICTION_BUFFER_SIZE = 15; // Frames kept in rolling buffer
const STABLE_FRAME_GATE = 7; // Consecutive matching frames required for stability
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CameraScreen = ({ navigation }) => {
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
  const [isCapturing, setIsCapturing] = useState(false);

  // Scan Mode State
  const [scanMode, setScanMode] = useState(SCAN_MODES.FLOWER);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isModelReadyRef = useRef(false); // Ref to avoid stale closure in scan loop
  const isCameraReadyRef = useRef(false); // Ref to track camera readiness in scan loop

  // LOGIC PRESERVATION: Store dimensions to fix distortion
  const lastFrameUri = useRef({ uri: null, width: 0, height: 0 });
  const bestFrame = useRef({ uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 }); // Track best stable frame
  const recentPredictions = useRef([]); // Track recent predictions for stability

  // Floating tip animation
  const tipFadeAnim = useRef(new Animated.Value(1)).current;
  const tipTimerRef = useRef(null);

  useEffect(() => {
    if (scanMode === SCAN_MODES.FLOWER) {
      // Reset fade and start 5-second auto-hide timer
      tipFadeAnim.setValue(1);
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
      tipTimerRef.current = setTimeout(() => {
        Animated.timing(tipFadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start();
      }, 5000);
    } else {
      // Hide immediately in Leaf mode
      tipFadeAnim.setValue(0);
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    }

    return () => {
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    };
  }, [scanMode]);

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
    recentPredictions.current = [];
    bestFrame.current = { uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 };
    lastFrameUri.current = { uri: null, width: 0, height: 0 }; // Clear stale frames from previous mode

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
      Alert.alert('Mode Switch Error', `Failed to switch to ${newMode} mode.`);
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

        // Track stability: count consecutive same predictions
        const currentLabel = result.topPrediction.label;
        const currentConfidence = result.topPrediction.percentage;

        // Add to recent predictions
        // Logic Preservation: Increased buffer to 7 for better "recent" selection
        recentPredictions.current.push({
          label: currentLabel,
          confidence: currentConfidence,
          uri: photo.uri,
          width: photo.width,
          height: photo.height
        });
        if (recentPredictions.current.length > PREDICTION_BUFFER_SIZE) {
          recentPredictions.current.shift();
        }

        // Check for stable prediction using 7-frame gate
        const recent = recentPredictions.current;
        const lastSeven = recent.slice(-STABLE_FRAME_GATE);
        const stableNow = lastSeven.length >= STABLE_FRAME_GATE && lastSeven.every(p => p.label === currentLabel);

        // Mode-aware rejection label check
        const rejectionLabel = scanMode === SCAN_MODES.LEAF ? 'Not Leaf' : 'Not Flower';

        // Update UI stability indicator
        setIsStable(stableNow && currentLabel !== rejectionLabel);

        // Update best frame if:
        if (stableNow && currentLabel !== rejectionLabel) {
          if (currentLabel === bestFrame.current.label) {
            // Same label - update if higher confidence
            if (currentConfidence > bestFrame.current.confidence) {
              bestFrame.current = {
                uri: photo.uri,
                width: photo.width,
                height: photo.height,
                label: currentLabel,
                confidence: currentConfidence,
                count: lastSeven.length
              };
              console.log('🏆 BEST FRAME updated (higher confidence):', currentLabel, `${currentConfidence.toFixed(1)}%`);
            }
          } else {
            // Different label - update if this stable prediction is more confident
            if (currentConfidence > bestFrame.current.confidence) {
              bestFrame.current = {
                uri: photo.uri,
                width: photo.width,
                height: photo.height,
                label: currentLabel,
                confidence: currentConfidence,
                count: lastSeven.length
              };
              console.log('🏆 BEST FRAME changed to:', currentLabel, `${currentConfidence.toFixed(1)}%`);
            }
          }
        }

        // Update predictions — only the top result needed for the detection pill
        const topPredictions = result.predictions.slice(0, 1);

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
          'Model Error',
          'Failed to load Teachable Machine model. Please try again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    };

    initializeModel();

    return () => {
      stopScanning();
      isModelReadyRef.current = false; // Reset ref on cleanup
      // Memory cleanup
      recentPredictions.current = [];
      bestFrame.current = { uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 };
      lastFrameUri.current = { uri: null, width: 0, height: 0 };
    };
  }, [stopScanning]);

  // Reset state and restart scanning when screen comes into focus
  // Also hide tab bar when on this screen
  useFocusEffect(
    useCallback(() => {
      console.log('📱 CameraScreen focused - resetting state');
      setIsCapturing(false);
      setIsStable(false);

      // Hide tab bar when on camera screen
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: 'none' }
      });

      // Reset best frame tracking for fresh scan
      bestFrame.current = { uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 };
      recentPredictions.current = [];
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
   * Handle Capture - Uses the BEST STABLE frame from real-time scanning
   * Prioritizes frames where the prediction was stable
   * Falls back to best recent frame, then last frame
   */
  const handleCapture = async () => {
    if (isCapturing) return;

    // Set capturing flag to prevent double-taps
    setIsCapturing(true);

    // Stop scanning FIRST
    stopScanning();

    console.log('📸 Capturing image...');

    // Prefer the BEST STABLE frame, fall back to Best Recent, then Last Frame
    let imageUri = null;
    let imageWidth = 0;
    let imageHeight = 0;
    let selectionReason = '';

    // 1. Try Best Stable Frame
    if (bestFrame.current.uri && bestFrame.current.confidence > 50) {
      imageUri = bestFrame.current.uri;
      imageWidth = bestFrame.current.width;
      imageHeight = bestFrame.current.height;
      selectionReason = `BEST STABLE: ${bestFrame.current.label} (${bestFrame.current.confidence.toFixed(1)}%)`;
    }
    // Logic Preservation: 2. Try Best Recent Frame (Intelligent Capture)
    else {
      // Mode-aware rejection label
      const rejectionLabel = scanMode === SCAN_MODES.LEAF ? 'Not Leaf' : 'Not Flower';
      const bestRecent = recentPredictions.current
        .filter(p => p.label !== rejectionLabel)
        .sort((a, b) => b.confidence - a.confidence)[0];

      if (bestRecent && bestRecent.confidence > 60) {
        imageUri = bestRecent.uri;
        imageWidth = bestRecent.width;
        imageHeight = bestRecent.height;
        selectionReason = `BEST RECENT: ${bestRecent.label} (${bestRecent.confidence.toFixed(1)}%)`;
      }
      // 3. Fallback to Last Frame
      else if (lastFrameUri.current.uri) {
        imageUri = lastFrameUri.current.uri;
        imageWidth = lastFrameUri.current.width;
        imageHeight = lastFrameUri.current.height;
        selectionReason = 'LAST FRAME (no stable prediction found)';
      }
    }

    if (!imageUri) {
      // Fallback: take a new photo if no frame available
      console.log('⚠️ No cached frame, taking new photo...');
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
          base64: false,
          exif: false,
          shutterSound: false,
        });

        console.log('✅ Image captured:', photo.uri);
        navigation.navigate(
          scanMode === SCAN_MODES.LEAF ? 'LeafPrediction' : 'FlowerPrediction',
          {
            imageUri: photo.uri,
            width: photo.width,
            height: photo.height,
            isLoading: true,
            returnTo: 'CameraMain',
            scanMode: scanMode,
          }
        );
      } catch (error) {
        console.error('❌ Capture failed:', error);
        Alert.alert('Capture Failed', 'Unable to capture image. Please try again.');
        setIsCapturing(false);
        startScanning();
      }
      return;
    }

    console.log('🟢 CAPTURE:', selectionReason);
    console.log('🟢 CAPTURE: URI:', imageUri.slice(-40));

    // Re-capture at higher quality for accurate final prediction
    // The scanning loop uses quality 0.5 for speed — upgrade the selected frame
    let finalUri = imageUri;
    let finalWidth = imageWidth;
    let finalHeight = imageHeight;
    try {
      if (cameraRef.current) {
        const hqPhoto = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: true,
          base64: false,
          exif: false,
          shutterSound: false,
        });
        if (hqPhoto?.uri) {
          finalUri = hqPhoto.uri;
          finalWidth = hqPhoto.width;
          finalHeight = hqPhoto.height;
          console.log('📸 HQ re-capture successful:', hqPhoto.width, 'x', hqPhoto.height);
        }
      }
    } catch (hqErr) {
      console.warn('⚠️ HQ re-capture failed, using scan frame:', hqErr.message);
      // Fall through — use the original scanning frame
    }

    // Navigate with the best available image
    // Logic Preservation: Passing width and height to fix distortion
    setIsCapturing(false);
    navigation.navigate(
      scanMode === SCAN_MODES.LEAF ? 'LeafPrediction' : 'FlowerPrediction',
      {
        imageUri: finalUri,
        width: finalWidth,
        height: finalHeight,
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
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render single Detection Pill — shows variety+confidence above threshold, 'Detecting...' below
  const renderDetectionPill = () => {
    if (predictions.length === 0) return null;

    const top = predictions[0];
    const isRejection = top.label === 'Not Flower' || top.label === 'Not Leaf';
    const isAboveThreshold = top.percentage / 100 >= CONFIDENCE_THRESHOLD;
    const showDetection = isAboveThreshold && !isRejection;
    const color = showDetection ? '#4CAF50' : top.percentage >= 40 ? '#FFA500' : '#9E9E9E';
    const statusText =
      isStable && showDetection
        ? 'Ready to capture'
        : 'Point camera at a gourd flower or leaf';

    return (
      <>
        <View style={[styles.detectionPill, isStable && showDetection && styles.detectionPillActive]}>
          <View style={[styles.pillDot, { backgroundColor: color }]} />
          <Text style={[styles.pillText, { color }]} numberOfLines={1}>
            {showDetection ? `${top.label}  ${top.percentage.toFixed(1)}%` : 'Detecting...'}
          </Text>
        </View>
        <Text style={styles.statusText}>{statusText}</Text>
      </>
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
              ]}>Flower</Text>
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
              ]}>Leaf</Text>
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
        {/* Framing guide overlay — corner brackets to guide subject placement */}
        <View style={styles.framingGuide} pointerEvents="none">
          <View style={styles.framingRect}>
            <View style={[styles.framingCorner, styles.cornerTL]} />
            <View style={[styles.framingCorner, styles.cornerTR]} />
            <View style={[styles.framingCorner, styles.cornerBL]} />
            <View style={[styles.framingCorner, styles.cornerBR]} />
          </View>
        </View>
        {/* Floating tip for flower mode */}
        {scanMode === SCAN_MODES.FLOWER && (
          <Animated.View style={[styles.floatingTip, { opacity: tipFadeAnim }]} pointerEvents="none">
            <Ionicons name="information-circle-outline" size={16} color="#FFF" />
            <Text style={styles.floatingTipText}>
              Adjust your angle and show the back of the flower for better prediction quality
            </Text>
          </Animated.View>
        )}
      </View>

      {/* 3. Predictions (Fills remaining space) */}
      <View style={styles.predictionsContainer}>
        {!isModelReady ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading model...</Text>
          </View>
        ) : predictions.length === 0 ? (
          <View style={styles.waitingContainer}>
            <Ionicons name="scan" size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.waitingText}>Waiting for predictions...</Text>
          </View>
        ) : (
          <>
            {/* Detection Pill */}
            {renderDetectionPill()}
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

  // Floating tip (flower mode)
  floatingTip: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    zIndex: 10,
  },
  floatingTipText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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

  // Detection Pill
  detectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  detectionPillActive: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statusText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Framing guide corners
  framingGuide: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  framingRect: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
  },
  framingCorner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

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
