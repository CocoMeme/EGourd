/**
 * ML-Based Flower Production Prediction Service
 * =============================================
 *
 * Replaces the rule-based prediction system with ML models.
 * Spawns Python process to run predictions using trained Random Forest models.
 */

const { spawn } = require('child_process');
const path = require('path');

class MLFlowerPredictionService {
  /**
   * Predict flower production using ML models
   * @param {Object} inputData - Plant and environmental data
   * @returns {Promise<Object>} Prediction results
   */
  static async predictFlowerProduction(inputData) {
    return new Promise((resolve, reject) => {
      // Prepare input for Python script
      const predictionInput = {
        plantType: inputData.plantType,
        plantAge: inputData.plantAge,
        environmental: {
          temperature: inputData.environmental.temperature,
          humidity: inputData.environmental.humidity,
          sunlightHours: inputData.environmental.sunlightHours,
          soilPH: inputData.environmental.soilPH || 6.5,
          soilType: inputData.environmental.soilType || 'loamy',
        },
        care: {
          wateringFrequency: inputData.care.wateringFrequency,
          fertilizerType: inputData.care.fertilizerType,
          fertilizerFrequency: inputData.care.fertilizerFrequency || 2,
          pestControl: inputData.care.pestControl || 'as-needed',
        },
        growth: {
          height: inputData.growth.height,
          leafCount: inputData.growth.leafCount,
          stemThickness: inputData.growth.stemThickness,
          healthRating: inputData.growth.healthRating,
        },
      };

      // Path to Python script
      const scriptPath = path.join(__dirname, '../../ml-models/scripts/predict.py');

      // Determine Python command (try python3 first, then python)
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      // Spawn Python process
      const pythonProcess = spawn(pythonCmd, [scriptPath]);

      let outputData = '';
      let errorData = '';

      // Capture stdout
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Capture stderr
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python prediction error:', errorData);
          return reject(new Error(`Prediction failed: ${errorData || 'Unknown error'}`));
        }

        try {
          const result = JSON.parse(outputData);

          // Check for error in result
          if (result.error) {
            return reject(new Error(result.message || result.error));
          }

          resolve(result);
        } catch {
          console.error('Failed to parse prediction output:', outputData);
          reject(new Error('Failed to parse prediction result'));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start prediction service: ${error.message}`));
      });

      // Send input data to Python script via stdin
      pythonProcess.stdin.write(JSON.stringify(predictionInput));
      pythonProcess.stdin.end();
    });
  }

  /**
   * Check if ML models are available
   * @returns {Boolean} True if models exist
   */
  static modelsExist() {
    const fs = require('fs');
    const modelsDir = path.join(__dirname, '../../ml-models/models');

    try {
      return (
        fs.existsSync(path.join(modelsDir, 'male_flower_model.joblib')) &&
        fs.existsSync(path.join(modelsDir, 'female_flower_model.joblib')) &&
        fs.existsSync(path.join(modelsDir, 'encoders.joblib'))
      );
    } catch {
      return false;
    }
  }
}

module.exports = MLFlowerPredictionService;
