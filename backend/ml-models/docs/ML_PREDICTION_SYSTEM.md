# ML-Based Flower Production Prediction System

## 📊 Overview

Complete machine learning system for predicting male and female flower production in cucurbit plants based on environmental conditions, care practices, and growth metrics.

**Model Type:** Random Forest Regressor (Ensemble Learning)  
**Training Data:** 5,000 synthetic samples with realistic distributions  
**Prediction Targets:** Male flowers and female flowers (separate models)  
**Input Features:** 15 features across plant, environmental, care, and growth categories

---

## 🗂 Directory Structure

```
backend/ml-models/
├── data/                           # Training datasets
│   ├── flower_production_dataset.csv
│   └── dataset_metadata.json
├── models/                         # Trained models
│   ├── male_flower_model.joblib
│   ├── female_flower_model.joblib
│   ├── encoders.joblib
│   ├── model_metadata.json
│   └── model_performance.png
├── scripts/                        # Python scripts
│   ├── generate_dataset.py        # Synthetic data generation
│   ├── train_model.py             # Model training pipeline
│   └── predict.py                 # Prediction service
├── docs/                           # Documentation
│   └── ML_PREDICTION_SYSTEM.md    # This file
└── requirements.txt               # Python dependencies
```

---

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend/ml-models
pip install -r requirements.txt
```

**Required packages:**

- pandas >= 2.0.0
- numpy >= 1.24.0
- scikit-learn >= 1.3.0
- joblib >= 1.3.0
- matplotlib >= 3.7.0

### 2. Generate Training Dataset

```bash
cd scripts
python generate_dataset.py
```

**Output:**

- `data/flower_production_dataset.csv` - 5,000 training samples
- `data/dataset_metadata.json` - Feature and target metadata

### 3. Train ML Models

```bash
python train_model.py
```

**Output:**

- `models/male_flower_model.joblib` - Male flower predictor
- `models/female_flower_model.joblib` - Female flower predictor
- `models/encoders.joblib` - Categorical feature encoders
- `models/model_metadata.json` - Model performance metrics
- `models/model_performance.png` - Visualization plots

**Training Time:** ~30 seconds on modern CPU

---

## 📋 Dataset Schema

### Input Features (15 total)

| Feature                | Type        | Range/Values                                 | Description                                |
| ---------------------- | ----------- | -------------------------------------------- | ------------------------------------------ |
| `plant_type`           | Categorical | ampalaya_bilog, upo_smooth, patola, cucumber | Plant species                              |
| `plant_age`            | Numerical   | 20-150 days                                  | Days since planting                        |
| `temperature`          | Numerical   | 15-40°C                                      | Average temperature                        |
| `humidity`             | Numerical   | 40-95%                                       | Relative humidity                          |
| `sunlight_hours`       | Numerical   | 3-12 hours                                   | Daily sunlight exposure                    |
| `soil_ph`              | Numerical   | 5.0-8.0                                      | Soil pH level                              |
| `soil_type`            | Categorical | sandy, loamy, clay, silty                    | Soil composition                           |
| `watering_frequency`   | Numerical   | 2-8 times/week                               | Watering schedule                          |
| `fertilizer_type`      | Categorical | none, organic, chemical, mixed               | Fertilizer category                        |
| `fertilizer_frequency` | Numerical   | 0-4 times/month                              | Fertilization schedule                     |
| `pest_control`         | Categorical | none, as-needed, regular, intensive          | Pest management level                      |
| `height`               | Numerical   | 100-400 cm                                   | Plant height                               |
| `leaf_count`           | Numerical   | 10-80 leaves                                 | Number of leaves                           |
| `stem_thickness`       | Numerical   | 5-25 mm                                      | Stem diameter                              |
| `health_rating`        | Numerical   | 1-5                                          | Overall plant health (1=poor, 5=excellent) |

### Target Variables

| Target           | Type      | Range | Description                       |
| ---------------- | --------- | ----- | --------------------------------- |
| `male_flowers`   | Numerical | 1-50  | Number of male flowers produced   |
| `female_flowers` | Numerical | 1-30  | Number of female flowers produced |

### Plant Type Characteristics

#### Ampalaya Bilog (Round Bitter Gourd)

- **Optimal Age:** 40-60 days
- **Male Flowers (optimal):** 22 ± 5
- **Female Flowers (optimal):** 11 ± 3
- **Male:Female Ratio:** 2:1
- **Temperature Preference:** 25-30°C
- **Height Range:** 150-300 cm

#### Upo Smooth (Smooth Bottle Gourd)

- **Optimal Age:** 50-70 days
- **Male Flowers (optimal):** 30 ± 6
- **Female Flowers (optimal):** 15 ± 4
- **Male:Female Ratio:** 2:1
- **Temperature Preference:** 24-29°C
- **Height Range:** 200-400 cm

#### Patola (Sponge Gourd)

- **Optimal Age:** 45-65 days
- **Male Flowers (optimal):** 18 ± 5
- **Female Flowers (optimal):** 9 ± 3
- **Male:Female Ratio:** 2:1
- **Temperature Preference:** 25-31°C
- **Height Range:** 180-350 cm

#### Cucumber

- **Optimal Age:** 35-55 days
- **Male Flowers (optimal):** 25 ± 5
- **Female Flowers (optimal):** 14 ± 3
- **Male:Female Ratio:** 1.8:1
- **Temperature Preference:** 20-28°C
- **Height Range:** 100-250 cm

---

## 🤖 Model Architecture

### Random Forest Regressor

**Hyperparameters:**

- `n_estimators`: 200 (number of trees)
- `max_depth`: 20 (maximum tree depth)
- `min_samples_split`: 5 (minimum samples to split node)
- `min_samples_leaf`: 2 (minimum samples in leaf)
- `random_state`: 42 (reproducibility)

**Why Random Forest?**

- ✅ Handles non-linear relationships
- ✅ Resistant to overfitting
- ✅ Provides feature importance
- ✅ No feature scaling required
- ✅ Works well with mixed data types
- ✅ Fast inference

### Training Process

1. **Data Split:** 80% train / 20% test
2. **Cross-Validation:** 5-fold CV on training set
3. **Separate Models:** Male and female predictions are independent
4. **Feature Encoding:** Label encoding for categorical features
5. **No Scaling:** Tree-based models don't require normalization

---

## 📈 Model Performance

### Expected Metrics (on synthetic data)

**Male Flower Model:**

- Test R²: ~0.92-0.95
- Test MAE: ~2.5-3.5 flowers
- Test RMSE: ~3.5-4.5 flowers
- 5-Fold CV MAE: ~2.8 flowers

**Female Flower Model:**

- Test R²: ~0.90-0.93
- Test MAE: ~1.5-2.5 flowers
- Test RMSE: ~2.0-3.0 flowers
- 5-Fold CV MAE: ~1.8 flowers

**Interpretation:**

- High R² (>0.90) indicates model explains >90% of variance
- Low MAE means predictions are typically within 2-3 flowers of actual
- Consistent CV scores show model generalizes well

### Feature Importance

**Top Features for Prediction:**

1. `health_rating` (15-20%) - Direct impact on plant productivity
2. `plant_age` (12-18%) - Critical for flowering maturity
3. `temperature` (10-15%) - Affects metabolic processes
4. `sunlight_hours` (8-12%) - Energy for flower production
5. `watering_frequency` (7-10%) - Stress management

---

## 🔧 API Usage

### Node.js Service Integration

The system integrates with Node.js backend via child process:

```javascript
const MLFlowerPredictionService = require("./services/mlFlowerPredictionService");

