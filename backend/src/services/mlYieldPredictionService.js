const { spawn } = require('child_process');
const path = require('path');

/**
 * ML Yield Prediction Service
 * Handles communication with Python yield prediction model
 */
class MLYieldPredictionService {
  /**
   * Predict crop yield based on plant data
   * @param {Object} plantData - Plant data for prediction
   * @returns {Promise<Object>} Prediction result
   */
  static async predictYield(plantData) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(
        __dirname,
        '../../ml-models/scripts/predict_yield.py'
      );

      // Spawn Python process
      const pythonProcess = spawn('python', [scriptPath]);

      let outputData = '';
      let errorData = '';

      // Collect stdout
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      // Collect stderr
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python process error:', errorData);
          return reject(new Error(`Yield prediction failed: ${errorData || 'Unknown error'}`));
        }

        try {
          const result = JSON.parse(outputData);
          
          if (!result.success) {
            return reject(new Error(result.error || 'Prediction failed'));
          }

          resolve(result);
        } catch (error) {
          console.error('Failed to parse Python output:', outputData);
          reject(new Error(`Failed to parse prediction result: ${error.message}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Send input data to Python script via stdin
      try {
        pythonProcess.stdin.write(JSON.stringify(plantData));
        pythonProcess.stdin.end();
      } catch (error) {
        reject(new Error(`Failed to send data to Python: ${error.message}`));
      }
    });
  }

  /**
   * Validate yield prediction input data
   * @param {Object} data - Input data to validate
   * @returns {Object} Validation result {isValid, errors}
   */
  static validateInput(data) {
    const errors = [];

    // Required fields
    const requiredFields = [
      'plant_type',
      'plant_age_days',
      'vine_length_cm',
      'node_count',
      'male_flower_count',
      'female_flower_count',
      'temperature_celsius',
      'soil_moisture_percent'
    ];

    // Check for missing fields
    requiredFields.forEach(field => {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${field} is required`);
      }
    });

    // Validate plant type
    const validPlantTypes = ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber'];
    if (data.plant_type && !validPlantTypes.includes(data.plant_type)) {
      errors.push(`plant_type must be one of: ${validPlantTypes.join(', ')}`);
    }

    // Validate numeric ranges
    const numericValidations = {
      plant_age_days: { min: 0, max: 200, label: 'Plant age' },
      vine_length_cm: { min: 0, max: 1000, label: 'Vine length' },
      node_count: { min: 0, max: 100, label: 'Node count' },
      male_flower_count: { min: 0, max: 100, label: 'Male flower count' },
      female_flower_count: { min: 0, max: 100, label: 'Female flower count' },
      temperature_celsius: { min: 10, max: 45, label: 'Temperature' },
      soil_moisture_percent: { min: 0, max: 100, label: 'Soil moisture' }
    };

    Object.entries(numericValidations).forEach(([field, { min, max, label }]) => {
      const value = parseFloat(data[field]);
      
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        if (isNaN(value)) {
          errors.push(`${label} must be a valid number`);
        } else if (value < min || value > max) {
          errors.push(`${label} must be between ${min} and ${max}`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get yield prediction input from existing pollination record
   * @param {Object} pollination - Pollination record from database
   * @returns {Object} Formatted input data for yield prediction
   */
  static formatPollinationDataForPrediction(pollination) {
    return {
      plant_type: pollination.plantType || pollination.plant_type,
      plant_age_days: pollination.plantAge || pollination.plant_age_days || 60,
      vine_length_cm: pollination.vineLength || pollination.vine_length_cm || 300,
      node_count: pollination.nodeCount || pollination.node_count || 35,
      male_flower_count: pollination.maleFlowerCount || pollination.male_flower_count || 20,
      female_flower_count: pollination.femaleFlowerCount || pollination.female_flower_count || 10,
      temperature_celsius: pollination.temperature || pollination.temperature_celsius || 27,
      soil_moisture_percent: pollination.soilMoisture || pollination.soil_moisture_percent || 70
    };
  }

  /**
   * Calculate expected yield range based on plant type
   * @param {string} plantType - Type of plant
   * @returns {Object} Expected yield range {min, max, average}
   */
  static getExpectedYieldRange(plantType) {
    const yieldRanges = {
      ampalaya_bilog: { min: 1.0, max: 5.0, average: 2.5 },
      upo_smooth: { min: 2.0, max: 8.0, average: 4.5 },
      patola: { min: 0.8, max: 4.0, average: 2.0 },
      cucumber: { min: 1.5, max: 6.0, average: 3.0 }
    };

    return yieldRanges[plantType] || { min: 0, max: 10, average: 3.0 };
  }
}

module.exports = MLYieldPredictionService;
