"""
Synthetic Dataset Generator for Yield Prediction
=================================================

Generates realistic training data for predicting fruit yield in cucurbit plants
based on plant growth metrics and environmental conditions.

Input Variables (7):
- plant_age_days: Age of plant in days
- vine_length_cm: Length of main vine in centimeters
- node_count: Number of nodes on the vine
- male_flower_count: Number of male flowers
- female_flower_count: Number of female flowers
- temperature_celsius: Average temperature in Celsius
- soil_moisture_percent: Soil moisture percentage

Target Variable:
- yield_kg: Predicted fruit yield in kilograms
"""

import numpy as np
import pandas as pd
import json
from datetime import datetime

# Set random seed for reproducibility
np.random.seed(42)

# Plant-specific yield characteristics
PLANT_YIELD_SPECS = {
    'ampalaya_bilog': {
        'base_yield_kg': 2.5,
        'optimal_age': (50, 70),
        'yield_per_female_flower': 0.18,
        'optimal_temp': (25, 30),
        'vine_length_factor': 0.008,
        'node_factor': 0.05
    },
    'upo_smooth': {
        'base_yield_kg': 4.5,
        'optimal_age': (60, 80),
        'yield_per_female_flower': 0.35,
        'optimal_temp': (24, 29),
        'vine_length_factor': 0.012,
        'node_factor': 0.08
    },
    'patola': {
        'base_yield_kg': 2.0,
        'optimal_age': (55, 75),
        'yield_per_female_flower': 0.15,
        'optimal_temp': (25, 31),
        'vine_length_factor': 0.007,
        'node_factor': 0.04
    },
    'cucumber': {
        'base_yield_kg': 3.0,
        'optimal_age': (45, 65),
        'yield_per_female_flower': 0.20,
        'optimal_temp': (20, 28),
        'vine_length_factor': 0.006,
        'node_factor': 0.06
    },
    'kalabasa': {
        'base_yield_kg': 4.0,
        'optimal_age': (50, 75),
        'yield_per_female_flower': 0.45,
        'optimal_temp': (24, 32),
        'vine_length_factor': 0.010,
        'node_factor': 0.07
    }
}

def calculate_yield(plant_type, plant_age, vine_length, node_count, 
                   male_flowers, female_flowers, temperature, soil_moisture):
    """Calculate yield based on plant characteristics and conditions"""
    
    specs = PLANT_YIELD_SPECS[plant_type]
    
    # Base yield from female flowers
    base_yield = female_flowers * specs['yield_per_female_flower']
    
    # Age factor
    age_min, age_max = specs['optimal_age']
    if plant_age < age_min:
        age_factor = max(0.3, plant_age / age_min)
    elif plant_age <= age_max:
        age_factor = 1.0
    else:
        age_factor = max(0.6, 1 - ((plant_age - age_max) / 50) * 0.4)
    
    # Vine development factor
    vine_factor = 1.0 + (vine_length * specs['vine_length_factor'])
    vine_factor = min(vine_factor, 1.5)  # Cap at 150%
    
    # Node factor (more nodes = more fruiting potential)
    node_factor = 1.0 + (node_count * specs['node_factor'])
    node_factor = min(node_factor, 1.4)  # Cap at 140%
    
    # Temperature factor
    temp_min, temp_max = specs['optimal_temp']
    if temp_min <= temperature <= temp_max:
        temp_factor = 1.2
    elif temperature < temp_min - 5 or temperature > temp_max + 5:
        temp_factor = 0.6
    else:
        temp_factor = 0.9
    
    # Soil moisture factor
    if 60 <= soil_moisture <= 80:
        moisture_factor = 1.15
    elif soil_moisture < 40 or soil_moisture > 90:
        moisture_factor = 0.7
    else:
        moisture_factor = 0.95
    
    # Pollination efficiency (ratio of male to female flowers)
    pollination_ratio = male_flowers / max(female_flowers, 1)
    if pollination_ratio >= 1.5:  # Sufficient males
        pollination_factor = 1.0
    elif pollination_ratio >= 1.0:
        pollination_factor = 0.95
    else:
        pollination_factor = 0.7  # Insufficient pollination
    
    # Calculate final yield
    yield_kg = (base_yield * age_factor * vine_factor * node_factor * 
                temp_factor * moisture_factor * pollination_factor)
    
    # Add some realistic variation
    yield_kg *= np.random.uniform(0.85, 1.15)
    
    # Ensure minimum yield
    yield_kg = max(0.1, yield_kg)
    
    return yield_kg