const predictionResult =
  await MLFlowerPredictionService.predictFlowerProduction({
    plantType: "ampalaya_bilog",
    plantAge: 50,
    environmental: {
      temperature: 28,
      humidity: 70,
      sunlightHours: 7,
      soilPH: 6.5,
      soilType: "loamy",
    },
    care: {
      wateringFrequency: 4,
      fertilizerType: "organic",
      fertilizerFrequency: 2,
      pestControl: "regular",
    },
    growth: {
      height: 220,
      leafCount: 45,
      stemThickness: 15,
      healthRating: 4,
    },
  });
```

### Response Format

```json
{
  "maleFlowers": {
    "min": 18,
    "max": 27,
    "average": 22
  },
  "femaleFlowers": {
    "min": 9,
    "max": 13,
    "average": 11
  },
  "confidence": 85,
  "influencingFactors": [
    {
      "factor": "Temperature",
      "impact": "positive",
      "description": "Temperature is in optimal range for flowering"
    },
    {
      "factor": "Plant Health",
      "impact": "positive",
      "description": "Good plant health promotes strong flowering"
    }
  ],
  "recommendations": [
    {
      "category": "general",
      "suggestion": "For ampalaya_bilog, maintain consistent moisture during flowering period to maximize production.",
      "priority": "low"
    }
  ]
}
```

### Confidence Score Calculation

Confidence is dynamically calculated based on input quality:

- **Base:** 100%
- **Penalties:**
  - Very young plant (<30 days): -15%
  - Very old plant (>100 days): -10%
  - Temperature outside 20-35°C: -15%
  - Humidity outside 50-90%: -10%
  - Low sunlight (<4 hrs): -15%
  - Poor health (1-2): -20%
  - Insufficient watering (<2x/week): -15%
- **Bonuses:**
  - Optimal temperature (25-30°C): +5%
  - Optimal humidity (60-80%): +5%
  - Optimal sunlight (6-8 hrs): +5%
  - Good health (4-5): +10%
  - Optimal watering (3-5x/week): +5%

**Range:** 40-100%

---

## 🔄 Retraining Procedure

### When to Retrain

- After collecting real-world data (>500 samples)
- Model performance degrades (MAE increases by >20%)
- Adding new plant types
- Environmental conditions change significantly
- Quarterly maintenance schedule

### Retraining Steps

1. **Prepare New Data**

   ```bash
   # Add real data to existing dataset
   python scripts/merge_datasets.py --real-data new_data.csv --output merged_data.csv
   ```

2. **Train New Models**

   ```bash
   python scripts/train_model.py --data merged_data.csv
   ```

3. **Evaluate Performance**

   - Check R² scores (should be >0.85)
   - Verify MAE hasn't increased
   - Review feature importance changes
   - Validate on hold-out test set

4. **Deploy Models**

   - Backup old models: `mv models models_backup_YYYYMMDD`
   - Copy new models to `models/` directory
   - Restart Node.js backend

5. **Monitor Performance**
   - Log predictions vs actuals for 2 weeks
   - Calculate rolling MAE
   - Collect user feedback

### Adding New Plant Types

1. Update `PLANT_SPECS` in `generate_dataset.py`
2. Generate new synthetic samples
3. Merge with existing dataset
4. Retrain models
5. Update validation in backend (`pollinationController.js`)
6. Update frontend plant type dropdowns

---

## 🧪 Testing

### Manual Testing

```bash
cd scripts

