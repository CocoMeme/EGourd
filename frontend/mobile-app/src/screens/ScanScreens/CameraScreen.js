import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert, Animated, Modal, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles';
import { modelService } from '../../services/modelService';
import { geminiService } from '../../services/geminiService';

// Real-time scanning configuration
const REALTIME_CONFIG = {
  enabled: true,              // Enable/disable real-time scanning
  intervalMs: 750,            // Time between predictions (ms)
  stabilizationCount: 3,      // Number of consistent predictions needed
  showOverlay: true,          // Show prediction overlay on camera
};

export const CameraScreen = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const cameraRef = useRef(null);
  
  // Real-time scanning state
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(REALTIME_CONFIG.enabled);
  const [livePrediction, setLivePrediction] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scanIntervalRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Gemini validation state
  const [showPredictionConflict, setShowPredictionConflict] = useState(null);
  const [validationStatus, setValidationStatus] = useState('tflite_only');

  // Initialize model when component mounts
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('🤖 Initializing model service...');
        await modelService.initialize();
        setIsModelReady(true);
        console.log('✅ Model service ready');
        
        // Get model info
        const modelInfo = modelService.getModelInfo();
        console.log('📊 Model info:', modelInfo);
        
        // Warm up the model
        await modelService.warmUp();
        console.log('🔥 Model warmed up');
      } catch (error) {
        console.error('❌ Model initialization failed:', error);
        Alert.alert(
          'Model Error',
          'Failed to load AI model. The app will still work but predictions may not be available.',
          [{ text: 'OK' }]
        );
      }
    };

    initializeModel();
    
    // Cleanup on unmount
    return () => {
      stopRealTimeScanning();
      modelService.clearHistory();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery access is required to pick images.');
      }
    })();
  }, []);

  // Start/stop real-time scanning when camera is active
  useEffect(() => {
    if (isModelReady && !capturedImage && isRealTimeEnabled) {
      startRealTimeScanning();
    } else {
      stopRealTimeScanning();
    }
    
    return () => stopRealTimeScanning();
  }, [isModelReady, capturedImage, isRealTimeEnabled]);

  // Animate prediction overlay
  useEffect(() => {
    if (livePrediction) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, { toValue: 0.7, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [livePrediction]);

  /**
   * Start real-time scanning - captures frames periodically and runs predictions
   */
  const startRealTimeScanning = useCallback(() => {
    if (scanIntervalRef.current) return; // Already scanning
    
    console.log('🎥 Starting real-time scanning...');
    setIsScanning(true);
    
    scanIntervalRef.current = setInterval(async () => {
      if (!cameraRef.current || !isModelReady || capturedImage) {
        return;
      }
      
      try {
        // Take a quick snapshot (no flash, no sound)
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,  // Decent quality for accuracy
          skipProcessing: true,
          base64: false,
          exif: false,
          isImageMirror: false,
          shutterSound: false,
        });
        
        // Run quick prediction
        const prediction = await modelService.quickPredict(photo.uri);
        
        // Get stabilized prediction
        const stablePrediction = modelService.getStabilizedPrediction();
        
        if (stablePrediction) {
          setLivePrediction(stablePrediction);
        }
      } catch (error) {
        // Silently ignore errors during real-time scanning
        console.log('Real-time scan error (ignored):', error.message);
      }
    }, REALTIME_CONFIG.intervalMs);
  }, [isModelReady, capturedImage]);

  /**
   * Stop real-time scanning
   */
  const stopRealTimeScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      console.log('🛑 Stopping real-time scanning');
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
      setIsScanning(false);
    }
  }, []);

  /**
   * Toggle real-time scanning on/off
   */
  const toggleRealTimeScanning = () => {
    setIsRealTimeEnabled(prev => !prev);
    if (isRealTimeEnabled) {
      setLivePrediction(null);
      modelService.clearHistory();
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture: ' + error.message);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  const analyzePicture = async () => {
    try {
      setIsProcessing(true);
      
      // Ensure model is ready
      if (!isModelReady) {
        Alert.alert(
          'Model Loading',
          'AI model is still loading. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('🔍 Analyzing image...');
      
      // Step 1: Get TFLite prediction (fast, offline)
      const tflitePrediction = await modelService.predictFlowerGender(capturedImage);
      console.log('✅ TFLite prediction:', tflitePrediction);
      
      let geminiPrediction = null;
      let finalPrediction = tflitePrediction;
      let currentValidationStatus = 'tflite_only';
      let comparisonResult = null;

      // Step 2: Try Gemini validation if enabled
      try {
        // Initialize Gemini if not already done
        if (!geminiService.isAvailable()) {
          await geminiService.initialize();
        }

        if (geminiService.isAvailable()) {
          console.log('🤖 Validating with Gemini AI...');
          geminiPrediction = await geminiService.analyzeFlower(capturedImage);
          console.log('✅ Gemini prediction:', geminiPrediction);
          
          // Step 3: Compare predictions
          comparisonResult = geminiService.comparePredictions(tflitePrediction, geminiPrediction);
          console.log('📊 Comparison result:', comparisonResult);

          if (comparisonResult.agree) {
            // Both models agree - high confidence!
            currentValidationStatus = 'validated';
            finalPrediction = comparisonResult.recommendation === 'gemini' 
              ? geminiPrediction 
              : tflitePrediction;
            
            console.log('✅ Models agree! Using:', comparisonResult.recommendation);
          } else {
            // Models disagree - show conflict resolution modal
            currentValidationStatus = 'conflict';
            console.log('⚠️ Models disagree - showing conflict modal');
            
            setShowPredictionConflict({
              tflite: tflitePrediction,
              gemini: geminiPrediction,
              photo: capturedImage,
              comparison: comparisonResult,
            });
            setIsProcessing(false);
            return; // Wait for user to choose
          }
        } else {
          console.log('ℹ️ Gemini not available, using TFLite only');
        }

      } catch (geminiError) {
        console.warn('⚠️ Gemini validation failed, using TFLite only:', geminiError.message);
        // Fallback to TFLite if Gemini API fails (offline/network issues)
        currentValidationStatus = 'tflite_only';
      }

      // Navigate to results screen with prediction data
      setValidationStatus(currentValidationStatus);
      navigation.navigate('Results', {
        imageUri: capturedImage,
        prediction: finalPrediction,
        validationStatus: currentValidationStatus,
        tflitePrediction,
        geminiPrediction,
        comparisonResult,
      });
      
    } catch (error) {
      console.error('❌ Analysis error:', error);
      
      // Show user-friendly error message
      Alert.alert(
        'Analysis Failed',
        error.message || 'Unable to analyze the image. Please try again with a clearer photo.',
        [
          { text: 'Retake', onPress: retakePicture },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle user's choice when predictions conflict
   */
  const handleConflictResolution = (chosenPrediction, source) => {
    console.log('👤 User chose:', source);
    
    navigation.navigate('Results', {
      imageUri: showPredictionConflict.photo,
      prediction: chosenPrediction,
      validationStatus: 'manual_override',
      tflitePrediction: showPredictionConflict.tflite,
      geminiPrediction: showPredictionConflict.gemini,
      comparisonResult: showPredictionConflict.comparison,
      userChoice: source,
    });
    
    setShowPredictionConflict(null);
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          
          {/* Show processing overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Analyzing flower...</Text>
              <Text style={styles.processingSubtext}>This may take a moment</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={retakePicture}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={32} color={theme.colors.error} />
            <Text style={styles.actionButtonText}>Retake</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.analyzeButton]} 
            onPress={analyzePicture}
            disabled={isProcessing || !isModelReady}
          >
            {isProcessing ? (
              <ActivityIndicator size={32} color={theme.colors.success} />
            ) : (
              <Ionicons 
                name="checkmark-circle" 
                size={32} 
                color={isModelReady ? theme.colors.success : theme.colors.text.secondary} 
              />
            )}
            <Text style={[
              styles.actionButtonText,
              (!isModelReady || isProcessing) && styles.actionButtonTextDisabled
            ]}>
              {isProcessing ? 'Analyzing...' : isModelReady ? 'Analyze' : 'Loading...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            
            {/* Real-time scanning toggle */}
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                isRealTimeEnabled && styles.controlButtonActive
              ]} 
              onPress={toggleRealTimeScanning}
            >
              <Ionicons 
                name={isRealTimeEnabled ? "eye" : "eye-off"} 
                size={28} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            
            {/* TM Test Mode Toggle */}
            <TouchableOpacity 
              style={[styles.controlButton, styles.tmButton]} 
              onPress={() => navigation.navigate('CameraScreenTM')}
            >
              <Ionicons name="flask" size={28} color="#FF9800" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <Ionicons name="camera-reverse" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerGuide}>
            <View style={[styles.guidebox, isScanning && styles.guideboxScanning]} />
            <Text style={styles.guideText}>
              {isRealTimeEnabled 
                ? (isScanning ? 'Scanning...' : 'Real-time mode active') 
                : 'Position gourd within frame'}
            </Text>
            
            {/* Live Prediction Overlay */}
            {livePrediction && isRealTimeEnabled && (
              <Animated.View style={[styles.livePredictionOverlay, { opacity: fadeAnim }]}>
                <View style={styles.predictionContent}>
                  <Ionicons 
                    name={livePrediction.gender === 'female' ? 'female' : 'male'} 
                    size={24} 
                    color={livePrediction.gender === 'female' ? '#FF69B4' : '#4169E1'} 
                  />
                  <View style={styles.predictionTextContainer}>
                    <Text style={styles.predictionVariety}>
                      {livePrediction.variety || 'Gourd'}
                    </Text>
                    <Text style={[
                      styles.predictionGender,
                      { color: livePrediction.gender === 'female' ? '#FF69B4' : '#4169E1' }
                    ]}>
                      {livePrediction.gender?.toUpperCase() || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round((livePrediction.confidence || 0) * 100)}%
                    </Text>
                  </View>
                </View>
                {livePrediction.confidence < 0.65 && (
                  <Text style={styles.lowConfidenceWarning}>
                    Low confidence - try better angle
                  </Text>
                )}
              </Animated.View>
            )}
          </View>

          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureButton} 
              onPress={takePicture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </View>
      </CameraView>

      {/* Conflict Resolution Modal */}
      {showPredictionConflict && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPredictionConflict(null)}
        >
          <View style={styles.conflictModalOverlay}>
            <View style={styles.conflictModalContainer}>
              <ScrollView 
                style={styles.conflictScrollView}
                contentContainerStyle={styles.conflictScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Header */}
                <View style={styles.conflictHeader}>
                  <Ionicons name="alert-circle" size={48} color="#FF9800" />
                  <Text style={styles.conflictTitle}>Different Predictions</Text>
                  <Text style={styles.conflictSubtitle}>
                    Our AI models have different opinions. Please choose which one looks correct:
                  </Text>
                </View>

                {/* TFLite Prediction Option */}
                <TouchableOpacity
                  style={styles.predictionOption}
                  onPress={() => handleConflictResolution(
                    showPredictionConflict.tflite,
                    'tflite'
                  )}
                  activeOpacity={0.7}
                >
                  <View style={styles.predictionOptionHeader}>
                    <View style={styles.predictionBadge}>
                      <Ionicons name="phone-portrait" size={16} color="#FFFFFF" />
                      <Text style={styles.predictionBadgeText}>On-Device</Text>
                    </View>
                    <Text style={styles.predictionConfidenceBadge}>
                      {Math.round(showPredictionConflict.tflite.confidence)}%
                    </Text>
                  </View>
                  
                  <View style={styles.predictionContent}>
                    <Ionicons 
                      name={showPredictionConflict.tflite.gender === 'female' ? 'female' : 'male'} 
                      size={32} 
                      color={showPredictionConflict.tflite.gender === 'female' ? '#FF69B4' : '#4169E1'} 
                    />
                    <View style={styles.predictionTextContent}>
                      <Text style={styles.predictionVarietyText}>
                        {showPredictionConflict.tflite.variety || 'Unknown'}
                      </Text>
                      <Text style={[
                        styles.predictionGenderText,
                        { color: showPredictionConflict.tflite.gender === 'female' ? '#FF69B4' : '#4169E1' }
                      ]}>
                        {showPredictionConflict.tflite.gender?.toUpperCase() || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.predictionNote}>
                    Fast offline detection • {showPredictionConflict.tflite.modelType}
                  </Text>
                </TouchableOpacity>

                {/* Gemini Prediction Option */}
                <TouchableOpacity
                  style={styles.predictionOption}
                  onPress={() => handleConflictResolution(
                    showPredictionConflict.gemini,
                    'gemini'
                  )}
                  activeOpacity={0.7}
                >
                  <View style={styles.predictionOptionHeader}>
                    <View style={[styles.predictionBadge, styles.geminiBadge]}>
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.predictionBadgeText}>Gemini AI</Text>
                    </View>
                    <Text style={styles.predictionConfidenceBadge}>
                      {Math.round(showPredictionConflict.gemini.confidence)}%
                    </Text>
                  </View>
                  
                  <View style={styles.predictionContent}>
                    <Ionicons 
                      name={showPredictionConflict.gemini.gender === 'female' ? 'female' : 'male'} 
                      size={32} 
                      color={showPredictionConflict.gemini.gender === 'female' ? '#FF69B4' : '#4169E1'} 
                    />
                    <View style={styles.predictionTextContent}>
                      <Text style={styles.predictionVarietyText}>
                        {showPredictionConflict.gemini.variety || 'Unknown'}
                      </Text>
                      <Text style={[
                        styles.predictionGenderText,
                        { color: showPredictionConflict.gemini.gender === 'female' ? '#FF69B4' : '#4169E1' }
                      ]}>
                        {showPredictionConflict.gemini.gender?.toUpperCase() || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>
                  
                  {showPredictionConflict.gemini.geminiData?.reasoning && (
                    <View style={styles.reasoningContainer}>
                      <Text style={styles.reasoningLabel}>AI Analysis:</Text>
                      <Text style={styles.reasoningText}>
                        {showPredictionConflict.gemini.geminiData.reasoning}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.predictionNote}>
                    Advanced cloud analysis • Requires internet
                  </Text>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.conflictCancelButton}
                  onPress={() => setShowPredictionConflict(null)}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
                  <Text style={styles.conflictCancelText}>Cancel & Retake Photo</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidebox: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: theme.borderRadius.large,
    backgroundColor: 'transparent',
  },
  guideboxScanning: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  guideText: {
    ...theme.typography.body,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.medium,
  },
  // Live prediction overlay styles
  livePredictionOverlay: {
    marginTop: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.md,
    minWidth: 200,
    alignItems: 'center',
  },
  predictionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionTextContainer: {
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  predictionVariety: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    fontSize: 10,
  },
  predictionGender: {
    ...theme.typography.h3,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
  },
  confidenceText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lowConfidenceWarning: {
    ...theme.typography.caption,
    color: '#FFA500',
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  // Control button active state
  controlButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.7)',
  },
  tmButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.5)',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  placeholder: {
    width: 56,
    height: 56,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
  },
  permissionButtonText: {
    ...theme.typography.button,
    color: '#FFFFFF',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    ...theme.typography.h3,
    color: '#FFFFFF',
    marginTop: theme.spacing.lg,
    fontWeight: '600',
  },
  processingSubtext: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: theme.spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background.primary,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  analyzeButton: {
    paddingHorizontal: theme.spacing.xl,
  },
  actionButtonText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  actionButtonTextDisabled: {
    color: theme.colors.text.secondary,
    opacity: 0.6,
  },
  // Conflict Modal Styles
  conflictModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  conflictModalContainer: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.borderRadius.large,
    borderTopRightRadius: theme.borderRadius.large,
    maxHeight: '85%',
    paddingTop: theme.spacing.md,
  },
  conflictScrollView: {
    flex: 1,
  },
  conflictScrollContent: {
    padding: theme.spacing.lg,
  },
  conflictHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  conflictTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
    fontWeight: 'bold',
  },
  conflictSubtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  predictionOption: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.large,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  predictionOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.small,
    gap: theme.spacing.xs,
  },
  geminiBadge: {
    backgroundColor: '#4285F4',
  },
  predictionBadgeText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  predictionConfidenceBadge: {
    ...theme.typography.h3,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  predictionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  predictionTextContent: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  predictionVarietyText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    fontSize: 11,
  },
  predictionGenderText: {
    ...theme.typography.h2,
    fontWeight: 'bold',
  },
  reasoningContainer: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#4285F4',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.small,
  },
  reasoningLabel: {
    ...theme.typography.caption,
    color: '#4285F4',
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  reasoningText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontStyle: 'italic',
  },
  predictionNote: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  conflictCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  conflictCancelText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
});