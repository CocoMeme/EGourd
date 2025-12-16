# Flower Production Prediction Feature

## Overview

The Flower Production Prediction feature allows users to predict how many male and female flowers their plants will produce based on environmental conditions, plant care, and growth metrics. This helps farmers plan pollination activities and optimize growing conditions.

## Implementation Summary

### Backend Components

#### 1. **FlowerPrediction Model** (`backend/src/models/FlowerPrediction.js`)

Database schema for storing prediction inputs and results:

**Input Fields:**

- `plantType`: Plant variety (ampalaya, patola, upo, kalabasa, kundol)
- `plantAge`: Age in days from planting
- `environmental`: Temperature, humidity, sunlight hours, soil pH, soil type
- `care`: Watering frequency, fertilizer type/frequency, pest control
- `growth`: Height, leaf count, stem thickness, health rating (1-5)
- `pollination`: Optional reference to existing Pollination record
- `notes`: Optional user notes

**Output Fields:**

- `prediction.maleFlowers`: { min, max, average }
- `prediction.femaleFlowers`: { min, max, average }
- `prediction.confidence`: 0-100 score
- `prediction.influencingFactors`: Array of factors with impact (positive/negative/neutral)
- `prediction.recommendations`: Array of suggestions with priority (high/medium/low)

#### 2. **FlowerPredictionService** (`backend/src/services/flowerPredictionService.js`)

Rule-based prediction algorithm using horticultural research:

**Base Production Data** (optimal conditions):

- **Ampalaya**: 15-30 male, 8-15 female flowers
- **Patola**: 12-25 male, 6-12 female flowers
- **Upo**: 20-40 male, 10-20 female flowers
- **Kalabasa**: 10-20 male, 5-10 female flowers
- **Kundol**: 15-30 male, 8-15 female flowers

**Adjustment Factors:**

1. **Age Factor** (25% weight): Plants at optimal flowering age get full production
2. **Environmental Factor** (35% weight): Temperature 25-30°C, humidity 60-80%, sunlight 6-8hrs optimal
3. **Care Factor** (25% weight): Watering 3-5x/week, proper fertilization, pest control
4. **Health Factor** (15% weight): Health rating directly affects production capacity

**Sex Ratio Modification:**

- Environmental stress increases male flowers relative to female flowers
- Water stress, temperature extremes, and nutrient deficiency shift ratio toward males
- Optimal conditions maintain natural ~2:1 male to female ratio

#### 3. **Controller Endpoints** (`backend/src/controllers/pollinationController.js`)

**POST /api/pollination/predict-flowers**

- Generate new flower production prediction
- Save prediction to database
- Return prediction results with recommendations

**GET /api/pollination/predictions**

- Fetch user's prediction history
- Supports filtering by plantType, pollinationId
- Pagination support (page, limit)

**GET /api/pollination/predictions/:id**

- Get single prediction with full details
- Includes linked Pollination record if available

**DELETE /api/pollination/predictions/:id**

- Delete prediction record
- User can only delete their own predictions

#### 4. **Routes** (`backend/src/routes/pollination.js`)

All prediction routes require authentication:

```javascript
router.post("/predict-flowers", predictFlowerProduction);
router.get("/predictions", getFlowerPredictions);
router
  .route("/predictions/:id")
  .get(getFlowerPrediction)
  .delete(deleteFlowerPrediction);
```

### Frontend Mobile Components

#### 1. **PredictFlowersScreen** (`frontend/mobile-app/src/screens/PolinationScreens/PredictFlowersScreen.js`)

Comprehensive input form with validation:

**Sections:**

1. **Plant Information**

   - Optional plant selection from user's existing plants
   - Manual entry: plant type, age in days
   - Auto-fills data when existing plant selected

2. **Environmental Conditions**

   - Temperature (°C): 15-45 range, optimal hints displayed
   - Humidity (%): 0-100 range
   - Sunlight Hours/Day: 0-24 range
   - Soil pH: 4-9 range (optional)
   - Soil Type: dropdown (loamy, clay, sandy, etc.)

3. **Plant Care**

   - Watering Frequency: times per week
   - Fertilizer Type: organic/chemical/mixed/none
   - Fertilizer Frequency: times per month
   - Pest Control: regular/occasional/as-needed/none

4. **Growth Metrics**

   - Height (cm): optional
   - Leaf Count: optional
   - Stem Thickness (mm): optional
   - Health Rating: 1-5 scale (required)