# Test prediction with sample input
echo '{
  "plantType": "patola",
  "plantAge": 55,
  "environmental": {
    "temperature": 27,
    "humidity": 75,
    "sunlightHours": 7,
    "soilPH": 6.3,
    "soilType": "loamy"
  },
  "care": {
    "wateringFrequency": 4,
    "fertilizerType": "mixed",
    "fertilizerFrequency": 2,
    "pestControl": "regular"
  },
  "growth": {
    "height": 280,
    "leafCount": 52,
    "stemThickness": 18,
    "healthRating": 5
  }
}' | python predict.py
```

### Validation Checklist

- [ ] Models load without errors
- [ ] Predictions are within reasonable ranges (1-50 males, 1-30 females)
- [ ] Confidence score is 40-100%
- [ ] Recommendations are relevant to input conditions
- [ ] Response time < 2 seconds
- [ ] Handles missing optional fields (defaults applied)
- [ ] Error handling for invalid plant types
- [ ] Categorical encodings work for all valid values

---

## 🐛 Troubleshooting

### Issue: "Model files not found"

**Solution:**

```bash
cd backend/ml-models/scripts
python generate_dataset.py
python train_model.py
```

### Issue: "ModuleNotFoundError: No module named 'sklearn'"

**Solution:**

```bash
pip install scikit-learn pandas numpy joblib matplotlib
```

### Issue: "Python process failed to start"

**Cause:** Python not in PATH or wrong command

**Solution (Windows):**

```bash
# Find Python path
where python

