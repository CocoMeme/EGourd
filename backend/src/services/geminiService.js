const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logMemoryUsage, forceGC } = require('../utils/memoryUtils');

// Get API keys from environment - supports multiple keys for fallback
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY, // Primary key
  process.env.GEMINI_API_KEY_2, // Fallback 1
  process.env.GEMINI_API_KEY_3, // Fallback 2
  process.env.GEMINI_API_KEY_4, // Fallback 3
].filter((key) => key && key.length > 0);

// Model fallback chain - when primary model is overloaded (503), try next model
// Only using free tier models that are confirmed to work with v1beta API
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash-lite', // Primary - newest, fast and lightweight (free)
  'gemini-2.0-flash-lite', // Fallback - stable and reliable (free)
];

// Retry configuration with exponential backoff
const RETRY_CONFIG = {
  initialDelay: 2000, // 2s initial backoff
  maxDelay: 15000, // 15s max backoff
  backoffMultiplier: 2, // Double each retry
  timeBudget: 25000, // 25s total budget (fits within 35s frontend timeout)
  maxServerRetries: 3, // Max 503 retries per model
};

const GEMINI_CONFIG = {
  temperature: 0.3,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 2048,
};

/**
 * Concurrency queue — limits parallel Gemini API calls.
 * With 4 free-tier keys at 2 RPM each, max 2 concurrent is safe.
 */
class RequestQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async enqueue(fn) {
    if (this.running >= this.concurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        this.queue.shift()();
      }
    }
  }
}

const requestQueue = new RequestQueue(2);

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
 * Execute a Gemini API call with per-call model instantiation,
 * automatic retry, key rotation, model fallback, and exponential backoff.
 * No shared mutable state — safe for concurrent requests.
 * @param {Function} operation - Async function that takes the current model and returns a result
 * @param {Object} meta - Optional object to receive metadata (e.g., meta.modelUsed)
 */
async function executeWithRetry(operation, meta = {}) {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const startTime = Date.now();
  let lastError;
  let delay = RETRY_CONFIG.initialDelay;

  for (let modelIndex = 0; modelIndex < MODEL_FALLBACK_CHAIN.length; modelIndex++) {
    const modelName = MODEL_FALLBACK_CHAIN[modelIndex];
    let serverRetries = 0;

    for (let keyIndex = 0; keyIndex < GEMINI_API_KEYS.length; keyIndex++) {
      // Check time budget
      const elapsed = Date.now() - startTime;
      if (elapsed > RETRY_CONFIG.timeBudget) {
        throw new Error(
          `Time budget exhausted (${Math.round(elapsed / 1000)}s). Last error: ${lastError?.message}`
        );
      }

      // Create fresh instances per attempt — no shared state between requests
      const apiKey = GEMINI_API_KEYS[keyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const activeModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: GEMINI_CONFIG,
      });

      try {
        console.log(
          `🤖 Gemini: key ${keyIndex + 1}/${GEMINI_API_KEYS.length}, model: ${modelName}`
        );
        const result = await requestQueue.enqueue(() => operation(activeModel));
        meta.modelUsed = modelName;
        return result;
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        const statusCode = error.status || errorMessage.match(/\[(\d{3})/)?.[1];

        // 503 Server overload → retry same key with backoff, then next model
        const isServerOverload =
          statusCode === 503 ||
          statusCode === '503' ||
          errorMessage.includes('503') ||
          errorMessage.includes('overloaded') ||
          errorMessage.includes('Service Unavailable');

        if (isServerOverload) {
          if (serverRetries < RETRY_CONFIG.maxServerRetries) {
            serverRetries++;
            console.log(
              `⚠️ Server overloaded (503), backoff ${delay}ms (retry ${serverRetries}/${RETRY_CONFIG.maxServerRetries})...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
            keyIndex--; // Retry same key
            continue;
          }
          console.log(
            `⚠️ Model ${modelName} still overloaded after ${RETRY_CONFIG.maxServerRetries} retries`
          );
          break; // Try next model
        }

        // 403 Forbidden / invalid key → skip to next key immediately
        const isForbiddenError =
          statusCode === 403 ||
          statusCode === '403' ||
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden') ||
          errorMessage.includes('leaked') ||
          errorMessage.includes('API key not valid');

        if (isForbiddenError) {
          console.log(`⚠️ API key ${keyIndex + 1} invalid (403), trying next...`);
          serverRetries = 0;
          continue;
        }

        // 429 Rate limit → backoff then next key
        const isRateLimitError =
          statusCode === 429 ||
          statusCode === '429' ||
          errorMessage.includes('429') ||
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('RATE_LIMIT_EXCEEDED');

        if (isRateLimitError) {
          console.log(`⚠️ Rate limit (429) on key ${keyIndex + 1}, backoff ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
          serverRetries = 0;
          continue;
        }

        // Unknown error → throw immediately
        throw error;
      }
    }

    // All keys exhausted for this model
    console.log(`⚠️ All keys exhausted for ${modelName}, trying next model...`);
  }

  throw new Error(`All Gemini models and API keys exhausted. Last error: ${lastError?.message}`);
}

/**
 * Generate AI response using Gemini API
 */
async function generateMessage(prompt, conversationHistory = []) {
  try {
    const meta = {};
    const result = await executeWithRetry(async (activeModel) => {
      // Build conversation history for context
      const history = [];

      // Add system context
      history.push({
        role: 'user',
        parts: [{ text: SYSTEM_CONTEXT }],
      });

      history.push({
        role: 'model',
        parts: [
          {
            text: "Understood. I'm ready to help with gourd farming questions. What would you like to know?",
          },
        ],
      });

      // Add recent conversation history (limit to last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || msg.content || msg.message || '' }],
        });
      }

      // Start chat with history
      const chat = activeModel.startChat({
        history,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40,
        },
      });

      // Send message and get response
      const result = await chat.sendMessage(prompt);
      return result;
    }, meta);

    const response = await result.response;
    const text = response.text();

    return {
      success: true,
      message: text,
      model: meta.modelUsed || MODEL_FALLBACK_CHAIN[0],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message);

    // Provide fallback response
    return {
      success: false,
      message:
        "I'm having trouble connecting to the AI service right now. Please try again in a moment.",
      error: error.message,
      fallback: true,
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
    'How do I identify male and female flowers?',
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
          responseMimeType: 'application/json',
        },
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
      details: error.message,
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

    // Frontend already compresses images; just clean the data URI prefix
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

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
- **HARVEST TIMING:** For most gourds (Ampalaya, Patola, Upo), it typically takes **20-35 days** from flower bloom to harvestable fruit. Do not guess 7 days unless the fruit is already very large.

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