5. **Notes**
   - Optional text field (500 char limit)

**Features:**

- Real-time validation with error messages
- Optimal value hints for each field
- Keyboard-aware scrolling
- Loading state during prediction generation
- Navigates to results screen on success

#### 2. **PredictionResultsScreen** (`frontend/mobile-app/src/screens/PolinationScreens/PredictionResultsScreen.js`)

Beautiful results display:

**Components:**

1. **Confidence Score**

   - Large percentage display
   - Color-coded: Green (80%+), Yellow (60-79%), Red (<60%)
   - Progress bar visualization

2. **Prediction Cards**

   - Male flowers: Blue themed card with count and range
   - Female flowers: Pink themed card with count and range
   - Total flowers: Summary card

3. **Influencing Factors**

   - List of factors affecting prediction
   - Color-coded icons: Green (positive), Red (negative), Gray (neutral)
   - Detailed descriptions for each factor

4. **Recommendations**

   - Priority-coded suggestions (high/medium/low)
   - Categorized by type (watering, fertilizer, sunlight, etc.)
   - Actionable advice to improve production

5. **Action Buttons**
   - Share results (native share dialog)
   - New prediction (return to form)
   - Done (return to pollination list)

#### 3. **Navigation Updates**

**AppNavigator.js:**

- Added PredictFlowers and PredictionResults screens to Pollination stack
- Modal presentation for PredictFlowers screen
- Proper header configurations

**PollinationScreen.js:**

- Added analytics icon button in header to access prediction feature
- Navigation to PredictFlowers screen

#### 4. **Service Layer** (`frontend/mobile-app/src/services/pollinationService.js`)

**New Methods:**

- `predictFlowers(predictionData)`: Generate prediction
- `getFlowerPredictions(filters)`: Fetch prediction history
- `getFlowerPrediction(predictionId)`: Get single prediction
- `deleteFlowerPrediction(predictionId)`: Delete prediction

All methods include:

- Console logging for debugging
- Error handling with re-throw
- Automatic token injection via interceptor

## Usage Flow

### User Journey

1. **Access Feature**

   - User taps analytics icon in Pollination screen header
   - Or navigates from existing plant detail

2. **Enter Data**

   - Optionally select existing plant (auto-fills basic info)
   - Fill in environmental conditions (temperature, humidity, sunlight, soil)
   - Enter care routine (watering, fertilizer, pest control)
   - Add growth metrics (optional measurements + health rating)
   - Add optional notes

3. **Generate Prediction**

   - Tap "Generate Prediction" button
   - Backend calculates prediction using rule-based algorithm
   - Saves prediction to database with timestamp

4. **View Results**

   - See confidence score and prediction accuracy indicator
   - View predicted male/female flower counts with ranges
   - Review influencing factors (what helped/hurt prediction)
   - Read recommendations for improving flower production

5. **Take Action**
   - Share results with others
   - Create new prediction
   - Return to pollination management

### Example Prediction Request

```json
{
  "pollinationId": "optional-plant-id",
  "plantType": "ampalaya",
  "plantAge": 45,
  "environmental": {
    "temperature": 28,
    "humidity": 70,
    "sunlightHours": 7,
    "soilPH": 6.5,
    "soilType": "loamy"
  },
  "care": {
    "wateringFrequency": 4,
    "fertilizerType": "organic",
    "fertilizerFrequency": 2,
    "pestControl": "regular"
  },
  "growth": {
    "height": 120,
    "leafCount": 25,
    "stemThickness": 8,
    "healthRating": 4
  },
  "notes": "Plant is growing well, no pest issues"
}
```

### Example Prediction Response

```json
{
  "success": true,
  "message": "Flower production prediction generated successfully",
  "data": {
    "predictionId": "prediction-id",
    "plantType": "ampalaya",
    "plantAge": 45,
    "maleFlowers": {
      "min": 20,
      "max": 33,
      "average": 26
    },
    "femaleFlowers": {
      "min": 9,
      "max": 16,
      "average": 13
    },
    "totalFlowers": {
      "min": 29,
      "max": 49,
      "average": 39
    },
    "confidence": 85,
    "influencingFactors": [
      {
        "factor": "Plant Age",
        "impact": "positive",
        "description": "Plant is at optimal age for flowering"
      },
      {
        "factor": "Temperature",
        "impact": "positive",
        "description": "Temperature is in optimal range for flowering"
      }
    ],
    "recommendations": [
      {
        "category": "general",
        "suggestion": "For ampalaya, ensure consistent moisture during flowering period to maximize both male and female flower production",
        "priority": "medium"
      }
    ],
    "createdAt": "2025-12-12T10:30:00Z"
  }
}
```

