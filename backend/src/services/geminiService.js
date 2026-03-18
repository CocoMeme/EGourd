const { GoogleGenAI } = require('@google/genai');
const { logMemoryUsage, forceGC } = require('../utils/memoryUtils');

// ===== KEY POOL — 7 keys with round-robin rotation =====
// Keys 1-4 are existing; 5-7 are GourdVission-1/2/3
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5, // GourdVission-1
  process.env.GEMINI_API_KEY_6, // GourdVission-2
  process.env.GEMINI_API_KEY_7, // GourdVission-3
].filter((key) => key && key.length > 0);

// ===== MODEL FALLBACK CHAIN =====
const MODEL_FALLBACK_CHAIN = [
  'gemini-3-flash-preview', // Primary - balanced speed + accuracy
  'gemini-3.1-flash-lite-preview', // Fallback - high-volume, cost-sensitive
];

// ===== RETRY CONFIGURATION =====
const RETRY_CONFIG = {
  initialDelay: 2000,
  maxDelay: 15000,
  backoffMultiplier: 2,
  timeBudget: 18000, // 18s total budget (fits within 26s frontend timeout)
  maxServerRetries: 3,
};

// ===== GENERATION DEFAULTS =====
// Lower temperature → more deterministic; fewer tokens → faster with structured JSON
const GEMINI_CONFIG = {
  temperature: 0.1,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// ===== ROUND-ROBIN KEY INDEX =====
// Advances once per top-level request so every call uses the next key in sequence
let globalKeyIndex = 0;

// ===== CONCURRENCY QUEUE =====
// 7 keys at ~2 RPM each; allow up to 3 concurrent calls safely
class RequestQueue {
  constructor(concurrency = 3) {
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

const requestQueue = new RequestQueue(3);

// ===== SYSTEM INSTRUCTIONS =====

const FLOWER_SYSTEM_INSTRUCTION = `You are an expert plant scientist specializing in tropical gourd identification (Cucurbitaceae family). Analyze gourd flower images and identify variety and gender with precision.

IDENTIFICATION RULES (non-negotiable):
1. UPO (Bottle Gourd, Lagenaria siceraria): Flowers are WHITE. If the flower is yellow, it CANNOT be Upo.
2. AMPALAYA (Bitter Gourd, Momordica charantia): Small yellow flowers, deeply lobed petals, thin stems.
3. PATOLA (Sponge Gourd, Luffa acutangula): LARGE bright yellow flowers, wide rounded petals.
4. CUCUMBER (Cucumis sativus): Small-to-medium yellow flowers, 5 rounded petals, thinner than patola.
5. GENDER: Female flowers have a distinct ovary (baby fruit) bulge at the base — a swollen green or ribbed protrusion. Male flowers have a thin stem with no such bulge. If you see any bulge at the petal base, classify as FEMALE. Only classify UNKNOWN if the base is completely obscured.
6. HARVEST TIMING: Gourds typically take 20-35 days from full bloom to harvest-ready fruit. Do not estimate 7 days unless the fruit is already large and clearly near-mature.
7. CONFIDENCE: Only set confidence > 0.8 if you are completely certain. Report 0.5-0.7 for partial views or ambiguous images.`;

const LEAF_SYSTEM_INSTRUCTION = `You are an expert plant scientist specializing in tropical gourd identification (Cucurbitaceae family). Analyze gourd leaf images, identify the variety, and assess leaf health.

IDENTIFICATION RULES:
1. AMPALAYA (Bitter Gourd): Deeply lobed leaves, 5-7 pointed lobes, jagged toothed edges, rough upper surface.
2. PATOLA (Sponge Gourd): Large leaves, shallow rounded lobes (3-5), rough texture, wide leaf blade.
3. UPO (Bottle Gourd): Heart-shaped to rounded leaves, shallow lobes, soft texture, velvety whitish underside.
4. KALABASA (Squash): Very large rounded leaves, shallow lobes with hairy texture, triangular stem attachment.
5. PIPINO (Cucumber): Medium triangular leaves, 3-5 angular lobes, rough texture, pointed tips.

HEALTH ASSESSMENT:
- Chlorophyll: "healthy" = uniform dark green; "yellowing" = patches from edges or veins; "deficient" = widespread pale/yellow coloration.
- Nutrient deficiencies: Iron -> interveinal chlorosis (yellow between veins, green veins); Nitrogen -> uniform pale yellowing from older leaves; Magnesium -> yellow edges, green center.
- Disease indicators: Downy mildew -> yellow angular spots on upper surface; Powdery mildew -> white powdery patches; Leaf curl virus -> distorted/curled margins.
- CONFIDENCE: Only set confidence > 0.8 if completely certain. Report 0.5-0.7 for partial views.`;

const CHATBOT_SYSTEM_INSTRUCTION = `You are an expert agricultural assistant specializing in gourd farming, particularly bottle gourds (Lagenaria siceraria).
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

// ===== RESPONSE SCHEMAS =====

const FLOWER_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    variety: {
      type: 'string',
      enum: ['ampalaya_bilog', 'patola', 'upo_smooth', 'cucumber', 'not_flower'],
    },
    gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    keyFeatures: { type: 'array', items: { type: 'string' } },
    flowerQuality: {
      type: 'object',
      properties: {
        overallScore: { type: 'number' },
        petalCondition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
        sizeAssessment: { type: 'string', enum: ['small', 'average', 'large'] },
        healthIndicators: { type: 'array', items: { type: 'string' } },
      },
      required: ['overallScore', 'petalCondition', 'sizeAssessment', 'healthIndicators'],
    },
    harvestPrediction: {
      type: 'object',
      properties: {
        daysToHarvest: { type: 'number' },
        currentStage: {
          type: 'string',
          enum: ['bud', 'blooming', 'peak_bloom', 'wilting', 'pollinated'],
        },
        pollinationReady: { type: 'boolean' },
        optimalHarvestWindow: { type: 'string' },
        bestPollinationTime: { type: 'string' },
      },
      required: [
        'daysToHarvest',
        'currentStage',
        'pollinationReady',
        'optimalHarvestWindow',
        'bestPollinationTime',
      ],
    },
    qualityMetrics: {
      type: 'object',
      properties: {
        petalQuality: { type: 'number' },
        colorScore: { type: 'number' },
        developmentScore: { type: 'number' },
        healthScore: { type: 'number' },
        pollinationPotential: { type: 'number' },
      },
      required: [
        'petalQuality',
        'colorScore',
        'developmentScore',
        'healthScore',
        'pollinationPotential',
      ],
    },
    observations: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'concerns'],
    },
  },
  required: [
    'variety',
    'gender',
    'confidence',
    'reasoning',
    'keyFeatures',
    'flowerQuality',
    'harvestPrediction',
    'qualityMetrics',
    'observations',
  ],
};

const LEAF_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    variety: {
      type: 'string',
      enum: ['ampalaya', 'patola', 'upo', 'kalabasa', 'pipino', 'not_leaf'],
    },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    keyFeatures: { type: 'array', items: { type: 'string' } },
    leafHealth: {
      type: 'object',
      properties: {
        healthScore: { type: 'number' },
        chlorophyllLevel: { type: 'string', enum: ['healthy', 'yellowing', 'deficient'] },
        maturityStage: { type: 'string', enum: ['young', 'mature', 'aging'] },
        visibleIssues: { type: 'array', items: { type: 'string' } },
        nutrientDeficiencies: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'healthScore',
        'chlorophyllLevel',
        'maturityStage',
        'visibleIssues',
        'nutrientDeficiencies',
      ],
    },
    observations: {
      type: 'object',
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        concerns: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'concerns', 'recommendations'],
    },
  },
  required: ['variety', 'confidence', 'reasoning', 'keyFeatures', 'leafHealth', 'observations'],
};

/**
 * Execute a Gemini API call with round-robin key rotation, model fallback, and exponential backoff.
 * Round-robin: every top-level call starts on the next key in sequence (globalKeyIndex advances by 1).
 * Error recovery: 503 retries the same key; 403/429 advance to the next key.
 * @param {Function} operation - async (ai, modelName) => result
 * @param {Object} meta - receives { modelUsed } after success
 */
async function executeWithRetry(operation, meta = {}) {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No GEMINI_API_KEY is configured');
  }

  const startTime = Date.now();
  let lastError;
  let delay = RETRY_CONFIG.initialDelay;

  // Assign starting key for this request (true round-robin across callers)
  const assignedKeyStart = globalKeyIndex;
  globalKeyIndex = (globalKeyIndex + 1) % GEMINI_API_KEYS.length;

  for (let modelIdx = 0; modelIdx < MODEL_FALLBACK_CHAIN.length; modelIdx++) {
    const modelName = MODEL_FALLBACK_CHAIN[modelIdx];
    let serverRetries = 0;
    let keyOffset = 0;

    while (keyOffset < GEMINI_API_KEYS.length) {
      const elapsed = Date.now() - startTime;
      if (elapsed > RETRY_CONFIG.timeBudget) {
        throw new Error(
          `Time budget exhausted (${Math.round(elapsed / 1000)}s). Last error: ${lastError?.message}`
        );
      }

      const keyIdx = (assignedKeyStart + keyOffset) % GEMINI_API_KEYS.length;
      const apiKey = GEMINI_API_KEYS[keyIdx];
      const ai = new GoogleGenAI({ apiKey });

      try {
        console.log(`🤖 Gemini: key ${keyIdx + 1}/${GEMINI_API_KEYS.length}, model: ${modelName}`);
        const result = await requestQueue.enqueue(() => operation(ai, modelName));
        meta.modelUsed = modelName;
        return result;
      } catch (error) {
        lastError = error;
        const errorMessage = error.message || '';
        const statusCode =
          error.status || error.code || (errorMessage.match(/\b(503|403|429)\b/) || [])[1];

        const isServerOverload =
          statusCode == 503 ||
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
            // Don't advance keyOffset — retry the same key
            continue;
          }
          console.log(
            `⚠️ Model ${modelName} still overloaded after ${RETRY_CONFIG.maxServerRetries} retries`
          );
          break; // Move to next model
        }

        const isForbiddenError =
          statusCode == 403 ||
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden') ||
          errorMessage.includes('API key not valid') ||
          errorMessage.includes('leaked');

        if (isForbiddenError) {
          console.log(`⚠️ API key ${keyIdx + 1} invalid (403), trying next...`);
          serverRetries = 0;
          keyOffset++;
          continue;
        }

        const isRateLimitError =
          statusCode == 429 ||
          errorMessage.includes('429') ||
          errorMessage.includes('quota exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('RATE_LIMIT_EXCEEDED');

        if (isRateLimitError) {
          console.log(`⚠️ Rate limit (429) on key ${keyIdx + 1}, backoff ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelay);
          serverRetries = 0;
          keyOffset++;
          continue;
        }

        // Unknown error → throw immediately
        throw error;
      }
    }

    console.log(`⚠️ All keys exhausted for ${modelName}, trying next model...`);
  }

  throw new Error(`All Gemini models and API keys exhausted. Last error: ${lastError?.message}`);
}

