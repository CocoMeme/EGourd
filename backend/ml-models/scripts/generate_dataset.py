"""
Synthetic Dataset Generator for Flower Production Prediction
=============================================================

Generates realistic training data for predicting male and female flower
production in cucurbit plants based on environmental, care, and growth factors.

Plant Types:
- ampalaya_bilog (Round Bitter Gourd)
- upo_smooth (Smooth Bottle Gourd)
- patola (Sponge Gourd)
- cucumber

Features:
- Environmental: temperature, humidity, sunlight_hours, soil_ph, soil_type
- Care: watering_frequency, fertilizer_type, fertilizer_frequency, pest_control
- Growth: height, leaf_count, stem_thickness, health_rating
- Plant metadata: plant_type, plant_age

Targets:
- male_flowers: Number of male flowers produced
- female_flowers: Number of female flowers produced
"""

import numpy as np
import pandas as pd
import json
from datetime import datetime

# Set random seed for reproducibility
np.random.seed(42)

# Plant-specific characteristics
PLANT_SPECS = {
    'ampalaya_bilog': {
        'optimal_age': (40, 60),
        'male_flowers': {'base': 22, 'std': 5},
        'female_flowers': {'base': 11, 'std': 3},
        'male_female_ratio': 2.0,
        'temp_preference': (25, 30),
        'height_range': (150, 300),
    },
    'upo_smooth': {
        'optimal_age': (50, 70),
        'male_flowers': {'base': 30, 'std': 6},
        'female_flowers': {'base': 15, 'std': 4},
        'male_female_ratio': 2.0,
        'temp_preference': (24, 29),
        'height_range': (200, 400),
    },
    'patola': {
        'optimal_age': (45, 65),
        'male_flowers': {'base': 18, 'std': 5},
        'female_flowers': {'base': 9, 'std': 3},
        'male_female_ratio': 2.0,
        'temp_preference': (25, 31),
        'height_range': (180, 350),
    },
    'cucumber': {
        'optimal_age': (35, 55),
        'male_flowers': {'base': 25, 'std': 5},
        'female_flowers': {'base': 14, 'std': 3},
        'male_female_ratio': 1.8,
        'temp_preference': (20, 28),
        'height_range': (100, 250),
    }
}

SOIL_TYPES = ['sandy', 'loamy', 'clay', 'silty']
FERTILIZER_TYPES = ['none', 'organic', 'chemical', 'mixed']
PEST_CONTROL = ['none', 'as-needed', 'regular', 'intensive']

def calculate_stress_level(temp, optimal_temp, humidity, watering, fertilizer):
    """Calculate environmental stress level (0-1)"""
    stress = 0.0
    
    # Temperature stress
    temp_min, temp_max = optimal_temp
    if temp < temp_min - 5 or temp > temp_max + 5:
        stress += 0.4
    elif temp < temp_min or temp > temp_max:
        stress += 0.2
    
    # Humidity stress
    if humidity < 50 or humidity > 90:
        stress += 0.2
    
    # Water stress
    if watering < 3:
        stress += 0.3
    elif watering > 7:
        stress += 0.2
    
    # Nutrient stress
    if fertilizer == 'none':
        stress += 0.2
    
    return min(1.0, stress)

def calculate_adjustment_factor(age, optimal_age, health, temp, optimal_temp, 
                                humidity, sunlight, watering, fertilizer, pest_control):
    """Calculate overall production adjustment factor"""
    factor = 1.0
    
    # Age factor
    age_min, age_max = optimal_age
    if age < age_min:
        factor *= max(0.3, 1 - ((age_min - age) / age_min) * 0.7)
    elif age > age_max:
        factor *= max(0.7, 1 - ((age - age_max) / 30) * 0.3)
    
    # Temperature factor
    temp_min, temp_max = optimal_temp
    if temp < 20 or temp > 35:
        factor *= 0.7
    elif temp_min <= temp <= temp_max:
        factor *= 1.1
    
    # Humidity factor
    if humidity < 50 or humidity > 90:
        factor *= 0.8
    elif 60 <= humidity <= 80:
        factor *= 1.05
    
    # Sunlight factor
    if sunlight < 4:
        factor *= 0.6
    elif 6 <= sunlight <= 8:
        factor *= 1.1
    elif sunlight > 10:
        factor *= 0.9
    
    # Watering factor
    if watering < 2:
        factor *= 0.6
    elif 3 <= watering <= 5:
        factor *= 1.1
    elif watering > 7:
        factor *= 0.85
    
    # Fertilizer factor
    fertilizer_factors = {
        'none': 0.7,
        'organic': 1.15,
        'chemical': 1.05,
        'mixed': 1.15
    }
    factor *= fertilizer_factors.get(fertilizer, 1.0)
    
    # Pest control factor
    pest_factors = {
        'none': 0.85,
        'as-needed': 1.0,
        'regular': 1.05,
        'intensive': 1.02
    }
    factor *= pest_factors.get(pest_control, 1.0)
    
    # Health factor (1-5 scale)
    health_factors = {1: 0.4, 2: 0.65, 3: 0.9, 4: 1.1, 5: 1.2}
    factor *= health_factors.get(health, 1.0)
    
    return factor

