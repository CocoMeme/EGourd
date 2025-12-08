/**
 * CameraScreenTM - Teachable Machine Universal Scanner
 * Combined screen for both Floating Point and Quantized models
 * Features: Real-time scanning, Capture (Freeze), Model Selection
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
  Switch
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { modelServiceTM } from '../../services/modelServiceTM';

const SCAN_INTERVAL = 200; // 200ms between predictions (fast like TM)
const TOP_N = 3; // Show top 3 predictions
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CameraScreenTM = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  
  // Model State
  const [isModelReady, setIsModelReady] = useState(false);
  const [currentModelType, setCurrentModelType] = useState('float'); // 'float' or 'quantized'

  // Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // For "Capture" mode
  const [predictions, setPredictions] = useState([]);
  const [processingTime, setProcessingTime] = useState(0);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current; // Start off-screen right

  const cameraRef = useRef(null);
  const scanIntervalRef = useRef(null);
  
  // Animated values for smooth transitions
  const animatedBars = useRef({});
  const animatedPositions = useRef({});

  // Initialize model
  useEffect(() => {
    const initializeModel = async () => {
      setIsModelReady(false);
      stopScanning();

      try {
        console.log(`🧪 Initializing TM model (${currentModelType})...`);
        await modelServiceTM.initialize(currentModelType);
        setIsModelReady(true);
        console.log('✅ TM model ready');
        
        // Warm up
        await modelServiceTM.warmUp();
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
  }, [currentModelType]);

  // Start scanning when model is ready
  useEffect(() => {
    if (isModelReady && !isScanning && !isPaused) {
      startScanning();
    }
  }, [isModelReady]);

  // Handle Settings Animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showSettings ? 0 : SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showSettings]);

  /**
   * Start real-time scanning
   */
  const startScanning = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

    console.log('🎥 Starting TM real-time scanning...');
    setIsScanning(true);

    scanIntervalRef.current = setInterval(async () => {
      if (!cameraRef.current || !isModelReady || isPaused) return;

      try {
        // Capture frame with decent quality for accurate predictions
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,  // Balance between speed and accuracy
          skipProcessing: true,
          base64: false,
          exif: true, // Needed for orientation
          isImageMirror: false,
          shutterSound: false,
        });

        // Run prediction
        const result = await modelServiceTM.quickPredict(photo.uri, photo.width, photo.height);
        
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
   * Toggle Capture (Freeze/Unfreeze)
   */
  const toggleCapture = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    if (newPausedState) {
      stopScanning();
    } else {
      startScanning();
    }
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
    const isUncertain = top.isSynthetic || top.percentage < 70;
    const color = getConfidenceColor(top.percentage, isUncertain);
    
    return (
      <View style={styles.mainResultCard}>
        <View style={[styles.iconContainer, { backgroundColor: isUncertain ? 'rgba(158, 158, 158, 0.2)' : 'rgba(76, 175, 80, 0.2)' }]}>
          <Ionicons 
            name={isUncertain ? "help-circle" : "leaf"} 
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
      {/* 1. Header (Fixed at top) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={[styles.badge, { backgroundColor: currentModelType === 'float' ? '#2196F3' : '#FF9800' }]}>
            <Text style={styles.badgeText}>
              {currentModelType === 'float' ? 'High Accuracy' : 'Fast Mode'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
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
          <TouchableOpacity onPress={toggleCapture} style={styles.captureButton}>
            <View style={[styles.captureInner, isPaused && styles.captureInnerActive]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Slide-out Menu (Full Width) */}
      {showSettings && (
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.settingsMenu, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeButton}>
                <Ionicons name="close" size={32} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Model Type</Text>
              
              <TouchableOpacity 
                style={styles.radioOption} 
                onPress={() => setCurrentModelType('float')}
              >
                <View style={[styles.radioCircle, currentModelType === 'float' && styles.radioCircleSelected]}>
                  {currentModelType === 'float' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioTextContainer}>
                  <Text style={styles.radioLabel}>Floating Point</Text>
                  <Text style={styles.radioSubLabel}>Higher accuracy, standard speed</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.radioOption} 
                onPress={() => setCurrentModelType('quantized')}
              >
                <View style={[styles.radioCircle, currentModelType === 'quantized' && styles.radioCircleSelected]}>
                  {currentModelType === 'quantized' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioTextContainer}>
                  <Text style={styles.radioLabel}>Quantized</Text>
                  <Text style={styles.radioSubLabel}>Faster performance, slightly lower accuracy</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.settingItem} onPress={toggleCameraFacing}>
              <Text style={styles.settingLabel}>Flip Camera</Text>
              <Ionicons name="camera-reverse-outline" size={24} color="#FFF" />
            </TouchableOpacity>

          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 40, // Status bar padding
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    height: 80,
    zIndex: 10,
  },
  headerCenter: {
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
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
    paddingBottom: 10, // Reduced padding to move it lower
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFF',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF',
  },
  captureInnerActive: {
    backgroundColor: '#FF5252', // Red when paused/captured
    transform: [{ scale: 0.8 }],
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

  // Settings Menu
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    flexDirection: 'row',
  },
  settingsMenu: {
    width: '100%', // Full width
    height: '100%',
    backgroundColor: '#1E1E1E',
    padding: 20,
    paddingTop: 50,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  settingsTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  
  // Settings Sections
  settingSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  // Radio Options
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  radioCircleSelected: {
    borderColor: '#2196F3',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  radioSubLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },

  // Other Settings
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  settingLabel: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '500',
  },
});