def generate_sample(plant_type, specs):
    """Generate a single training sample"""
    
    # Plant age
    age_min, age_max = specs['optimal_age']
    if np.random.random() < 0.6:
        # 60% optimal age
        plant_age = np.random.randint(age_min, age_max + 1)
    elif np.random.random() < 0.5:
        # 20% young
        plant_age = np.random.randint(max(30, age_min - 15), age_min)
    else:
        # 20% old
        plant_age = np.random.randint(age_max, min(120, age_max + 30))
    
    # Vine length (correlated with age)
    if plant_age < 40:
        vine_length = np.random.uniform(100, 250)
    elif plant_age < 60:
        vine_length = np.random.uniform(200, 400)
    else:
        vine_length = np.random.uniform(300, 500)
    
    # Node count (correlated with vine length)
    nodes_per_meter = np.random.uniform(8, 15)
    node_count = int((vine_length / 100) * nodes_per_meter)
    
    # Flower counts (realistic based on plant maturity)
    if plant_age < 40:
        male_flowers = int(np.random.uniform(8, 18))
        female_flowers = int(np.random.uniform(4, 10))
    elif plant_age < 70:
        male_flowers = int(np.random.uniform(15, 35))
        female_flowers = int(np.random.uniform(8, 18))
    else:
        male_flowers = int(np.random.uniform(12, 28))
        female_flowers = int(np.random.uniform(6, 15))
    
    # Temperature
    temp_min, temp_max = specs['optimal_temp']
    if np.random.random() < 0.5:
        temperature = np.random.uniform(temp_min, temp_max)
    else:
        temperature = np.random.uniform(18, 38)
    
    # Soil moisture
    if np.random.random() < 0.6:
        soil_moisture = np.random.uniform(60, 80)
    else:
        soil_moisture = np.random.uniform(30, 95)
    
    # Calculate yield
    yield_kg = calculate_yield(
        plant_type, plant_age, vine_length, node_count,
        male_flowers, female_flowers, temperature, soil_moisture
    )
    
    return {
        'plant_type': plant_type,
        'plant_age_days': plant_age,
        'vine_length_cm': round(vine_length, 1),
        'node_count': node_count,
        'male_flower_count': male_flowers,
        'female_flower_count': female_flowers,
        'temperature_celsius': round(temperature, 1),
        'soil_moisture_percent': round(soil_moisture, 1),
        'yield_kg': round(yield_kg, 2)
    }

def generate_dataset(total_samples=5000):
    """Generate complete synthetic dataset"""
    
    print(f"Generating {total_samples} synthetic yield samples...")
    
    samples = []
    samples_per_plant = total_samples // len(PLANT_YIELD_SPECS)
    
    for plant_type, specs in PLANT_YIELD_SPECS.items():
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
    print(f"\nYield statistics:")
    print(f"Mean yield: {df['yield_kg'].mean():.2f} kg")
    print(f"Std yield: {df['yield_kg'].std():.2f} kg")
    print(f"Min yield: {df['yield_kg'].min():.2f} kg")
    print(f"Max yield: {df['yield_kg'].max():.2f} kg")

def save_metadata(output_path):
    """Save dataset metadata"""
    metadata = {
        'generated_at': datetime.now().isoformat(),
        'version': '1.0',
        'plant_types': list(PLANT_YIELD_SPECS.keys()),
        'features': [
            'plant_age_days',
            'vine_length_cm',
            'node_count',
            'male_flower_count',
            'female_flower_count',
            'temperature_celsius',
            'soil_moisture_percent'
        ],
        'target': 'yield_kg',
        'plant_specifications': PLANT_YIELD_SPECS
    }
    
    with open(output_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nMetadata saved to: {output_path}")

if __name__ == '__main__':
    # Generate dataset
    df = generate_dataset(total_samples=5000)
    
    # Save to CSV
    save_dataset(df, '../data/yield_prediction_dataset.csv')
    
    # Save metadata
    save_metadata('../data/yield_dataset_metadata.json')
    
    print("\n✓ Yield dataset generation complete!")
