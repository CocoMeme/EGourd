"""
Pollination Management Prediction Script
=========================================

Unified prediction script for all pollination management ML models.
Receives input via stdin as JSON, outputs predictions as JSON to stdout.

Supports three prediction types:
1. flowering - Predicts days until first flower
2. pollination_success - Predicts success rate of pollination
3. fruit_maturity - Predicts days to maturity and expected yield
"""

import sys
import json
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')


def load_model_components(model_type):
    """Load model and preprocessor components"""
    try:
        model = joblib.load(os.path.join(MODELS_DIR, f'{model_type}_model.joblib'))
        encoders = joblib.load(os.path.join(MODELS_DIR, f'{model_type}_encoders.joblib'))
        scaler = joblib.load(os.path.join(MODELS_DIR, f'{model_type}_scaler.joblib'))
        return model, encoders, scaler
    except FileNotFoundError as e:
        raise Exception(f"Model files not found for {model_type}. Please train the models first.")


def preprocess_data(df, encoders, scaler, categorical_cols, numerical_cols):
    """Apply preprocessing to input data"""
    df_processed = df.copy()
    
    # Encode categorical columns
    for col in categorical_cols:
        if col in df_processed.columns and col in encoders:
            df_processed[col] = df_processed[col].astype(str)
            known_labels = set(encoders[col].classes_)
            df_processed[col] = df_processed[col].apply(
                lambda x: x if x in known_labels else encoders[col].classes_[0]
            )
            df_processed[col] = encoders[col].transform(df_processed[col])
    
    # Scale numerical columns
    df_processed[numerical_cols] = scaler.transform(df_processed[numerical_cols])
    
    return df_processed


def predict_flowering(input_data):
    """Predict days until first flower"""
    model, encoders, scaler = load_model_components('flowering')
    
    feature_columns = [
        'gourd_type', 'variety_name', 'season', 'region_climate',
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours',
        'soil_ph', 'soil_moisture', 'soil_type',
        'fertilizer_type', 'fertilizer_frequency', 'watering_frequency',
        'plant_health_score'
    ]
    categorical_columns = [
        'gourd_type', 'variety_name', 'season', 'region_climate',
        'soil_type', 'fertilizer_type', 'fertilizer_frequency', 'watering_frequency'
    ]
    numerical_columns = [
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours',
        'soil_ph', 'soil_moisture', 'plant_health_score'
    ]
    
    # Set defaults for missing optional fields
    defaults = {
        'region_climate': 'tropical_lowland',
        'avg_rainfall_mm': 10.0,
        'sunlight_hours': 7.0,
        'soil_ph': 6.5,
        'soil_moisture': 65.0,
        'soil_type': 'silty',  # Philippine standard soil type
        'fertilizer_frequency': 'weekly',
        'plant_health_score': 4
    }
    
    for key, default in defaults.items():
        if key not in input_data or input_data[key] is None:
            input_data[key] = default
    
    df = pd.DataFrame([input_data])
    df_processed = preprocess_data(df, encoders, scaler, categorical_columns, numerical_columns)
    
    # Ensure columns are in correct order
    X = df_processed[feature_columns]
    
    prediction = model.predict(X)[0]
    predicted_days = round(prediction)
    
    # Calculate confidence based on feature importance and input quality
    confidence = calculate_confidence(input_data, 'flowering')
    
    # Calculate expected flowering date range
    from datetime import datetime, timedelta
    planting_date = input_data.get('planting_date', datetime.now().strftime('%Y-%m-%d'))
    if isinstance(planting_date, str):
        planting_date = datetime.strptime(planting_date, '%Y-%m-%d')
    
    expected_date = planting_date + timedelta(days=predicted_days)
    earliest_date = planting_date + timedelta(days=max(1, predicted_days - 5))
    latest_date = planting_date + timedelta(days=predicted_days + 5)
    
    return {
        'success': True,
        'prediction_type': 'flowering',
        'predicted_days_to_flower': predicted_days,
        'expected_date': expected_date.strftime('%Y-%m-%d'),
        'range': {
            'earliest': earliest_date.strftime('%Y-%m-%d'),
            'latest': latest_date.strftime('%Y-%m-%d')
        },
        'confidence': confidence,
        'recommendations': get_flowering_recommendations(input_data, predicted_days)
    }


