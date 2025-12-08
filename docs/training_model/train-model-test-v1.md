# Ampalaya Gourd Classification Model Training Guide

This guide provides step-by-step instructions for training a machine learning model to classify male and female ampalaya (bitter gourd) flowers using Google Colab.

## What is Google Colab?

Google Colab (Colaboratory) is a free cloud-based Jupyter notebook environment that runs on Google's servers. Key features:
- **Free GPU/TPU access** - Great for training machine learning models
- **No setup required** - Pre-installed ML libraries (TensorFlow, PyTorch, etc.)
- **Cloud storage integration** - Works with Google Drive
- **Collaborative** - Share and work together like Google Docs
- **12-24 hour runtime** - Free tier provides decent compute time

## Dataset Information

- **Female Ampalaya Dataset**: 507 images in `ampalayabilog female` folder
- **Male Ampalaya Dataset**: 496 images in `ampalayabilog male` folder
- **Total Images**: 1,003 images (~1.3 GB per class)
- **Purpose**: Binary classification (Male vs Female flowers)
- **Location**: `MyDrive/EGourd/Senior_Datasets/`

## Training Code for Google Colab

Below is the complete code to train your model. The code is organized into **9 cells** for easy execution and modification in Google Colab.

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

**Total Runtime: ~35-90 minutes**

---

## 📦 CELL 1: Setup & Installation

