# Multi-Class Gourd Flower Classification Model Training Guide

This guide provides step-by-step instructions for training a **multi-class** machine learning model to classify gourd flowers by variety and gender, with non-flower rejection capability.

## What's New in V3?

- **Multi-class classification** - Supports multiple gourd varieties (Ampalaya, Patola, etc.)
- **Non-flower rejection** - Includes `not_flower` class to reject non-flower images
- **Confidence threshold** - Built-in low-confidence detection
- **Optimized for real-time** - Float16 quantization for faster mobile inference

## Dataset Information

### Required Folder Structure
```
MyDrive/EGourd/
├── Datasets/
│   ├── ampalaya_bilog_female/    (1048 images - ✓ Excellent)
│   ├── ampalaya_bilog_male/      (1042 images - ✓ Excellent)
│   ├── patola_female/            (1158 images - ✓ Excellent)
│   ├── patola_male/              (1113 images - ✓ Excellent)
│   ├── upo_smooth_female/        (1085 images - ✓ Good)
│   ├── upo_smooth_male/          (901 images - ✓ Good)
│   └── not_flower/               (888 images - ✓ Good)
│       └── leaves, stems, fruits, background, etc.
└── Model_Versions/
    └── (trained models will be saved here)
```

### Class Labels
| Index | Class Name | Description |
|-------|------------|-------------|
| 0 | ampalaya_bilog_female | Ampalaya Bilog Female Flower |
| 1 | ampalaya_bilog_male | Ampalaya Bilog Male Flower |
| 2 | patola_female | Patola Female Flower |
| 3 | patola_male | Patola Male Flower |
| 4 | upo_smooth_female | Upo (Smooth variety) Female Flower |
| 5 | upo_smooth_male | Upo (Smooth variety) Male Flower |
| 6 | not_flower | Non-flower (leaves, stems, etc.) |

## Training Code for Google Colab

---

### 📋 Cell Structure Overview

| Cell | Purpose | Runtime | Can Rerun? |
|------|---------|---------|------------|
| 1 | Setup & Installation | 30s | ✓ Anytime |
| 2 | Mount Drive & Verify | 10s | ✓ Anytime |
| 3 | Organize Dataset | 2-5 min | ⚠️ Only once |
| 4 | Configure & Prepare Data | 10s | ✓ To change settings |
| 5 | Build & Compile Model | 5s | ✓ To rebuild |
| 6 | Train Phase 1 | 15-30 min | ✓ To retrain |
| 7 | Train Phase 2 & Evaluate | 20-60 min | ✓ To retrain |
| 8 | Visualize & Test | 30s | ✓ Anytime |
| 9 | Export & Save | 1-2 min | ✓ Anytime |

**Total Runtime: ~45-120 minutes**

---

## 📦 CELL 1: Setup & Installation

```python
# ============================================================================
# CELL 1: Setup & Installation
# Purpose: Install required packages, import libraries, and verify GPU availability
# Instructions: Run this cell first. Wait for all packages to install.
# ============================================================================

# ============================================================================
# GOURD FLOWER MULTI-CLASS CLASSIFICATION MODEL TRAINING
# Multi-Class Classification: Variety + Gender + Non-Flower Rejection
# Compatible with Expo React Native Mobile App
# ============================================================================

# ⭐⭐⭐ CRITICAL: Install TensorFlow with Keras 2.x compatibility
# ============================================================================
print("=" * 70)
print("🔧 INSTALLING TENSORFLOW WITH KERAS 2.x COMPATIBILITY")
print("=" * 70)
print("⚠️  This prevents Keras 3.x format issues with TFLite conversion")
print("⚠️  DO NOT SKIP THIS STEP!")
print()

# Set environment variable BEFORE importing TensorFlow
import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

# Install TensorFlow (latest version) and required packages
print("Installing TensorFlow and dependencies...")
!pip install -q tensorflow tensorflow-hub
!pip install -q pillow
!pip install -q scikit-learn  # For confusion matrix

print("\n✅ TensorFlow installed successfully!")
print("✅ Keras 2.x compatibility mode enabled!")
print("✅ Ready for TFLite conversion")
print()

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
import os
import json
from google.colab import drive
from datetime import datetime
import zipfile
import shutil

# Check TensorFlow version and GPU availability
print("=" * 70)
print("SYSTEM CONFIGURATION")
print("=" * 70)
print(f"TensorFlow Version: {tf.__version__}")
# Removed Keras Version print as it causes issues with legacy Keras compatibility
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")
print(f"Built with CUDA: {tf.test.is_built_with_cuda()}")

# Verify we're using Keras 2.x compatibility mode
tf_version = tf.__version__
# Removed Keras version assignment as it causes issues with legacy Keras compatibility
print(f"\n✅ TensorFlow version: {tf_version}")
# print(f"✅ Keras version: {keras_version}") # Original line, commented out
if os.environ.get('TF_USE_LEGACY_KERAS') == '1':
    print("✅ Keras 2.x compatibility mode ENABLED")
    print("✅ TFLite conversion will work correctly")
else:
    print("⚠️  WARNING: Keras 2.x compatibility not detected!")
    print("⚠️  TFLite conversion may fail!")

print("=" * 70)
print("\n✓ All libraries imported successfully!")
print("✓ Ready to proceed to next cell")
```

