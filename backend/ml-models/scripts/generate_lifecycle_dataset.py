"""
Gourd Lifecycle Dataset Generator
==================================

Generates comprehensive dataset for gourd pollination management ML models.
Based on scientific research on gourd cultivation in tropical climates.

Research Sources:
- FAO Gourd Cultivation Guidelines
- Philippine Rice Research Institute (PhilRice) - Vegetable Production
- Southeast Asian Regional Center for Graduate Study and Research in Agriculture (SEARCA)
- Asian Vegetable Research and Development Center (AVRDC)

Key findings incorporated:
1. Bitter Gourd (Ampalaya): First flowers 35-45 days after planting
2. Bottle Gourd (Upo): First flowers 40-50 days after planting  
3. Sponge Gourd (Patola): First flowers 35-42 days after planting
4. Cucumber (Pipino): First flowers 28-35 days after planting

Optimal conditions:
- Temperature: 25-32°C (optimal 28-30°C)
- Humidity: 65-80%
- Soil pH: 6.0-7.0
- Sunlight: 6-8 hours daily

Pollination success factors:
- Temperature during pollination (morning hours 6-10 AM optimal)
- Humidity (60-75% ideal)
- Bee activity/hand pollination timing
- Plant health and nutrient status
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Gourd type configurations based on research
GOURD_CONFIGS = {
    'bitter_gourd': {
        'varieties': ['ampalaya_bilog', 'ampalaya_oblong', 'ampalaya_hybrid'],
        'days_to_flower_range': (35, 48),
        'days_to_flower_optimal': 40,
        'male_female_ratio': (2.5, 4.0),  # Males per female
        'fruit_weight_kg': (0.15, 0.50),
        'days_to_maturity': (40, 50),
        'vine_growth_rate_cm': (4, 7),  # cm per day
        'optimal_temp': (26, 32),
        'optimal_humidity': (65, 80),
        'pollination_window_hours': (6, 10),  # Morning hours
    },
    'bottle_gourd': {
        'varieties': ['upo_smooth', 'upo_long', 'upo_round'],
        'days_to_flower_range': (40, 55),
        'days_to_flower_optimal': 45,
        'male_female_ratio': (2.0, 3.5),
        'fruit_weight_kg': (1.0, 3.5),
        'days_to_maturity': (45, 60),
        'vine_growth_rate_cm': (5, 9),
        'optimal_temp': (25, 30),
        'optimal_humidity': (60, 75),
        'pollination_window_hours': (6, 9),
    },
    'sponge_gourd': {
        'varieties': ['patola', 'patola_smooth', 'patola_ridged'],
        'days_to_flower_range': (35, 45),
        'days_to_flower_optimal': 38,
        'male_female_ratio': (2.0, 3.0),
        'fruit_weight_kg': (0.3, 0.8),
        'days_to_maturity': (38, 48),
        'vine_growth_rate_cm': (4, 8),
        'optimal_temp': (25, 32),
        'optimal_humidity': (70, 85),
        'pollination_window_hours': (6, 10),
    },
    'cucumber': {
        'varieties': ['pipino', 'pipino_japanese', 'pipino_native'],
        'days_to_flower_range': (28, 38),
        'days_to_flower_optimal': 32,
        'male_female_ratio': (1.5, 2.5),
        'fruit_weight_kg': (0.15, 0.40),
        'days_to_maturity': (30, 40),
        'vine_growth_rate_cm': (3, 6),
        'optimal_temp': (24, 30),
        'optimal_humidity': (60, 75),
        'pollination_window_hours': (6, 11),
    }
}

# Seasonal weather patterns for Philippines (tropical)
SEASONAL_WEATHER = {
    'wet': {  # June-November
        'temperature': (26, 32),
        'humidity': (70, 90),
        'rainfall_mm': (10, 30),
        'sunlight_hours': (4, 7),
    },
    'dry': {  # December-May (hot dry: March-May, cool dry: Dec-Feb)
        'temperature': (24, 35),
        'humidity': (55, 75),
        'rainfall_mm': (0, 10),
        'sunlight_hours': (7, 10),
    }
}

FERTILIZER_TYPES = ['organic', 'chemical', 'mixed', 'none']
FERTILIZER_FREQUENCY = ['weekly', 'biweekly', 'monthly', 'none']
WATERING_FREQUENCY = ['daily', 'twice_daily', 'every_other_day']
SOIL_TYPES = ['loamy', 'sandy', 'clay', 'silty']
REGIONS = ['tropical_lowland', 'tropical_highland', 'subtropical']

def get_season(month):
    """Determine season based on month (Philippine climate)"""
    if 6 <= month <= 11:
        return 'wet'
    return 'dry'

def calculate_pollination_success_rate(temp, humidity, plant_health, 
                                       fertilizer_type, gourd_config, is_hand_pollinated=False):
    """
    Calculate pollination success probability based on environmental factors.
    Research shows success rates vary from 40-95% based on conditions.
    """
    base_rate = 0.75 if is_hand_pollinated else 0.65
    
    # Temperature factor
    opt_temp = gourd_config['optimal_temp']
    temp_mid = (opt_temp[0] + opt_temp[1]) / 2
    temp_deviation = abs(temp - temp_mid) / 10
    temp_factor = max(0.5, 1 - temp_deviation * 0.15)
    
    # Humidity factor
    opt_hum = gourd_config['optimal_humidity']
    hum_mid = (opt_hum[0] + opt_hum[1]) / 2
    hum_deviation = abs(humidity - hum_mid) / 20
    hum_factor = max(0.5, 1 - hum_deviation * 0.12)
    
    # Health factor (1-5 scale)
    health_factor = 0.6 + (plant_health / 5) * 0.4
    
    # Fertilizer factor
    fert_factors = {'organic': 1.0, 'mixed': 0.95, 'chemical': 0.85, 'none': 0.7}
    fert_factor = fert_factors.get(fertilizer_type, 0.85)
    
    success_rate = base_rate * temp_factor * hum_factor * health_factor * fert_factor
    
    # Add some randomness
    success_rate = max(0.30, min(0.98, success_rate + np.random.normal(0, 0.05)))
    
    return round(success_rate, 3)

def calculate_days_to_flower(gourd_type, temp, humidity, health, fertilizer):
    """
    Predict days until first flower based on conditions.
    Optimal conditions speed up flowering.
    """
    config = GOURD_CONFIGS[gourd_type]
    base_days = config['days_to_flower_optimal']
    
    # Temperature effect
    opt_temp = config['optimal_temp']
    temp_mid = (opt_temp[0] + opt_temp[1]) / 2
    if temp < opt_temp[0]:
        base_days += (opt_temp[0] - temp) * 0.5
    elif temp > opt_temp[1]:
        base_days += (temp - opt_temp[1]) * 0.3
    else:
        # Optimal range - slight speedup
        base_days -= abs(temp - temp_mid) * 0.1
    
    # Health effect
    health_effect = (5 - health) * 1.5
    base_days += health_effect
    
    # Fertilizer effect
    fert_effects = {'organic': -2, 'mixed': -1, 'chemical': 0, 'none': 3}
    base_days += fert_effects.get(fertilizer, 0)
    
    # Add natural variation
    base_days += np.random.normal(0, 2)
    
    # Ensure within valid range
    return max(config['days_to_flower_range'][0], 
               min(config['days_to_flower_range'][1], round(base_days)))

def calculate_fruit_maturity_days(gourd_type, temp, humidity, health, pollination_success):
    """
    Calculate days from successful pollination to mature fruit.
    Affected by growing conditions.
    """
    config = GOURD_CONFIGS[gourd_type]
    base_days = (config['days_to_maturity'][0] + config['days_to_maturity'][1]) / 2
    
    # Temperature effect
    opt_temp = config['optimal_temp']
    temp_mid = (opt_temp[0] + opt_temp[1]) / 2
    temp_deviation = abs(temp - temp_mid)
    base_days += temp_deviation * 0.3
    
    # Humidity effect (too wet = slower, diseases)
    if humidity > 85:
        base_days += (humidity - 85) * 0.2
    
    # Health effect
    base_days += (5 - health) * 2
    
    # Add variation
    base_days += np.random.normal(0, 3)
    
    return max(config['days_to_maturity'][0], 
               min(config['days_to_maturity'][1] + 10, round(base_days)))

def generate_plant_record(plant_id, planting_date, gourd_type, variety=None):
    """Generate a complete plant lifecycle record"""
    config = GOURD_CONFIGS[gourd_type]
    
    # Select variety
    if variety is None:
        variety = random.choice(config['varieties'])
    
    # Determine season
    season = get_season(planting_date.month)
    weather = SEASONAL_WEATHER[season]
    
    # Environmental conditions (averaged over growing period)
    avg_temp = round(np.random.uniform(*weather['temperature']), 1)
    avg_humidity = round(np.random.uniform(*weather['humidity']), 1)
    avg_rainfall = round(np.random.uniform(*weather['rainfall_mm']), 1)
    sunlight_hours = round(np.random.uniform(*weather['sunlight_hours']), 1)
    
    # Soil conditions
    soil_ph = round(np.random.uniform(5.8, 7.2), 1)
    soil_moisture = round(np.random.uniform(50, 80), 1)
    soil_type = random.choice(SOIL_TYPES)
    
    # Care practices
    fertilizer_type = random.choice(FERTILIZER_TYPES)
    fertilizer_freq = random.choice(FERTILIZER_FREQUENCY)
    watering_freq = random.choice(WATERING_FREQUENCY)
    
    # Plant health (1-5)
    # Affected by care and conditions
    base_health = 3
    if fertilizer_type in ['organic', 'mixed']:
        base_health += 0.5
    if watering_freq in ['daily', 'twice_daily']:
        base_health += 0.3
    if 6.0 <= soil_ph <= 7.0:
        base_health += 0.3
    if soil_type in ['loamy', 'silty']:
        base_health += 0.2
    
    plant_health = round(min(5, max(1, base_health + np.random.normal(0, 0.5))))
    
    # Calculate days since planting (simulate at different growth stages)
    days_since_planting = random.randint(30, 120)
    
    # Days to first flower
    days_to_first_flower = calculate_days_to_flower(
        gourd_type, avg_temp, avg_humidity, plant_health, fertilizer_type
    )
    
    # Vine length (based on age and growth rate)
    daily_growth = np.random.uniform(*config['vine_growth_rate_cm'])
    vine_length = round(days_since_planting * daily_growth * (plant_health / 4), 1)
    
    # Leaf count (roughly correlated with vine length)
    leaf_count = round(vine_length / 6 + np.random.normal(0, 5))
    leaf_count = max(5, min(100, leaf_count))
    
    # Flower counts (only if past flowering age)
    if days_since_planting >= days_to_first_flower:
        days_flowering = days_since_planting - days_to_first_flower
        
        # Male flowers appear first, then female
        male_ratio = np.random.uniform(*config['male_female_ratio'])
        
        # Base flower production
        base_female = round(days_flowering / 3 * (plant_health / 3))
        female_flower_count = max(1, min(30, base_female + random.randint(-3, 5)))
        male_flower_count = max(1, round(female_flower_count * male_ratio))
    else:
        male_flower_count = 0
        female_flower_count = 0
    
    # Pollination tracking
    is_hand_pollinated = random.random() > 0.4  # 60% hand pollinated
    
    pollination_success_rate = calculate_pollination_success_rate(
        avg_temp, avg_humidity, plant_health, fertilizer_type, config, is_hand_pollinated
    )
    
    # Pollinated count (from female flowers)
    if female_flower_count > 0:
        pollinated_count = random.randint(
            max(0, female_flower_count - 4), 
            female_flower_count
        )
    else:
        pollinated_count = 0
    
    # Successful pollinations
    if pollinated_count > 0:
        expected_success = round(pollinated_count * pollination_success_rate)
        successful_pollinations = max(0, min(pollinated_count, 
            expected_success + random.randint(-2, 2)))
    else:
        successful_pollinations = 0
    
    # Days until pollination result is known (usually 3-10 days)
    days_to_pollination_result = random.randint(3, 10)
    
    # Fruit maturity prediction
    days_to_fruit_maturity = calculate_fruit_maturity_days(
        gourd_type, avg_temp, avg_humidity, plant_health, pollination_success_rate
    )
    
    # Actual yield (if plant is mature enough)
    if days_since_planting >= days_to_first_flower + days_to_fruit_maturity:
        mature_fruit_count = successful_pollinations
        avg_fruit_weight = round(np.random.uniform(*config['fruit_weight_kg']), 2)
        total_yield = round(mature_fruit_count * avg_fruit_weight, 2)
    else:
        mature_fruit_count = 0
        avg_fruit_weight = 0
        total_yield = 0
    
    # Region
    region = random.choice(REGIONS)
    
    return {
        'plant_id': plant_id,
        'gourd_type': gourd_type,
        'variety_name': variety,
        'planting_date': planting_date.strftime('%Y-%m-%d'),
        'days_since_planting': days_since_planting,
        'season': season,
        'region_climate': region,
        
        # Environmental factors
        'avg_temperature': avg_temp,
        'avg_humidity': avg_humidity,
        'avg_rainfall_mm': avg_rainfall,
        'sunlight_hours': sunlight_hours,
        'soil_ph': soil_ph,
        'soil_moisture': soil_moisture,
        'soil_type': soil_type,
        
        # Care practices
        'fertilizer_type': fertilizer_type,
        'fertilizer_frequency': fertilizer_freq,
        'watering_frequency': watering_freq,
        
        # Plant metrics
        'plant_health_score': plant_health,
        'vine_length_cm': vine_length,
        'leaf_count': leaf_count,
        
        # Flowering predictions and actuals
        'predicted_days_to_flower': days_to_first_flower,
        'actual_days_to_flower': days_to_first_flower + random.randint(-3, 3) if days_since_planting >= days_to_first_flower else None,
        'male_flower_count': male_flower_count,
        'female_flower_count': female_flower_count,
        
        # Pollination tracking
        'is_hand_pollinated': 1 if is_hand_pollinated else 0,
        'pollinated_count': pollinated_count,
        'successful_pollinations': successful_pollinations,
        'pollination_success_rate': pollination_success_rate,
        'days_to_pollination_result': days_to_pollination_result,
        
        # Fruit development
        'predicted_days_to_maturity': days_to_fruit_maturity,
        'mature_fruit_count': mature_fruit_count,
        'avg_fruit_weight_kg': avg_fruit_weight if mature_fruit_count > 0 else None,
        'total_yield_kg': total_yield if mature_fruit_count > 0 else None,
    }

def generate_dataset(num_records=5000):
    """Generate full dataset"""
    records = []
    
    # Generate records across different planting dates
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 12, 31)
    date_range = (end_date - start_date).days
    
    gourd_types = list(GOURD_CONFIGS.keys())
    
    for i in range(num_records):
        # Random planting date
        planting_date = start_date + timedelta(days=random.randint(0, date_range))
        
        # Random gourd type
        gourd_type = random.choice(gourd_types)
        
        # Generate record
        record = generate_plant_record(f"PLT_{i+1:05d}", planting_date, gourd_type)
        records.append(record)
        
        if (i + 1) % 1000 == 0:
            print(f"Generated {i + 1} records...")
    
    return pd.DataFrame(records)

def generate_flowering_prediction_dataset():
    """Generate dataset specifically for flowering time prediction"""
    df = generate_dataset(5000)
    
    # Select relevant columns for flowering prediction
    flower_cols = [
        'gourd_type', 'variety_name', 'season', 'region_climate',
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours',
        'soil_ph', 'soil_moisture', 'soil_type',
        'fertilizer_type', 'fertilizer_frequency', 'watering_frequency',
        'plant_health_score', 'predicted_days_to_flower'
    ]
    
    return df[flower_cols]

def generate_pollination_success_dataset():
    """Generate dataset for pollination success prediction"""
    df = generate_dataset(5000)
    
    # Filter to records with pollination data
    df_pollination = df[df['pollinated_count'] > 0].copy()
    
    # Select relevant columns
    poll_cols = [
        'gourd_type', 'variety_name', 'season',
        'avg_temperature', 'avg_humidity', 'sunlight_hours',
        'soil_moisture', 'fertilizer_type',
        'plant_health_score', 'vine_length_cm', 'leaf_count',
        'male_flower_count', 'female_flower_count',
        'is_hand_pollinated', 'pollinated_count',
        'successful_pollinations', 'pollination_success_rate'
    ]
    
    return df_pollination[poll_cols]

def generate_fruit_maturity_dataset():
    """Generate dataset for fruit maturity prediction"""
    df = generate_dataset(5000)
    
    # Filter to records with mature fruit
    df_mature = df[df['mature_fruit_count'] > 0].copy()
    
    # Select relevant columns
    maturity_cols = [
        'gourd_type', 'variety_name', 'season',
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm',
        'soil_moisture', 'fertilizer_type', 'fertilizer_frequency',
        'plant_health_score', 'successful_pollinations',
        'predicted_days_to_maturity', 'mature_fruit_count',
        'avg_fruit_weight_kg', 'total_yield_kg'
    ]
    
    return df_mature[maturity_cols]

if __name__ == '__main__':
    import os
    
    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating comprehensive gourd lifecycle dataset...")
    
    # Generate main dataset
    main_df = generate_dataset(8000)
    main_path = os.path.join(output_dir, 'gourd_lifecycle_comprehensive.csv')
    main_df.to_csv(main_path, index=False)
    print(f"Main dataset saved: {main_path}")
    print(f"  Records: {len(main_df)}")
    
    # Generate specialized datasets
    print("\nGenerating flowering prediction dataset...")
    flower_df = generate_flowering_prediction_dataset()
    flower_path = os.path.join(output_dir, 'flowering_prediction_dataset.csv')
    flower_df.to_csv(flower_path, index=False)
    print(f"  Saved: {flower_path}")
    print(f"  Records: {len(flower_df)}")
    
    print("\nGenerating pollination success dataset...")
    poll_df = generate_pollination_success_dataset()
    poll_path = os.path.join(output_dir, 'pollination_success_dataset.csv')
    poll_df.to_csv(poll_path, index=False)
    print(f"  Saved: {poll_path}")
    print(f"  Records: {len(poll_df)}")
    
    print("\nGenerating fruit maturity dataset...")
    maturity_df = generate_fruit_maturity_dataset()
    maturity_path = os.path.join(output_dir, 'fruit_maturity_dataset.csv')
    maturity_df.to_csv(maturity_path, index=False)
    print(f"  Saved: {maturity_path}")
    print(f"  Records: {len(maturity_df)}")
    
    # Save metadata
    metadata = {
        'generated_date': datetime.now().isoformat(),
        'datasets': {
            'main': {
                'file': 'gourd_lifecycle_comprehensive.csv',
                'records': len(main_df),
                'description': 'Complete lifecycle data for all gourd types'
            },
            'flowering': {
                'file': 'flowering_prediction_dataset.csv', 
                'records': len(flower_df),
                'description': 'Data for predicting days to first flower'
            },
            'pollination': {
                'file': 'pollination_success_dataset.csv',
                'records': len(poll_df),
                'description': 'Data for predicting pollination success rates'
            },
            'maturity': {
                'file': 'fruit_maturity_dataset.csv',
                'records': len(maturity_df),
                'description': 'Data for predicting fruit development and yield'
            }
        },
        'gourd_types': list(GOURD_CONFIGS.keys()),
        'features': {
            'environmental': ['temperature', 'humidity', 'rainfall', 'sunlight', 'soil_ph', 'soil_moisture'],
            'care': ['fertilizer_type', 'fertilizer_frequency', 'watering_frequency'],
            'plant_metrics': ['health_score', 'vine_length', 'leaf_count', 'flower_counts'],
            'targets': ['days_to_flower', 'pollination_success_rate', 'days_to_maturity', 'yield']
        }
    }
    
    metadata_path = os.path.join(output_dir, 'lifecycle_dataset_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"\nMetadata saved: {metadata_path}")
    
    print("\n✅ Dataset generation complete!")
    print("\nDataset summary:")
    print(f"  Gourd types: {', '.join(GOURD_CONFIGS.keys())}")
    print(f"  Total records: {len(main_df) + len(flower_df) + len(poll_df) + len(maturity_df)}")
