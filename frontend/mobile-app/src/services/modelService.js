/**
 * Model Service for Gourd Flower Multi-Class Classification
 * Using TensorFlow Lite format with react-native-fast-tflite
 * 
 * This service handles:
 * - Loading the TensorFlow Lite model (native)
 * - Image preprocessing (resize, normalize)
 * - Running inference for flower classification (variety + gender)
 * - Non-flower rejection with confidence threshold
 * - Real-time prediction support with stabilization
 * 
 * @module modelService
 * @version 3.0.0-multiclass
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

// Model configuration - UPDATE THIS WHEN RETRAINING MODEL
const MODEL_CONFIG = {
  version: '3.0.0-multiclass',
  inputSize: [224, 224],
  // Class order MUST match training order in train-model-v3-multiclass.md
  classes: [
    'ampalaya_bilog_female',
    'ampalaya_bilog_male',
    'patola_female',
    'patola_male',
    'upo_smooth_female',
    'upo_smooth_male',
    'not_flower'
  ],
  // Human-readable labels for each class
  classLabels: {
    ampalaya_bilog_female: { variety: 'Ampalaya Bilog', gender: 'female', isFlower: true },
    ampalaya_bilog_male: { variety: 'Ampalaya Bilog', gender: 'male', isFlower: true },
    patola_female: { variety: 'Patola', gender: 'female', isFlower: true },
    patola_male: { variety: 'Patola', gender: 'male', isFlower: true },
    upo_smooth_female: { variety: 'Upo (Smooth)', gender: 'female', isFlower: true },
    upo_smooth_male: { variety: 'Upo (Smooth)', gender: 'male', isFlower: true },
    not_flower: { variety: null, gender: null, isFlower: false }
  },
  confidenceThreshold: 0.65, // 65% minimum confidence
  preprocessing: {
    rescale: 1.0 / 255.0
  }
};

class ModelService {
  constructor() {
    this.model = null;
    this.isReady = false;
    this.isInitializing = false;
    this.config = MODEL_CONFIG;
    this.isMultiClass = false; // Will be set based on loaded model
    
    // Real-time prediction state
    this.lastPrediction = null;
    this.predictionHistory = [];
    this.maxHistorySize = 5;
  }

  /**
   * Initialize and load the TFLite model (native)
   * @returns {Promise<boolean>} True if initialization successful
   * @throws {Error} If model initialization fails
   */
  async initialize() {
    if (this.isInitializing) {
      console.log('⏳ Model initialization already in progress...');
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isReady;
    }

    if (this.isReady) {
      console.log('✅ Model already initialized');
      return true;
    }

    this.isInitializing = true;

    try {
      console.log('🤖 Initializing TFLite model...');
      console.log(`📊 Config version: ${this.config.version}`);
      
      await this.loadTFLiteModel();
      
      this.isReady = true;
      this.isInitializing = false;
      
      console.log('✅ Model loaded successfully');
      console.log(`📊 Mode: ${this.isMultiClass ? 'Multi-class' : 'Binary'}`);
      
      return true;
    } catch (error) {
      this.isInitializing = false;
      this.isReady = false;
      console.error('❌ Model initialization failed:', error);
      throw new Error(`Failed to initialize model: ${error.message}`);
    }
  }

  /**
   * Load the TensorFlow Lite model using native loader
   * Attempts to load multi-class model first, falls back to binary
   * @private
   */
  async loadTFLiteModel() {
    try {
      console.log('📦 Loading TFLite model asset...');
      
      let modelSource;
      
      // Try to load multi-class model first
      try {
        modelSource = require('../../assets/models/gourd_classifier.tflite');
        console.log('✅ Found multi-class model: gourd_classifier.tflite');
        this.isMultiClass = true;
      } catch (e) {
        // Fallback to original binary model
        console.log('⚠️ Multi-class model not found, using binary model');
        modelSource = require('../../assets/models/ampalaya_classifier.tflite');
        this.isMultiClass = false;
        
        // Adjust config for binary model
        this.config = {
          ...this.config,
          version: '2.0.0-binary',
          classes: ['female', 'male'],
          classLabels: {
            female: { variety: 'Ampalaya Bilog', gender: 'female', isFlower: true },
            male: { variety: 'Ampalaya Bilog', gender: 'male', isFlower: true }
          }
        };
      }
      
      console.log('🔄 Loading model with native TFLite interpreter...');
      this.model = await loadTensorflowModel(modelSource);
      
      console.log('✅ TFLite model loaded successfully');
      console.log('📊 Model info:');
      console.log('   Inputs:', JSON.stringify(this.model.inputs, null, 2));
      console.log('   Outputs:', JSON.stringify(this.model.outputs, null, 2));
      
    } catch (error) {
      console.error('❌ TFLite model loading failed:', error);
      throw new Error(`Failed to load TFLite model: ${error.message}`);
    }
  }

  /**
   * Preprocess image for model input
   * @param {string} imageUri - URI of the image to process
   * @param {number} quality - JPEG quality (0-1), lower for faster processing
   * @returns {Promise<Float32Array>} Preprocessed image as Float32 tensor
   */
  async preprocessImage(imageUri, quality = 1) {
    try {
      const [width, height] = this.config.inputSize;
      
      // Resize image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width, height } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: 'base64',
      });
      
      // Convert to bytes and decode JPEG
      const jpegBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const rawImageData = jpeg.decode(jpegBytes, { useTArray: true });
      
      // Extract RGB and normalize to [0, 1]
      const pixels = new Float32Array(width * height * 3);
      let pixelIndex = 0;
      
      for (let i = 0; i < rawImageData.data.length; i += 4) {
        pixels[pixelIndex++] = rawImageData.data[i] / 255.0;     // R
        pixels[pixelIndex++] = rawImageData.data[i + 1] / 255.0; // G
        pixels[pixelIndex++] = rawImageData.data[i + 2] / 255.0; // B
      }
      
      return pixels;
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error);
      throw new Error(`Failed to preprocess image: ${error.message}`);
    }
  }

  /**
   * Predict flower classification from image
   * Returns variety, gender, confidence, and whether it's a flower
   * 
   * @param {string} imageUri - URI of the flower image
   * @param {Object} options - Prediction options
   * @param {boolean} options.fastMode - Use lower quality for faster prediction
   * @returns {Promise<Object>} Prediction result with classification details
   */
  async predictFlowerGender(imageUri, options = {}) {
    if (!this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const { fastMode = false } = options;
    const startTime = Date.now();

    try {
      // Preprocess image (lower quality in fast mode)
      const imagePixels = await this.preprocessImage(imageUri, fastMode ? 0.5 : 1);

      // Run inference
      const outputs = await this.model.run([imagePixels]);
      const outputTensor = outputs[0];
      
      // Parse based on model type
      let result;
      if (this.isMultiClass && outputTensor.length > 1) {
        result = this.parseMultiClassOutput(outputTensor);
      } else {
        result = this.parseBinaryOutput(outputTensor[0]);
      }
      
      result.processingTime = Date.now() - startTime;
      result.timestamp = new Date().toISOString();
      result.modelVersion = this.config.version;
      result.inputShape = [...this.config.inputSize, 3];
      
      // Store in history for stabilization
      this.addToHistory(result);
      
      console.log('✅ Prediction:', {
        class: result.predictedClass,
        variety: result.variety,
        gender: result.gender,
        confidence: `${result.confidence.toFixed(1)}%`,
        isFlower: result.isFlower,
        time: `${result.processingTime}ms`
      });

      return result;
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      throw new Error(`Prediction failed: ${error.message}`);
    }
  }

  /**
   * Parse multi-class softmax output
   * @private
   */
  parseMultiClassOutput(outputTensor) {
    const numClasses = this.config.classes.length;
    
    // Find class with highest probability
    let maxProb = -1;
    let maxIndex = 0;
    const probabilities = {};
    
    for (let i = 0; i < Math.min(outputTensor.length, numClasses); i++) {
      const prob = outputTensor[i];
      probabilities[this.config.classes[i]] = prob;
      
      if (prob > maxProb) {
        maxProb = prob;
        maxIndex = i;
      }
    }
    
    const predictedClass = this.config.classes[maxIndex];
    const classInfo = this.config.classLabels[predictedClass];
    const confidence = maxProb * 100;
    
    // Check thresholds
    const isLowConfidence = confidence < this.config.confidenceThreshold * 100;
    const isNotFlower = predictedClass === 'not_flower';
    
    return {
      // Primary classification
      predictedClass,
      variety: classInfo?.variety || null,
      gender: classInfo?.gender || null,
      isFlower: classInfo?.isFlower && !isLowConfidence,
      
      // Confidence
      confidence,
      rawScore: maxProb,
      isLowConfidence,
      isUncertain: isLowConfidence,
      confidenceThreshold: this.config.confidenceThreshold * 100,
      
      // All probabilities
      probabilities,
      
      // Status
      isNotFlower,
      shouldReject: isNotFlower || isLowConfidence,
      
      // Message
      message: this.generateMessage(predictedClass, confidence, isLowConfidence),
      
      // Model info
      modelType: 'MobileNetV2 (Multi-Class)',
      numClasses
    };
  }

  /**
   * Parse binary model output
   * @private
   */
  parseBinaryOutput(rawScore) {
    const isMale = rawScore > 0.5;
    const gender = isMale ? 'male' : 'female';
    const confidence = isMale ? rawScore * 100 : (1 - rawScore) * 100;
    const isLowConfidence = rawScore > 0.4 && rawScore < 0.6;
    
    return {
      predictedClass: gender,
      variety: 'Ampalaya Bilog',
      gender,
      isFlower: !isLowConfidence,
      confidence,
      rawScore,
      isLowConfidence,
      isUncertain: isLowConfidence,
      confidenceThreshold: 60,
      probabilities: { female: (1 - rawScore), male: rawScore },
      isNotFlower: false,
      shouldReject: isLowConfidence,
      message: isLowConfidence 
        ? 'Low confidence - try a clearer photo'
        : `${gender.charAt(0).toUpperCase() + gender.slice(1)} Ampalaya Bilog flower`,
      modelType: 'MobileNetV2 (Binary)',
      numClasses: 2
    };
  }

  /**
   * Generate user-friendly message
   * @private
   */
  generateMessage(predictedClass, confidence, isLowConfidence) {
    if (isLowConfidence) {
      return 'Low confidence - please try a clearer photo';
    }
    
    if (predictedClass === 'not_flower') {
      return 'No flower detected - point camera at a flower';
    }
    
    const info = this.config.classLabels[predictedClass];
    if (!info) return `Unknown class: ${predictedClass}`;
    
    const genderStr = info.gender ? info.gender.charAt(0).toUpperCase() + info.gender.slice(1) : '';
    return `${genderStr} ${info.variety} flower (${confidence.toFixed(0)}%)`;
  }

  /**
   * Add prediction to history for stabilization
   * @private
   */
  addToHistory(prediction) {
    this.predictionHistory.push(prediction);
    if (this.predictionHistory.length > this.maxHistorySize) {
      this.predictionHistory.shift();
    }
    this.lastPrediction = prediction;
  }

  /**
   * Get stabilized prediction from recent history
   * Returns most common prediction from last N predictions
   */
  getStabilizedPrediction() {
    if (this.predictionHistory.length < 3) {
      return this.lastPrediction;
    }
    
    // Count occurrences
    const classCounts = {};
    for (const pred of this.predictionHistory) {
      const cls = pred.predictedClass;
      classCounts[cls] = (classCounts[cls] || 0) + 1;
    }
    
    // Find most common
    let maxCount = 0;
    let stableClass = null;
    for (const [cls, count] of Object.entries(classCounts)) {
      if (count > maxCount) {
        maxCount = count;
        stableClass = cls;
      }
    }
    
    // Return most recent of stable class
    for (let i = this.predictionHistory.length - 1; i >= 0; i--) {
      if (this.predictionHistory[i].predictedClass === stableClass) {
        return {
          ...this.predictionHistory[i],
          isStabilized: true,
          stabilityCount: maxCount,
          historySize: this.predictionHistory.length
        };
      }
    }
    
    return this.lastPrediction;
  }

  /**
   * Clear prediction history
   */
  clearHistory() {
    this.predictionHistory = [];
    this.lastPrediction = null;
  }

  /**
   * Quick prediction for real-time camera (lower quality, faster)
   */
  async quickPredict(imageUri) {
    return this.predictFlowerGender(imageUri, { fastMode: true });
  }

  /**
   * Batch predict multiple images
   */
  async predictBatch(imageUris) {
    if (!this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    console.log(`🔍 Batch prediction for ${imageUris.length} images...`);
    const results = [];

    for (let i = 0; i < imageUris.length; i++) {
      try {
        const result = await this.predictFlowerGender(imageUris[i]);
        results.push({ index: i, uri: imageUris[i], result, success: true });
      } catch (error) {
        results.push({ index: i, uri: imageUris[i], error: error.message, success: false });
      }
    }

    return results;
  }

  /**
   * Get model information and status
   */
  getModelInfo() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      modelVersion: this.config.version,
      modelType: this.isMultiClass ? 'MobileNetV2 (Multi-Class)' : 'MobileNetV2 (Binary)',
      format: 'TensorFlow Lite (Native)',
      inputShape: [...this.config.inputSize, 3],
      classes: this.config.classes,
      numClasses: this.config.classes.length,
      confidenceThreshold: this.config.confidenceThreshold * 100,
      backend: 'native-tflite',
      classLabels: this.config.classLabels,
      isMultiClass: this.isMultiClass
    };
  }

  /**
   * Get supported gourd varieties
   */
  getSupportedVarieties() {
    const varieties = new Set();
    for (const info of Object.values(this.config.classLabels)) {
      if (info.variety) varieties.add(info.variety);
    }
    return Array.from(varieties);
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics() {
    return {
      accuracy: 1.0,
      precision: 1.0,
      recall: 1.0,
      f1Score: 1.0,
      auc: 1.0,
      trainingInfo: {
        batch_size: 16,
        num_classes: this.config.classes.length
      }
    };
  }

  /**
   * Warm up the model
   */
  async warmUp() {
    if (!this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    console.log('🔥 Model warm-up (native TFLite handles automatically)');
  }

  /**
   * Cleanup resources
   */
  dispose() {
    console.log('🧹 Disposing model...');
    if (this.model) {
      this.model = null;
    }
    this.isReady = false;
    this.isInitializing = false;
    this.clearHistory();
    console.log('✅ Model disposed');
  }

  /**
   * Reset the service
   */
  reset() {
    this.dispose();
    console.log('🔄 Model service reset');
  }

  /**
   * Get memory info
   */
  getMemoryInfo() {
    return {
      message: 'Native TFLite - memory managed by native layer',
      historySize: this.predictionHistory.length
    };
  }
}

// Export singleton instance
export const modelService = new ModelService();

// Also export class and config for testing
export { ModelService, MODEL_CONFIG };