---

## 💾 CELL 2: Mount Drive & Verify Dataset

```python
# ============================================================================
# CELL 2: Mount Drive & Verify Dataset
# Purpose: Connect to Google Drive and verify your dataset folders exist
# Instructions: 
#   1. Run this cell
#   2. Click the authorization link
#   3. Grant access to Google Drive
#   4. Wait for dataset verification
# ============================================================================

# Mount Google Drive to access datasets
drive.mount('/content/drive')

# ============================================================================
# DATASET CONFIGURATION - UPDATE THESE PATHS IF NEEDED
# ============================================================================

DRIVE_BASE_PATH = '/content/drive/MyDrive/EGourd/Datasets'

# Define all class folders (UPDATE FOLDER NAMES TO MATCH YOUR STRUCTURE)
CLASS_FOLDERS = {
    'ampalaya_bilog_female': f'{DRIVE_BASE_PATH}/ampalaya_bilog_female',
    'ampalaya_bilog_male': f'{DRIVE_BASE_PATH}/ampalaya_bilog_male',
    'patola_female': f'{DRIVE_BASE_PATH}/patola_female',
    'patola_male': f'{DRIVE_BASE_PATH}/patola_male',
    'upo_smooth_female': f'{DRIVE_BASE_PATH}/upo_smooth_female',
    'upo_smooth_male': f'{DRIVE_BASE_PATH}/upo_smooth_male',
    'not_flower': f'{DRIVE_BASE_PATH}/not_flower',
}

# Local paths for organized data
LOCAL_DATA_PATH = '/content/gourd_data'
TRAIN_DIR = f'{LOCAL_DATA_PATH}/train'
VALIDATION_DIR = f'{LOCAL_DATA_PATH}/validation'
TEST_DIR = f'{LOCAL_DATA_PATH}/test'

# Verify dataset paths
print("=" * 70)
print("VERIFYING DATASET FOLDERS")
print("=" * 70)

total_images = 0
class_counts = {}

for class_name, folder_path in CLASS_FOLDERS.items():
    if os.path.exists(folder_path):
        count = len([f for f in os.listdir(folder_path) 
                    if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))])
        class_counts[class_name] = count
        total_images += count
        status = "✓" if count >= 100 else "⚠️"
        print(f"{status} {class_name}: {count} images")
    else:
        class_counts[class_name] = 0
        print(f"❌ {class_name}: NOT FOUND at {folder_path}")

print("=" * 70)
print(f"Total images: {total_images}")

# Check class balance
if total_images > 0:
    avg_count = total_images / len(CLASS_FOLDERS)
    print(f"Average per class: {avg_count:.0f} images")
    print("\nClass Balance Check:")
    for class_name, count in class_counts.items():
        balance = (count / avg_count * 100) if avg_count > 0 else 0
        status = "✓" if balance > 70 else "⚠️"
        print(f"  {status} {class_name}: {balance:.1f}% of average")
    
    print("\n💡 Dataset Statistics:")
    print(f"   • Smallest class: {min(class_counts.values())} images")
    print(f"   • Largest class: {max(class_counts.values())} images")
    print(f"   • Imbalance ratio: {max(class_counts.values()) / min(class_counts.values()):.2f}x")
    
    if max(class_counts.values()) / min(class_counts.values()) > 2:
        print("\n⚠️  WARNING: High class imbalance detected (>2x difference)")
        print("   → Class weights will be automatically applied during training")
        print("   → Consider data augmentation or collecting more samples for smaller classes")
    
    if any(count < 300 for count in class_counts.values()):
        print("\n⚠️  Warning: Some classes have <300 images. Consider collecting more data.")
else:
    print("⚠️ No images found. Please check your folder paths.")

print("\n✓ Drive mounted and dataset verified!")
print("✓ Ready to organize dataset in next cell")
```