/**
 * Analyze leaf image for variety and health assessment
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} tmPrediction - Optional context from TFLite model
 * @returns {Promise<Object>} Leaf analysis result
 */
async function analyzeLeaf(base64Image, tmPrediction = null) {
  try {
    // Memory optimization: Log before processing
    logMemoryUsage('Before Gemini leaf analysis');

    // Frontend already compresses images; just clean the data URI prefix
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // Prepare context string if prediction is available
    let contextString = '';
    if (tmPrediction) {
      contextString = `
CONTEXT FROM SPECIALIZED MODEL:
This leaf was identified by a specialized local model as: "${tmPrediction.label}" with ${tmPrediction.confidence}% confidence.
Please verify this identification.
`;
    }

    const prompt = `Analyze this gourd/vegetable leaf image. Identify the variety and assess the leaf health.
${contextString}

**Varieties:** Ampalaya (bitter gourd), Patola (sponge gourd), Upo (bottle gourd), Kalabasa (squash), Pipino (cucumber)

**IDENTIFICATION TIPS:**
- **AMPALAYA:** Deeply lobed leaves with pointed tips, 5-7 lobes, jagged edges
- **PATOLA:** Large, rounded leaves with shallow lobes, rough texture
- **UPO:** Heart-shaped or rounded leaves, soft texture, velvety underside
- **KALABASA:** Large, rounded leaves with shallow lobes, hairy stems
- **PIPINO:** Triangular leaves with pointed tips, rough texture, 3-5 lobes

Respond with ONLY this JSON (keep responses SHORT to avoid truncation):
{
  "variety": "ampalaya" | "patola" | "upo" | "kalabasa" | "pipino" | "not_leaf",
  "confidence": 0.0-1.0,
  "reasoning": "One sentence explanation citing key visual features",
  "keyFeatures": ["feature1", "feature2"],
  "leafHealth": {
    "healthScore": 0-100,
    "chlorophyllLevel": "healthy|yellowing|deficient",
    "maturityStage": "young|mature|aging",
    "visibleIssues": ["issue1"],
    "nutrientDeficiencies": ["deficiency1"]
  },
  "observations": {
    "strengths": ["strength1"],
    "concerns": ["concern1"],
    "recommendations": ["recommendation1"]
  }
}`;

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

    // Ensure we have a valid JSON object
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    const parsedResult = JSON.parse(jsonStr);

    // Memory optimization: Cleanup and hint GC after heavy operation
    logMemoryUsage('After Gemini leaf analysis');
    forceGC();

    return parsedResult;
  } catch (error) {
    console.error('Gemini Leaf Analysis Error:', error.message);
    forceGC(); // Cleanup even on error
    throw error;
  }
}

module.exports = {
  generateMessage,
  getQuickSuggestions,
  isAvailable,
  generateHarvestPrediction,
  analyzeImage,
  analyzeLeaf,
};
