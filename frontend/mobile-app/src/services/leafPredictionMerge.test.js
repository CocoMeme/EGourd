import { mergeGeminiLeafResult } from './leafPredictionMerge';

describe('mergeGeminiLeafResult', () => {
  const basePrev = {
    variety: 'Sponge Gourd',
    confidence: 85,
    validationStatus: 'tflite_only',
    geminiData: null,
    isNotLeaf: false,
  };

  const baseGemini = {
    variety: 'Cucumber',
    confidence: 92,
    geminiData: {
      reasoning: 'Five-lobed leaf, smooth texture',
      keyFeatures: ['lobed', 'smooth'],
      leaf: { leafColor: 'Green' },
      observations: 'healthy',
    },
  };

  it('overwrites variety with Gemini result (the bug fix)', () => {
    const result = mergeGeminiLeafResult(basePrev, baseGemini);
    expect(result.variety).toBe('Cucumber');
  });

  it('averages TM and Gemini confidences', () => {
    const result = mergeGeminiLeafResult(basePrev, baseGemini);
    expect(result.confidence).toBe(88.5);
  });

  it('marks prediction as validated', () => {
    const result = mergeGeminiLeafResult(basePrev, baseGemini);
    expect(result.validationStatus).toBe('validated');
  });

  it('attaches geminiData payload', () => {
    const result = mergeGeminiLeafResult(basePrev, baseGemini);
    expect(result.geminiData.reasoning).toBe('Five-lobed leaf, smooth texture');
  });

  it('preserves TM variety when Gemini returns empty variety', () => {
    const result = mergeGeminiLeafResult(basePrev, { ...baseGemini, variety: '' });
    expect(result.variety).toBe('Sponge Gourd');
  });

  it('handles null prev by returning Gemini-only result', () => {
    const result = mergeGeminiLeafResult(null, baseGemini);
    expect(result.variety).toBe('Cucumber');
    expect(result.confidence).toBe(92);
    expect(result.validationStatus).toBe('validated');
  });

  it('regression: TM says Sponge Gourd, Gemini says Cucumber, final is Cucumber', () => {
    const tmPrev = { ...basePrev, variety: 'Sponge Gourd', confidence: 80 };
    const gemini = { ...baseGemini, variety: 'Cucumber', confidence: 95 };
    const result = mergeGeminiLeafResult(tmPrev, gemini);
    expect(result.variety).toBe('Cucumber');
    expect(result.confidence).toBe(87.5);
  });

  it('regression: TM says Cucumber, Gemini says Sponge Gourd, final is Sponge Gourd', () => {
    const tmPrev = { ...basePrev, variety: 'Cucumber', confidence: 70 };
    const gemini = { ...baseGemini, variety: 'Sponge Gourd', confidence: 88 };
    const result = mergeGeminiLeafResult(tmPrev, gemini);
    expect(result.variety).toBe('Sponge Gourd');
    expect(result.confidence).toBe(79);
  });

  it('handles not_leaf Gemini result by setting variety to "Not a Leaf"', () => {
    const gemini = { ...baseGemini, variety: 'Not a Leaf', confidence: 90 };
    const result = mergeGeminiLeafResult(basePrev, gemini);
    expect(result.variety).toBe('Not a Leaf');
  });

  it('propagates isNotLeaf flag when Gemini says not a leaf (string variety)', () => {
    const gemini = { ...baseGemini, variety: 'Not a Leaf', confidence: 90 };
    const result = mergeGeminiLeafResult(basePrev, gemini);
    expect(result.isNotLeaf).toBe(true);
  });

  it('propagates isNotLeaf flag when Gemini sets isNotLeaf=true explicitly', () => {
    const gemini = { ...baseGemini, isNotLeaf: true, variety: null, confidence: 90 };
    const result = mergeGeminiLeafResult(basePrev, gemini);
    expect(result.isNotLeaf).toBe(true);
  });

  it('keeps isNotLeaf=false when Gemini identifies a real leaf', () => {
    const result = mergeGeminiLeafResult(basePrev, baseGemini);
    expect(result.isNotLeaf).toBe(false);
  });
});