---

## 📂 CELL 3: Organize Dataset & Visualize Samples

```python
# ============================================================================
# CELL 3: Organize Dataset & Visualize Samples
# Purpose: Split images into train/validation/test sets and preview samples
# Instructions: 
#   1. Run this cell once (takes 2-5 minutes to copy files)
#   2. Check the summary statistics
#   3. Review the sample images displayed
#   4. WARNING: Do not rerun this cell unless you want to re-split the data
# ============================================================================

def extract_and_organize_dataset():
    """
    Organize images from Google Drive folders into train/validation/test splits
    Split: 70% train, 15% validation, 15% test
    """
    
    # Check if already organized
    if os.path.exists(f'{LOCAL_DATA_PATH}/train') and \
       len(os.listdir(f'{LOCAL_DATA_PATH}/train')) > 0:
        print("⚠️  Dataset already organized! Skipping to avoid re-splitting.")
        print("   Delete /content/gourd_data/ if you want to re-organize.\n")
        
        # Show existing split counts
        for split in ['train', 'validation', 'test']:
            split_path = f'{LOCAL_DATA_PATH}/{split}'
            if os.path.exists(split_path):
                total = sum([len(os.listdir(f'{split_path}/{c}')) 
                           for c in os.listdir(split_path) 
                           if os.path.isdir(f'{split_path}/{c}')])
                print(f"   {split.capitalize()}: {total} images")
        return
    
    print("Creating directory structure...")
    
    # Create directories for each class in each split
    for split in ['train', 'validation', 'test']:
        for class_name in CLASS_FOLDERS.keys():
            os.makedirs(f'{LOCAL_DATA_PATH}/{split}/{class_name}', exist_ok=True)
    
    print("Organizing datasets...")
    
    # Set random seed for reproducibility
    np.random.seed(42)
    
    split_stats = {split: {} for split in ['train', 'validation', 'test']}
    
    for class_name, source_dir in CLASS_FOLDERS.items():
        if not os.path.exists(source_dir):
            print(f"⚠️ Skipping {class_name}: folder not found")
            continue
            
        # Get all image files
        files = [os.path.join(source_dir, f) for f in os.listdir(source_dir)
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))]
        
        if len(files) == 0:
            print(f"⚠️ Skipping {class_name}: no images found")
            continue
        
        # Shuffle files for random split
        np.random.shuffle(files)
        
        # Calculate split indices
        total = len(files)
        train_idx = int(0.70 * total)
        val_idx = int(0.85 * total)
        
        # Split files
        splits = {
            'train': files[:train_idx],
            'validation': files[train_idx:val_idx],
            'test': files[val_idx:]
        }
        
        # Copy files to respective directories
        for split_name, file_list in splits.items():
            for i, file_path in enumerate(file_list):
                ext = os.path.splitext(file_path)[1]
                dest = f'{LOCAL_DATA_PATH}/{split_name}/{class_name}/{class_name}_{i}{ext}'
                shutil.copy(file_path, dest)
            split_stats[split_name][class_name] = len(file_list)
        
        print(f"✓ {class_name}: {len(splits['train'])} train, {len(splits['validation'])} val, {len(splits['test'])} test")
    
    # Summary
    print("\n" + "="*70)
    print("DATASET ORGANIZATION SUMMARY")
    print("="*70)
    for split_name, counts in split_stats.items():
        total = sum(counts.values())
        print(f"{split_name.capitalize():12}: {total} images")
    print("="*70 + "\n")

# Run dataset extraction and organization
extract_and_organize_dataset()

# ============================================================================
# VISUALIZE SAMPLE IMAGES
# ============================================================================

def visualize_samples():
    """Display sample images from training set to verify data quality"""
    print("Displaying sample images from training set...\n")
    
    class_names = [c for c in CLASS_FOLDERS.keys() if os.path.exists(f'{TRAIN_DIR}/{c}')]
    num_classes = len(class_names)
    
    fig, axes = plt.subplots(num_classes, 4, figsize=(12, 3 * num_classes))
    
    for idx, class_name in enumerate(class_names):
        class_dir = f'{TRAIN_DIR}/{class_name}'
        if not os.path.exists(class_dir):
            continue
            
        images = [f for f in os.listdir(class_dir) 
                 if f.lower().endswith(('.png', '.jpg', '.jpeg'))][:4]
        
        for i, img_name in enumerate(images):
            img_path = os.path.join(class_dir, img_name)
            img = plt.imread(img_path)
            
            ax = axes[idx, i] if num_classes > 1 else axes[i]
            ax.imshow(img)
            ax.set_title(f'{class_name}', fontsize=8)
            ax.axis('off')
    
    plt.tight_layout()
    plt.savefig('/content/sample_images.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✓ Sample visualization saved as 'sample_images.png'\n")

# Visualize samples
visualize_samples()

print("✓ Dataset organization complete!")
print("✓ Ready to configure model in next cell")
```

