# Quick Start: ML Flower Production Prediction

## Step 1: Install Python Dependencies

```bash
cd backend/ml-models
pip install -r requirements.txt
```

## Step 2: Generate Dataset & Train Models

```bash
cd scripts
python generate_dataset.py
python train_model.py
```

**Expected Output:**

- `data/flower_production_dataset.csv` (5,000 samples)
- `models/*.joblib` (trained models)
- `models/model_performance.png` (visualization)

**Training Time:** ~30 seconds

## Step 3: Test Prediction

```bash
echo '{
  "plantType": "ampalaya_bilog",
  "plantAge": 50,
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
    "height": 220,
    "leafCount": 45,
    "stemThickness": 15,
    "healthRating": 4
  }
}' | python predict.py
```

## Step 4: Start Backend

```bash
cd ../../../backend
npm run dev
```

The system will automatically use ML models for predictions!

## File Structure

```
backend/ml-models/
├── data/                   # Training data
├── models/                 # Trained models (.joblib files)
├── scripts/                # Python scripts
│   ├── generate_dataset.py
│   ├── train_model.py
│   └── predict.py
├── docs/                   # Documentation
└── requirements.txt        # Python packages
```

## Model Performance

- **Male Flowers:** MAE ~2.5-3.5, R² ~0.93
- **Female Flowers:** MAE ~1.5-2.5, R² ~0.91
- **Confidence:** 40-100% based on input quality

## Troubleshooting

**"Model files not found"**
→ Run `python train_model.py` first

**"ModuleNotFoundError"**
→ Run `pip install -r requirements.txt`

**"Python not found"**
→ Install Python 3.8+ and add to PATH

For detailed documentation, see [ML_PREDICTION_SYSTEM.md](ML_PREDICTION_SYSTEM.md)