```python
# ============================================================================
# CELL 1: Setup & Installation
# Purpose: Install required packages, import libraries, and verify GPU availability
# Instructions: Run this cell first. Wait for all packages to install.
# ============================================================================

# ============================================================================
# AMPALAYA GOURD CLASSIFICATION MODEL TRAINING
# Binary Classification: Male vs Female Flowers
# Compatible with Expo React Native Mobile App
# ============================================================================

# 1. INSTALL AND IMPORT REQUIRED LIBRARIES
# ============================================================================

# Install additional packages if needed
!pip install -q tensorflow-hub
!pip install -q pillow
!pip install -q scikit-learn  # ⭐ For confusion matrix

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns  # ⭐ For confusion matrix visualization
import os
import json
from google.colab import drive
from datetime import datetime
import zipfile
import shutil

# Check TensorFlow version and GPU availability
print(f"TensorFlow Version: {tf.__version__}")
print(f"GPU Available: {tf.config.list_physical_devices('GPU')}")
print(f"Built with CUDA: {tf.test.is_built_with_cuda()}")

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

# 2. MOUNT GOOGLE DRIVE AND VERIFY DATASET PATHS
# ============================================================================
# Mount Google Drive to access datasets
drive.mount('/content/drive')

# Define paths - Update these to match your Google Drive structure
DRIVE_BASE_PATH = '/content/drive/MyDrive/EGourd/Senior_Datasets'
FEMALE_DATASET_DIR = f'{DRIVE_BASE_PATH}/ampalayabilog female'  # 507 images
MALE_DATASET_DIR = f'{DRIVE_BASE_PATH}/ampalayabilog male'      # 496 images

# Local paths for organized data
LOCAL_DATA_PATH = '/content/ampalaya_data'
TRAIN_DIR = f'{LOCAL_DATA_PATH}/train'
VALIDATION_DIR = f'{LOCAL_DATA_PATH}/validation'
TEST_DIR = f'{LOCAL_DATA_PATH}/test'

# Verify dataset paths
print(f"Checking dataset paths...")
if os.path.exists(FEMALE_DATASET_DIR):
    female_count = len([f for f in os.listdir(FEMALE_DATASET_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    print(f"✓ Female dataset found: {female_count} images")
else:
    print(f"⚠️ Female dataset not found at {FEMALE_DATASET_DIR}")

if os.path.exists(MALE_DATASET_DIR):
    male_count = len([f for f in os.listdir(MALE_DATASET_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
    print(f"✓ Male dataset found: {male_count} images")
else:
    print(f"⚠️ Male dataset not found at {MALE_DATASET_DIR}")

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

# 3. DATASET ORGANIZATION AND SPLITTING
# ============================================================================

def extract_and_organize_dataset():
    """
    Organize images from Google Drive folders into train/validation/test splits
    Recommended split: 70% train, 15% validation, 15% test
    Total images: ~1003 (507 female + 496 male)
    """
    
    # ⭐ CHECK IF ALREADY ORGANIZED (prevents re-splitting)
    if os.path.exists(f'{LOCAL_DATA_PATH}/train/female') and \
       len(os.listdir(f'{LOCAL_DATA_PATH}/train/female')) > 0:
        print("⚠️  Dataset already organized! Skipping to avoid re-splitting.")
        print("   Delete /content/ampalaya_data/ if you want to re-organize.\n")
        
        # Show existing split counts
        for split in ['train', 'validation', 'test']:
            f_count = len(os.listdir(f'{LOCAL_DATA_PATH}/{split}/female'))
            m_count = len(os.listdir(f'{LOCAL_DATA_PATH}/{split}/male'))
            print(f"   {split.capitalize()}: {f_count + m_count} images ({f_count} female, {m_count} male)")
        return
    
    print("Creating directory structure...")
    
    # Create directories
    for split in ['train', 'validation', 'test']:
        for class_name in ['female', 'male']:
            os.makedirs(f'{LOCAL_DATA_PATH}/{split}/{class_name}', exist_ok=True)
    
    print("Organizing datasets...")
    
    # Set random seed for reproducibility
    np.random.seed(42)
    
    def split_and_copy_files(source_dir, class_name):
        """Split files from source directory into train/val/test"""
        # Get all image files
        files = []
        for filename in os.listdir(source_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                files.append(os.path.join(source_dir, filename))
        
        # Shuffle files for random split
        np.random.shuffle(files)
        
        # Calculate split indices
        total = len(files)
        train_idx = int(0.70 * total)  # 70% for training
        val_idx = int(0.85 * total)     # 15% for validation
        # Remaining 15% for test
        
        # Split files
        train_files = files[:train_idx]
        val_files = files[train_idx:val_idx]
        test_files = files[val_idx:]
        
        # Copy files to respective directories with progress
        splits = [
            (train_files, 'train'),
            (val_files, 'validation'),
            (test_files, 'test')
        ]
        
        for file_list, split in splits:
            for i, file_path in enumerate(file_list):
                # Preserve original extension
                ext = os.path.splitext(file_path)[1]
                dest = f'{LOCAL_DATA_PATH}/{split}/{class_name}/{class_name}_{i}{ext}'
                shutil.copy(file_path, dest)
        
        print(f"✓ {class_name.capitalize()}: {len(train_files)} train, {len(val_files)} val, {len(test_files)} test (Total: {total})")
        return len(train_files), len(val_files), len(test_files)
    
    # Process both classes
    if os.path.exists(FEMALE_DATASET_DIR):
        f_train, f_val, f_test = split_and_copy_files(FEMALE_DATASET_DIR, 'female')
    else:
        print("⚠️ Female dataset directory not found!")
        f_train = f_val = f_test = 0
    
    if os.path.exists(MALE_DATASET_DIR):
        m_train, m_val, m_test = split_and_copy_files(MALE_DATASET_DIR, 'male')
    else:
        print("⚠️ Male dataset directory not found!")
        m_train = m_val = m_test = 0
    
    # Summary
    print("\n" + "="*70)
    print("DATASET ORGANIZATION SUMMARY")
    print("="*70)
    print(f"Training set:   {f_train + m_train} images ({f_train} female, {m_train} male)")
    print(f"Validation set: {f_val + m_val} images ({f_val} female, {m_val} male)")
    print(f"Test set:       {f_test + m_test} images ({f_test} female, {m_test} male)")
    print(f"Total:          {f_train + m_train + f_val + m_val + f_test + m_test} images")
    print("="*70 + "\n")
    
    print("✓ Dataset organization complete!")

# Run dataset extraction and organization
extract_and_organize_dataset()

# ============================================================================
# 3.5 VISUALIZE SAMPLE IMAGES (Optional but Recommended)
# ============================================================================

# Define class names for visualization
CLASS_NAMES = ['female', 'male']

def visualize_samples():
    """Display sample images from training set to verify data quality"""
    print("Displaying sample images from training set...\n")
    
    plt.figure(figsize=(15, 8))
    
    # Get sample images from each class
    for idx, class_name in enumerate(CLASS_NAMES):
        class_dir = f'{TRAIN_DIR}/{class_name}'
        images = [f for f in os.listdir(class_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))][:8]
        
        for i, img_name in enumerate(images):
            img_path = os.path.join(class_dir, img_name)
            img = plt.imread(img_path)
            
            plt.subplot(4, 4, idx * 8 + i + 1)
            plt.imshow(img)
            plt.title(f'{class_name.capitalize()}', fontsize=10)
            plt.axis('off')
    
    plt.tight_layout()
    plt.savefig('/content/sample_images.png', dpi=150, bbox_inches='tight')
    plt.show()
    print("✓ Sample visualization saved as 'sample_images.png'\n")

# Visualize samples (comment out if you want to skip)
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
#   4. You can rerun this cell to change settings
# ============================================================================

# 4. HYPERPARAMETER CONFIGURATION
# ============================================================================
IMG_HEIGHT = 224  # Standard size for most pre-trained models
IMG_WIDTH = 224
BATCH_SIZE = 16   # Optimized for ~1000 images dataset (reduced from 32)
EPOCHS = 100      # Maximum epochs (early stopping will prevent overfitting)
LEARNING_RATE = 0.001

# Class names
CLASS_NAMES = ['female', 'male']
NUM_CLASSES = len(CLASS_NAMES)

print("\n" + "="*70)
print("MODEL CONFIGURATION")
print("="*70)
print(f"Image Size: {IMG_HEIGHT}x{IMG_WIDTH}")
print(f"Batch Size: {BATCH_SIZE}")
print(f"Max Epochs: {EPOCHS}")
print(f"Learning Rate: {LEARNING_RATE}")
print(f"Classes: {CLASS_NAMES}")
print("="*70 + "\n")

# ============================================================================
# 5. DATA AUGMENTATION AND PREPROCESSING
# ============================================================================

# Enhanced data augmentation for small dataset (helps prevent overfitting)
train_datagen = ImageDataGenerator(
    rescale=1./255,              # Normalize pixel values to [0,1]
    rotation_range=40,           # Randomly rotate images by up to 40 degrees
    width_shift_range=0.3,       # Randomly shift images horizontally
    height_shift_range=0.3,      # Randomly shift images vertically
    horizontal_flip=True,        # Randomly flip images horizontally
    vertical_flip=True,          # Randomly flip images vertically
    zoom_range=0.3,              # Randomly zoom in/out
    shear_range=0.2,             # Shear transformation
    brightness_range=[0.7, 1.3], # Adjust brightness (wider range)
    fill_mode='nearest',         # Fill pixels after transformation
    channel_shift_range=20       # Random channel shifts for color variation
)

# Only rescaling for validation and test sets (no augmentation)
val_test_datagen = ImageDataGenerator(rescale=1./255)

# Create data generators
train_generator = train_datagen.flow_from_directory(
    TRAIN_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary',  # Binary classification
    shuffle=True,
    seed=42  # For reproducibility
)

validation_generator = val_test_datagen.flow_from_directory(
    VALIDATION_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=False
)

test_generator = val_test_datagen.flow_from_directory(
    TEST_DIR,
    target_size=(IMG_HEIGHT, IMG_WIDTH),
    batch_size=BATCH_SIZE,
    class_mode='binary',
    shuffle=False
)

print("\n" + "="*70)
print("DATA GENERATORS READY")
print("="*70)
print(f"Training samples:   {train_generator.samples}")
print(f"Validation samples: {validation_generator.samples}")
print(f"Test samples:       {test_generator.samples}")
print(f"Steps per epoch:    {train_generator.samples // BATCH_SIZE}")
print("="*70 + "\n")

print("✓ Hyperparameters configured!")
print("✓ Data generators ready!")
print("✓ Ready to build model in next cell")
```

