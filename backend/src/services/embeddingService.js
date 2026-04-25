const { GoogleGenAI } = require('@google/genai');
const Scan = require('../models/Scan');

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_DIM = 768;

// Use the first available API key for embeddings (low-quota operation, no rotation needed)
function getAI() {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_2;
  if (!key) throw new Error('No Gemini API key available for embeddings');
  return new GoogleGenAI({ apiKey: key });
}

/**
 * Build a descriptive text string from a scan document for embedding.
 * More descriptive text = better semantic similarity matching.
 */
function buildScanText(scan) {
  const parts = [];

  const type = scan.scanType || 'flower';
  parts.push(`Scan type: ${type}`);

  if (scan.variety) parts.push(`Variety: ${scan.variety}`);
  if (scan.prediction) parts.push(`Prediction: ${scan.prediction}`);

  const gemini = scan.aiPrediction?.gemini;
  if (gemini) {
    if (gemini.variety) parts.push(`Gemini variety: ${gemini.variety}`);
    if (gemini.gender) parts.push(`Gemini gender: ${gemini.gender}`);
    if (gemini.confidence) parts.push(`Gemini confidence: ${gemini.confidence}%`);
    if (gemini.reasoning) parts.push(`Reasoning: ${gemini.reasoning}`);
    if (gemini.keyFeatures?.length > 0) {
      parts.push(`Key features: ${gemini.keyFeatures.join(', ')}`);
    }
    const obs = gemini.observations;
    if (obs) {
      if (obs.strengths?.length > 0) parts.push(`Strengths: ${obs.strengths.join(', ')}`);
      if (obs.concerns?.length > 0) parts.push(`Concerns: ${obs.concerns.join(', ')}`);
    }
    const leaf = gemini.leaf;
    if (leaf) {
      if (leaf.overallHealth) parts.push(`Leaf health: ${leaf.overallHealth}`);
      if (leaf.diseases?.length > 0)
        parts.push(`Diseases: ${leaf.diseases.map((d) => d.name).join(', ')}`);
    }
  }

  const tflite = scan.aiPrediction?.tflite;
  if (tflite) {
    if (tflite.variety) parts.push(`TFLite variety: ${tflite.variety}`);
    if (tflite.confidence) parts.push(`TFLite confidence: ${tflite.confidence}%`);
  }

  return parts.join('. ');
}

/**
 * Generate an embedding vector for the given text using Gemini text-embedding-004.
 * @returns {Promise<number[]>} 768-dimensional float array
 */
async function generateEmbedding(text) {
  const ai = getAI();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  return result.embeddings[0].values;
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

/**
 * Generate an embedding for a scan and store it in MongoDB.
 * Designed to be called non-blocking after scan save.
 */
async function generateAndStore(scanId, scanText) {
  try {
    const embedding = await generateEmbedding(scanText);
    await Scan.findByIdAndUpdate(scanId, { $set: { embedding } });
  } catch (err) {
    // Embedding is best-effort — log but never block the scan pipeline
    console.error(`[EmbeddingService] Failed to embed scan ${scanId}:`, err.message);
  }
}

/**
 * Find the top-k most similar past scans for a user, given a query embedding.
 * Uses Atlas Vector Search if available, falls back to in-memory cosine similarity.
 *
 * @param {string} userId
 * @param {number[]} queryEmbedding
 * @param {string} scanType - 'flower' or 'leaf'
 * @param {string} excludeId - scan ID to exclude (the current scan)
 * @param {number} k - number of results to return
 * @returns {Promise<Object[]>} Array of scan summaries sorted by similarity
 */
async function findSimilarScans(userId, queryEmbedding, scanType, excludeId = null, k = 3) {
  try {
    // Try Atlas Vector Search first
    const pipeline = [
      {
        $vectorSearch: {
          index: 'scan_embedding_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 50,
          limit: k + 1,
          filter: { userId: userId.toString(), scanType },
        },
      },
      {
        $project: {
          _id: 1,
          variety: 1,
          scanType: 1,
          'aiPrediction.gemini': 1,
          'aiPrediction.tflite': 1,
          date: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await Scan.aggregate(pipeline);
    const filtered = excludeId
      ? results.filter((s) => s._id.toString() !== excludeId.toString())
      : results;
    return filtered.slice(0, k);
  } catch (_atlasErr) {
    // Atlas Vector Search not available — fallback to in-memory cosine similarity
    const scans = await Scan.find(
      { userId, scanType, _id: { $ne: excludeId }, embedding: { $exists: true } },
      { variety: 1, scanType: 1, aiPrediction: 1, date: 1, embedding: 1 }
    )
      .limit(200)
      .lean();

    const scored = scans.map((s) => ({
      ...s,
      score: cosineSimilarity(queryEmbedding, s.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(({ embedding: _e, ...rest }) => rest);
  }
}

/**
 * Build a compact few-shot context block from similar scans.
 * This is injected into the Gemini prompt as reference scans.
 */
function buildContextBlock(similarScans) {
  if (!similarScans || similarScans.length === 0) return '';

  const blocks = similarScans
    .map((s, i) => {
      const g = s.aiPrediction?.gemini;
      if (!g) return null;

      const lines = [`Reference Scan ${i + 1}:`];
      if (s.variety) lines.push(`  Variety: ${s.variety}`);
      if (g.gender) lines.push(`  Gender: ${g.gender}`);
      if (g.confidence) lines.push(`  Confidence: ${g.confidence}%`);
      if (g.reasoning) lines.push(`  Reasoning: ${g.reasoning.substring(0, 200)}...`);
      if (g.keyFeatures?.length > 0) lines.push(`  Key features: ${g.keyFeatures.join(', ')}`);
      return lines.join('\n');
    })
    .filter(Boolean);

  if (blocks.length === 0) return '';

  return `\n\nREFERENCE SCANS (from this user's previous analyses — use as few-shot context to calibrate your confidence and reasoning, but always base your primary assessment on the current image):\n${blocks.join('\n\n')}`;
}

module.exports = {
  buildScanText,
  generateEmbedding,
  generateAndStore,
  findSimilarScans,
  buildContextBlock,
  EMBEDDING_DIM,
};
