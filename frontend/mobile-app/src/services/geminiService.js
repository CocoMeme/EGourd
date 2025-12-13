/**
 * Gemini AI Service
 * Integrates Google Gemini 3.0 Flash for flower classification validation
 * Works alongside TFLite model for enhanced accuracy
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system/legacy';

// Get API key from environment
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ENABLE_GEMINI = process.env.EXPO_PUBLIC_ENABLE_GEMINI_VALIDATION === 'true';

// Gemini configuration - Using latest Gemini 2.5 Flash (Free Tier)
const GEMINI_CONFIG = {
  model: 'gemini-2.5-flash',
  temperature: 0.3, // Slightly higher for better reasoning
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048, // Increased for comprehensive analysis
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

      console.log('🔍 Gemini analyzing image:', imageUri.slice(-30));
      if (tmPrediction) {
        console.log('💡 Using TM Context:', tmPrediction.label, `(${tmPrediction.confidence}%)`);
      }

      // Convert image to base64 (use string 'base64' for compatibility)
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      // Prepare context string if prediction is available
      let contextString = '';
      if (tmPrediction) {
        contextString = `
CONTEXT FROM SPECIALIZED MODEL:
This image was identified by a specialized local model as: "${tmPrediction.label}" with ${tmPrediction.confidence}% confidence.
Please verify this. If you disagree, you must have STRONG visual evidence (e.g. wrong color, wrong shape).
`;

        // GENDER ENHANCEMENT: If TM says female, force Gemini to look closer
        if (tmPrediction.gender === 'female') {
          contextString += `
IMPORTANT: The local model detected a FEMALE flower. 
This means it likely saw an ovary/fruit bulge behind the flower base.
LOOK SPECIFICALLY FOR THIS BULGE. Do not classify as MALE unless you are absolutely certain that bulge is absent.
`;
        }
      }

      // Prepare simplified prompt to avoid response truncation
      const prompt = `Analyze this gourd flower image. Identify the variety and gender.
${contextString}

**Varieties:** ampalaya_bilog (yellow, 5 petals), patola (large yellow), upo_smooth (white)
**Gender:** male (stamens, thin stem, no base bulge) | female (ovary bulge at base, pistil)

**CRITICAL IDENTIFICATION TIPS (Visual Rules):**
- **UJO (Bottle Gourd):** Flowers are **WHITE**. If it is yellow, it is NOT Upo.
- **AMPALAYA (Bitter Gourd):** Small yellow flowers, thin stems.
- **PATOLA (Sponge Gourd):** LARGE bright yellow flowers.
- **MALE vs FEMALE:** Look for the "baby fruit" (ovary bulge) behind the flower base. No bulge = MALE.

Respond with ONLY this JSON (keep responses SHORT to avoid truncation):
{
  "variety": "ampalaya_bilog" | "patola" | "upo_smooth" | "not_flower",
  "gender": "male" | "female" | "unknown",
  "confidence": 0.0-1.0,
  "reasoning": "One sentence explanation citing color and shape",
  "keyFeatures": ["feature1", "feature2"],
  "flowerQuality": {"overallScore": 0-100, "petalCondition": "excellent|good|fair|poor"},
  "harvestPrediction": {"daysToHarvest": number, "currentStage": "bud|blooming|peak_bloom|wilting|pollinated", "pollinationReady": true|false},
  "qualityMetrics": {"healthScore": 0-100, "pollinationPotential": 0-100}
}`;

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

      /* ... (rest of parsing logic remains same until formatPrediction) ... */

      console.log('📄 Gemini raw response:', text);

      // Parse JSON from response - handle potentially truncated responses
      let geminiResult;
      try {
        // Try to find complete JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          geminiResult = JSON.parse(jsonMatch[0]);
        } else {
          // Try to extract basic fields from partial response
          const varietyMatch = text.match(/"variety"\s*:\s*"([^"]+)"/);
          const genderMatch = text.match(/"gender"\s*:\s*"([^"]+)"/);
          const confidenceMatch = text.match(/"confidence"\s*:\s*([\d.]+)/);
          const reasoningMatch = text.match(/"reasoning"\s*:\s*"([^"]+)/);

          if (varietyMatch && genderMatch && confidenceMatch) {
            geminiResult = {
              variety: varietyMatch[1],
              gender: genderMatch[1],
              confidence: parseFloat(confidenceMatch[1]),
              reasoning: reasoningMatch ? reasoningMatch[1] : 'Analysis completed',
              keyFeatures: [],
            };
            console.log('⚠️ Extracted partial response:', geminiResult);
          } else {
            throw new Error('Could not parse Gemini response');
          }
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        // Try fallback extraction
        const varietyMatch = text.match(/"variety"\s*:\s*"([^"]+)"/);
        const genderMatch = text.match(/"gender"\s*:\s*"([^"]+)"/);
        const confidenceMatch = text.match(/"confidence"\s*:\s*([\d.]+)/);

        if (varietyMatch && genderMatch && confidenceMatch) {
          geminiResult = {
            variety: varietyMatch[1],
            gender: genderMatch[1],
            confidence: parseFloat(confidenceMatch[1]),
            reasoning: 'Analysis completed (partial response)',
            keyFeatures: [],
          };
          console.log('⚠️ Fallback extraction:', geminiResult);
        } else {
          throw new Error('Invalid response format from Gemini');
        }
      }

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
      apiKeyConfigured: !!GEMINI_API_KEY,
    };
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
export default geminiService;