---

## 🏗️ CELL 5: Build & Compile Model

```python
# ============================================================================
# CELL 5: Build & Compile Model
# Purpose: Create the MobileNetV2 model architecture and set up training callbacks
# Instructions:
#   1. Run this cell to build the model
#   2. Review the model summary
#   3. Note the number of trainable parameters
#   4. You can rerun this to rebuild the model
# ============================================================================

# 6. MODEL ARCHITECTURE
# ============================================================================

def create_model(model_type='mobilenet'):
    """
    Create a transfer learning model
    MobileNetV2 is recommended for mobile deployment (Expo app)
    """
    
    if model_type == 'mobilenet':
        # MobileNetV2: Lightweight, optimized for mobile devices
        base_model = tf.keras.applications.MobileNetV2(
            input_shape=(IMG_HEIGHT, IMG_WIDTH, 3),
            include_top=False,  # Remove classification layer
            weights='imagenet'  # Use pre-trained weights
        )
        print("Using MobileNetV2 (Mobile-Optimized)")
        
    elif model_type == 'efficientnet':
        # EfficientNetB0: Good balance of accuracy and speed
        base_model = tf.keras.applications.EfficientNetB0(
            input_shape=(IMG_HEIGHT, IMG_WIDTH, 3),
            include_top=False,
            weights='imagenet'
        )
        print("Using EfficientNetB0")
    
    elif model_type == 'resnet':
        # ResNet50: Higher accuracy, heavier model
        base_model = tf.keras.applications.ResNet50(
            input_shape=(IMG_HEIGHT, IMG_WIDTH, 3),
            include_top=False,
            weights='imagenet'
        )
        print("Using ResNet50")
    
    # Freeze base model layers initially
    base_model.trainable = False
    
    # Build complete model
    model = keras.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),  # Dropout for regularization
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(1, activation='sigmoid')  # Binary classification
    ])
    
    return model, base_model

# Create model (use 'mobilenet' for best mobile compatibility)
model, base_model = create_model('mobilenet')

# Display model architecture
model.summary()

# ============================================================================
# 7. COMPILE MODEL
# ============================================================================

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
    loss='binary_crossentropy',
    metrics=[
        'accuracy',
        keras.metrics.Precision(name='precision'),
        keras.metrics.Recall(name='recall'),
        keras.metrics.AUC(name='auc')
    ]
)

print("✓ Model compiled successfully")

# ============================================================================
# 8. CALLBACKS FOR TRAINING
# ============================================================================

# Create checkpoint directory
checkpoint_dir = '/content/checkpoints'
os.makedirs(checkpoint_dir, exist_ok=True)

# Early stopping: Stop if validation loss doesn't improve
early_stopping = EarlyStopping(
    monitor='val_loss',
    patience=15,  # Increased patience for small dataset
    restore_best_weights=True,
    verbose=1
)

# Model checkpoint: Save best model
model_checkpoint = ModelCheckpoint(
    filepath=f'{checkpoint_dir}/best_model.h5',
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

# Reduce learning rate when plateau
reduce_lr = ReduceLROnPlateau(
    monitor='val_loss',
    factor=0.5,  # Reduce LR by half
    patience=7,   # Increased patience
    min_lr=1e-7,
    verbose=1
)

callbacks = [early_stopping, model_checkpoint, reduce_lr]

print("✓ Training callbacks configured")
print("\n✓ Model is ready for training!")
print("✓ Proceed to next cell to start Phase 1 training")
```