# Update mlFlowerPredictionService.js if needed
const pythonCmd = 'C:\\Python39\\python.exe';
```

**Solution (Linux/Mac):**

```bash
# Ensure python3 is available
which python3

# Or create symlink
sudo ln -s /usr/bin/python3 /usr/bin/python
```

### Issue: "Prediction taking too long (>5 seconds)"

**Causes:**

- Large model files (shouldn't happen with Random Forest)
- Slow disk I/O
- Python startup overhead

**Solutions:**

- Keep models in memory (implement model server)
- Use faster storage (SSD)
- Profile with `time python predict.py`

### Issue: "Unrealistic predictions"

**Causes:**

- Input values outside training distribution
- Model trained on poor quality data
- Feature encoding mismatch

**Solutions:**

- Validate input ranges before prediction
- Check training data statistics
- Retrain with more diverse data
- Add input validation in frontend

---

## 📊 Data Collection for Improvement

### Real-World Data Schema

Collect actual observations in this format:

```csv
plant_type,plant_age,temperature,humidity,sunlight_hours,soil_ph,soil_type,watering_frequency,fertilizer_type,fertilizer_frequency,pest_control,height,leaf_count,stem_thickness,health_rating,male_flowers_actual,female_flowers_actual
ampalaya_bilog,52,28.5,72,7.2,6.4,loamy,4,organic,2,regular,235,48,16,4,24,12
```

### Integration Points

1. **Manual Entry:** Admin can record actual flower counts
2. **Automated:** Track predictions vs actuals over time
3. **User Feedback:** "Was this prediction accurate?" button
4. **Export Function:** Download prediction history as CSV

---

## 🔐 Production Considerations

### Security

- [ ] Validate all input ranges
- [ ] Sanitize input before passing to Python
- [ ] Implement rate limiting on prediction endpoint
- [ ] Don't expose Python error messages to users
- [ ] Log prediction requests for audit

### Performance

- [ ] Cache common predictions (e.g., typical conditions)
- [ ] Implement prediction queue for high load
- [ ] Monitor Python process memory usage
- [ ] Set timeout for predictions (3 seconds)

### Monitoring

- [ ] Log prediction latency
- [ ] Track prediction confidence distribution
- [ ] Monitor model file integrity
- [ ] Alert if MAE increases significantly

---

## 📚 References

**Horticultural Research:**

- Cucurbit flowering patterns and sex expression
- Environmental effects on flower production
- Stress-induced sex ratio changes

**Machine Learning:**

- Random Forest Regression (Breiman, 2001)
- Scikit-learn documentation
- Feature importance in tree-based models

**Best Practices:**

- Model versioning and deployment
- MLOps for production systems
- Continuous model monitoring

---

## 👥 Maintenance

**Last Updated:** January 1, 2026  
**Model Version:** 1.0  
**Dataset Version:** 1.0  
**Next Review:** April 1, 2026

**Contact:** Development Team  
**Repository:** backend/ml-models/
