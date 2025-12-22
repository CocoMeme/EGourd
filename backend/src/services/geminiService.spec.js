const assert = require('assert');
const geminiService = require('./geminiService');

async function test() {
  console.log('Running geminiService tests...');

  // Test 1: Function existence
  try {
    assert.strictEqual(typeof geminiService.generateHarvestPrediction, 'function', 'generateHarvestPrediction should be a function');
    console.log('✓ generateHarvestPrediction exists');
  } catch (e) {
    console.error('✗ generateHarvestPrediction missing');
    throw e;
  }

  console.log('All tests passed!');
}

test().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
