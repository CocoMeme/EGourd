# Gourd Pollination Management System - ML Documentation

## Overview

The revised pollination management system uses real machine learning models to provide predictions for:

1. **Flowering Prediction** - When will the plant start producing flowers?
2. **Pollination Success** - What's the likelihood of successful pollination?
3. **Fruit Maturity** - When will fruits be ready for harvest and expected yield?

## ML Models

### 1. Flowering Prediction Model

**Algorithm**: Random Forest Regressor

**Purpose**: Predicts the number of days from planting until the first flower appears.

**Input Features**:
- `gourd_type` - Type of gourd (bitter_gourd, bottle_gourd, sponge_gourd, cucumber)
- `variety_name` - Specific variety
- `season` - wet/dry
- `region_climate` - tropical_lowland, tropical_highland, subtropical
- `avg_temperature` - Average temperature in °C
- `avg_humidity` - Average humidity %
- `avg_rainfall_mm` - Average daily rainfall
- `sunlight_hours` - Daily sunlight hours
- `soil_ph` - Soil pH level
- `soil_moisture` - Soil moisture %
- `soil_type` - loamy, sandy, clay, silty
- `fertilizer_type` - organic, chemical, mixed, none
- `fertilizer_frequency` - weekly, biweekly, monthly, none
- `watering_frequency` - daily, twice_daily, every_other_day
- `plant_health_score` - 1-5 rating

**Output**:
```json
{
  "predicted_days_to_flower": 42,
  "expected_date": "2026-02-15",
  "range": {
    "earliest": "2026-02-10",
    "latest": "2026-02-20"
  },
  "confidence": 0.85,
  "recommendations": [
    "Conditions are optimal for flowering. Continue current care routine."
  ]
}
```

**Performance**:
- MAE: ~1.64 days
- R² Score: ~0.86

### 2. Pollination Success Model

**Algorithm**: Gradient Boosting Regressor

**Purpose**: Predicts the success rate of pollination attempts.

**Input Features**:
- `gourd_type` - Type of gourd
- `variety_name` - Specific variety
- `season` - wet/dry
- `avg_temperature` - Temperature during pollination
- `avg_humidity` - Humidity during pollination
- `sunlight_hours` - Daily sunlight
- `soil_moisture` - Soil moisture %
- `fertilizer_type` - Type of fertilizer used
- `plant_health_score` - Overall plant health
- `vine_length_cm` - Current vine length
- `leaf_count` - Number of leaves
- `male_flower_count` - Available male flowers
- `female_flower_count` - Available female flowers
- `is_hand_pollinated` - 1 for hand pollination, 0 for natural

**Output**:
```json
{
  "success_rate": 0.85,
  "success_rate_percentage": 85.0,
  "female_flowers": 5,
  "expected_successful_pollinations": 4,
  "days_until_result_visible": 5,
  "confidence": 0.82,
  "recommendations": [
    "Pollination conditions are favorable. Monitor for fruit development in 5-7 days."
  ]
}
```

**Performance**:
- MAE: ~0.04 (4% error)
- R² Score: ~0.76

### 3. Fruit Maturity Model

**Algorithm**: Random Forest Regressor (two models - maturity days & yield)

**Purpose**: Predicts days until fruit maturity and expected yield.

**Input Features**:
- `gourd_type` - Type of gourd
- `variety_name` - Specific variety
- `season` - wet/dry
- `avg_temperature` - Average temperature
- `avg_humidity` - Average humidity
- `avg_rainfall_mm` - Average rainfall
- `soil_moisture` - Soil moisture
- `fertilizer_type` - Fertilizer used
- `fertilizer_frequency` - Fertilizer schedule
- `plant_health_score` - Plant health rating
- `successful_pollinations` - Number of successful pollinations

**Output**:
```json
{
  "days_to_maturity": 45,
  "expected_harvest_date": "2026-04-01",
  "harvest_range": {
    "earliest": "2026-03-27",
    "latest": "2026-04-08"
  },
  "expected_fruits": 4,
  "expected_yield_kg": 2.5,
  "avg_fruit_weight_kg": 0.62,
  "confidence": 0.80,
  "recommendations": [
    "Monitor fruit development. Expect harvest around 45 days from pollination."
  ]
}
```

**Performance**:
- Maturity MAE: ~2.56 days
- Yield MAE: ~2.10 kg

## Datasets

### Research Basis

The datasets are generated based on scientific research from:
- FAO Gourd Cultivation Guidelines
- Philippine Rice Research Institute (PhilRice) vegetable production data
- Southeast Asian Regional Center for Graduate Study (SEARCA)
- Asian Vegetable Research and Development Center (AVRDC)

### Key Findings Incorporated

