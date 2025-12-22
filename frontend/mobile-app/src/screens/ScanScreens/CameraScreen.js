/**
 * CameraScreen - Teachable Machine Scanner (Replaced old Gemini Camera)
 * Real-time flower classification using TM floating point model
 * Features: Real-time scanning, Capture with Gemini AI analysis
 * Storage Optimization: Auto-cleanup of unused frames
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
  Dimensions
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy'; // Fixed deprecation
import { theme } from '../../styles';
import { modelService, CONFIDENCE_THRESHOLDS } from '../../services/modelService';
// geminiService import removed if not strictly used in this file, but keeping just in case or for consistency. 
// Actually, CameraScreenTM used it? Let's check original. Yes, imported but not seemingly used in the snippet I saw. 
// Wait, CameraScreenTM had `import { geminiService } from '../../services/geminiService';` at line 23.
import { geminiService } from '../../services/geminiService';

const SCAN_INTERVAL = 200; // 200ms between predictions (fast like TM)
const TOP_N = 3; // Show top 3 predictions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Cleanup Configuration
const RECENT_FRAMES_BUFFER = 7; // Keep last 7 frames for stability checks

export const CameraScreen = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();

  // Model State
  const [isModelReady, setIsModelReady] = useState(false);

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [processingTime, setProcessingTime] = useState(0);
  const [isStable, setIsStable] = useState(false); // Track if prediction is stable

  // Capture State
  const [isCapturing, setIsCapturing] = useState(false);

  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // LOGIC PRESERVATION: Store dimensions to fix distortion
  const lastFrameUri = useRef({ uri: null, width: 0, height: 0 });
  const bestFrame = useRef({ uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 }); // Track best stable frame
  const recentPredictions = useRef([]); // Track recent predictions for stability

  // Animated values for smooth transitions
  const animatedBars = useRef({});
  const animatedPositions = useRef({});

  // Initialize model
  useEffect(() => {
    const initializeModel = async () => {
      setIsModelReady(false);
      stopScanning();

      try {
        console.log('🧪 Initializing TM model (CameraScreen)...');
        await modelService.initialize();
        setIsModelReady(true);
        console.log('✅ TM model ready');

        // Warm up
        await modelService.warmUp();
        console.log('🔥 TM model warmed up');
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
    };
  }, []);

  // Reset state and restart scanning when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 CameraScreen focused - resetting state');
      setIsCapturing(false);
      setIsStable(false);

      // Reset best frame tracking for fresh scan
      bestFrame.current = { uri: null, width: 0, height: 0, label: null, confidence: 0, count: 0 };
      recentPredictions.current = [];
      lastFrameUri.current = { uri: null, width: 0, height: 0 };

      // Restart scanning if model is ready
      if (isModelReady && !scanIntervalRef.current) {
        startScanning();
      }

      return () => {
        // IMPORTANT: Stop scanning when screen loses focus
        console.log('📱 CameraScreen unfocused - stopping scanning');
        stopScanning();
      };
    }, [isModelReady, startScanning, stopScanning])
  );

  // Start scanning when model is ready
  useEffect(() => {
    if (isModelReady && !isScanning && !isPaused && !isCapturing) {
      startScanning();
    }
  }, [isModelReady, isCapturing]);

  /**
   * Helper: Delete image file from storage if it's not needed anymore
   */
  const deleteFrame = async (uri) => {
    if (!uri) return;

    // Safety: Don't delete if it's the currently tracked "Best Frame"
    if (uri === bestFrame.current.uri) return;

    // Safety: Don't delete if it's currently in the "Recent Predictions" buffer
    // (Note: we usually call this on the frame that *just left* the buffer, so strictly it's not there,
    // but good to be safe if calling from elsewhere)
    const isRecent = recentPredictions.current.some(p => p.uri === uri);
    if (isRecent) return;

    // Safety: Don't delete if we are capturing and this is the frame we might need
    // (This is a simplified check, but strict stopping of scanInterval is the main fix)
    if (isCapturing) return;

    try {
      // usage of getInfoAsync is deprecated and unnecessary with idempotent: true
      await FileSystem.deleteAsync(uri, { idempotent: true });
      // console.log('🗑️ Cleanup:', uri.split('/').pop());
    } catch (error) {
      console.log('⚠️ Cleanup failed (ignored):', error.message);
    }
  };

  /**
   * Start real-time scanning
   */
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    console.log('🎥 Starting TM real-time scanning...');
    setIsScanning(true);

    scanIntervalRef.current = setInterval(async () => {
      // Logic Preservation: Added strict check for null scanIntervalRef
      if (!cameraRef.current || !isModelReady || isPaused) return;

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

        // Logic Preservation: Check if stopped during async capture
        if (!scanIntervalRef.current) {
          // If we stopped, delete this stray frame immediately
          deleteFrame(photo.uri);
          return;
        }

        // Save the last frame URI for instant capture
        // Check if we need to delete the PREVIOUS lastFrameUri (if it's not best/recent)
        if (lastFrameUri.current.uri && lastFrameUri.current.uri !== photo.uri) {
          deleteFrame(lastFrameUri.current.uri);
        }
        lastFrameUri.current = { uri: photo.uri, width: photo.width, height: photo.height };

        // Run prediction
        const result = await modelService.quickPredict(photo.uri, photo.width, photo.height);

        // DEBUG: Log real-time prediction
        // console.log('🔴 REALTIME:', result.topPrediction.label, `(${result.topPrediction.percentage.toFixed(1)}%)`);

        // Track stability: count consecutive same predictions
        const currentLabel = result.topPrediction.label;
        const currentConfidence = result.topPrediction.percentage;

        // Add to recent predictions 
        recentPredictions.current.push({
          label: currentLabel,
          confidence: currentConfidence,
          uri: photo.uri,
          width: photo.width,
          height: photo.height
        });

        // CLEANUP: If buffer full, remove oldest and delete its file
        if (recentPredictions.current.length > RECENT_FRAMES_BUFFER) {
          const removed = recentPredictions.current.shift();
          // Safety: Check if scanning is still active before deleting (though deleteFrame has checks too)
          if (scanIntervalRef.current && removed && removed.uri) {
            deleteFrame(removed.uri);
          }
        }

        // Check for stable prediction 
        const recent = recentPredictions.current;
        const lastFive = recent.slice(-5);
        const stableNow = lastFive.length >= 5 && lastFive.every(p => p.label === currentLabel);

        // Update UI stability indicator
        setIsStable(stableNow && currentLabel !== 'Not Flower');

        // Update best frame if:
        if (stableNow && currentLabel !== 'Not Flower') {
          const oldBestUri = bestFrame.current.uri;

          if (currentLabel === bestFrame.current.label) {
            // Same label - update if higher confidence
            if (currentConfidence > bestFrame.current.confidence) {
              bestFrame.current = {
                uri: photo.uri,
                width: photo.width,
                height: photo.height,
                label: currentLabel,
                confidence: currentConfidence,
                count: lastFive.length
              };
              console.log('🏆 BEST FRAME updated (higher confidence):', currentLabel, `${currentConfidence.toFixed(1)}%`);

              // If we replaced the best frame, the old one might be garbage now
              if (oldBestUri && oldBestUri !== photo.uri) {
                deleteFrame(oldBestUri);
              }
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
                count: lastFive.length
              };
              console.log('🏆 BEST FRAME changed to:', currentLabel, `${currentConfidence.toFixed(1)}%`);

              // If we replaced the best frame, the old one might be garbage now
              if (oldBestUri && oldBestUri !== photo.uri) {
                deleteFrame(oldBestUri);
              }
            }
          }
        }

        // Update predictions with animations
        // Filter: Always keep top 1, but for others require at least 40% confidence
        const topPredictions = result.predictions
          .filter((p, i) => i === 0 || p.percentage >= 40)
          .slice(0, TOP_N);

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
    }, SCAN_INTERVAL);
  }, [isModelReady, isPaused]);

  /**
   * Stop scanning
   */
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      console.log('🛑 Stopping TM scanning');
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      setIsScanning(false);
    }
  }, []);

  /**
   * Handle Capture - Uses the BEST STABLE frame from real-time scanning
   * Prioritizes frames where the prediction was stable
   * Falls back to best recent frame, then last frame
   */
  const handleCapture = async () => {
    if (isCapturing) return;

    // Set capturing flag to prevent double-taps
    setIsCapturing(true);

    // CRITICAL FIX: Stop scanning FIRST and ensure it knows we are capturing
    // This prevents any pending intervals from deleting our frame
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      setIsScanning(false);
      console.log('🛑 Stopped scanning immediately for capture');
    }

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
      const bestRecent = recentPredictions.current
        .filter(p => p.label !== 'Not Flower')
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
        navigation.navigate('Results', {
          imageUri: photo.uri,
          width: photo.width,
          height: photo.height,
          isLoading: true,
        });
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

    // CRITICAL FIX: Move the file to a safe location to prevent "cleanup" race conditions
    // The scan interval might still be running a "zombie" tick that deletes frames
    try {
      // Ensure target directory exists
      const targetDir = FileSystem.cacheDirectory + 'captures/';
      const dirInfo = await FileSystem.getInfoAsync(targetDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
      }

      const filename = imageUri.split('/').pop();
      const safeUri = targetDir + 'safe_' + filename;

      // Check if source file exists
      const sourceInfo = await FileSystem.getInfoAsync(imageUri);
      if (sourceInfo.exists) {
        await FileSystem.moveAsync({
          from: imageUri,
          to: safeUri
        });
        console.log('🔒 Securely moved capture to:', safeUri.slice(-40));
        imageUri = safeUri; // Use the new safe URI
      } else {
        console.warn('⚠️ Source file for move not found:', imageUri);
        // Continue with original URI if move fails (it might still work if not deleted)
      }
    } catch (error) {
      console.error('⚠️ Failed to move capture to safe location:', error);
      // If move fails, we try with original, but it might crash
    }

    // Navigate IMMEDIATELY to 'Results' (Fixed from 'ResultsTM')
    navigation.navigate('Results', {
      imageUri: imageUri,
      width: imageWidth,
      height: imageHeight,
      isLoading: true,
      // Pass the prediction we *already* have to save time? 
      // Actually ResultsScreenTM re-runs analysis. 
      // If we want to skip re-running TM, we could pass it.
      // But user wants "keep all progress on logic", and current logic in ResultsScreenTM runs it.
      // So we keep it as is.
    });
    // Note: isCapturing will be reset by useFocusEffect when returning
  };

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

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

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
            {top.percentage.toFixed(1)}% Confidence
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Removed as requested */}
      { /* <View style={styles.header}> ... </View> */}

      <View style={styles.settingsOverlay}>
        <TouchableOpacity style={styles.backButtonOverlay} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.badgeOverlay, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.badgeText}>Real-time Scan</Text>
        </View>

        <TouchableOpacity style={styles.settingsButtonOverlay} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 2. Camera Viewport (Square 1:1) */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          animateShutter={false}
        />
        {/* Guidebox Removed */}
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
            <View style={styles.predictionsHeader}>
              <Text style={styles.predictionsTitle}>
                {isPaused ? 'Analysis Paused' : 'Real-time Analysis'}
              </Text>
              {isPaused && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedText}>PAUSED</Text>
                </View>
              )}
            </View>

            {/* Main Result Card */}
            {renderMainResult()}

            {/* Secondary Predictions */}
            <View style={styles.secondaryPredictions}>
              <Text style={styles.secondaryTitle}>Other Possibilities</Text>
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
          <Text style={[styles.captureHint, isStable && styles.captureHintStable]}>
            {!isModelReady ? 'Loading model...' :
              isStable ? '✓ Stable detection - Tap to capture!' :
                'Hold steady for best results'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 40, // Status bar padding
  },

  // Header Overlay replacing the old header block
  settingsOverlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 50, // Higher than camera
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  backButtonOverlay: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent bg for visibility
    borderRadius: 20,
  },
  settingsButtonOverlay: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  badgeOverlay: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Camera Container
  cameraContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
    backgroundColor: '#1a1a1a', // Placeholder color
  },
  camera: {
    flex: 1,
  },

  // Predictions container
  predictionsContainer: {
    flex: 1, // Fill remaining space
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.lg,
    marginTop: -24, // Overlap slightly with camera
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
  captureHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 8,
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