---

## ⚙️ CELL 4: Configure Hyperparameters & Prepare Data

```python
# ============================================================================
# CELL 4: Configure Hyperparameters & Prepare Data
# Purpose: Set training configuration and create data generators with augmentation
# Instructions:
#   1. Review hyperparameters (modify if needed)
#   2. Run this cell
#   3. Note the number of training/validation/test samples
# ============================================================================

# ============================================================================
# HYPERPARAMETER CONFIGURATION
# ============================================================================
IMG_HEIGHT = 224
IMG_WIDTH = 224
BATCH_SIZE = 16
EPOCHS = 100
LEARNING_RATE = 0.001

# Class names (must match folder names and order)
CLASS_NAMES = ['ampalaya_bilog_female', 'ampalaya_bilog_male', 
               'patola_female', 'patola_male', 
               'upo_smooth_female', 'upo_smooth_male',
               'not_flower']
NUM_CLASSES = len(CLASS_NAMES)

# Confidence threshold for "unknown" predictions
CONFIDENCE_THRESHOLD = 0.65  # 65% minimum confidence

print("\n" + "="*70)
print("MODEL CONFIGURATION")
print("="*70)
print(f"Image Size: {IMG_HEIGHT}x{IMG_WIDTH}")
print(f"Batch Size: {BATCH_SIZE}")
print(f"Max Epochs: {EPOCHS}")
print(f"Learning Rate: {LEARNING_RATE}")
print(f"Number of Classes: {NUM_CLASSES}")
print(f"Classes: {CLASS_NAMES}")
print(f"Confidence Threshold: {CONFIDENCE_THRESHOLD * 100}%")
print("="*70 + "\n")

# ============================================================================
# DATA AUGMENTATION AND PREPROCESSING
# ============================================================================

# Enhanced data augmentation
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=40,
    width_shift_range=0.3,
    height_shift_range=0.3,
    horizontal_flip=True,
    vertical_flip=True,
    zoom_range=0.3,
    shear_range=0.2,
    brightness_range=[0.7, 1.3],
    fill_mode='nearest',
    channel_shift_range=20
)

# Only rescaling for validation and test sets
val_test_datagen = ImageDataGenerator(rescale=1./255)

# Create data generators - CATEGORICAL for multi-class
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',  # ⭐ CHANGED: Multi-class classification
    classes=CLASS_NAMES,       # ⭐ Explicit class order
    shuffle=True,
    seed=42
)

validation_generator = val_test_datagen.flow_from_directory(
    VALIDATION_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',  # ⭐ CHANGED
    classes=CLASS_NAMES,
    shuffle=False
)

test_generator = val_test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='categorical',  # ⭐ CHANGED
    classes=CLASS_NAMES,
    shuffle=False
)

# Verify class indices
print("\nClass Indices (verify correct mapping):")
for class_name, idx in train_generator.class_indices.items():
    print(f"  {idx}: {class_name}")

print("\n" + "="*70)
print("DATA GENERATORS READY")
print("="*70)
print(f"Training samples:   {train_generator.samples}")
print(f"Validation samples: {validation_generator.samples}")
print(f"Test samples:       {test_generator.samples}")
print(f"Steps per epoch:    {train_generator.samples // BATCH_SIZE}")
print("="*70 + "\n")

# Calculate class weights for imbalanced datasets
from sklearn.utils.class_weight import compute_class_weight

class_weights_array = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(train_generator.classes),
    y=train_generator.classes
)
class_weights = dict(enumerate(class_weights_array))
print("Class Weights (for imbalanced data):")
for idx, weight in class_weights.items():
    print(f"  {CLASS_NAMES[idx]}: {weight:.3f}")

print("\n✓ Hyperparameters configured!")
print("✓ Data generators ready!")
print("✓ Ready to build model in next cell")
```

