/**
 * Model Service (Consolidated)
 * Handles Floating Point TFLite model from Teachable Machine
 * Replaces previous modelService and modelServiceTM
 * 
 * @module modelService
 * @version 3.2.0-enhanced
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

// Labels from labels.txt (9 classes - includes Cucumber)
const TM_LABELS = [
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

// Confidence Thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MODERATE: 70,
  LOW: 0
};

class ModelService {
  constructor() {
    this.model = null;
    this.labels = TM_LABELS;
    this.isReady = false;
    this.isInitializing = false;
    this.inputSize = [224, 224]; // Standard Teachable Machine size
  }

  /**
   * Initialize TM model (Float only)
   */
  async initialize() {
    // If already initialized, skip
    if (this.isReady) {
      console.log('✅ Model already initialized');
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
      console.log('🤖 Initializing model (float)...');
      
      // Load floating point TFLite model
      await this.loadModel();
      
      this.isReady = true;
      this.isInitializing = false;
      
      console.log('✅ Model loaded successfully');
      
      return true;
    } catch (error) {
      this.isInitializing = false;
      this.isReady = false;
      console.error('❌ Model initialization failed:', error);
      throw new Error(`Failed to initialize model: ${error.message}`);
    }
  }

  /**
   * Load TFLite model file (floating point only)
   */
  async loadModel() {
    try {
      console.log('📦 Loading tflite_model_2026-01-03/model_unquant.tflite...');
      const modelSource = require('../../assets/models/tflite_model_2026-01-03/model_unquant.tflite');

      this.model = await loadTensorflowModel(modelSource);
      
      console.log('✅ TFLite model loaded');
      console.log('📊 Model info:');
      console.log('   Inputs:', JSON.stringify(this.model.inputs, null, 2));
      console.log('   Outputs:', JSON.stringify(this.model.outputs, null, 2));
      
    } catch (error) {
      console.error('❌ Model loading failed:', error);
      throw new Error(`Failed to load model file: ${error.message}`);
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
      const inputType = (this.model && this.model.inputs && this.model.inputs[0] && this.model.inputs[0].dataType) 
        ? this.model.inputs[0].dataType 
        : 'float32';
        
      // console.log(`ℹ️ Preprocessing for input type: ${inputType}`);

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
        // Formula: (value - 127.5) / 127.5 = value/127.5 - 1
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
      const outputs = await this.model.run([imagePixels]);
      const outputTensor = outputs[0];
      
      // Check output type
      const outputType = (this.model && this.model.outputs && this.model.outputs[0] && this.model.outputs[0].dataType)
        ? this.model.outputs[0].dataType
        : 'float32';

      // Get raw probabilities (no smoothing - matches TM website behavior)
      const probabilities = Array.from(outputTensor);
      
      // Build probability array
      const predictions = this.labels.map((label, index) => {
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
        processingTime
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
      console.log('🔥 Model warmup complete');
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
}

export const modelService = new ModelService();
export { CONFIDENCE_THRESHOLDS };
