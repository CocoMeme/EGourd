/**
 * Pollination ML Prediction Service
 * ===================================
 * 
 * Comprehensive service for all pollination management ML predictions:
 * 1. Flowering Prediction - When will the plant start flowering?
 * 2. Pollination Success - What's the likely success rate?
 * 3. Fruit Maturity - When will fruits be ready for harvest?
 * 
 * Communicates with Python ML models via child process.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PollinationMLService {
  constructor() {
    this.scriptPath = path.join(__dirname, '../../ml-models/scripts/predict_pollination.py');
    this.modelsDir = path.join(__dirname, '../../ml-models/models');
    this.pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  }

  /**
   * Check if all required ML models exist
   */
  modelsExist() {
    const requiredModels = [
      'flowering_model.joblib',
      'flowering_encoders.joblib',
      'flowering_scaler.joblib',
      'pollination_success_model.joblib',
      'pollination_success_encoders.joblib',
      'pollination_success_scaler.joblib',
      'fruit_maturity_model.joblib',
      'fruit_maturity_encoders.joblib',
      'fruit_maturity_scaler.joblib'
    ];

    try {
      return requiredModels.every(model => 
        fs.existsSync(path.join(this.modelsDir, model))
      );
    } catch (error) {
      console.error('Error checking models:', error);
      return false;
    }
  }

  /**
   * Execute Python prediction script
   * @param {Object} inputData - Input data for prediction
   * @returns {Promise<Object>} Prediction result
   */
  async _runPrediction(inputData) {
    return new Promise((resolve, reject) => {
      // Log input for debugging
      console.log('🔮 ML Prediction input:', JSON.stringify(inputData, null, 2));
      
      const pythonProcess = spawn(this.pythonCmd, [this.scriptPath]);
      
      let outputData = '';
      let errorData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        console.log('🔮 Python exit code:', code);
        console.log('🔮 Python stdout:', outputData);
        if (errorData) console.log('🔮 Python stderr:', errorData);
        
        if (code !== 0) {
          console.error('Python prediction error:', errorData);
          return reject(new Error(`Prediction failed: ${errorData || 'Unknown error'}`));
        }
        
        try {
          const result = JSON.parse(outputData);
          
          if (!result.success) {
            console.error('🔮 Prediction failed:', result.error || result.message);
            return reject(new Error(result.error || result.message || 'Prediction failed'));
          }
          
          console.log('🔮 Prediction success:', result.prediction_type);
          resolve(result);
        } catch (parseError) {
          console.error('Failed to parse prediction output:', outputData);
          reject(new Error('Failed to parse prediction result'));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start prediction service: ${error.message}`));
      });
      
      // Send input data to Python script
      pythonProcess.stdin.write(JSON.stringify(inputData));
      pythonProcess.stdin.end();
    });
  }

  /**
   * Predict when the plant will start flowering
   * @param {Object} plantData - Plant and environmental data
   * @returns {Promise<Object>} Flowering prediction
   */
  async predictFlowering(plantData) {
    // Validate required fields
    if (!plantData.gourdType && !plantData.gourd_type) {
      throw new Error('Gourd type is required');
    }

    // Helper to extract date only (YYYY-MM-DD) from various date formats
    const getDateOnly = (dateValue) => {
      if (!dateValue) return new Date().toISOString().split('T')[0];
      if (typeof dateValue === 'string') {
        // Handle ISO string or date-only string
        return dateValue.split('T')[0];
      }
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    };

    // Map frontend field names to ML model field names
    const inputData = {
      prediction_type: 'flowering',
      gourd_type: plantData.gourdType || plantData.gourd_type,
      variety_name: plantData.variety || plantData.variety_name || this._getDefaultVariety(plantData.gourdType || plantData.gourd_type),
      season: plantData.season || this._getCurrentSeason(),
      region_climate: plantData.region || plantData.region_climate || 'tropical_lowland',
      avg_temperature: plantData.avgTemperature || plantData.avg_temperature || 28,
      avg_humidity: plantData.avgHumidity || plantData.avg_humidity || 70,
      avg_rainfall_mm: plantData.avgRainfall || plantData.avg_rainfall_mm || 10,
      sunlight_hours: plantData.sunlightHours || plantData.sunlight_hours || 7,
      soil_ph: plantData.soilPh || plantData.soil_ph || 6.5,
      soil_moisture: plantData.soilMoisture || plantData.soil_moisture || 65,
      soil_type: plantData.soilType || plantData.soil_type || 'silty',  // Philippine standard
      fertilizer_type: plantData.fertilizerType || plantData.fertilizer_type || 'organic',
      fertilizer_frequency: plantData.fertilizerFrequency || plantData.fertilizer_frequency || 'weekly',
      watering_frequency: plantData.wateringFrequency || plantData.watering_frequency || 'daily',
      plant_health_score: plantData.plantHealth || plantData.plant_health_score || 4,
      planting_date: getDateOnly(plantData.datePlanted || plantData.planting_date)
    };

    const result = await this._runPrediction(inputData);
    
    return {
      predictedDaysToFlower: result.predicted_days_to_flower,
      expectedDate: result.expected_date,
      range: result.range,
      confidence: result.confidence,
      recommendations: result.recommendations
    };
  }

  /**
   * Predict pollination success rate
   * @param {Object} pollinationData - Plant and pollination data
   * @returns {Promise<Object>} Pollination success prediction
   */
  async predictPollinationSuccess(pollinationData) {
    if (!pollinationData.gourdType && !pollinationData.gourd_type) {
      throw new Error('Gourd type is required');
    }

    const inputData = {
      prediction_type: 'pollination_success',
      gourd_type: pollinationData.gourdType || pollinationData.gourd_type,
      variety_name: pollinationData.variety || pollinationData.variety_name || this._getDefaultVariety(pollinationData.gourdType || pollinationData.gourd_type),
      season: pollinationData.season || this._getCurrentSeason(),
      avg_temperature: pollinationData.avgTemperature || pollinationData.avg_temperature || 28,
      avg_humidity: pollinationData.avgHumidity || pollinationData.avg_humidity || 70,
      sunlight_hours: pollinationData.sunlightHours || pollinationData.sunlight_hours || 7,
      soil_moisture: pollinationData.soilMoisture || pollinationData.soil_moisture || 65,
      fertilizer_type: pollinationData.fertilizerType || pollinationData.fertilizer_type || 'organic',
      plant_health_score: pollinationData.plantHealth || pollinationData.plant_health_score || 4,
      vine_length_cm: pollinationData.vineLength || pollinationData.vine_length_cm || 200,
      leaf_count: pollinationData.leafCount || pollinationData.leaf_count || 40,
      male_flower_count: pollinationData.maleFlowerCount || pollinationData.male_flower_count || 10,
      female_flower_count: pollinationData.femaleFlowerCount || pollinationData.female_flower_count || 5,
      is_hand_pollinated: pollinationData.isHandPollinated !== undefined ? 
        (pollinationData.isHandPollinated ? 1 : 0) : 1
    };

    const result = await this._runPrediction(inputData);
    
    return {
      successRate: result.success_rate,
      successRatePercentage: result.success_rate_percentage,
      femaleFlowers: result.female_flowers,
      expectedSuccessfulPollinations: result.expected_successful_pollinations,
      daysUntilResultVisible: result.days_until_result_visible,
      confidence: result.confidence,
      recommendations: result.recommendations
    };
  }

  /**
   * Predict fruit maturity and yield
   * @param {Object} maturityData - Plant and fruit development data
   * @returns {Promise<Object>} Maturity and yield prediction
   */
  async predictFruitMaturity(maturityData) {
    if (!maturityData.gourdType && !maturityData.gourd_type) {
      throw new Error('Gourd type is required');
    }

    const inputData = {
      prediction_type: 'fruit_maturity',
      gourd_type: maturityData.gourdType || maturityData.gourd_type,
      variety_name: maturityData.variety || maturityData.variety_name || this._getDefaultVariety(maturityData.gourdType || maturityData.gourd_type),
      season: maturityData.season || this._getCurrentSeason(),
      avg_temperature: maturityData.avgTemperature || maturityData.avg_temperature || 28,
      avg_humidity: maturityData.avgHumidity || maturityData.avg_humidity || 70,
      avg_rainfall_mm: maturityData.avgRainfall || maturityData.avg_rainfall_mm || 10,
      soil_moisture: maturityData.soilMoisture || maturityData.soil_moisture || 65,
      fertilizer_type: maturityData.fertilizerType || maturityData.fertilizer_type || 'organic',
      fertilizer_frequency: maturityData.fertilizerFrequency || maturityData.fertilizer_frequency || 'weekly',
      plant_health_score: maturityData.plantHealth || maturityData.plant_health_score || 4,
      successful_pollinations: maturityData.successfulPollinations || maturityData.successful_pollinations || 1,
      pollination_date: maturityData.pollinationDate || maturityData.pollination_date || new Date().toISOString().split('T')[0]
    };

    const result = await this._runPrediction(inputData);
    
    return {
      daysToMaturity: result.days_to_maturity,
      expectedHarvestDate: result.expected_harvest_date,
      harvestRange: result.harvest_range,
      expectedFruits: result.expected_fruits,
      expectedYieldKg: result.expected_yield_kg,
      avgFruitWeightKg: result.avg_fruit_weight_kg,
      confidence: result.confidence,
      recommendations: result.recommendations
    };
  }

  /**
   * Get complete lifecycle prediction for a new plant
   * @param {Object} plantData - Plant and environmental data
   * @returns {Promise<Object>} Complete lifecycle predictions
   */
  async getLifecyclePredictions(plantData) {
    // Prepare pollination data early
    const pollinationData = {
      ...plantData,
      maleFlowerCount: 15,  // Average expected
      femaleFlowerCount: 6,
      isHandPollinated: true
    };

    // Run independent predictions in parallel to save time
    const [floweringPrediction, pollinationPrediction] = await Promise.all([
      this.predictFlowering(plantData),
      this.predictPollinationSuccess(pollinationData)
    ]);
    
    // Estimate fruit maturity (depends on pollination success)
    const maturityData = {
      ...plantData,
      successfulPollinations: pollinationPrediction.expectedSuccessfulPollinations
    };
    const maturityPrediction = await this.predictFruitMaturity(maturityData);
    
    return {
      flowering: floweringPrediction,
      pollination: pollinationPrediction,
      maturity: maturityPrediction,
      summary: {
        plantingToFlowering: floweringPrediction.predictedDaysToFlower,
        expectedPollinationSuccess: pollinationPrediction.successRatePercentage,
        floweringToHarvest: maturityPrediction.daysToMaturity,
        totalDaysToHarvest: floweringPrediction.predictedDaysToFlower + maturityPrediction.daysToMaturity,
        expectedYieldKg: maturityPrediction.expectedYieldKg
      }
    };
  }

  /**
   * Get current season based on date
   */
  _getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    return (month >= 6 && month <= 11) ? 'wet' : 'dry';
  }

  /**
   * Get default variety for gourd type
   */
  _getDefaultVariety(gourdType) {
    const varieties = {
      'bitter_gourd': 'ampalaya_bilog',
      'bottle_gourd': 'upo_smooth',
      'sponge_gourd': 'patola',
      'cucumber': 'pipino'
    };
    return varieties[gourdType] || gourdType;
  }
}

// Export singleton instance
module.exports = new PollinationMLService();