---

## 🏗️ CELL 5: Build & Compile Model

```python
# ============================================================================
# CELL 5: Build & Compile Model
# Purpose: Create the MobileNetV2 model for multi-class classification
# ============================================================================

def create_multiclass_model():
    """
    Create a transfer learning model for multi-class classification
    MobileNetV2 optimized for mobile deployment
    """
    
    # MobileNetV2: Lightweight, optimized for mobile devices
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_HEIGHT, IMG_WIDTH, 3),
        include_top=False,
        weights='imagenet'
    )
    print("✓ Using MobileNetV2 (Mobile-Optimized)")
    
    # Freeze base model layers initially
    base_model.trainable = False
    
    # Build complete model for MULTI-CLASS classification
    model = keras.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),
        layers.Dense(256, activation='relu'),  # ⭐ Increased for multi-class
        layers.Dropout(0.3),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.2),
        # ⭐⭐⭐ MULTI-CLASS OUTPUT with SOFTMAX
        layers.Dense(NUM_CLASSES, activation='softmax')
    ])
    
    return model, base_model

# Create model
model, base_model = create_multiclass_model()

# Display model architecture
model.summary()

# ============================================================================
# COMPILE MODEL FOR MULTI-CLASS
# ============================================================================

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',  # ⭐ CHANGED: Multi-class loss
    metrics=[
        'accuracy',
        keras.metrics.Precision(name='precision'),
        keras.metrics.Recall(name='recall'),
        keras.metrics.AUC(name='auc', multi_label=True)
    ]
)

print("✓ Model compiled for multi-class classification")

# ============================================================================
# CALLBACKS FOR TRAINING
# ============================================================================

checkpoint_dir = '/content/checkpoints'
os.makedirs(checkpoint_dir, exist_ok=True)

early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,
    restore_best_weights=True,
    verbose=1
)

model_checkpoint = ModelCheckpoint(
    filepath=f'{checkpoint_dir}/best_model.h5',
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,
    patience=7,
    min_lr=1e-7,
    verbose=1
)

callbacks = [early_stopping, model_checkpoint, reduce_lr]

print("✓ Training callbacks configured")
print("\n✓ Model is ready for training!")
```

---

## 🚂 CELL 6: Train Model - Phase 1 (Frozen Base)

```python
# ============================================================================
# CELL 6: Train Model - Phase 1 (Frozen Base)
# Purpose: Train with frozen base layers (transfer learning)
# Expected time: 15-30 minutes
# ============================================================================

print("PHASE 1: Training with frozen base model")
print("="*70 + "\n")

history_phase1 = model.fit(
    train_generator,
    epochs=25,
    validation_data=validation_generator,
    callbacks=callbacks,
    class_weight=class_weights,  # ⭐ Use class weights for balance
    verbose=1
)

print("\n✓ Phase 1 training complete!")
print("✓ Ready for Phase 2 fine-tuning in next cell")
```

---

## 🎯 CELL 7: Fine-tune Model - Phase 2 & Evaluate

