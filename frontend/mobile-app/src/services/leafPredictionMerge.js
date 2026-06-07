/**
 * Pure helpers for leaf prediction merging.
 * Extracted so the Gemini-overwrites-TM logic is unit-testable
 * without mounting the screen.
 */

const detectGeminiIsNotLeaf = (geminiResult) => {
  if (!geminiResult) return false;
  if (typeof geminiResult.isNotLeaf === 'boolean') return geminiResult.isNotLeaf;
  if (geminiResult.predictedClass === 'not_leaf') return true;
  const variety = geminiResult.variety;
  if (typeof variety === 'string' && variety.toLowerCase() === 'not a leaf') return true;
  return false;
};

export const mergeGeminiLeafResult = (prev, geminiResult) => {
  const geminiIsNotLeaf = detectGeminiIsNotLeaf(geminiResult);
  if (!prev) {
    return {
      variety: geminiResult?.variety ?? null,
      confidence: geminiResult?.confidence ?? 0,
      validationStatus: 'validated',
      geminiData: geminiResult?.geminiData ?? null,
      isNotLeaf: geminiIsNotLeaf,
    };
  }
  return {
    ...prev,
    isNotLeaf: geminiIsNotLeaf,
    variety: geminiResult?.variety || prev.variety,
    confidence:
      typeof prev.confidence === 'number' && typeof geminiResult?.confidence === 'number'
        ? (prev.confidence + geminiResult.confidence) / 2
        : geminiResult?.confidence ?? prev.confidence,
    validationStatus: 'validated',
    geminiData: geminiResult?.geminiData || prev.geminiData,
  };
};
