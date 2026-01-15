const { GoogleGenerativeAI } = require('@google/generative-ai');
const { compressForGemini } = require('../utils/imageProcessor');
const { logMemoryUsage, forceGC } = require('../utils/memoryUtils');

// Get API keys from environment - supports multiple keys for fallback
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,           // Primary key
  process.env.GEMINI_API_KEY_2,         // Fallback 1
  process.env.GEMINI_API_KEY_3,         // Fallback 2
  process.env.GEMINI_API_KEY_4,         // Fallback 3
].filter(key => key && key.length > 0);

// Model fallback chain - when primary model is overloaded (503), try next model
// Only using free tier models that are confirmed to work with v1beta API
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite',   // Primary - newest, fast and lightweight (free)
  'gemini-2.0-flash-lite',   // Fallback - stable and reliable (free)
];

// Delay between retries (in milliseconds)
// Note: Free tier = 2 RPM (requests per minute) = need 30s between requests
// Paid tier = 15 RPM = need 4s between requests
const RATE_LIMIT_DELAY = 5000;  // 5s delay before trying next key on 429 (conservative for free tier)
const SERVER_RETRY_DELAY = 3000; // 3s delay between 503 retries

const GEMINI_CONFIG = {
  temperature: 0.3,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Initialize Gemini AI
let genAI;
let model;
let currentKeyIndex = 0;
let currentModelIndex = 0;

/**
 * Initialize Gemini with current key and model
 */
function initializeGemini(keyIndex = currentKeyIndex, modelIndex = currentModelIndex) {
  if (GEMINI_API_KEYS.length === 0) return;

  if (keyIndex >= GEMINI_API_KEYS.length) {
    keyIndex = 0; // Rotate back to start if exhausted
  }
  if (modelIndex >= MODEL_FALLBACK_CHAIN.length) {
    modelIndex = 0; // Rotate back to primary model
  }

  currentKeyIndex = keyIndex;
  currentModelIndex = modelIndex;
  const apiKey = GEMINI_API_KEYS[currentKeyIndex];
  const modelName = MODEL_FALLBACK_CHAIN[currentModelIndex];

  console.log(`🤖 Initializing Gemini AI with key ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length}, model: ${modelName}`);
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: GEMINI_CONFIG
  });
}

// Initial setup
initializeGemini();

/**
 * Switch to next available API key
 * @returns {boolean} true if switched successfully, false if no more keys available
 */
function switchToNextKey() {
  if (currentKeyIndex + 1 < GEMINI_API_KEYS.length) {
    console.log(`🔄 Switching to API key ${currentKeyIndex + 2}/${GEMINI_API_KEYS.length}...`);
    initializeGemini(currentKeyIndex + 1, currentModelIndex);
    return true;
  }
  console.warn('⚠️ All API keys exhausted for current model');
  return false;
}

/**
 * Switch to next available model in fallback chain
 * Resets key index to 0 so all keys can be tried with new model
 * @returns {boolean} true if switched successfully, false if no more models available
 */
function switchToNextModel() {
  if (currentModelIndex + 1 < MODEL_FALLBACK_CHAIN.length) {
    const nextModel = MODEL_FALLBACK_CHAIN[currentModelIndex + 1];
    console.log(`🔄 Model overloaded, switching to fallback model: ${nextModel}`);
    initializeGemini(0, currentModelIndex + 1); // Reset to first key with new model
    return true;
  }
  console.warn('⚠️ All models in fallback chain exhausted');
  return false;
}

// System context for gourd farming expertise
const SYSTEM_CONTEXT = `You are an expert agricultural assistant specializing in gourd farming, particularly bottle gourds (Lagenaria siceraria). 
You provide helpful, accurate advice on:
- Gourd cultivation techniques and best practices
- Hand pollination methods and timing
- Pest and disease identification and management
- Soil preparation and fertilization
- Watering schedules and irrigation
- Harvesting and storage
- Growing season planning
- Troubleshooting common problems

Always provide practical, actionable advice. Keep responses concise but informative (2-4 paragraphs max unless asked for more detail). Use simple language suitable for farmers of all experience levels.`;

/**
 * Helper: Execute a Gemini API call with automatic retry, key rotation, and model fallback
 * @param {Function} operation - Async function that takes the current model and returns a result
 */