---

## 🚂 CELL 6: Train Model - Phase 1 (Frozen Base)

```python
# ============================================================================
# CELL 6: Train Model - Phase 1 (Frozen Base)
# Purpose: Train the model with frozen base layers (transfer learning)
# Instructions:
#   1. Run this cell to start training
#   2. This will train for up to 20 epochs
#   3. Watch the accuracy and loss metrics
#   4. Expected time: 15-30 minutes
#   5. Training will auto-save checkpoints
# ============================================================================

# 9. TRAINING PHASE 1 - FROZEN BASE MODEL
# ============================================================================
print("PHASE 1: Training with frozen base model")
print("="*70 + "\n")

history_phase1 = model.fit(
    train_generator,
    epochs=20,  # Initial training with frozen base
    validation_data=validation_generator,
    callbacks=callbacks,
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
# Purpose: Unfreeze layers and fine-tune the model, then evaluate on test set
# Instructions:
#   1. Run this cell after Phase 1 completes
#   2. This unfreezes some layers for fine-tuning
#   3. Training continues with lower learning rate
#   4. Expected time: 20-60 minutes
#   5. Evaluation runs automatically at the end
# ============================================================================

# 10. TRAINING PHASE 2 - FINE-TUNING
# ============================================================================
print("PHASE 2: Fine-tuning with unfrozen layers")
print("="*70 + "\n")

# Unfreeze the base model
base_model.trainable = True

# Freeze first layers, fine-tune last layers
fine_tune_at = len(base_model.layers) - 30  # Unfreeze last 30 layers

for layer in base_model.layers[:fine_tune_at]:
    layer.trainable = False

# Recompile with lower learning rate for fine-tuning
model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE/10),  # Lower LR
    loss='binary_crossentropy',
    metrics=['accuracy', 
             keras.metrics.Precision(name='precision'),
             keras.metrics.Recall(name='recall'),
             keras.metrics.AUC(name='auc')]
)

# Continue training
history_phase2 = model.fit(
    train_generator,
    epochs=EPOCHS,
    initial_epoch=history_phase1.epoch[-1],
    validation_data=validation_generator,
    callbacks=callbacks,
    verbose=1
)

print("\n✓ Training complete!")

# ============================================================================
# 11. EVALUATE MODEL ON TEST SET
# ============================================================================

print("\n" + "="*70)
print("EVALUATING MODEL ON TEST SET")
print("="*70 + "\n")

# ⭐ LOAD BEST MODEL FROM CHECKPOINT (not the last epoch model)
print("Loading best model from checkpoint...")
best_model = keras.models.load_model(f'{checkpoint_dir}/best_model.h5')
print("✓ Best model loaded\n")

# Evaluate on test set using the BEST model
test_loss, test_accuracy, test_precision, test_recall, test_auc = best_model.evaluate(
    test_generator,
    verbose=1
)

print(f"\nTest Results:")
print(f"  Loss: {test_loss:.4f}")
print(f"  Accuracy: {test_accuracy:.4f}")
print(f"  Precision: {test_precision:.4f}")
print(f"  Recall: {test_recall:.4f}")
print(f"  AUC: {test_auc:.4f}")

# Calculate F1 Score
f1_score = 2 * (test_precision * test_recall) / (test_precision + test_recall)
print(f"  F1 Score: {f1_score:.4f}")

# ⭐ GENERATE CONFUSION MATRIX
print("\n📊 Generating confusion matrix...")
from sklearn.metrics import confusion_matrix, classification_report
import seaborn as sns

# Get predictions
test_generator.reset()
y_true = test_generator.classes
y_pred_probs = best_model.predict(test_generator, verbose=0)
y_pred = (y_pred_probs > 0.5).astype(int).flatten()

# Confusion matrix
cm = confusion_matrix(y_true, y_pred)
print("\nConfusion Matrix:")
print(f"                Predicted")
print(f"                Female  Male")
print(f"Actual Female   {cm[0][0]:4d}    {cm[0][1]:4d}")
print(f"Actual Male     {cm[1][0]:4d}    {cm[1][1]:4d}")

# Plot confusion matrix
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
            xticklabels=['Female', 'Male'], 
            yticklabels=['Female', 'Male'])
plt.title('Confusion Matrix')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.savefig('/content/confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.show()
print("✓ Confusion matrix saved as 'confusion_matrix.png'")

print("\n✓ Evaluation complete!")
print("✓ Ready to visualize results in next cell")
```

