/**
 * Gemini AI Service
 * Integrates Google Gemini 2.5 Flash for flower classification validation
 * Works through Backend Proxy
 * Supports multiple API keys with automatic fallback (handled by backend)
 */

import { API_BASE_URL } from '../config/api';
import * as FileSystem from 'expo-file-system';
import { authService } from './authService';


const ENABLE_GEMINI = process.env.EXPO_PUBLIC_ENABLE_GEMINI_VALIDATION === 'true';

// Debug: Log environment variables on module load
console.log('🔧 Gemini Config:', {
  enabledEnvVar: process.env.EXPO_PUBLIC_ENABLE_GEMINI_VALIDATION,
  isEnabled: ENABLE_GEMINI,
  mode: 'backend-proxy'
});

// Gemini configuration - using backend
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash', // Informational only
};

class GeminiService {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = ENABLE_GEMINI;
  }

  /**
   * Initialize Gemini AI
   * No sophisticated init needed for backend proxy, but we keep signature for compatibility
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('⚠️ Gemini validation is disabled in environment');
      return;
    }
    
    // We consider it initialized if enabled
    this.isInitialized = true;
    console.log('✅ Gemini Service (Backend Proxy) ready');
  }

  /**
   * Check if Gemini service is available
   */
  isAvailable() {
    return this.isEnabled;
  }

  /**
   * Analyze flower image using Gemini AI via Backend
   * @param {string} imageUri - Local image URI
   * @param {Object} tmPrediction - Optional context from TFLite model
   * @returns {Promise<Object>} Prediction object matching modelService format
   */
  async analyzeFlower(imageUri, tmPrediction = null) {
    const startTime = Date.now();

    try {
      // Ensure initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isAvailable()) {
        throw new Error('Gemini service not available');
      }

      console.log('🔍 Gemini analyzing image via backend:', imageUri.slice(-30));
      if (tmPrediction) {
        console.log('💡 Using TM Context:', tmPrediction.label, `(${tmPrediction.confidence}%)`);
      }

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Get auth token
      const token = authService.getToken();

      // Setup timeout controller (60 seconds to allow for backend retries/cold starts)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Call Backend API
      const response = await fetch(`${API_BASE_URL}/scans/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        signal: controller.signal,
        body: JSON.stringify({
          image: base64Image,
          tmPrediction: tmPrediction
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Backend analysis failed: ${response.status} ${response.statusText}`);
      }

      const geminiResult = await response.json();
      
      console.log('📄 Gemini backend response received');

      // Validate response structure
      if (!geminiResult.variety || !geminiResult.gender || geminiResult.confidence === undefined) {
        console.error('Invalid Gemini response:', geminiResult);
        throw new Error('Invalid response structure from Gemini Service');
      }

      // Format prediction for app usage
      return this.formatPrediction(geminiResult, Date.now() - startTime);

    } catch (error) {
      console.error('❌ Gemini analysis error:', error);
      throw error;
    }
  }

  /**
   * Format Gemini response to match modelService output structure
   * @param {Object} geminiResult - Raw Gemini response
   * @param {number} processingTime - Time taken in milliseconds
   * @returns {Object} Formatted prediction
   */
  formatPrediction(geminiResult, processingTime) {
    const {
      variety,
      gender,
      confidence,
      reasoning,
      keyFeatures,
      flowerQuality,
      harvestPrediction,
      observations,
      qualityMetrics
    } = geminiResult;

    // Determine if it's a flower
    const isNotFlower = variety === 'not_flower';
    const isFlower = !isNotFlower;

    // Format variety name for display
    let varietyDisplay = null;
    if (variety === 'ampalaya_bilog') {
      varietyDisplay = 'Ampalaya Bilog';
    } else if (variety === 'patola') {
      varietyDisplay = 'Patola';
    } else if (variety === 'upo_smooth') {
      varietyDisplay = 'Upo (Smooth)';
    } else if (variety === 'cucumber') {
      varietyDisplay = 'Cucumber';
    }

    // Build predicted class (matches multi-class model format)
    let predictedClass = 'unknown';
    if (isNotFlower) {
      predictedClass = 'not_flower';
    } else if (varietyDisplay && gender) {
      predictedClass = `${variety}_${gender}`;
    }

    // Convert confidence to percentage
    const confidencePercent = Math.round(confidence * 100 * 10) / 10;

    // Determine confidence level
    const isLowConfidence = confidence < 0.65;
    const isUncertain = confidence < 0.5;
    const shouldReject = isNotFlower || isUncertain;

    // Build message
    let message;
    if (isNotFlower) {
      message = 'Not a gourd flower';
    } else if (isUncertain) {
      message = `Uncertain: ${varietyDisplay || 'Unknown'} (${confidencePercent}%)`;
    } else {
      const genderCap = gender.charAt(0).toUpperCase() + gender.slice(1);
      message = `${genderCap} ${varietyDisplay} flower (${confidencePercent}%)`;
    }

    return {
      // Core prediction
      predictedClass,
      variety: varietyDisplay,
      gender: isFlower ? gender : null,
      isFlower,

      // Confidence metrics
      confidence: confidencePercent,
      rawScore: confidence,
      isLowConfidence,
      isUncertain,
      shouldReject,
      confidenceThreshold: 65,

      // Not_flower detection
      isNotFlower,

      // User-facing message
      message,

      // Model metadata
      modelType: 'Gemini 2.5 Flash',
      source: 'gemini',
      processingTime,
      timestamp: new Date().toISOString(),
      modelVersion: 'gemini-2.5-flash',

      // Gemini-specific data (enhanced with new fields)
      geminiData: {
        reasoning,
        keyFeatures: keyFeatures || [],
        flowerQuality: isFlower ? flowerQuality : null,
        harvestPrediction: isFlower ? harvestPrediction : null,
        observations: isFlower ? observations : null,
        qualityMetrics: isFlower ? qualityMetrics : null,
      },

      // Probabilities (simulated for consistency)
      probabilities: this.buildProbabilities(variety, gender, confidence),
    };
  }

  /**
   * Build probability distribution (simulated to match modelService format)
   */
  buildProbabilities(variety, gender, confidence) {
    const classes = [
      'ampalaya_bilog_female',
      'ampalaya_bilog_male',
      'patola_female',
      'patola_male',
      'upo_smooth_female',
      'upo_smooth_male',
      'cucumber_female',
      'cucumber_male',
      'not_flower',
    ];

    const probabilities = {};
    const predictedClass = variety === 'not_flower'
      ? 'not_flower'
      : `${variety}_${gender}`;

    // Distribute remaining probability among other classes
    const remainingProb = 1 - confidence;
    const otherClassProb = remainingProb / (classes.length - 1);

    classes.forEach(cls => {
      probabilities[cls] = cls === predictedClass ? confidence : otherClassProb;
    });

    return probabilities;
  }

  /**
   * Compare TFLite and Gemini predictions
   * @param {Object} tflitePrediction - Prediction from modelService
   * @param {Object} geminiPrediction - Prediction from Gemini
   * @returns {Object} Comparison result
   */
  comparePredictions(tflitePrediction, geminiPrediction) {
    const varietyMatch = tflitePrediction.variety === geminiPrediction.variety;
    const genderMatch = tflitePrediction.gender === geminiPrediction.gender;
    const bothAgree = varietyMatch && genderMatch;

    // Calculate agreement confidence
    const avgConfidence = (tflitePrediction.rawScore + geminiPrediction.rawScore) / 2;
    const maxConfidence = Math.max(tflitePrediction.rawScore, geminiPrediction.rawScore);

    // Determine which prediction to trust more
    let recommendation = 'manual'; // Default: let user choose

    // Logic Refinement:
    if (bothAgree) {
      // Both agree - use higher confidence prediction
      recommendation = geminiPrediction.rawScore >= tflitePrediction.rawScore
        ? 'gemini'
        : 'tflite';
    } else {
      // DISAGREEMENT LOGIC:

      // 0. SPECIES CHECK: Trust TM if it says Upo (White) and Gemini says Ampalaya (Yellow)
      // This handles cases where Gemini hallucinates color
      if (tflitePrediction.variety === 'Upo (Smooth)' && geminiPrediction.variety === 'Ampalaya Bilog') {
        if (tflitePrediction.rawScore > 0.8) recommendation = 'tflite';
      }

      // 1. GENDER CHECK (The "Female Protection" Rule)
      // If TM saw a female (harder to see) and Gemini defaults to male, trust TM unless Gemini is super sure
      else if (tflitePrediction.gender === 'female' && geminiPrediction.gender === 'male') {
        if (geminiPrediction.rawScore < 0.98 && tflitePrediction.rawScore > 0.65) {
          recommendation = 'tflite';
        } else if (geminiPrediction.rawScore >= 0.98) {
          recommendation = 'gemini'; // Only trust Gemini if 98%+ sure it's male
        }
      }

      // 2. TFLite Extemely High Confidence (>= 98%) -> Trust TFLite (Specialist override)
      else if (tflitePrediction.rawScore >= 0.98) {
        recommendation = 'tflite';
      }
      // 3. Gemini Very High Confidence (>= 95%) vs TFLite Low (< 70%) -> Trust Gemini
      else if (geminiPrediction.rawScore >= 0.95 && tflitePrediction.rawScore < 0.7) {
        recommendation = 'gemini';
      }
      // 4. TFLite High (>= 90%) vs Gemini Low/Med (< 90%) -> Trust TFLite
      else if (tflitePrediction.rawScore >= 0.90 && geminiPrediction.rawScore < 0.90) {
        recommendation = 'tflite';
      }
      // 5. Gemini High (>= 90%) vs TFLite Low/Med (< 80%) -> Trust Gemini
      else if (geminiPrediction.rawScore >= 0.90 && tflitePrediction.rawScore < 0.80) {
        recommendation = 'gemini';
      }
      // Else remain 'manual'
    }

    return {
      agree: bothAgree,
      varietyMatch,
      genderMatch,
      confidence: bothAgree ? maxConfidence : avgConfidence,
      recommendation,
      confidenceGap: Math.abs(tflitePrediction.rawScore - geminiPrediction.rawScore),
    };
  }

  /**
   * Get service info
   */
  getServiceInfo() {
    return {
      isEnabled: this.isEnabled,
      isInitialized: this.isInitialized,
      isAvailable: this.isAvailable(),
      model: GEMINI_CONFIG.model,
      mode: 'backend-proxy',
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;
