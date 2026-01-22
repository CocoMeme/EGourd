/**
 * Model Service (Consolidated)
 * Handles Multiple TFLite models from Teachable Machine
 * Supports Flower and Leaf scanning modes
 * 
 * @module modelService
 * @version 4.0.0-multimodel
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

// ============ SCAN MODES ============
export const SCAN_MODES = {
  FLOWER: 'flower',
  LEAF: 'leaf',
};

// ============ MODEL LABELS ============
// Flower model labels (9 classes)
const FLOWER_LABELS = [
  'Ampalaya Bilog Male',       // 0
  'Ampalaya Bilog Female',     // 1
  'Not Flower',                // 2
  'Patola Female',             // 3
  'Patola Male',               // 4
  'Upo Smooth Female',         // 5
  'Upo Smooth Male',           // 6
  'Cucumber Female',           // 7
  'Cucumber Male',             // 8
];

// Leaf model labels (6 classes - includes rejection class)
const LEAF_LABELS = [
  'Ampalaya Leaves',           // 0
  'Patola Leaves',             // 1
  'Upo Leaves',                // 2
  'Kalabasa Leaves',           // 3
  'Pipino Leaves',             // 4
  'Not Leaf',                  // 5 - rejection class
];

// Confidence Thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MODERATE: 70,
  LOW: 0
};

class ModelService {
  constructor() {
    // Model instances (lazy-loaded)
    this._flowerModel = null;
    this._leafModel = null;

    // Current scan mode
    this._scanMode = SCAN_MODES.FLOWER;

    // State tracking
    this.isReady = false;
    this.isInitializing = false;
    this.inputSize = [224, 224]; // Standard Teachable Machine size
  }

  // ============ GETTERS ============
  get scanMode() {
    return this._scanMode;
  }

  get labels() {
    return this._scanMode === SCAN_MODES.LEAF ? LEAF_LABELS : FLOWER_LABELS;
  }

  get model() {
    return this._scanMode === SCAN_MODES.LEAF ? this._leafModel : this._flowerModel;
  }

  // ============ MODE SWITCHING ============
  /**
   * Switch scan mode between flower and leaf
   * @param {string} mode - 'flower' or 'leaf'
   */
  async setScanMode(mode) {
    if (mode !== SCAN_MODES.FLOWER && mode !== SCAN_MODES.LEAF) {
      throw new Error(`Invalid scan mode: ${mode}`);
    }

    if (this._scanMode === mode && this.isReady) {
      console.log(`✅ Already in ${mode} mode`);
      return true;
    }

    console.log(`🔄 Switching to ${mode} mode...`);
    this._scanMode = mode;
    this.isReady = false;

    // Initialize the model for this mode
    return await this.initialize();
  }

  /**
   * Initialize model for current scan mode (lazy-load)
   */
  async initialize() {
    // If model for current mode is already loaded, skip
    const currentModel = this.model;
    if (currentModel && this.isReady) {
      console.log(`✅ ${this._scanMode} model already initialized`);
      return true;
    }

    // If initializing, wait
    if (this.isInitializing) {
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isReady;
    }

    this.isInitializing = true;

    try {
      console.log(`🤖 Initializing ${this._scanMode} model...`);

      // Load model for current mode
      await this.loadModel(this._scanMode);

      this.isReady = true;
      this.isInitializing = false;

      console.log(`✅ ${this._scanMode} model loaded successfully`);

      return true;
    } catch (error) {
      this.isInitializing = false;
      this.isReady = false;
      console.error(`❌ ${this._scanMode} model initialization failed:`, error);
      throw new Error(`Failed to initialize ${this._scanMode} model: ${error.message}`);
    }
  }

  /**
   * Load TFLite model file for specified mode
   * @param {string} mode - 'flower' or 'leaf'
   */
  async loadModel(mode) {
    try {
      let modelSource;

      if (mode === SCAN_MODES.LEAF) {
        // Only load if not already loaded
        if (this._leafModel) {
          console.log('✅ Leaf model already in memory');
          return;
        }
        console.log('📦 Loading leaf/model_unquant.tflite...');
        modelSource = require('../../assets/models/leaf/model_unquant.tflite');
        this._leafModel = await loadTensorflowModel(modelSource);
        console.log('✅ Leaf TFLite model loaded');
        console.log('📊 Model info:', JSON.stringify(this._leafModel.inputs, null, 2));
      } else {
        // Flower mode (default)
        if (this._flowerModel) {
          console.log('✅ Flower model already in memory');
          return;
        }
        console.log('📦 Loading flower/model_unquant.tflite...');
        modelSource = require('../../assets/models/flower/model_unquant.tflite');
        this._flowerModel = await loadTensorflowModel(modelSource);
        console.log('✅ Flower TFLite model loaded');
        console.log('📊 Model info:', JSON.stringify(this._flowerModel.inputs, null, 2));
      }

    } catch (error) {
      console.error(`❌ ${mode} model loading failed:`, error);
      throw new Error(`Failed to load ${mode} model file: ${error.message}`);
    }
  }

  /**
   * Preprocess image for TM model
   * Automatically detects input type (uint8 vs float32)
   */
  async preprocessImage(imageUri, sourceWidth, sourceHeight, quality = 0.8) {
    try {
      const [targetWidth, targetHeight] = this.inputSize;

      // Calculate center crop
      let actions = [];

      if (sourceWidth && sourceHeight) {
        const minDimension = Math.min(sourceWidth, sourceHeight);
        const originX = Math.floor((sourceWidth - minDimension) / 2);
        const originY = Math.floor((sourceHeight - minDimension) / 2);

        actions.push({
          crop: {
            originX,
            originY,
            width: minDimension,
            height: minDimension,
          }
        });
      }

      actions.push({ resize: { width: targetWidth, height: targetHeight } });

      // Resize image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        actions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true
        }
      );

      const base64 = manipResult.base64;
      const jpegBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const rawImageData = jpeg.decode(jpegBytes, { useTArray: true });

      // Check input type from model
      const currentModel = this.model;
      const inputType = (currentModel && currentModel.inputs && currentModel.inputs[0] && currentModel.inputs[0].dataType)
        ? currentModel.inputs[0].dataType
        : 'float32';

      if (inputType === 'uint8') {
        // For uint8 quantized input: 0-255
        const pixels = new Uint8Array(targetWidth * targetHeight * 3);
        let pixelIndex = 0;

        for (let i = 0; i < rawImageData.data.length; i += 4) {
          pixels[pixelIndex++] = rawImageData.data[i];     // R
          pixels[pixelIndex++] = rawImageData.data[i + 1]; // G
          pixels[pixelIndex++] = rawImageData.data[i + 2]; // B
        }
        return pixels;
      } else {
        // For float32 input: MobileNet normalization (-1 to 1)
        const pixels = new Float32Array(targetWidth * targetHeight * 3);
        let pixelIndex = 0;

        for (let i = 0; i < rawImageData.data.length; i += 4) {
          pixels[pixelIndex++] = (rawImageData.data[i] - 127.5) / 127.5;     // R
          pixels[pixelIndex++] = (rawImageData.data[i + 1] - 127.5) / 127.5; // G
          pixels[pixelIndex++] = (rawImageData.data[i + 2] - 127.5) / 127.5; // B
        }
        return pixels;
      }
    } catch (error) {
      console.error('❌ Image preprocessing failed:', error);
      throw new Error(`Failed to preprocess image: ${error.message}`);
    }
  }

  /**
   * Predict and return ALL class probabilities
   */
  async predictWithAllProbabilities(imageUri, sourceWidth, sourceHeight) {
    if (!this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      // Preprocess
      const imagePixels = await this.preprocessImage(imageUri, sourceWidth, sourceHeight, 0.8);

      // Run inference
      const currentModel = this.model;
      const outputs = await currentModel.run([imagePixels]);
      const outputTensor = outputs[0];

      // Get raw probabilities (no smoothing - matches TM website behavior)
      const probabilities = Array.from(outputTensor);

      // Build probability array using current mode labels
      const currentLabels = this.labels;
      const predictions = currentLabels.map((label, index) => {
        const probability = probabilities[index] || 0;
        const percentage = probability * 100;

        return {
          label,
          probability,
          percentage: Math.round(percentage * 10) / 10,
          index
        };
      });

      // Sort by probability (highest first)
      predictions.sort((a, b) => b.probability - a.probability);

      const topPrediction = predictions[0];
      const processingTime = Date.now() - startTime;

      // Determine confidence level
      let confidenceLevel = 'low';
      if (topPrediction.percentage >= CONFIDENCE_THRESHOLDS.HIGH) {
        confidenceLevel = 'high';
      } else if (topPrediction.percentage >= CONFIDENCE_THRESHOLDS.MODERATE) {
        confidenceLevel = 'moderate';
      }

      return {
        predictions,
        topPrediction: {
          ...topPrediction,
          confidenceLevel
        },
        processingTime,
        scanMode: this._scanMode // Include scan mode in result
      };

    } catch (error) {
      console.error('❌ Prediction failed:', error);
      throw new Error(`Prediction failed: ${error.message}`);
    }
  }

  async quickPredict(imageUri, sourceWidth, sourceHeight) {
    const result = await this.predictWithAllProbabilities(imageUri, sourceWidth, sourceHeight);
    // Track performance metrics
    this.trackPerformance(result.processingTime);
    return result;
  }

  async warmUp() {
    if (!this.isReady) return;
    try {
      // Create dummy float32 input for warmup
      const [w, h] = this.inputSize;
      const dummyInput = new Float32Array(w * h * 3).fill(0);
      await this.model.run([dummyInput]);
      console.log(`🔥 ${this._scanMode} model warmup complete`);
    } catch (e) {
      console.log('Warmup failed (ignoring):', e.message);
    }
  }

  /**
   * Track inference performance over recent predictions
   * @param {number} time - Processing time in ms
   * @returns {number} Average processing time
   */
  trackPerformance(time) {
    if (!this.recentTimes) this.recentTimes = [];
    this.recentTimes.push(time);
    if (this.recentTimes.length > 10) this.recentTimes.shift();

    const avg = this.recentTimes.reduce((a, b) => a + b, 0) / this.recentTimes.length;

    // Warn if inference is getting slow
    if (avg > 150 && this.recentTimes.length >= 5) {
      console.warn('⚠️ Slow inference detected. Avg:', Math.round(avg), 'ms');
    }

    return avg;
  }

  /**
   * Get current performance stats
   */
  getPerformanceStats() {
    if (!this.recentTimes || this.recentTimes.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    return {
      avg: Math.round(this.recentTimes.reduce((a, b) => a + b, 0) / this.recentTimes.length),
      min: Math.round(Math.min(...this.recentTimes)),
      max: Math.round(Math.max(...this.recentTimes)),
      count: this.recentTimes.length
    };
  }

  /**
   * Get service info including current mode
   */
  getServiceInfo() {
    return {
      scanMode: this._scanMode,
      isReady: this.isReady,
      flowerModelLoaded: this._flowerModel !== null,
      leafModelLoaded: this._leafModel !== null,
      labels: this.labels,
      inputSize: this.inputSize,
    };
  }
}

export const modelService = new ModelService();
export { CONFIDENCE_THRESHOLDS };