def predict_pollination_success(input_data):
    """Predict pollination success rate"""
    model, encoders, scaler = load_model_components('pollination_success')
    
    feature_columns = [
        'gourd_type', 'variety_name', 'season',
        'avg_temperature', 'avg_humidity', 'sunlight_hours',
        'soil_moisture', 'fertilizer_type',
        'plant_health_score', 'vine_length_cm', 'leaf_count',
        'male_flower_count', 'female_flower_count', 'is_hand_pollinated'
    ]
    categorical_columns = ['gourd_type', 'variety_name', 'season', 'fertilizer_type']
    numerical_columns = [
        'avg_temperature', 'avg_humidity', 'sunlight_hours', 'soil_moisture',
        'plant_health_score', 'vine_length_cm', 'leaf_count',
        'male_flower_count', 'female_flower_count', 'is_hand_pollinated'
    ]
    
    # Set defaults
    defaults = {
        'sunlight_hours': 7.0,
        'soil_moisture': 65.0,
        'vine_length_cm': 200.0,
        'leaf_count': 40,
        'is_hand_pollinated': 1
    }
    
    for key, default in defaults.items():
        if key not in input_data or input_data[key] is None:
            input_data[key] = default
    
    df = pd.DataFrame([input_data])
    df_processed = preprocess_data(df, encoders, scaler, categorical_columns, numerical_columns)
    
    X = df_processed[feature_columns]
    
    prediction = model.predict(X)[0]
    success_rate = min(1.0, max(0.0, round(prediction, 3)))
    
    # Calculate expected successful pollinations
    female_count = input_data.get('female_flower_count', 1)
    expected_successes = round(female_count * success_rate)
    
    confidence = calculate_confidence(input_data, 'pollination')
    
    # Days until pollination result is typically known (3-10 days)
    days_to_result = 5 if success_rate > 0.7 else 7
    
    return {
        'success': True,
        'prediction_type': 'pollination_success',
        'success_rate': success_rate,
        'success_rate_percentage': round(success_rate * 100, 1),
        'female_flowers': female_count,
        'expected_successful_pollinations': expected_successes,
        'days_until_result_visible': days_to_result,
        'confidence': confidence,
        'recommendations': get_pollination_recommendations(input_data, success_rate)
    }


def predict_fruit_maturity(input_data):
    """Predict fruit maturity timeline and expected yield"""
    maturity_model = joblib.load(os.path.join(MODELS_DIR, 'fruit_maturity_model.joblib'))
    yield_model = joblib.load(os.path.join(MODELS_DIR, 'fruit_maturity_yield_model.joblib'))
    encoders = joblib.load(os.path.join(MODELS_DIR, 'fruit_maturity_encoders.joblib'))
    scaler = joblib.load(os.path.join(MODELS_DIR, 'fruit_maturity_scaler.joblib'))
    
    feature_columns = [
        'gourd_type', 'variety_name', 'season',
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm',
        'soil_moisture', 'fertilizer_type', 'fertilizer_frequency',
        'plant_health_score', 'successful_pollinations'
    ]
    categorical_columns = ['gourd_type', 'variety_name', 'season', 'fertilizer_type', 'fertilizer_frequency']
    numerical_columns = [
        'avg_temperature', 'avg_humidity', 'avg_rainfall_mm',
        'soil_moisture', 'plant_health_score', 'successful_pollinations'
    ]
    
    # Set defaults
    defaults = {
        'avg_rainfall_mm': 10.0,
        'soil_moisture': 65.0,
        'fertilizer_frequency': 'weekly',
        'plant_health_score': 4
    }
    
    for key, default in defaults.items():
        if key not in input_data or input_data[key] is None:
            input_data[key] = default
    
    df = pd.DataFrame([input_data])
    df_processed = preprocess_data(df, encoders, scaler, categorical_columns, numerical_columns)
    
    X = df_processed[feature_columns]
    
    maturity_days = round(maturity_model.predict(X)[0])
    expected_yield = max(0, round(yield_model.predict(X)[0], 2))
    
    # Calculate harvest date
    from datetime import datetime, timedelta
    pollination_date = input_data.get('pollination_date', datetime.now().strftime('%Y-%m-%d'))
    if isinstance(pollination_date, str):
        pollination_date = datetime.strptime(pollination_date, '%Y-%m-%d')
    
    harvest_date = pollination_date + timedelta(days=maturity_days)
    
    # Get expected fruit count and weight
    successful_pollinations = input_data.get('successful_pollinations', 1)
    fruit_weights = {
        'bitter_gourd': (0.15, 0.50),
        'bottle_gourd': (1.0, 3.5),
        'sponge_gourd': (0.3, 0.8),
        'cucumber': (0.15, 0.40)
    }
    gourd_type = input_data.get('gourd_type', 'bitter_gourd')
    weight_range = fruit_weights.get(gourd_type, (0.3, 1.0))
    avg_weight = (weight_range[0] + weight_range[1]) / 2
    
    confidence = calculate_confidence(input_data, 'maturity')
    
    return {
        'success': True,
        'prediction_type': 'fruit_maturity',
        'days_to_maturity': maturity_days,
        'expected_harvest_date': harvest_date.strftime('%Y-%m-%d'),
        'harvest_range': {
            'earliest': (pollination_date + timedelta(days=max(1, maturity_days - 5))).strftime('%Y-%m-%d'),
            'latest': (pollination_date + timedelta(days=maturity_days + 7)).strftime('%Y-%m-%d')
        },
        'expected_fruits': successful_pollinations,
        'expected_yield_kg': expected_yield,
        'avg_fruit_weight_kg': round(avg_weight, 2),
        'confidence': confidence,
        'recommendations': get_maturity_recommendations(input_data, maturity_days)
    }