---

## 📊 CELL 8: Visualize Results & Test Predictions

```python
# ============================================================================
# CELL 8: Visualize Results & Test Predictions
# Purpose: Plot training history and test the model on sample images
# Instructions:
#   1. Run this cell to see training curves
#   2. Review accuracy and loss plots
#   3. Check sample predictions
#   4. You can rerun this anytime after training
# ============================================================================

# 12. VISUALIZE TRAINING HISTORY
# ============================================================================

def plot_training_history(history1, history2):
    """Plot training and validation metrics"""
    
    # Combine histories
    acc = history1.history['accuracy'] + history2.history['accuracy']
    val_acc = history1.history['val_accuracy'] + history2.history['val_accuracy']
    loss = history1.history['loss'] + history2.history['loss']
    val_loss = history1.history['val_loss'] + history2.history['val_loss']
    
    epochs_range = range(len(acc))
    
    plt.figure(figsize=(15, 5))
    
    # Accuracy plot
    plt.subplot(1, 3, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.axvline(x=len(history1.history['accuracy']), color='r', 
                linestyle='--', label='Fine-tuning Start')
    plt.legend(loc='lower right')
    plt.title('Training and Validation Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    
    # Loss plot
    plt.subplot(1, 3, 2)
    plt.plot(epochs_range, loss, label='Training Loss')
    plt.plot(epochs_range, val_loss, label='Validation Loss')
    plt.axvline(x=len(history1.history['loss']), color='r', 
                linestyle='--', label='Fine-tuning Start')
    plt.legend(loc='upper right')
    plt.title('Training and Validation Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    
    # Additional metrics
    if 'precision' in history2.history:
        precision = history2.history['precision']
        recall = history2.history['recall']
        
        plt.subplot(1, 3, 3)
        plt.plot(range(len(precision)), precision, label='Precision')
        plt.plot(range(len(recall)), recall, label='Recall')
        plt.legend(loc='lower right')
        plt.title('Precision and Recall')
        plt.xlabel('Epoch (Phase 2)')
        plt.ylabel('Score')
    
    plt.tight_layout()
    plt.savefig('/content/training_history.png', dpi=300, bbox_inches='tight')
    plt.show()

plot_training_history(history_phase1, history_phase2)

# ============================================================================
# 15. TEST MODEL INFERENCE
# ============================================================================

print("\n" + "="*70)
print("TESTING MODEL INFERENCE")
print("="*70 + "\n")

def predict_image(model, image_path):
    """Test prediction on a single image"""
    # Load and preprocess image
    img = keras.preprocessing.image.load_img(
        image_path, 
        target_size=(IMG_HEIGHT, IMG_WIDTH)
    )
    img_array = keras.preprocessing.image.img_to_array(img)
    img_array = tf.expand_dims(img_array, 0)  # Create batch
    img_array = img_array / 255.0  # Normalize
    
    # Predict
    prediction = model.predict(img_array, verbose=0)
    score = prediction[0][0]
    
    # Interpret result
    if score > 0.5:
        class_name = CLASS_NAMES[1]  # male
        confidence = score * 100
    else:
        class_name = CLASS_NAMES[0]  # female
        confidence = (1 - score) * 100
    
    return class_name, confidence

# Test on a few random test images
test_images = []
for class_name in CLASS_NAMES:
    class_dir = f'{TEST_DIR}/{class_name}'
    images = os.listdir(class_dir)[:3]  # Get first 3 images
    test_images.extend([f'{class_dir}/{img}' for img in images])

print("Sample predictions:")
for img_path in test_images:
    true_class = img_path.split('/')[-2]
    pred_class, confidence = predict_image(best_model, img_path)  # ⭐ Use best_model
    emoji = "✓" if pred_class == true_class else "✗"
    print(f"{emoji} True: {true_class:6} | Predicted: {pred_class:6} ({confidence:.1f}%)")

print("\n✓ Visualization and testing complete!")
print("✓ Ready to export models in next cell")
```