```python
# ============================================================================
# CELL 7: Fine-tune Model - Phase 2 & Evaluate
# Purpose: Unfreeze some layers and fine-tune, then evaluate on test set
# Expected time: 20-60 minutes
# ============================================================================

print("PHASE 2: Fine-tuning with unfrozen layers")
print("="*70 + "\n")

# Unfreeze the last 30 layers of the base model
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

# Recompile with lower learning rate
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE / 10),
    loss='categorical_crossentropy',
    metrics=[
        'accuracy',
        keras.metrics.Precision(name='precision'),
        keras.metrics.Recall(name='recall'),
        keras.metrics.AUC(name='auc', multi_label=True)
    ]
)

print(f"Trainable layers: {len([l for l in model.layers[0].layers if l.trainable])}")

# Continue training
history_phase2 = model.fit(
    train_generator,
    epochs=EPOCHS,
    initial_epoch=len(history_phase1.history['accuracy']),
    validation_data=validation_generator,
    callbacks=callbacks,
    class_weight=class_weights,
    verbose=1
)

# ============================================================================
# EVALUATE ON TEST SET
# ============================================================================

print("\n" + "="*70)
print("EVALUATING ON TEST SET")
print("="*70 + "\n")

# Load best model
best_model = keras.models.load_model(f'{checkpoint_dir}/best_model.h5')

# Evaluate
test_results = best_model.evaluate(test_generator, verbose=1)
test_loss = test_results[0]
test_accuracy = test_results[1]
test_precision = test_results[2]
test_recall = test_results[3]
test_auc = test_results[4]

# Calculate F1 Score
f1_score = 2 * (test_precision * test_recall) / (test_precision + test_recall + 1e-7)

print("\n" + "="*70)
print("TEST SET RESULTS")
print("="*70)
print(f"Accuracy:  {test_accuracy*100:.2f}%")
print(f"Precision: {test_precision*100:.2f}%")
print(f"Recall:    {test_recall*100:.2f}%")
print(f"F1 Score:  {f1_score*100:.2f}%")
print(f"AUC:       {test_auc*100:.2f}%")
print("="*70)

# ============================================================================
# CONFUSION MATRIX
# ============================================================================

print("\nGenerating confusion matrix...")

# Get predictions
test_generator.reset()
predictions = best_model.predict(test_generator, verbose=1)
predicted_classes = np.argmax(predictions, axis=1)
true_classes = test_generator.classes

# Create confusion matrix
cm = confusion_matrix(true_classes, predicted_classes)

plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASS_NAMES,
            yticklabels=CLASS_NAMES)
plt.title('Confusion Matrix - Multi-Class Classification')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig('/content/confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.show()

# Classification report
print("\nClassification Report:")
print(classification_report(true_classes, predicted_classes, 
                           target_names=CLASS_NAMES))

print("\n✓ Phase 2 training and evaluation complete!")
```

---

## 📊 CELL 8: Visualize Training History

```python
# ============================================================================
# CELL 8: Visualize Training History
# ============================================================================

def plot_training_history():
    """Plot training metrics from both phases"""
    
    # Combine histories
    acc = history_phase1.history['accuracy'] + history_phase2.history['accuracy']
    val_acc = history_phase1.history['val_accuracy'] + history_phase2.history['val_accuracy']
    loss = history_phase1.history['loss'] + history_phase2.history['loss']
    val_loss = history_phase1.history['val_loss'] + history_phase2.history['val_loss']
    
    epochs_range = range(1, len(acc) + 1)
    phase1_end = len(history_phase1.history['accuracy'])
    
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Accuracy
    axes[0, 0].plot(epochs_range, acc, 'b-', label='Training')
    axes[0, 0].plot(epochs_range, val_acc, 'r-', label='Validation')
    axes[0, 0].axvline(x=phase1_end, color='g', linestyle='--', label='Fine-tuning Start')
    axes[0, 0].set_title('Model Accuracy')
    axes[0, 0].set_xlabel('Epoch')
    axes[0, 0].set_ylabel('Accuracy')
    axes[0, 0].legend()
    axes[0, 0].grid(True)
    
    # Loss
    axes[0, 1].plot(epochs_range, loss, 'b-', label='Training')
    axes[0, 1].plot(epochs_range, val_loss, 'r-', label='Validation')
    axes[0, 1].axvline(x=phase1_end, color='g', linestyle='--', label='Fine-tuning Start')
    axes[0, 1].set_title('Model Loss')
    axes[0, 1].set_xlabel('Epoch')
    axes[0, 1].set_ylabel('Loss')
    axes[0, 1].legend()
    axes[0, 1].grid(True)
    
    # Per-class accuracy from confusion matrix
    per_class_acc = cm.diagonal() / cm.sum(axis=1)
    axes[1, 0].bar(CLASS_NAMES, per_class_acc * 100, color=['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#95a5a6'])
    axes[1, 0].set_title('Per-Class Accuracy')
    axes[1, 0].set_ylabel('Accuracy (%)')
    axes[1, 0].set_xticklabels(CLASS_NAMES, rotation=45, ha='right')
    axes[1, 0].set_ylim(0, 100)
    for i, v in enumerate(per_class_acc * 100):
        axes[1, 0].text(i, v + 2, f'{v:.1f}%', ha='center', fontsize=9)
    
    # Final metrics summary
    metrics_names = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'AUC']
    metrics_values = [test_accuracy*100, test_precision*100, test_recall*100, f1_score*100, test_auc*100]
    colors = ['#2ecc71', '#3498db', '#9b59b6', '#e74c3c', '#f39c12']
    axes[1, 1].bar(metrics_names, metrics_values, color=colors)
    axes[1, 1].set_title('Final Test Metrics')
    axes[1, 1].set_ylabel('Percentage (%)')
    axes[1, 1].set_ylim(0, 100)
    for i, v in enumerate(metrics_values):
        axes[1, 1].text(i, v + 2, f'{v:.1f}%', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig('/content/training_history.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✓ Training history saved as 'training_history.png'")

plot_training_history()
```

