const assert = require('assert');

// We need to handle the require of the model which might fail if DB not connected or similar,
// but usually schema definitions are fine.
// If it fails, we'll see.
try {
  const scanController = require('./scanController');

  async function test() {
    console.log('Running scanController tests...');

    // Test 1: Function existence
    try {
      assert.strictEqual(typeof scanController.getHarvestPrediction, 'function', 'getHarvestPrediction should be a function');
      console.log('✓ getHarvestPrediction exists');
    } catch (e) {
      console.error('✗ getHarvestPrediction missing');
      throw e;
    }

    console.log('All tests passed!');
  }

  test().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });

} catch (err) {
  console.error('Failed to load scanController:', err);
  process.exit(1);
}