async function executeWithRetry(operation) {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Ensure model is initialized
  if (!model) initializeGemini();

  let modelFallbackCount = 0;
  let keyRotationCount = 0;
  let serverRetryCount = 0;
  const maxModelFallbacks = MODEL_FALLBACK_CHAIN.length;
  const maxKeyRotations = GEMINI_API_KEYS.length;
  const maxServerRetries = 3; // Retry up to 3 times for server overload
  let lastError;

  while (modelFallbackCount < maxModelFallbacks) {
    keyRotationCount = 0; // Reset key rotation for each model

    while (keyRotationCount < maxKeyRotations) {
      try {
        return await operation(model);
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        const statusCode = error.status || (errorMessage.match(/\[(\d{3})/)?.[1]);

        // Check for server overload (503) - retry with delay, don't rotate keys
        const isServerOverload = statusCode === 503 ||
          statusCode === '503' ||
          errorMessage.includes('503') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('Service Unavailable');

        if (isServerOverload) {
          if (serverRetryCount < maxServerRetries) {
            serverRetryCount++;
            console.log(`⚠️ Server overloaded (503), waiting ${SERVER_RETRY_DELAY / 1000}s before retry ${serverRetryCount}/${maxServerRetries}...`);
            await new Promise(resolve => setTimeout(resolve, SERVER_RETRY_DELAY));
            continue; // Retry with same key after delay
          }

          // 503 retries exhausted - try next model (not next key)
          console.log(`⚠️ Model ${MODEL_FALLBACK_CHAIN[currentModelIndex]} still overloaded after ${maxServerRetries} retries`);
          break; // Exit inner loop to try next model
        }

        // Check for forbidden/leaked key (403) - skip to next key immediately
        const isForbiddenError = statusCode === 403 ||
          statusCode === '403' ||
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden') ||
          errorMessage.includes('leaked') ||
          errorMessage.includes('API key not valid');

        if (isForbiddenError) {
          console.log(`⚠️ API key ${currentKeyIndex + 1} is invalid/leaked (403), skipping to next key...`);
          if (switchToNextKey()) {
            keyRotationCount++;
            serverRetryCount = 0;
            continue; // Retry with new key
          }
          // All keys exhausted for this model - try next model
          break;
        }

        // Check for rate limit (429) - rotate to next key (more specific patterns)
        const isRateLimitError = statusCode === 429 ||
          statusCode === '429' ||
          errorMessage.includes('429') ||
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('RATE_LIMIT_EXCEEDED');

        if (isRateLimitError) {
          console.log(`⚠️ API rate limit hit (429), waiting ${RATE_LIMIT_DELAY / 1000}s before trying next key...`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
          if (switchToNextKey()) {
            keyRotationCount++;
            serverRetryCount = 0; // Reset server retry count for new key
            continue; // Retry with new key
          }
          // All keys exhausted for this model - try next model
          break; // Exit inner loop to try next model
        }

        // Unknown error - throw immediately
        throw error;
      }
    }

    // Try switching to next model
    if (switchToNextModel()) {
      modelFallbackCount++;
      serverRetryCount = 0; // Reset server retry count for new model
      continue; // Retry with new model
    }

    // No more models available
    break;
  }

  throw new Error(`All Gemini models and API keys exhausted. Last error: ${lastError?.message}`);
}

/**
 * Generate AI response using Gemini API
 */
async function generateMessage(prompt, conversationHistory = []) {
  try {
    const result = await executeWithRetry(async (activeModel) => {
      // Build conversation history for context
      const history = [];

      // Add system context
      history.push({
        role: 'user',
        parts: [{ text: SYSTEM_CONTEXT }]
      });

      history.push({
        role: 'model',
        parts: [{ text: 'Understood. I\'m ready to help with gourd farming questions. What would you like to know?' }]
      });

      // Add recent conversation history (limit to last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || msg.content || msg.message || '' }]
        });
      }

      // Start chat with history
      const chat = activeModel.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40
        }
      });

      // Send message and get response
      const result = await chat.sendMessage(prompt);
      return result;
    });

    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      message: text,
      model: GEMINI_MODEL,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Gemini API Error:', error.message);

    // Provide fallback response
    return {
      success: false,
      message: 'I\'m having trouble connecting to the AI service right now. Please try again in a moment.',
      error: error.message,
      fallback: true
    };
  }
}

/**
 * Get quick suggestions for common topics
 */
function getQuickSuggestions() {
  return [
    'How do I hand-pollinate bottle gourds?',
    'What are common gourd pests?',
    'When is the best time to harvest?',
    'How often should I water my gourds?',
    'What soil is best for growing gourds?',
    'How do I identify male and female flowers?'
  ];
}

/**
 * Check if Gemini service is available
 */
function isAvailable() {
  return GEMINI_API_KEYS.length > 0;
}

/**
 * Generate harvest prediction based on scan and environment
 */
