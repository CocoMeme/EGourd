const { GoogleGenerativeAI } = require('@google/generative-ai');

// Get API keys from environment - supports multiple keys for fallback
const GEMINI_API_KEYS = [
  process.env.GEMINI_API_KEY,           // Primary key
  process.env.GEMINI_API_KEY_2,         // Fallback 1
  process.env.GEMINI_API_KEY_3,         // Fallback 2
  process.env.GEMINI_API_KEY_4,         // Fallback 3
].filter(key => key && key.length > 0);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_CONFIG = {
  // model property is NOT allowed here, it's passed to getGenerativeModel
  temperature: 0.3,
  topK: 1,
  topP: 0.95,
  maxOutputTokens: 2048,
};

// Initialize Gemini AI
let genAI;
let model;
let currentKeyIndex = 0;

/**
 * Initialize Gemini with current key
 */
function initializeGemini(keyIndex = currentKeyIndex) {
  if (GEMINI_API_KEYS.length === 0) return;
  
  if (keyIndex >= GEMINI_API_KEYS.length) {
    keyIndex = 0; // Rotate back to start if exhausted
  }
  
  currentKeyIndex = keyIndex;
  const apiKey = GEMINI_API_KEYS[currentKeyIndex];
  
  console.log(`🤖 Initializing Gemini AI with key ${currentKeyIndex + 1}/${GEMINI_API_KEYS.length}...`);
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ 
    model: GEMINI_MODEL,
    generationConfig: GEMINI_CONFIG 
  });
}

// Initial setup
initializeGemini();

/**
 * Switch to next available API key
 */
function switchToNextKey() {
  if (currentKeyIndex + 1 < GEMINI_API_KEYS.length) {
    console.log(`⚠️ API rate limit hit, switching to fallback key ${currentKeyIndex + 2}...`);
    initializeGemini(currentKeyIndex + 1);
    return true;
  }
  console.warn('⚠️ All API keys exhausted or rate limited');
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
 * Helper: Execute a Gemini API call with automatic retry and key rotation
 * @param {Function} operation - Async function that takes the current model and returns a result
 */
async function executeWithRetry(operation) {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Ensure model is initialized
  if (!model) initializeGemini();

  let retryCount = 0;
  const maxRetries = GEMINI_API_KEYS.length;
  let lastError;

  while (retryCount < maxRetries) {
    try {
      return await operation(model);
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';
      const isRateLimitError = errorMessage.includes('429') || 
                               errorMessage.includes('quota') || 
                               errorMessage.includes('rate') ||
                               errorMessage.includes('Resource has been exhausted');
      
      if (isRateLimitError) {
        console.log(`⚠️ API rate limit hit, attempting switch to fallback key...`);
        if (switchToNextKey()) {
          retryCount++;
          continue; // Retry with new key
        }
      }
      
      throw error; // If not rate limit or no keys left, throw original error
    }
  }

  throw new Error(`All Gemini API keys exhausted. Last error: ${lastError?.message}`);
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

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

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
    
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error('Gemini Image Analysis Error:', error.message);
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