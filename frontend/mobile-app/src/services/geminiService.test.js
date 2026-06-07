import { geminiService } from './geminiService';

const buildRawResponse = (overrides = {}) => ({
  variety: 'patola',
  confidence: 0.87,
  reasoning: 'Test reasoning',
  keyFeatures: ['lobed leaves', 'tendrils'],
  leafHealth: {
    leafColor: 'Green',
    leafTexture: 'Smooth',
    diseaseSigns: 'None',
    overallCondition: 'Healthy',
  },
  observations: 'Looks healthy.',
  ...overrides,
});

describe('geminiService.formatLeafPrediction', () => {
  it('maps patola to "Sponge Gourd" with proper confidence percent', () => {
    const result = geminiService.formatLeafPrediction(buildRawResponse(), 1234);

    expect(result.variety).toBe('Sponge Gourd');
    expect(result.confidence).toBe(87);
    expect(result.isNotLeaf).toBe(false);
    expect(result.isLeaf).toBe(true);
    expect(result.predictedClass).toBe('patola_leaf');
    expect(result.source).toBe('gemini');
    expect(result.modelType).toBe('Gemini 3 Flash');
    expect(result.message).toBe('Sponge Gourd leaf (87%)');
  });

  it.each([
    ['ampalaya', 'Bitter Gourd', 'ampalaya_leaf', false],
    ['patola', 'Sponge Gourd', 'patola_leaf', false],
    ['upo', 'Bottle Gourd', 'upo_leaf', false],
    ['kalabasa', 'Squash', 'kalabasa_leaf', false],
    ['pipino', 'Cucumber', 'pipino_leaf', false],
  ])('maps raw variety "%s" to display "%s"', (raw, display, predictedClass) => {
    const result = geminiService.formatLeafPrediction(
      buildRawResponse({ variety: raw, confidence: 0.5 }),
      100,
    );
    expect(result.variety).toBe(display);
    expect(result.predictedClass).toBe(predictedClass);
    expect(result.isNotLeaf).toBe(false);
  });

  it('marks not_leaf responses as not a leaf', () => {
    const result = geminiService.formatLeafPrediction(
      buildRawResponse({ variety: 'not_leaf', confidence: 0.95 }),
      200,
    );

    expect(result.variety).toBe('Not a Leaf');
    expect(result.isNotLeaf).toBe(true);
    expect(result.isLeaf).toBe(false);
    expect(result.predictedClass).toBe('not_leaf');
    expect(result.geminiData.leaf).toBeNull();
  });

  it('falls back to raw variety when not in display map', () => {
    const result = geminiService.formatLeafPrediction(
      buildRawResponse({ variety: 'unknown_gourd', confidence: 0.6 }),
      50,
    );

    expect(result.variety).toBe('unknown_gourd');
    expect(result.isNotLeaf).toBe(false);
  });

  it('rounds confidence to one decimal place', () => {
    const result = geminiService.formatLeafPrediction(
      buildRawResponse({ confidence: 0.87654 }),
      50,
    );
    expect(result.confidence).toBe(87.7);
  });

  it('attaches geminiData payload with leaf and observations for valid leaves', () => {
    const result = geminiService.formatLeafPrediction(buildRawResponse(), 50);
    expect(result.geminiData.reasoning).toBe('Test reasoning');
    expect(result.geminiData.keyFeatures).toEqual(['lobed leaves', 'tendrils']);
    expect(result.geminiData.leaf).not.toBeNull();
    expect(result.geminiData.observations).toBe('Looks healthy.');
  });

  it('nulls out leaf and observations for not_leaf responses', () => {
    const result = geminiService.formatLeafPrediction(
      buildRawResponse({ variety: 'not_leaf' }),
      50,
    );
    expect(result.geminiData.leaf).toBeNull();
    expect(result.geminiData.observations).toBeNull();
  });
});
