const scanController = require('./scanController');

describe('Scan Controller', () => {
  it('should have getHarvestPrediction function', () => {
    expect(typeof scanController.getHarvestPrediction).toBe('function');
  });
});
