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
  'gemini-3.1-flash-lite-preview', // Primary - balanced speed + accuracy
  'gemini-3-flash-preview', // Fallback - high-volume, cost-sensitive
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
// Lower temperature → more deterministic; higher token budget prevents truncated JSON
const GEMINI_CONFIG = {
  temperature: 0.1,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 8192,
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

const FLOWER_SYSTEM_INSTRUCTION = `You are an expert plant scientist specializing in tropical gourd identification (Cucurbitaceae family). Your role is to independently analyze gourd flower images and determine variety and gender based solely on visual evidence.

CRITICAL — INDEPENDENT ANALYSIS:
Always form your own assessment from the image first. If context from an external model is provided, treat it as a secondary reference only — never let it bias or override your visual analysis. Your confidence must reflect YOUR certainty from the image, not agreement with any external prediction.

VARIETY IDENTIFICATION (key distinguishing features):
1. UPO (Bottle Gourd, Lagenaria siceraria):
   - Flowers are always WHITE or cream — never yellow
   - Large funnel-shaped petals with prominent veining
   - Thick, hairy calyx and peduncle (flower stalk)
   - Blooms open primarily in the evening/night
   - RULE: If the flower is yellow, it CANNOT be Upo
2. AMPALAYA (Bitter Gourd, Momordica charantia):
   - Small YELLOW flowers (1.5-2cm diameter)
   - 5 deeply separated, rounded petals with visible venation
   - Thin, wiry stems; calyx is small and star-shaped
   - Petals appear delicate, almost translucent at edges
3. PATOLA (Sponge Gourd, Luffa acutangula):
   - LARGE bright yellow flowers (5-8cm diameter) — noticeably bigger than ampalaya or cucumber
   - 5 wide, overlapping rounded petals forming a broad face
   - Prominent yellow stamens clustered at center
   - Thick, angular ridged stem; flower base may show ridges
4. CUCUMBER (Cucumis sativus):
   - Small-to-medium YELLOW flowers (2-3cm diameter)
   - 5 pointed, star-shaped petals (more angular than patola)
   - Lighter yellow than patola; petals thinner and more deeply divided
   - Short peduncle; flowers cluster near leaf axils
5. KALABASA (Squash, Cucurbita spp.):
   - Large bright YELLOW-ORANGE flowers (8-12cm diameter) — the largest gourd flowers
   - 5 fused petals forming a deep bell or trumpet shape (not flat-faced like patola)
   - Thick, fleshy petals with prominent ridges along the corolla
   - Stout, angular, hairy/prickly stem (pentagonal cross-section)
   - KEY DIFFERENTIATOR: Bell-shaped fused corolla and massive size distinguish from all others

GENDER IDENTIFICATION:
- FEMALE: A swollen ovary (miniature fruit shape) is visible at the base below the petals. This bulge is green, sometimes ridged or elongated depending on species. The ovary is the single most reliable gender indicator.
- MALE: Thin, straight stem below the flower with NO basal swelling. Stamens are prominent inside the flower.
- UNKNOWN: Only use when the flower base is completely obscured or the image is too blurry to determine.

HARVEST TIMING:
- Gourds typically take 20-35 days from full bloom to harvest-ready fruit.
- Do not estimate less than 14 days unless a developing fruit is already clearly visible and near-mature.

CONFIDENCE CALIBRATION (anchor to visual evidence only):
- 0.85-1.0: Crystal-clear image, textbook features visible, zero ambiguity.
- 0.70-0.84: Good image quality, most key features visible, minor uncertainty.
- 0.50-0.69: Partial view, some features obscured, or atypical presentation.
- Below 0.50: Poor image, heavily obscured, or genuinely ambiguous.`;

const LEAF_SYSTEM_INSTRUCTION = `You are an expert plant scientist specializing in tropical gourd identification (Cucurbitaceae family). Your role is to independently analyze gourd leaf images, identify the variety, and assess leaf health based solely on visual evidence.

CRITICAL — INDEPENDENT ANALYSIS:
Always form your own assessment from the image first. If context from an external model is provided, treat it as a secondary reference only — never let it bias or override your visual analysis. Your confidence must reflect YOUR certainty from the image, not agreement with any external prediction.

VARIETY IDENTIFICATION (key distinguishing features):
1. AMPALAYA (Bitter Gourd, Momordica charantia):
   - Deeply palmately lobed (5-7 pointed lobes), each lobe narrow and elongated
   - Margins are irregularly serrated/toothed with sharp edges
   - Upper surface rough to touch; dark green when healthy; leaf size 8-15cm
   - KEY DIFFERENTIATOR: Most deeply cut lobes of all gourd leaves — sinuses reach close to the petiole
2. PATOLA (Sponge Gourd, Luffa acutangula):
   - Large palmately lobed leaves (3-5 shallow to moderate lobes)
   - Rough sandpaper-like texture on upper surface
   - Wide leaf blade (15-25cm); broader than deep
   - KEY DIFFERENTIATOR: Lobes are rounded (not pointed like ampalaya); rough texture is distinctive
3. UPO (Bottle Gourd, Lagenaria siceraria):
   - Heart-shaped to kidney-shaped with very shallow lobes or nearly entire margin
   - Soft, velvety texture; underside has whitish pubescence (fine hairs)
   - Light to medium green color
   - KEY DIFFERENTIATOR: Velvety soft feel and whitish underside distinguish from all other gourds
4. KALABASA (Squash, Cucurbita spp.):
   - Very large rounded leaves (20-40cm), the largest among common gourds
   - Shallow lobes with broadly triangular shape
   - Surface covered with stiff, prickly hairs (hispid)
   - KEY DIFFERENTIATOR: Massive size and prickly/hairy texture; triangular petiole attachment area often has white mottling
5. PIPINO (Cucumber, Cucumis sativus):
   - Medium triangular leaves with 3-5 angular, pointed lobes
   - Rough texture with small bristly hairs; thinner leaf blade than kalabasa or patola
   - KEY DIFFERENTIATOR: Angular pointed lobes (vs. rounded in patola) and medium size (vs. large in kalabasa)

HEALTH ASSESSMENT:
- Chlorophyll: "healthy" = uniform dark green; "yellowing" = patches spreading from edges or veins; "deficient" = widespread pale/yellow coloration.
- Nutrient deficiencies: Iron -> interveinal chlorosis (yellow between veins, green veins remain); Nitrogen -> uniform pale yellowing starting from older/lower leaves; Magnesium -> yellow margins with green center persisting.
- Disease indicators: Downy mildew -> yellow angular spots bounded by leaf veins on upper surface; Powdery mildew -> white powdery coating on upper/lower surfaces; Leaf curl virus -> upward/downward curling and distortion of leaf margins.

CONFIDENCE CALIBRATION (anchor to visual evidence only):
- 0.85-1.0: Crystal-clear image, textbook features visible, zero ambiguity.
- 0.70-0.84: Good image quality, most key features visible, minor uncertainty.
- 0.50-0.69: Partial view, some features obscured, or atypical presentation.
- Below 0.50: Poor image, heavily obscured, or genuinely ambiguous.`;

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
      enum: ['ampalaya_bilog', 'patola', 'upo_smooth', 'cucumber', 'kalabasa', 'not_flower'],
    },
    gender: { type: 'string', enum: ['male', 'female', 'unknown'] },
    confidence: { type: 'number' },
    reasoning: { type: 'string' },
    keyFeatures: { type: 'array', items: { type: 'string' } },
    flowerQuality: {
      type: 'object',
      properties: {
        overallScore: { type: 'number', minimum: 0, maximum: 100 },
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
          enum: ['bud', 'blooming', 'peak_bloom', 'pollinated', 'wilting'],
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
        petalQuality: { type: 'number', minimum: 0, maximum: 100 },
        colorScore: { type: 'number', minimum: 0, maximum: 100 },
        developmentScore: { type: 'number', minimum: 0, maximum: 100 },
        healthScore: { type: 'number', minimum: 0, maximum: 100 },
        pollinationPotential: { type: 'number', minimum: 0, maximum: 100 },
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
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['strengths', 'concerns', 'recommendations'],
    },
    tfliteComparison: {
      type: 'object',
      description:
        'Comparison with on-device TFLite model prediction. Populate only when TFLite context is provided.',
      properties: {
        agrees: { type: 'boolean', description: 'Whether Gemini overall agrees with TFLite' },
        varietyAgreement: {
          type: 'boolean',
          description: 'Whether variety predictions match',
        },
        genderAgreement: {
          type: 'boolean',
          description: 'Whether gender predictions match',
        },
        overrideReason: {
          type: 'string',
          description:
            'If Gemini disagrees, explain which visual evidence contradicts the TFLite prediction',
        },
        confidenceAssessment: {
          type: 'string',
          description:
            'Assessment of whether the TFLite confidence level seems justified given the image',
        },
      },
      required: [
        'agrees',
        'varietyAgreement',
        'genderAgreement',
        'overrideReason',
        'confidenceAssessment',
      ],
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
        healthScore: { type: 'number', minimum: 0, maximum: 100 },
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
    tfliteComparison: {
      type: 'object',
      description:
        'Comparison with on-device TFLite model prediction. Populate only when TFLite context is provided.',
      properties: {
        agrees: { type: 'boolean', description: 'Whether Gemini overall agrees with TFLite' },
        varietyAgreement: {
          type: 'boolean',
          description: 'Whether variety predictions match',
        },
        overrideReason: {
          type: 'string',
          description:
            'If Gemini disagrees, explain which visual evidence contradicts the TFLite prediction',
        },
        confidenceAssessment: {
          type: 'string',
          description:
            'Assessment of whether the TFLite confidence level seems justified given the image',
        },
      },
      required: ['agrees', 'varietyAgreement', 'overrideReason', 'confidenceAssessment'],
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
 * Parse Gemini JSON response safely.
 * If the text is truncated (unterminated string/object), throws a descriptive error
 * rather than a cryptic SyntaxError so callers can retry or return a fallback.
 */
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to detect truncation vs. genuinely malformed JSON
    const trimmed = (text || '').trim();
    const isTruncated = trimmed.length > 0 && !trimmed.endsWith('}') && !trimmed.endsWith(']');
    if (isTruncated) {
      throw new Error(
        `Gemini response was truncated (${trimmed.length} chars). The model hit its output token limit mid-JSON. Original error: ${e.message}`
      );
    }
    throw new Error(`Gemini returned invalid JSON: ${e.message}`);
  }
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

    // Include Gemini flower stage data if available for richer context
    const currentStage = scanData.aiPrediction?.gemini?.harvestPrediction?.currentStage || null;
    const pollinationReady =
      scanData.aiPrediction?.gemini?.harvestPrediction?.pollinationReady ?? null;
    const flowerHealthScore = scanData.aiPrediction?.gemini?.flowerQuality?.overallScore || null;

    const prompt = `Analyze the following gourd scan data and provide a harvest prediction.

Scan Data:
- Plant/Fruit Type: ${prediction}
- Variety: ${variety || 'Unknown'}
- Confidence: ${confidence}%${currentStage ? `\n- Current Growth Stage: ${currentStage}` : ''}${pollinationReady !== null ? `\n- Pollination Ready: ${pollinationReady}` : ''}${flowerHealthScore !== null ? `\n- Flower Health Score: ${flowerHealthScore}/100` : ''}

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
          maxOutputTokens: 2048,
        },
      });
    });

    return safeJsonParse(response.text);
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
async function analyzeImage(base64Image, tmPrediction = null, contextBlock = '') {
  try {
    logMemoryUsage('Before Gemini image analysis');

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    let userPrompt =
      'Analyze this gourd flower image. First, form your own independent assessment of the variety and gender based solely on what you see in the image.';
    if (tmPrediction) {
      userPrompt += `\n\nAFTER completing your independent analysis, compare it with this on-device model prediction:
- Variety: "${tmPrediction.label}"
- Confidence: ${tmPrediction.confidence}%${tmPrediction.gender ? `\n- Gender: ${tmPrediction.gender}` : ''}

Note: The on-device model may be overconfident due to overfitting. Do NOT anchor your confidence to its score. Populate the tfliteComparison field with your honest assessment of agreement/disagreement and explain any differences with specific visual evidence.`;
    }
    if (contextBlock) {
      userPrompt += contextBlock;
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

    const parsedResult = safeJsonParse(response.text);

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
async function analyzeLeaf(base64Image, tmPrediction = null, contextBlock = '') {
  try {
    logMemoryUsage('Before Gemini leaf analysis');

    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    let userPrompt =
      'Analyze this gourd leaf image. First, form your own independent assessment of the variety and leaf health based solely on what you see in the image.';
    if (tmPrediction) {
      userPrompt += `\n\nAFTER completing your independent analysis, compare it with this on-device model prediction:
- Variety: "${tmPrediction.label}"
- Confidence: ${tmPrediction.confidence}%

Note: The on-device model may be overconfident due to overfitting. Do NOT anchor your confidence to its score. Populate the tfliteComparison field with your honest assessment of agreement/disagreement and explain any differences with specific visual evidence.`;
    }
    if (contextBlock) {
      userPrompt += contextBlock;
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

    const parsedResult = safeJsonParse(response.text);

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