/**
 * Generate AI chatbot response using Gemini
 */
async function generateMessage(prompt, conversationHistory = []) {
  try {
    const meta = {};
    const text = await executeWithRetry(async (ai, modelName) => {
      const history = [];
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        history.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || msg.content || msg.message || '' }],
        });
      }

      const chat = ai.chats.create({
        model: modelName,
        history,
        config: {
          systemInstruction: CHATBOT_SYSTEM_INSTRUCTION,
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40,
        },
      });

      const response = await chat.sendMessage({ message: prompt });
      return response.text;
    }, meta);

    return {
      success: true,
      message: text,
      model: meta.modelUsed || MODEL_FALLBACK_CHAIN[0],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Gemini API Error:', error.message);
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
 * Quick suggestions for common gourd farming topics
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
 * Generate harvest prediction from scan + environmental data
 */
async function generateHarvestPrediction(scanData, environmentalData = {}) {
  try {
    const { prediction, confidence, variety } = scanData;
    const { location, date, weather } = environmentalData;

    const prompt = `Analyze the following gourd scan data and provide a harvest prediction.

Scan Data:
- Plant/Fruit Type: ${prediction}
- Variety: ${variety || 'Unknown'}
- Confidence: ${confidence}

Context:
- Date: ${date || new Date().toDateString()}
- Location: ${location || 'Unknown'}
- Weather: ${weather || 'Unknown'}

Provide estimated harvest date, days to harvest, confidence (0-100), rationale citing growth stages, and 2-3 care recommendations.`;

    const response = await executeWithRetry(async (ai, modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              estimatedHarvestDate: { type: 'string' },
              daysToHarvest: { type: 'number' },
              confidence: { type: 'number' },
              rationale: { type: 'string' },
              recommendations: { type: 'array', items: { type: 'string' } },
            },
            required: [
              'estimatedHarvestDate',
              'daysToHarvest',
              'confidence',
              'rationale',
              'recommendations',
            ],
          },
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Gemini Harvest Prediction Error:', error.message);
    return {
      error: 'Failed to generate harvest prediction',
      details: error.message,
    };
  }
}

/**
 * Analyze flower image for variety and gender identification.
 * Uses structured output (responseSchema) to guarantee valid JSON without manual parsing.
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {Object} tmPrediction - Optional TFLite context { label, confidence, gender }
 * @returns {Promise<Object>} Structured flower analysis result
 */
async function analyzeImage(base64Image, tmPrediction = null) {
  try {
    logMemoryUsage('Before Gemini image analysis');

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    let userPrompt = 'Analyze this gourd flower image. Identify the variety and gender.';
    if (tmPrediction) {
      userPrompt += `\n\nCONTEXT FROM LOCAL MODEL: Previously identified as "${tmPrediction.label}" with ${tmPrediction.confidence}% confidence. Verify — override only if you have strong visual evidence.`;
      if (tmPrediction.gender === 'female') {
        userPrompt +=
          '\nIMPORTANT: Local model detected a FEMALE flower. Look specifically for an ovary bulge at the base. Do not classify as MALE unless you are absolutely certain the bulge is absent.';
      }
    }

    const response = await executeWithRetry(async (ai, modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: userPrompt },
              { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            ],
          },
        ],
        config: {
          systemInstruction: FLOWER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: FLOWER_ANALYSIS_SCHEMA,
          ...GEMINI_CONFIG,
        },
      });
    });

    const parsedResult = JSON.parse(response.text);

    logMemoryUsage('After Gemini image analysis');
    forceGC();

    return parsedResult;
  } catch (error) {
    console.error('Gemini Image Analysis Error:', error.message);
    forceGC();
    throw error;
  }
}