---

## 💾 CELL 9: Export Models & Save to Google Drive

```python
# ============================================================================
# CELL 9: Export Models & Save to Google Drive
# Purpose: Convert model to TensorFlow Lite format and save all files to Google Drive
# Instructions:
#   1. Run this cell to export the trained model
#   2. Model will be converted to .tflite format
#   3. All files saved to Google Drive automatically
#   4. Download the .tflite file for your Expo app
#   5. You can rerun this cell anytime
# ============================================================================

# 13. MODEL EXPORT AND CONVERSION
# ============================================================================
print("CONVERTING MODEL TO TENSORFLOW LITE FORMAT")
print("="*70 + "\n")

# ⭐ USE BEST MODEL FROM CHECKPOINT (not the current model variable)
print("Loading best model for export...")
best_model = keras.models.load_model(f'{checkpoint_dir}/best_model.h5')
print("✓ Best model loaded for conversion\n")

# Save full model first
best_model.save('/content/ampalaya_classifier.h5')
print("✓ Saved full model: ampalaya_classifier.h5")

# Convert to TensorFlow Lite (optimized for mobile)
converter = tf.lite.TFLiteConverter.from_keras_model(best_model)  # ⭐ Use best_model

# Optimizations for mobile deployment
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_types = [tf.float16]  # Use float16 for smaller size

# Convert
tflite_model = converter.convert()

# Save TFLite model
tflite_path = '/content/ampalaya_classifier.tflite'
with open(tflite_path, 'wb') as f:
    f.write(tflite_model)

print(f"✓ TensorFlow Lite model saved: {tflite_path}")
print(f"  Model size: {os.path.getsize(tflite_path) / (1024*1024):.2f} MB")

# ============================================================================
# 14. CREATE MODEL METADATA FOR MOBILE APP
# ============================================================================

# Create metadata file with model information
metadata = {
    "model_name": "Ampalaya Flower Classifier",
    "version": "1.0.0",
    "created_at": datetime.now().isoformat(),
    "model_type": "MobileNetV2",
    "input_shape": [IMG_HEIGHT, IMG_WIDTH, 3],
    "classes": CLASS_NAMES,
    "preprocessing": {
        "rescale": 1.0/255.0,
        "input_size": [IMG_HEIGHT, IMG_WIDTH]
    },
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
        "test_samples": test_generator.samples
    }
}

# Save metadata
with open('/content/model_metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("✓ Model metadata saved: model_metadata.json")

# ============================================================================
# 16. SAVE ALL FILES TO GOOGLE DRIVE
# ============================================================================

print("\n" + "="*70)
print("SAVING FILES TO GOOGLE DRIVE")
print("="*70 + "\n")

# Create output directory in Google Drive - Save to Model_Versions
MODEL_SAVE_PATH = '/content/drive/MyDrive/EGourd/Model_Versions'
base_version_name = f'Version_{datetime.now().strftime("%m-%d-%Y")}'

# Always use incremental numbers starting from 1
counter = 1
version_name = f'{base_version_name}_{counter}'
output_dir = f'{MODEL_SAVE_PATH}/{version_name}'

# Find next available number
while os.path.exists(output_dir):
    counter += 1
    version_name = f'{base_version_name}_{counter}'
    output_dir = f'{MODEL_SAVE_PATH}/{version_name}'

os.makedirs(output_dir, exist_ok=True)
print(f"Saving to: {output_dir}")
print(f"Version: {version_name}")

# Copy files to Google Drive
files_to_save = [
    ('/content/ampalaya_classifier.h5', 'Full Keras Model', '⭐⭐ Backup/Retraining'),
    ('/content/ampalaya_classifier.tflite', 'TensorFlow Lite Model', '⭐⭐⭐ FOR EXPO APP'),
    ('/content/model_metadata.json', 'Model Metadata', '⭐⭐⭐ FOR EXPO APP'),
    ('/content/training_history.png', 'Training History Plot', '⭐ Documentation'),
    ('/content/confusion_matrix.png', 'Confusion Matrix', '⭐⭐ Documentation'),  # ⭐ Added
    ('/content/sample_images.png', 'Sample Images', '⭐ Documentation'),
    (f'{checkpoint_dir}/best_model.h5', 'Best Model Checkpoint', '⭐ Backup')
]

print("\nFile Purposes:")
print("⭐⭐⭐ = Essential for Expo app")
print("⭐⭐   = Good to keep for future training")
print("⭐     = Optional documentation\n")

for source_path, description, priority in files_to_save:
    if os.path.exists(source_path):
        filename = os.path.basename(source_path)
        dest_path = f'{output_dir}/{filename}'
        shutil.copy(source_path, dest_path)
        size_mb = os.path.getsize(source_path) / (1024*1024)
        print(f"✓ Saved: {description:30} → {filename:30} ({size_mb:.2f} MB) {priority}")
    else:
        print(f"⚠ Skipped: {description} (not found)")

print(f"\n✓ All files saved to: {output_dir}")

# ============================================================================
# 17. SUMMARY AND NEXT STEPS
# ============================================================================

print("\n" + "="*70)
print("TRAINING COMPLETE - SUMMARY")
print("="*70 + "\n")

print("📊 Model Performance:")
print(f"   • Accuracy: {test_accuracy*100:.2f}%")
print(f"   • Precision: {test_precision*100:.2f}%")
print(f"   • Recall: {test_recall*100:.2f}%")
print(f"   • F1 Score: {f1_score*100:.2f}%")

print("\n📦 Generated Files:")
print("   • ampalaya_classifier.h5 (Full Keras model) - Backup/Retraining")
print("   • ampalaya_classifier.tflite (Mobile-optimized model) ⭐ FOR EXPO")
print("   • model_metadata.json (Model configuration) ⭐ FOR EXPO")
print("   • training_history.png (Training visualization) - Documentation")
print("   • sample_images.png (Dataset preview) - Documentation")

print(f"\n📁 Location in Google Drive:")
print(f"   MyDrive/EGourd/Model_Versions/{version_name}/")

print("\n📱 Next Steps for Expo Mobile Integration:")
print("   1. Go to your Google Drive")
print("   2. Navigate to: EGourd/Model_Versions/")
print("   3. Open the latest version folder (Version_MM-DD-YYYY)")
print("   4. Download 'ampalaya_classifier.tflite' (⭐ THIS FILE)")
print("   5. Download 'model_metadata.json' (⭐ THIS FILE)")
print("   6. Place them in your Expo app's assets folder")
print("\n   💡 Note: You only need .tflite and .json for the mobile app!")
print("   💡 Other files (.h5, .png) are for backup and documentation")

print("\n🚀 To use in your mobile app:")
print("   - Install: npm install @tensorflow/tfjs @tensorflow/tfjs-react-native")
print("   - Install: expo install expo-gl expo-camera expo-image-picker")
print("   - Load the .tflite model")
print("   - Preprocess images to 224x224 pixels")
print("   - Normalize pixel values to [0, 1]")
print("   - Threshold at 0.5: >0.5 = Male, <0.5 = Female")

print("\n" + "="*70)
print("🎉 ALL DONE! Your model is ready for deployment!")
print("="*70)
```

