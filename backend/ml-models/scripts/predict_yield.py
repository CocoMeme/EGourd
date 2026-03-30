#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Yield Prediction Service
Loads trained ML models and makes yield predictions based on plant data
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

def load_models():
    """Load trained yield prediction model and encoder"""
    try:
        models_dir = Path(__file__).parent.parent / 'models'
        
        model = joblib.load(models_dir / 'yield_model.joblib')
        encoder = joblib.load(models_dir / 'yield_encoder.joblib')
        
        # Load metadata for reference
        with open(models_dir / 'yield_model_metadata.json', 'r') as f:
            metadata = json.load(f)
        
        return model, encoder, metadata
    except Exception as e:
        return None, None, {'error': str(e)}

def validate_input(data):
    """Validate input data"""
    required_fields = [
        'plant_type',
        'plant_age_days',
        'vine_length_cm',
        'node_count',
        'male_flower_count',
        'female_flower_count',
        'temperature_celsius',
        'soil_moisture_percent'
    ]
    
    # Check if all required fields are present
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    # Validate plant type
    valid_plant_types = ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber', 'kalabasa']
    if data['plant_type'] not in valid_plant_types:
        return False, f"Invalid plant_type. Must be one of: {', '.join(valid_plant_types)}"
    
    # Validate numeric ranges
    validations = {
        'plant_age_days': (0, 200, 'Plant age must be between 0-200 days'),
        'vine_length_cm': (0, 1000, 'Vine length must be between 0-1000 cm'),
        'node_count': (0, 100, 'Node count must be between 0-100'),
        'male_flower_count': (0, 100, 'Male flower count must be between 0-100'),
        'female_flower_count': (0, 100, 'Female flower count must be between 0-100'),
        'temperature_celsius': (10, 45, 'Temperature must be between 10-45°C'),
        'soil_moisture_percent': (0, 100, 'Soil moisture must be between 0-100%')
    }
    
    for field, (min_val, max_val, error_msg) in validations.items():
        try:
            value = float(data[field])
            if not (min_val <= value <= max_val):
                return False, error_msg
        except (ValueError, TypeError):
            return False, f"{field} must be a valid number"
    
    return True, "Valid"

def get_recommendations(plant_type, predicted_yield, input_data):
    """Generate recommendations based on prediction and input data"""
    recommendations = []
    
    # Plant-specific optimal ranges
    optimal_ranges = {
        'ampalaya_bilog': {
            'age_range': (50, 70),
            'temp_range': (25, 30),
            'moisture_range': (60, 80),
            'base_yield': 2.5
        },
        'upo_smooth': {
            'age_range': (60, 80),
            'temp_range': (26, 31),
            'moisture_range': (65, 85),
            'base_yield': 4.5
        },
        'patola': {
            'age_range': (55, 75),
            'temp_range': (24, 29),
            'moisture_range': (60, 80),
            'base_yield': 2.0
        },
        'cucumber': {
            'age_range': (45, 65),
            'temp_range': (25, 30),
            'moisture_range': (65, 85),
            'base_yield': 3.0
        }
    }
    
    plant_specs = optimal_ranges.get(plant_type, {})
    
    # Age recommendations
    age_min, age_max = plant_specs.get('age_range', (0, 0))
    plant_age = input_data['plant_age_days']
    if plant_age < age_min:
        recommendations.append(f"Plant is still young. Optimal harvest age: {age_min}-{age_max} days")
    elif plant_age > age_max:
        recommendations.append(f"Plant is past optimal age. Best harvest was at {age_min}-{age_max} days")
    else:
        recommendations.append(f"Plant age is optimal for harvesting ({age_min}-{age_max} days)")
    
    # Temperature recommendations
    temp_min, temp_max = plant_specs.get('temp_range', (0, 0))
    temperature = input_data['temperature_celsius']
    if temperature < temp_min:
        recommendations.append(f"Temperature is low. Optimal: {temp_min}-{temp_max}°C. Consider greenhouse or protection")
    elif temperature > temp_max:
        recommendations.append(f"Temperature is high. Optimal: {temp_min}-{temp_max}°C. Increase watering and provide shade")
    else:
        recommendations.append(f"Temperature is optimal ({temp_min}-{temp_max}°C)")
    
    # Moisture recommendations
    moisture_min, moisture_max = plant_specs.get('moisture_range', (0, 0))
    moisture = input_data['soil_moisture_percent']
    if moisture < moisture_min:
        recommendations.append(f"Soil moisture is low. Optimal: {moisture_min}-{moisture_max}%. Increase watering frequency")
    elif moisture > moisture_max:
        recommendations.append(f"Soil moisture is high. Optimal: {moisture_min}-{moisture_max}%. Reduce watering to prevent root rot")
    else:
        recommendations.append(f"Soil moisture is optimal ({moisture_min}-{moisture_max}%)")
    
    # Pollination efficiency
    male_flowers = input_data['male_flower_count']
    female_flowers = input_data['female_flower_count']
    if female_flowers > 0:
        pollination_ratio = male_flowers / female_flowers
        if pollination_ratio < 0.5:
            recommendations.append("Low male-to-female flower ratio. Consider hand pollination or attracting more pollinators")
        elif pollination_ratio > 2.0:
            recommendations.append("High male flower count. Good natural pollination expected")
        else:
            recommendations.append("Balanced flower ratio. Pollination should proceed naturally")
    else:
        recommendations.append("No female flowers detected. Wait for flowering or check plant health")
    
    # Vine development
    vine_length = input_data['vine_length_cm']
    node_count = input_data['node_count']
    if vine_length > 0 and node_count > 0:
        internodal_length = vine_length / node_count
        if internodal_length < 5:
            recommendations.append("Short internodes indicate compact growth. Good node development")
        elif internodal_length > 15:
            recommendations.append("Long internodes. Plant may be etiolated. Ensure adequate light")
    
    # Yield expectations
    base_yield = plant_specs.get('base_yield', 0)
    if predicted_yield < base_yield * 0.5:
        recommendations.append(f"Predicted yield is low ({predicted_yield:.2f} kg). Review all growing conditions")
    elif predicted_yield > base_yield * 1.5:
        recommendations.append(f"Excellent yield expected ({predicted_yield:.2f} kg)! Maintain current practices")
    else:
        recommendations.append(f"Normal yield expected ({predicted_yield:.2f} kg)")
    
    return recommendations