| Gourd Type | Days to First Flower | Days to Maturity | Optimal Temp | Optimal Humidity |
|------------|---------------------|------------------|--------------|------------------|
| Bitter Gourd | 35-48 | 40-50 | 26-32°C | 65-80% |
| Bottle Gourd | 40-55 | 45-60 | 25-30°C | 60-75% |
| Sponge Gourd | 35-45 | 38-48 | 25-32°C | 70-85% |
| Cucumber | 28-38 | 30-40 | 24-30°C | 60-75% |

### Dataset Files

Located in `backend/ml-models/data/`:

1. **gourd_lifecycle_comprehensive.csv** (8,000 records)
   - Complete lifecycle data for all gourd types
   
2. **flowering_prediction_dataset.csv** (5,000 records)
   - Training data for flowering time prediction

3. **pollination_success_dataset.csv** (4,220 records)
   - Training data for pollination success prediction

4. **fruit_maturity_dataset.csv** (1,813 records)
   - Training data for fruit maturity prediction

## API Endpoints

### Plant Management

```
GET    /api/plants                    - Get all plants
POST   /api/plants                    - Create new plant
GET    /api/plants/:id                - Get single plant
PUT    /api/plants/:id                - Update plant
DELETE /api/plants/:id                - Delete plant
```

### Flowering

```
POST   /api/plants/:id/predict-flowering   - Get flowering prediction
POST   /api/plants/:id/flowering           - Record flowering start
PUT    /api/plants/:id/flowers             - Update flower counts
```

### Pollination

```
POST   /api/plants/:id/predict-pollination              - Predict success rate
POST   /api/plants/:id/pollinations                     - Add pollination event
PUT    /api/plants/:id/pollinations/:pollinationId/result - Record result
```

### Fruit & Harvest

```
POST   /api/plants/:id/predict-maturity              - Predict maturity
PUT    /api/plants/:id/fruits/:fruitId/harvest       - Record harvest
```

### Dashboard

```
GET    /api/plants/dashboard/stats      - Get statistics
GET    /api/plants/attention/needed     - Plants needing attention
GET    /api/plants/gourd-types          - Get gourd configurations
POST   /api/plants/:id/lifecycle-prediction - Full lifecycle prediction
```

## Example Usage

### 1. Create a New Plant

```javascript
const response = await plantService.createPlant({
  gourdType: 'bitter_gourd',
  variety: 'ampalaya_bilog',
  plantName: 'My Ampalaya #1',
  datePlanted: '2026-01-04',
  notes: 'Planted in pot on balcony',
  environment: {
    avgTemperature: 28,
    avgHumidity: 75,
    soilType: 'loamy',
    sunlightHours: 7
  },
  care: {
    fertilizerType: 'organic',
    fertilizerFrequency: 'weekly',
    wateringFrequency: 'daily'
  }
});

// Response includes flowering prediction
console.log(response.data.flowering);
// { predictedDaysToFlower: 42, predictedFloweringDate: '2026-02-15', confidence: 0.85 }
```

### 2. Record Flowering

```javascript
await plantService.recordFlowering(plantId, 15, 6);
// Records: 15 male flowers, 6 female flowers
```

### 3. Add Pollination with Prediction

```javascript
const result = await plantService.addPollination(plantId, 5, true, 'Morning pollination');
// Automatically predicts success rate
console.log(result.data.prediction);
// { successRate: 0.85, expectedSuccessfulPollinations: 4, daysUntilResultVisible: 5 }
```

### 4. Record Pollination Result

```javascript
await plantService.recordPollinationResult(plantId, pollinationId, 4);
// Records 4 successful pollinations
// Automatically generates fruit maturity prediction
```

### 5. Get Full Lifecycle Prediction

```javascript
const prediction = await plantService.getLifecyclePrediction(plantId);
console.log(prediction.data.predictions.summary);
// {
//   plantingToFlowering: 42,
//   expectedPollinationSuccess: 85.0,
//   floweringToHarvest: 45,
//   totalDaysToHarvest: 87,
//   expectedYieldKg: 2.5
// }
```

## Retraining Models

To retrain the ML models with new data:

```bash
cd backend/ml-models/scripts

# Generate new dataset (optional)
python generate_lifecycle_dataset.py

# Train all models
python train_pollination_models.py
```

This will:
1. Load the CSV datasets
2. Train flowering, pollination success, and fruit maturity models
3. Save models and encoders to `backend/ml-models/models/`
4. Output performance metrics

## Model Files

Located in `backend/ml-models/models/`:

- `flowering_model.joblib` - Flowering prediction model
- `flowering_encoders.joblib` - Label encoders for categorical features
- `flowering_scaler.joblib` - Feature scaler

- `pollination_success_model.joblib` - Pollination success model
- `pollination_success_encoders.joblib`
- `pollination_success_scaler.joblib`

- `fruit_maturity_model.joblib` - Days to maturity model
- `fruit_maturity_yield_model.joblib` - Yield prediction model
- `fruit_maturity_encoders.joblib`
- `fruit_maturity_scaler.joblib`

- `pollination_models_metadata.json` - Training metadata and metrics