---

## 🎯 Quick Tips for Using These Cells

### Modifying Hyperparameters
Want to change batch size or learning rate? Just edit **Cell 4** and rerun from there.

### Retraining the Model
If you want to train again with different settings:
1. Modify hyperparameters in Cell 4
2. Rerun Cell 5 (rebuild model)
3. Rerun Cells 6 & 7 (train again)

### Testing Without Training
Already trained? Just run:
- Cell 1 (setup)
- Cell 2 (mount drive)
- Cell 8 (visualize - if you have saved model)
- Cell 9 (export)

### If Training Disconnects
Don't worry! The best model is saved. Just:
1. Reconnect to Colab
2. Rerun Cells 1-2 (setup & mount)
3. Skip to Cell 9 (export saved model)

### Memory Issues
If you get "Out of Memory" errors:
- Go to Cell 4
- Change `BATCH_SIZE = 16` to `BATCH_SIZE = 8`
- Rerun from Cell 4 onwards

---

## ⏱️ Expected Timing per Cell

```
Cell 1: [====                    ] 30 seconds
Cell 2: [==                      ] 10 seconds  
Cell 3: [==================      ] 2-5 minutes
Cell 4: [==                      ] 10 seconds
Cell 5: [=                       ] 5 seconds
Cell 6: [======================  ] 15-30 minutes
Cell 7: [========================] 20-60 minutes
Cell 8: [==                      ] 30 seconds
Cell 9: [=====                   ] 1-2 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:  35-90 minutes (depending on early stopping)
```
```

## Integration with Expo Mobile App

After training, here's how to use the model in your Expo app:

### 1. Install Required Packages

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
expo install expo-gl expo-camera expo-image-picker
```

