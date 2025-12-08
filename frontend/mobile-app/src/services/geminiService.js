/**
 * Gemini AI Service
 * Integrates Google Gemini 3.0 Flash for flower classification validation
 * Works alongside TFLite model for enhanced accuracy
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system';

// Get API key from environment
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ENABLE_GEMINI = process.env.EXPO_PUBLIC_ENABLE_GEMINI_VALIDATION === 'true';

// Gemini configuration
const GEMINI_CONFIG = {
  model: 'gemini-1.5-flash',
  temperature: 0.2, // Low temperature for consistent classification
  topK: 1,
  topP: 1,
  maxOutputTokens: 512,
};

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;
    this.isEnabled = ENABLE_GEMINI;
  }

  /**
   * Initialize Gemini AI
   */
  async initialize() {
    if (this.isInitialized) return;
    
    if (!this.isEnabled) {
      console.log('⚠️ Gemini validation is disabled in environment');
      return;
    }

    if (!GEMINI_API_KEY) {
      console.warn('⚠️ Gemini API key not found. Gemini validation disabled.');
      this.isEnabled = false;
      return;
    }

    try {
      console.log('🤖 Initializing Gemini AI...');
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ 
        model: GEMINI_CONFIG.model,
        generationConfig: {
          temperature: GEMINI_CONFIG.temperature,
          topK: GEMINI_CONFIG.topK,
          topP: GEMINI_CONFIG.topP,
          maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
        }
      });
      this.isInitialized = true;
      console.log('✅ Gemini AI initialized successfully');
    } catch (error) {
      console.error('❌ Gemini initialization failed:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if Gemini service is available
   */
  isAvailable() {
    return this.isEnabled && this.isInitialized;
  }

  /**
   * Analyze flower image using Gemini AI
   * @param {string} imageUri - Local image URI
   * @returns {Promise<Object>} Prediction object matching modelService format
   */
  async analyzeFlower(imageUri) {
    const startTime = Date.now();

    try {
      // Ensure initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.isAvailable()) {
        throw new Error('Gemini service not available');
      }

      console.log('🔍 Gemini analyzing image:', imageUri);

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Prepare detailed prompt
      const prompt = `You are an expert botanist specializing in gourd flower identification. Analyze this flower image carefully and provide a detailed classification.

**Task:** Identify the gourd variety and flower gender.

**Gourd Varieties to Detect:**
1. **Ampalaya Bilog** (Bitter Gourd) - Round variety with characteristic bitter gourd flowers
2. **Patola** (Luffa/Sponge Gourd) - Has larger yellow flowers with distinct luffa characteristics
3. **Upo Smooth** (Bottle Gourd) - Smooth variety with white flowers, typically bloom at night

**Gender Classification:**
- **Male Flowers:** Have visible stamens (pollen-bearing structures), typically on long thin stems
- **Female Flowers:** Have an ovary/small fruit at the base, pistil instead of stamens

**Special Case:**
- If this is NOT a gourd flower (e.g., different plant, object, blurry image), classify as "not_flower"

**Required Response Format (JSON only):**
{
  "variety": "ampalaya_bilog" | "patola" | "upo_smooth" | "not_flower",
  "gender": "male" | "female" | "unknown",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief 1-2 sentence explanation of your classification",
  "keyFeatures": ["feature1", "feature2", "feature3"]
}

**Important:**
- Respond ONLY with valid JSON (no markdown, no extra text)
- Be conservative with confidence scores
- If uncertain, lower the confidence score
- If image quality is poor, mention it in reasoning and lower confidence`;

      // Call Gemini API
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      console.log('📄 Gemini raw response:', text);

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from Gemini');
      }

      const geminiResult = JSON.parse(jsonMatch[0]);

      // Validate response structure
      if (!geminiResult.variety || !geminiResult.gender || geminiResult.confidence === undefined) {
        throw new Error('Incomplete response from Gemini');
      }

      // Convert to modelService format
      const prediction = this.formatPrediction(geminiResult, Date.now() - startTime);

      console.log('✅ Gemini prediction:', prediction);

      return prediction;

    } catch (error) {
      console.error('❌ Gemini analysis error:', error);
      throw new Error(`Gemini analysis failed: ${error.message}`);
    }
  }

  /**
   * Format Gemini response to match modelService output structure
   * @param {Object} geminiResult - Raw Gemini response
   * @param {number} processingTime - Time taken in milliseconds
   * @returns {Object} Formatted prediction
   */
  formatPrediction(geminiResult, processingTime) {
    const { variety, gender, confidence, reasoning, keyFeatures } = geminiResult;

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
      modelType: 'Gemini 1.5 Flash',
      source: 'gemini',
      processingTime,
      timestamp: new Date().toISOString(),
      modelVersion: 'gemini-1.5-flash',

      // Gemini-specific data
      geminiData: {
        reasoning,
        keyFeatures: keyFeatures || [],
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
    
    if (bothAgree) {
      // Both agree - use higher confidence prediction
      recommendation = geminiPrediction.rawScore >= tflitePrediction.rawScore 
        ? 'gemini' 
        : 'tflite';
    } else if (geminiPrediction.rawScore > 0.8 && tflitePrediction.rawScore < 0.6) {
      // Gemini very confident, TFLite uncertain
      recommendation = 'gemini';
    } else if (tflitePrediction.rawScore > 0.8 && geminiPrediction.rawScore < 0.6) {
      // TFLite very confident, Gemini uncertain
      recommendation = 'tflite';
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
      apiKeyConfigured: !!GEMINI_API_KEY,
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;