async function generateHarvestPrediction(scanData, environmentalData = {}) {
  try {
    const { prediction, confidence, variety } = scanData;
    const { location, date, weather } = environmentalData;

    const prompt = `
      Analyze the following gourd scan data and environmental context to provide a harvest prediction:
      
      **Scan Data:**
      - Plant/Fruit Type: ${prediction}
      - Variety: ${variety || 'Unknown'}
      - Confidence: ${confidence}
      
      **Context:**
      - Date: ${date || new Date().toDateString()}
      - Location: ${location || 'Unknown'}
      - Weather Conditions: ${weather || 'Unknown'}

      Based on this, provide a JSON response with the following structure:
      {
        "estimatedHarvestDate": "YYYY-MM-DD (or range)",
        "daysToHarvest": number (approximate),
        "confidence": number (0-100),
        "rationale": "Explanation of why this date was chosen based on typical growth cycles and current conditions.",
        "recommendations": ["List of 2-3 specific care tips for this stage"]
      }
      
      Ensure the rationale cites specific growth stages for the identified gourd type.
    `;

    const result = await executeWithRetry(async (activeModel) => {
      return await activeModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });
    });

    const response = await result.response;
    const text = response.text();

    // Parse JSON if it returns a stringified JSON block (sometimes wrapped in markdown code blocks)
    let jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Gemini Harvest Prediction Error:', error.message);
    return {
      error: 'Failed to generate harvest prediction',
      details: error.message
    };
  }
}

/**
 * Analyze flower image for variety and gender identification
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} tmPrediction - Optional context from TFLite model
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeImage(base64Image, tmPrediction = null) {
  try {
    // Memory optimization: Log before processing
    logMemoryUsage('Before Gemini image analysis');

    // Compress image before sending to Gemini (saves memory and bandwidth)
    const compressedBase64 = await compressForGemini(base64Image);

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

    const prompt = `Analyze this gourd/vegetable flower image. Identify the variety and gender.
${contextString}

**Varieties:** ampalaya_bilog (yellow, 5 petals), patola (large yellow), upo_smooth (white), cucumber (yellow, small)
**Gender:** male (stamens, thin stem, no base bulge) | female (ovary bulge at base, pistil)

**CRITICAL IDENTIFICATION TIPS (Visual Rules):**
- **UPO (Bottle Gourd):** Flowers are **WHITE**. If it is yellow, it is NOT Upo.
- **AMPALAYA (Bitter Gourd):** Small yellow flowers, thin stems, deeply lobed petals.
- **PATOLA (Sponge Gourd):** LARGE bright yellow flowers, wide petals.
- **CUCUMBER:** Small yellow flowers, 5 rounded petals, thinner than patola.
- **MALE vs FEMALE:** Look for the "baby fruit" (ovary bulge) behind the flower base. No bulge = MALE.

Respond with ONLY this JSON (keep responses SHORT to avoid truncation):
{
  "variety": "ampalaya_bilog" | "patola" | "upo_smooth" | "cucumber" | "not_flower",
  "gender": "male" | "female" | "unknown",
  "confidence": 0.0-1.0,
  "reasoning": "One sentence explanation citing color and shape",
  "keyFeatures": ["feature1", "feature2"],
  "flowerQuality": {
    "overallScore": 0-100, 
    "petalCondition": "excellent|good|fair|poor",
    "sizeAssessment": "small|average|large",
    "healthIndicators": ["indicator1"]
  },
  "harvestPrediction": {
    "daysToHarvest": number, 
    "currentStage": "bud|blooming|peak_bloom|wilting|pollinated", 
    "pollinationReady": true|false,
    "optimalHarvestWindow": "Morning/Afternoon",
    "bestPollinationTime": "time string"
  },
  "qualityMetrics": {
    "petalQuality": 0-100,
    "colorScore": 0-100,
    "developmentScore": 0-100,
    "healthScore": 0-100,
    "pollinationPotential": 0-100
  },
  "observations": {
    "strengths": ["strength1"],
    "concerns": ["concern1"]
  }
}`;

    // Use compressed image (already cleaned of data URI prefix)
    const cleanBase64 = compressedBase64.replace(/^data:image\/\w+;base64,/, '');

    const result = await executeWithRetry(async (activeModel) => {
      return await activeModel.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: cleanBase64,
          },
        },
      ]);
    });

    const response = await result.response;
    const text = response.text();

    // Parse JSON
    let jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();

    // Ensure we have a valid JSON object by finding the first { and last }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const parsedResult = JSON.parse(jsonStr);

    // Memory optimization: Cleanup and hint GC after heavy operation
    logMemoryUsage('After Gemini image analysis');
    forceGC();

    return parsedResult;

  } catch (error) {
    console.error('Gemini Image Analysis Error:', error.message);
    forceGC(); // Cleanup even on error
    throw error;
  }
}

module.exports = {
  generateMessage,
  getQuickSuggestions,
  isAvailable,
  generateHarvestPrediction,
  analyzeImage
};