---

## 💾 CELL 9: Export Models & Save to Google Drive

```python
# ============================================================================
# CELL 9: Export Models & Save to Google Drive
# Purpose: Convert to TFLite, create metadata, and save to Drive
# ============================================================================

print("CONVERTING MODEL TO TENSORFLOW LITE FORMAT")
print("="*70 + "\n")

# Load best model
best_model = keras.models.load_model(f'{checkpoint_dir}/best_model.h5')
print("✓ Best model loaded for conversion\n")

# Save full model
best_model.save('/content/gourd_classifier.h5')
print("✓ Saved full model: gourd_classifier.h5")

# ============================================================================
# CONVERT TO TENSORFLOW LITE WITH FLOAT16 QUANTIZATION
# ============================================================================

converter = tf.lite.TFLiteConverter.from_keras_model(best_model)

# Optimizations for mobile deployment
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]

# Convert
tflite_model = converter.convert()

# Save TFLite model
tflite_path = '/content/gourd_classifier.tflite'
with open(tflite_path, 'wb') as f:
    f.write(tflite_model)

print(f"✓ TensorFlow Lite model saved: {tflite_path}")
print(f"  Model size: {os.path.getsize(tflite_path) / (1024*1024):.2f} MB")

# ============================================================================
# CREATE MODEL METADATA FOR MOBILE APP
# ============================================================================

# Create comprehensive metadata
metadata = {
    "model_name": "Gourd Flower Multi-Class Classifier",
    "version": "2.0.0",
    "created_at": datetime.now().isoformat(),
    "model_type": "MobileNetV2",
    "classification_type": "multi-class",
    "input_shape": [IMG_HEIGHT, IMG_WIDTH, 3],
    "output_shape": [NUM_CLASSES],
    "classes": CLASS_NAMES,
    "class_labels": {
        "ampalaya_bilog_female": {"variety": "Ampalaya Bilog", "gender": "female", "isFlower": True},
        "ampalaya_bilog_male": {"variety": "Ampalaya Bilog", "gender": "male", "isFlower": True},
        "patola_female": {"variety": "Patola", "gender": "female", "isFlower": True},
        "patola_male": {"variety": "Patola", "gender": "male", "isFlower": True},
        "not_flower": {"variety": None, "gender": None, "isFlower": False}
    },
    "preprocessing": {
        "rescale": 1.0/255.0,
        "input_size": [IMG_HEIGHT, IMG_WIDTH]
    },
    "confidence_threshold": CONFIDENCE_THRESHOLD,
    "metrics": {
        "test_accuracy": float(test_accuracy),
        "test_precision": float(test_precision),
        "test_recall": float(test_recall),
        "test_f1_score": float(f1_score),
        "test_auc": float(test_auc)
    },
    "training_info": {
        "total_epochs": len(history_phase1.history['accuracy']) + len(history_phase2.history['accuracy']),
        "batch_size": BATCH_SIZE,
        "train_samples": train_generator.samples,
        "val_samples": validation_generator.samples,
        "test_samples": test_generator.samples,
        "num_classes": NUM_CLASSES
    }
}

# Save metadata
with open('/content/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("✓ Model metadata saved: model_metadata.json")

# ============================================================================
# SAVE TO GOOGLE DRIVE
# ============================================================================

print("\n" + "="*70)
print("SAVING FILES TO GOOGLE DRIVE")
print("="*70 + "\n")

MODEL_SAVE_PATH = '/content/drive/MyDrive/EGourd/Model_Versions'
base_version_name = f'MultiClass_Version_{datetime.now().strftime("%m-%d-%Y")}'

counter = 1
version_name = f'{base_version_name}_{counter}'
output_dir = f'{MODEL_SAVE_PATH}/{version_name}'

while os.path.exists(output_dir):
    counter += 1
    version_name = f'{base_version_name}_{counter}'
    output_dir = f'{MODEL_SAVE_PATH}/{version_name}'

os.makedirs(output_dir, exist_ok=True)
print(f"Saving to: {output_dir}")
print(f"Version: {version_name}")

# Copy files
files_to_save = [
    ('/content/gourd_classifier.h5', 'Full Keras Model'),
    ('/content/gourd_classifier.tflite', 'TensorFlow Lite Model ⭐⭐⭐'),
    ('/content/model_metadata.json', 'Model Metadata ⭐⭐⭐'),
    ('/content/training_history.png', 'Training History'),
    ('/content/confusion_matrix.png', 'Confusion Matrix'),
    ('/content/sample_images.png', 'Sample Images'),
    (f'{checkpoint_dir}/best_model.h5', 'Best Model Checkpoint')
]

for source_path, description in files_to_save:
    if os.path.exists(source_path):
        filename = os.path.basename(source_path)
        dest_path = f'{output_dir}/{filename}'
        shutil.copy(source_path, dest_path)
        size_mb = os.path.getsize(source_path) / (1024*1024)
        print(f"✓ {description:35} → {filename:30} ({size_mb:.2f} MB)")

# ============================================================================
# SUMMARY
# ============================================================================

print("\n" + "="*70)
print("TRAINING COMPLETE - SUMMARY")
print("="*70 + "\n")

print("📊 Model Performance:")
print(f"   • Accuracy: {test_accuracy*100:.2f}%")
print(f"   • Precision: {test_precision*100:.2f}%")
print(f"   • Recall: {test_recall*100:.2f}%")
print(f"   • F1 Score: {f1_score*100:.2f}%")

print(f"\n📦 Classes Supported ({NUM_CLASSES}):")
for i, class_name in enumerate(CLASS_NAMES):
    print(f"   {i}: {class_name}")

print(f"\n📁 Files saved to: MyDrive/EGourd/Model_Versions/{version_name}/")

print("\n📱 For Expo Mobile App:")
print("   1. Download gourd_classifier.tflite")
print("   2. Download model_metadata.json")
print("   3. Place in: frontend/mobile-app/assets/models/")
print("   4. Rename to: gourd_classifier.tflite")
print("   5. Update modelService.js to use new model")

print("\n✅ Multi-class model training complete!")
```

---

## 🎯 Quick Tips

### Adding New Gourd Varieties
1. Create new folders: `{variety}_female/` and `{variety}_male/`
2. Add 400+ images per folder
3. Update `CLASS_FOLDERS` in Cell 2
4. Update `CLASS_NAMES` in Cell 4
5. Retrain the model

### Improving Not-Flower Detection
Include diverse images in `not_flower/`:
- Gourd leaves (close-up, various angles)
- Stems and vines
- Fruits at different stages
- Soil, background, sky
- Hands, tools, other objects
- Blurry/partial flower shots

### Model Performance Tips
- Ensure balanced classes (similar image counts)
- Use class weights if imbalanced
- More diverse images = better generalization
- Test on different phones/lighting conditions

---

**Created**: December 2024  
**Version**: 3.0.0 (Multi-Class)  
**Compatible with**: TensorFlow 2.15.x, Expo SDK 48+, React Native