def generate_sample(plant_type, specs):
    """Generate a single training sample"""
    
    # Plant age (days)
    age_min, age_max = specs['optimal_age']
    if np.random.random() < 0.6:
        # 60% optimal age
        plant_age = np.random.randint(age_min, age_max + 1)
    elif np.random.random() < 0.5:
        # 20% young
        plant_age = np.random.randint(max(20, age_min - 20), age_min)
    else:
        # 20% old
        plant_age = np.random.randint(age_max, min(150, age_max + 40))
    
    # Environmental factors
    temp_min, temp_max = specs['temp_preference']
    if np.random.random() < 0.5:
        # 50% optimal temperature
        temperature = np.random.uniform(temp_min, temp_max)
    else:
        # 50% sub-optimal
        temperature = np.random.uniform(15, 40)
    
    humidity = np.random.uniform(40, 95) if np.random.random() < 0.4 else np.random.uniform(60, 80)
    sunlight_hours = np.random.uniform(3, 12) if np.random.random() < 0.4 else np.random.uniform(6, 8)
    soil_ph = np.random.uniform(5.0, 8.0) if np.random.random() < 0.3 else np.random.uniform(6.0, 6.8)
    soil_type = np.random.choice(SOIL_TYPES, p=[0.15, 0.50, 0.20, 0.15])
    
    # Care factors
    watering_frequency = int(np.random.choice([2, 3, 4, 5, 6, 7, 8], p=[0.1, 0.15, 0.25, 0.25, 0.15, 0.07, 0.03]))
    fertilizer_type = np.random.choice(FERTILIZER_TYPES, p=[0.1, 0.4, 0.3, 0.2])
    fertilizer_frequency = int(np.random.choice([0, 1, 2, 3, 4], p=[0.1, 0.2, 0.4, 0.2, 0.1]))
    pest_control = np.random.choice(PEST_CONTROL, p=[0.15, 0.35, 0.35, 0.15])
    
    # Growth metrics
    height_min, height_max = specs['height_range']
    height = np.random.uniform(height_min * 0.6, height_max * 1.1)
    leaf_count = int(np.random.uniform(10, 80))
    stem_thickness = np.random.uniform(5, 25)
    health_rating = int(np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.15, 0.35, 0.30, 0.15]))
    
    # Calculate adjustment factor
    adj_factor = calculate_adjustment_factor(
        plant_age, specs['optimal_age'], health_rating,
        temperature, specs['temp_preference'],
        humidity, sunlight_hours, watering_frequency,
        fertilizer_type, pest_control
    )
    
    # Calculate stress for sex ratio modification
    stress = calculate_stress_level(
        temperature, specs['temp_preference'],
        humidity, watering_frequency, fertilizer_type
    )
    
    # Stress increases males, decreases females
    male_multiplier = 1.0 + (stress * 0.3)
    female_multiplier = 1.0 - (stress * 0.25)
    
    # Calculate flower counts
    male_base = specs['male_flowers']['base']
    male_std = specs['male_flowers']['std']
    female_base = specs['female_flowers']['base']
    female_std = specs['female_flowers']['std']
    
    male_flowers = int(max(1, np.random.normal(
        male_base * adj_factor * male_multiplier,
        male_std
    )))
    
    female_flowers = int(max(1, np.random.normal(
        female_base * adj_factor * female_multiplier,
        female_std
    )))
    
    return {
        'plant_type': plant_type,
        'plant_age': plant_age,
        'temperature': round(temperature, 1),
        'humidity': round(humidity, 1),
        'sunlight_hours': round(sunlight_hours, 1),
        'soil_ph': round(soil_ph, 1),
        'soil_type': soil_type,
        'watering_frequency': watering_frequency,
        'fertilizer_type': fertilizer_type,
        'fertilizer_frequency': fertilizer_frequency,
        'pest_control': pest_control,
        'height': round(height, 1),
        'leaf_count': leaf_count,
        'stem_thickness': round(stem_thickness, 1),
        'health_rating': health_rating,
        'male_flowers': male_flowers,
        'female_flowers': female_flowers
    }

def generate_dataset(total_samples=5000):
    """Generate complete synthetic dataset"""
    
    print(f"Generating {total_samples} synthetic samples...")
    
    samples = []
    samples_per_plant = total_samples // len(PLANT_SPECS)
    
    for plant_type, specs in PLANT_SPECS.items():
        print(f"  Generating {samples_per_plant} samples for {plant_type}...")
        for _ in range(samples_per_plant):
            sample = generate_sample(plant_type, specs)
            samples.append(sample)
    
    df = pd.DataFrame(samples)
    
    # Shuffle the dataset
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    return df

def save_dataset(df, output_path):
    """Save dataset to CSV"""
    df.to_csv(output_path, index=False)
    print(f"\nDataset saved to: {output_path}")
    print(f"Total samples: {len(df)}")
    print(f"\nDataset statistics:")
    print(df.describe())
    print(f"\nPlant type distribution:")
    print(df['plant_type'].value_counts())
    print(f"\nTarget statistics:")
    print(f"Male flowers: mean={df['male_flowers'].mean():.2f}, std={df['male_flowers'].std():.2f}")
    print(f"Female flowers: mean={df['female_flowers'].mean():.2f}, std={df['female_flowers'].std():.2f}")

def save_metadata(output_path):
    """Save dataset metadata"""
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'version': '1.0',
        'plant_types': list(PLANT_SPECS.keys()),
        'features': {
            'categorical': ['plant_type', 'soil_type', 'fertilizer_type', 'pest_control'],
            'numerical': [
                'plant_age', 'temperature', 'humidity', 'sunlight_hours', 'soil_ph',
                'watering_frequency', 'fertilizer_frequency', 'height', 'leaf_count',
                'stem_thickness', 'health_rating'
            ]
        },
        'targets': ['male_flowers', 'female_flowers'],
        'plant_specifications': PLANT_SPECS
    }
    
    with open(output_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nMetadata saved to: {output_path}")

if __name__ == '__main__':
    # Generate dataset
    df = generate_dataset(total_samples=5000)
    
    # Save to CSV
    save_dataset(df, '../data/flower_production_dataset.csv')
    
    # Save metadata
    save_metadata('../data/dataset_metadata.json')
    
    print("\n✓ Dataset generation complete!")