### 2. Example React Native Integration

```javascript
// Example: Using the trained model in your Expo app
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as ImagePicker from 'expo-image-picker';

// Load the model
const loadModel = async () => {
  await tf.ready();
  const model = await tf.loadLayersModel(
    bundleResourceIO(require('./assets/model.json'))
  );
  return model;
};

// Predict function
const classifyImage = async (imageUri, model) => {
  // Load and preprocess image
  const response = await fetch(imageUri);
  const imageBlob = await response.blob();
  const imageTensor = await tf.browser.fromPixels(imageBlob);
  
  // Resize to 224x224
  const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
  
  // Normalize to [0, 1]
  const normalized = resized.div(255.0);
  
  // Add batch dimension
  const batched = normalized.expandDims(0);
  
  // Predict
  const prediction = await model.predict(batched);
  const score = await prediction.data();
  
  // Interpret result
  const isMale = score[0] > 0.5;
  const confidence = isMale ? score[0] * 100 : (1 - score[0]) * 100;
  
  return {
    class: isMale ? 'Male' : 'Female',
    confidence: confidence
  };
};
```

## Tips for Better Results

1. **Dataset Quality**: Ensure images are clear and well-lit
2. **Data Balance**: Your dataset is well-balanced (507 vs 496 images) ✓
3. **Augmentation**: Enhanced augmentation compensates for smaller dataset size
4. **GPU Usage**: Enable GPU in Colab (Runtime → Change runtime type → **T4 GPU**)
5. **Monitoring**: Watch for overfitting (val_loss increasing while train_loss decreases)
6. **Class Balance**: The dataset is nearly balanced, which is ideal for binary classification

## Dataset-Specific Optimizations Applied

Given your dataset of ~1,000 images, the following optimizations have been implemented:

1. **Reduced Batch Size**: Changed from 32 to 16 for better gradient updates with smaller dataset
2. **Enhanced Augmentation**: Increased augmentation parameters to generate more training variety
3. **Longer Patience**: Increased early stopping patience to 15 epochs
4. **More Epochs**: Maximum epochs set to 100 (early stopping will prevent overfitting)
5. **Random Seed**: Set to 42 for reproducible splits
6. **File Preservation**: Keeps original file extensions during organization

## Expected Training Performance

With ~1,000 images on T4 GPU:
- **Training time**: 30-90 minutes (depending on early stopping)
- **Expected accuracy**: 85-95% (depends on image quality and flower distinctiveness)
- **Memory usage**: Well within T4 GPU limits (16GB VRAM)
- **Training samples**: ~702 images (70%)
- **Validation samples**: ~150 images (15%)
- **Test samples**: ~150 images (15%)

## Troubleshooting

- **Out of Memory**: Already optimized with BATCH_SIZE=16 for your dataset size
- **Slow Training**: Ensure **T4 GPU** is enabled in Colab (not CPU)
- **Low Accuracy**: Verify images are properly labeled in correct folders
- **Overfitting**: Monitor training - early stopping will handle this automatically
- **Dataset Not Found**: Ensure folders are named exactly `ampalayabilog female` and `ampalayabilog male`
- **Permission Errors**: Make sure Google Drive is properly mounted and accessible

## Quick Setup Checklist

Before running the code:
- [ ] Upload datasets to `MyDrive/EGourd/Senior_Datasets/`
- [ ] Verify folder names: `ampalayabilog female` and `ampalayabilog male`
- [ ] Enable T4 GPU (Runtime → Change runtime type → T4 GPU → Save)
- [ ] Run cells in order from top to bottom
- [ ] Monitor training progress and metrics

---

**Created**: October 30, 2025  
**Compatible with**: TensorFlow 2.x, Expo SDK 48+, React Native