def calculate_confidence(input_data, prediction_type):
    """Calculate prediction confidence based on data completeness and quality"""
    base_confidence = 0.75
    
    # Boost for complete data
    if prediction_type == 'flowering':
        required = ['gourd_type', 'avg_temperature', 'avg_humidity', 'fertilizer_type', 'plant_health_score']
    elif prediction_type == 'pollination':
        required = ['gourd_type', 'avg_temperature', 'avg_humidity', 'male_flower_count', 'female_flower_count']
    else:
        required = ['gourd_type', 'avg_temperature', 'avg_humidity', 'successful_pollinations']
    
    completeness = sum(1 for r in required if r in input_data and input_data[r] is not None) / len(required)
    base_confidence += completeness * 0.15
    
    # Health score boost
    health = input_data.get('plant_health_score', 3)
    if health >= 4:
        base_confidence += 0.05
    
    return min(0.95, round(base_confidence, 2))


def get_flowering_recommendations(input_data, predicted_days):
    """Generate recommendations for optimal flowering"""
    recommendations = []
    
    temp = input_data.get('avg_temperature', 28)
    if temp < 25:
        recommendations.append("Temperature is below optimal. Consider greenhouse protection if available.")
    elif temp > 32:
        recommendations.append("High temperatures may stress plants. Ensure adequate watering and mulching.")
    
    humidity = input_data.get('avg_humidity', 70)
    if humidity < 60:
        recommendations.append("Low humidity - consider misting plants in early morning.")
    elif humidity > 85:
        recommendations.append("High humidity increases disease risk. Ensure good air circulation.")
    
    fertilizer = input_data.get('fertilizer_type', 'none')
    if fertilizer == 'none':
        recommendations.append("Apply balanced fertilizer (NPK 10-10-10) to promote healthy flowering.")
    
    health = input_data.get('plant_health_score', 3)
    if health < 3:
        recommendations.append("Improve plant health by addressing nutrient deficiencies or pest issues.")
    
    if not recommendations:
        recommendations.append("Conditions are optimal for flowering. Continue current care routine.")
    
    return recommendations


def get_pollination_recommendations(input_data, success_rate):
    """Generate recommendations for successful pollination"""
    recommendations = []
    
    if success_rate < 0.6:
        recommendations.append("Consider hand pollination in early morning (6-10 AM) for better results.")
    
    is_hand = input_data.get('is_hand_pollinated', 0)
    if not is_hand:
        recommendations.append("Hand pollination typically increases success rate by 15-20%.")
    
    male_count = input_data.get('male_flower_count', 0)
    female_count = input_data.get('female_flower_count', 0)
    if male_count < female_count * 2:
        recommendations.append("More male flowers needed. Ensure at least 2-3 males per female for optimal pollen.")
    
    temp = input_data.get('avg_temperature', 28)
    if temp > 32:
        recommendations.append("High temperature can reduce pollen viability. Pollinate in cool morning hours.")
    
    if not recommendations:
        recommendations.append("Pollination conditions are favorable. Monitor for fruit development in 5-7 days.")
    
    return recommendations


def get_maturity_recommendations(input_data, maturity_days):
    """Generate recommendations for fruit development"""
    recommendations = []
    
    health = input_data.get('plant_health_score', 3)
    if health < 4:
        recommendations.append("Boost plant health with compost tea or foliar fertilizer for better fruit development.")
    
    humidity = input_data.get('avg_humidity', 70)
    if humidity > 85:
        recommendations.append("High humidity may cause fungal issues. Monitor for signs of disease on developing fruits.")
    
    successful = input_data.get('successful_pollinations', 0)
    if successful > 8:
        recommendations.append("Consider thinning some fruits to improve size and quality of remaining ones.")
    
    if maturity_days > 50:
        recommendations.append("Long maturity period ahead. Maintain consistent watering and feeding schedule.")
    
    if not recommendations:
        recommendations.append(f"Monitor fruit development. Expect harvest around {maturity_days} days from pollination.")
    
    return recommendations


def main():
    """Main entry point - read from stdin, output to stdout"""
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        
        if not input_json.strip():
            raise ValueError("No input data provided")
        
        input_data = json.loads(input_json)
        
        # Determine prediction type
        prediction_type = input_data.pop('prediction_type', 'flowering')
        
        # Make prediction based on type
        if prediction_type == 'flowering':
            result = predict_flowering(input_data)
        elif prediction_type == 'pollination_success':
            result = predict_pollination_success(input_data)
        elif prediction_type == 'fruit_maturity':
            result = predict_fruit_maturity(input_data)
        else:
            raise ValueError(f"Unknown prediction type: {prediction_type}")
        
        # Output result
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f"Prediction failed: {str(e)}"
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()