## Technical Details

### Algorithm Logic

The prediction algorithm follows this flow:

1. **Get Base Production Data**

   - Look up typical flower counts for plant type under optimal conditions
   - Retrieve optimal age ranges and sex ratio

2. **Calculate Adjustment Factors**

   - **Age**: Compare plant age to optimal flowering age range
   - **Environment**: Evaluate temperature, humidity, sunlight, soil pH
   - **Care**: Assess watering, fertilization, pest control
   - **Health**: Use health rating as direct multiplier

3. **Apply Combined Adjustment**

   - Weighted average: Age (25%), Environment (35%), Care (25%), Health (15%)
   - Adjustment range: 0.4x to 1.5x of base production

4. **Sex Ratio Modification**

   - Calculate stress level from environmental and care factors
   - High stress → more male flowers (up to +30%), fewer female flowers (up to -25%)
   - Low stress → balanced production (natural ~2:1 ratio)

5. **Generate Ranges**

   - Min: Average - 15%
   - Max: Average + 15%
   - Average: Base × Combined Adjustment

6. **Calculate Confidence**

   - Based on how close conditions are to optimal
   - Higher confidence when all factors are in good range
   - Lower confidence with multiple suboptimal conditions

7. **Generate Recommendations**
   - Identify negative factors
   - Provide specific advice for each issue
   - Prioritize by impact level

### Future Enhancements

1. **Machine Learning Integration**

   - Collect actual flower production data from users
   - Train ML model to improve prediction accuracy
   - Compare predictions vs actuals over time

2. **Historical Analysis**

   - Track prediction accuracy by user
   - Show prediction vs actual results comparison
   - Adjust algorithm based on feedback

3. **Advanced Features**

   - Photo-based growth assessment using computer vision
   - Weather integration for automatic environmental data
   - Seasonal trends and historical data analysis
   - Push notifications for optimal planting times

4. **Web Dashboard**
   - Admin view of all predictions
   - Analytics on prediction accuracy
   - Export data for research purposes

## Files Created/Modified

### New Files

1. `backend/src/models/FlowerPrediction.js` - Database model
2. `backend/src/services/flowerPredictionService.js` - Prediction algorithm
3. `frontend/mobile-app/src/screens/PolinationScreens/PredictFlowersScreen.js` - Input form
4. `frontend/mobile-app/src/screens/PolinationScreens/PredictionResultsScreen.js` - Results display

### Modified Files

1. `backend/src/models/index.js` - Export FlowerPrediction model
2. `backend/src/controllers/pollinationController.js` - Add prediction endpoints
3. `backend/src/routes/pollination.js` - Add prediction routes
4. `frontend/mobile-app/src/screens/index.js` - Export new screens
5. `frontend/mobile-app/src/services/pollinationService.js` - Add prediction methods
6. `frontend/mobile-app/src/navigation/AppNavigator.js` - Add navigation routes
7. `frontend/mobile-app/src/screens/PolinationScreens/PollinationScreen.js` - Add access button

## Testing Recommendations

1. **Backend API Testing**

   - Test prediction generation with various input combinations
   - Verify validation for out-of-range values
   - Test prediction retrieval and filtering
   - Test deletion and access control

2. **Algorithm Testing**

   - Test each plant type produces reasonable predictions
   - Verify stress factors reduce female flower counts
   - Test optimal conditions produce high confidence scores
   - Validate recommendations match identified issues

3. **Frontend Testing**

   - Test form validation for all fields
   - Verify plant selection auto-fills correctly
   - Test navigation flow between screens
   - Verify results display correctly
   - Test share functionality

4. **Integration Testing**
   - End-to-end flow from form to results
   - Test with real plant data
   - Verify predictions save to database
   - Test prediction history retrieval

## Conclusion

The Flower Production Prediction feature provides users with data-driven insights to optimize their plant care and maximize flower production. The rule-based algorithm provides immediate value while collecting data for future machine learning improvements. The intuitive mobile interface makes it easy for users to input data and understand predictions.
