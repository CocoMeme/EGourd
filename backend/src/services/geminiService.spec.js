const geminiService = require('./geminiService');

describe('Gemini Service', () => {
  it('should have generateHarvestPrediction function', () => {
    expect(typeof geminiService.generateHarvestPrediction).toBe('function');
  });
});