def calculate_confidence_score(input_data, metadata):
    """Calculate confidence score based on input data quality"""
    confidence = 100.0
    
    # Reduce confidence if values are at extremes
    # Age extremes
    if input_data['plant_age_days'] < 30 or input_data['plant_age_days'] > 100:
        confidence -= 10
    
    # Temperature extremes
    if input_data['temperature_celsius'] < 20 or input_data['temperature_celsius'] > 35:
        confidence -= 5
    
    # Moisture extremes
    if input_data['soil_moisture_percent'] < 40 or input_data['soil_moisture_percent'] > 90:
        confidence -= 5
    
    # Very low flower counts
    if input_data['male_flower_count'] < 5 or input_data['female_flower_count'] < 3:
        confidence -= 10
    
    # Vine development issues
    if input_data['vine_length_cm'] < 100:
        confidence -= 5
    
    if input_data['node_count'] < 15:
        confidence -= 5
    
    return max(confidence, 50.0)  # Minimum 50% confidence

def predict_yield(input_data):
    """Make yield prediction"""
    try:
        # Load models
        model, encoder, metadata = load_models()
        if model is None:
            return {
                'success': False,
                'error': metadata.get('error', 'Failed to load model')
            }
        
        # Validate input
        is_valid, message = validate_input(input_data)
        if not is_valid:
            return {
                'success': False,
                'error': message
            }
        
        # Prepare features DataFrame with EXACT column order from training
        features = pd.DataFrame([{
            'plant_type': input_data['plant_type'],
            'plant_age_days': float(input_data['plant_age_days']),
            'vine_length_cm': float(input_data['vine_length_cm']),
            'node_count': float(input_data['node_count']),
            'male_flower_count': float(input_data['male_flower_count']),
            'female_flower_count': float(input_data['female_flower_count']),
            'temperature_celsius': float(input_data['temperature_celsius']),
            'soil_moisture_percent': float(input_data['soil_moisture_percent'])
        }])
        
        # Encode plant type (in-place, just like training)
        features['plant_type'] = encoder.transform(features[['plant_type']])
        
        # Make prediction
        predicted_yield = model.predict(features)[0]
        
        # Ensure non-negative yield
        predicted_yield = max(0, predicted_yield)
        
        # Calculate confidence
        confidence = calculate_confidence_score(input_data, metadata)
        
        # Generate recommendations
        recommendations = get_recommendations(
            input_data['plant_type'],
            predicted_yield,
            input_data
        )
        
        return {
            'success': True,
            'prediction': {
                'yield_kg': round(predicted_yield, 2),
                'confidence_score': round(confidence, 1),
                'plant_type': input_data['plant_type'],
                'recommendations': recommendations
            },
            'input_summary': {
                'plant_age_days': input_data['plant_age_days'],
                'vine_length_cm': input_data['vine_length_cm'],
                'node_count': input_data['node_count'],
                'male_flower_count': input_data['male_flower_count'],
                'female_flower_count': input_data['female_flower_count'],
                'temperature_celsius': input_data['temperature_celsius'],
                'soil_moisture_percent': input_data['soil_moisture_percent']
            },
            'model_info': {
                'test_r2': metadata.get('performance_metrics', {}).get('test', {}).get('r2'),
                'test_mae': metadata.get('performance_metrics', {}).get('test', {}).get('mae')
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Prediction error: {str(e)}'
        }

def main():
    """Main function - reads JSON from stdin and outputs prediction"""
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        input_data = json.loads(input_json)
        
        # Make prediction
        result = predict_yield(input_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        error_result = {
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }
        print(json.dumps(error_result, indent=2))
    except Exception as e:
        error_result = {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }
        print(json.dumps(error_result, indent=2))

if __name__ == '__main__':
    main()
