# TFLite Model Retraining Guide

## Problem: Overfitting to Background

The current TFLite model shows overconfident predictions because training images were captured in
controlled environments with uniform backgrounds. The model learns background texture alongside
the gourd features, causing it to fail when the background changes.

Symptoms:
- Confidence scores near 95-100% even on ambiguous frames
- Misclassification when moving to a new location
- `applySoftmaxWithTemperature` is needed to artificially flatten scores at inference time

---

## Root Cause

Limited background variety in training data. The model overfits to:
- Dirt / soil background color
- Consistent lighting direction
- Camera-to-subject distance used during capture

---

## Dataset Requirements

### Minimum Targets

| Class | Images | Varied Backgrounds |
|---|---|---|
| Ampalaya Flower | 200 | >= 60 |
| Patola Flower | 200 | >= 60 |
| Upo Flower | 200 | >= 60 |
| Kalabasa Flower | 200 | >= 60 |
| Pipino Flower | 200 | >= 60 |
| Ampalaya Leaf | 200 | >= 60 |
| Patola Leaf | 200 | >= 60 |
| Upo Leaf | 200 | >= 60 |
| Kalabasa Leaf | 200 | >= 60 |
| Pipino Leaf | 200 | >= 60 |
| Not Flower (negative) | 150 | varied |
| Not Leaf (negative) | 150 | varied |

### Background Variety Checklist

Capture each class in at least these conditions:
- [ ] Outdoors, natural daylight (morning/afternoon/overcast)
- [ ] Artificial light (indoor fluorescent, LED)
- [ ] High-contrast background (white wall, dark soil)
- [ ] Busy background (foliage, greenhouse netting)
- [ ] Handheld at varying distances (20 cm, 40 cm, 60 cm)

---

## Data Augmentation

Apply these augmentations during training to simulate real-world variation.

### Brightness and Contrast
```python
# TFLite Model Maker / Keras ImageDataGenerator
augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomBrightness(factor=0.3),    # +/-30% brightness
    tf.keras.layers.RandomContrast(factor=0.2),
])
```

### Rotation and Flip
```python
augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal_and_vertical"),
    tf.keras.layers.RandomRotation(factor=0.08),     # +/-15 degrees
    tf.keras.layers.RandomZoom(height_factor=0.15),
])
```

### Combined Pipeline
```python
data_augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal_and_vertical"),
    tf.keras.layers.RandomRotation(0.08),
    tf.keras.layers.RandomBrightness(0.3),
    tf.keras.layers.RandomContrast(0.2),
    tf.keras.layers.RandomZoom(0.15),
])
```

### Background Swapping (Advanced)

For each training image, composite the gourd subject onto a random background:
1. Use U2-Net or rembg to extract subject mask
2. Blend onto a random background image (fetch ~500 diverse backgrounds)
3. Export at 224x224 for MobileNetV2 input

```bash
pip install rembg
python scripts/swap_backgrounds.py --input data/raw/ --backgrounds data/backgrounds/ --output data/augmented/
```

---

## Retraining Tools

### Option A: Teachable Machine (Beginner)

1. Go to [Teachable Machine](https://teachablemachine.withgoogle.com/)
2. Choose **Image Project > Standard image model**
3. Create one class per gourd variety (flower and leaf separately, or combined)
4. Upload augmented images per class
5. In **Advanced** settings:
   - Epochs: 50-80
   - Batch size: 16
   - Learning rate: 0.001
6. Export as **TensorFlow Lite > Floating point**
7. Replace `assets/ml-models/flower_model.tflite` and `leaf_model.tflite`

### Option B: TFLite Model Maker (Recommended)

```python
import tensorflow as tf
from tflite_model_maker import image_classifier
from tflite_model_maker.image_classifier import DataLoader

# Load data
data = DataLoader.from_folder('data/augmented/')
train_data, test_data = data.split(0.9)

# Build model (MobileNetV2 base)
model = image_classifier.create(
    train_data,
    model_spec=image_classifier.EfficientNetLite0Spec(),
    epochs=50,
    dropout_rate=0.2,
)

# Evaluate
loss, accuracy = model.evaluate(test_data)
print(f"Accuracy: {accuracy:.2%}")

# Export
model.export(export_dir='models/')
```

---

## Confidence Calibration

After retraining, validate that confidence distributions are reasonable before removing
the `applySoftmaxWithTemperature` hack:

1. Run the new model against a held-out validation set
2. Plot a histogram of top-1 confidence scores
3. If the histogram peaks near 95-100% for correct predictions, reduce `T` in
   `applySoftmaxWithTemperature` from `1.5` toward `1.2`
4. If the model is well-calibrated (peak around 70-85%), you can remove temperature scaling
   and set the raw probabilities directly

```javascript
// In modelService.js — once model is well-calibrated:
// Replace applySoftmaxWithTemperature(rawProbabilities, 1.5) with:
const probabilities = Array.from(rawProbabilities);
// And remove the 97% cap: Math.min(probability * 100, 97) → probability * 100
```

---

## Deployment

1. Place the new `.tflite` file in `frontend/mobile-app/assets/ml-models/`
2. Update the filename reference in `modelService.js` if the name changed:
   ```javascript
   const FLOWER_MODEL_ASSET = require('../../assets/ml-models/flower_model_v2.tflite');
   ```
3. Run `npx expo run:android` to rebuild the native bundle
4. Test with `npm test -- --testPathPattern=modelService` to ensure unit tests pass

---

## Tracking Progress

Update `docs/progress-track.md` after each retraining milestone:
- Dataset collection complete
- Augmentation pipeline verified
- Model trained and accuracy > 90% on validation set
- Deployed to device and real-world tested