/**
 * Analyze leaf image for variety identification and health assessment.
 * Uses structured output (responseSchema) to guarantee valid JSON.
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {Object} tmPrediction - Optional TFLite context { label, confidence }
 * @returns {Promise<Object>} Structured leaf analysis result
 */
async function analyzeLeaf(base64Image, tmPrediction = null) {
  try {
    logMemoryUsage('Before Gemini leaf analysis');

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    let userPrompt = 'Analyze this gourd leaf image. Identify the variety and assess leaf health.';
    if (tmPrediction) {
      userPrompt += `\n\nCONTEXT FROM LOCAL MODEL: Previously identified as "${tmPrediction.label}" with ${tmPrediction.confidence}% confidence. Verify this identification.`;
    }

    const response = await executeWithRetry(async (ai, modelName) => {
      return await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: userPrompt },
              { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            ],
          },
        ],
        config: {
          systemInstruction: LEAF_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema: LEAF_ANALYSIS_SCHEMA,
          ...GEMINI_CONFIG,
        },
      });
    });

    const parsedResult = JSON.parse(response.text);

    logMemoryUsage('After Gemini leaf analysis');
    forceGC();

    return parsedResult;
  } catch (error) {
    console.error('Gemini Leaf Analysis Error:', error.message);
    forceGC();
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
