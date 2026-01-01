"""
Flower Production Prediction Service
====================================

Loads trained ML models and performs predictions for flower production
based on plant characteristics and environmental conditions.

Input: JSON with plant features
Output: JSON with male/female flower predictions and confidence score
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

class FlowerPredictor:
    def __init__(self, models_dir='../models'):
        """Initialize predictor with trained models"""
        self.models_dir = Path(__file__).parent / models_dir
        
        try:
            self.male_model = joblib.load(self.models_dir / 'male_flower_model.joblib')
            self.female_model = joblib.load(self.models_dir / 'female_flower_model.joblib')
            self.encoders = joblib.load(self.models_dir / 'encoders.joblib')
            
            with open(self.models_dir / 'model_metadata.json', 'r') as f:
                self.metadata = json.load(f)
            
            self.feature_names = self.metadata['feature_names']
            
        except FileNotFoundError as e:
            raise Exception(f"Model files not found. Please train models first. Error: {e}")
    
    def validate_input(self, data):
        """Validate input data"""
        required_fields = [
            'plantType', 'plantAge', 'environmental', 'care', 'growth'
        ]
        
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Validate plant type
        valid_plants = ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber']
        if data['plantType'] not in valid_plants:
            raise ValueError(f"Invalid plant type. Must be one of: {valid_plants}")
        
        return True
    
    def preprocess_input(self, data):
        """Convert input JSON to model features"""
        
        # Extract data
        env = data['environmental']
        care = data['care']
        growth = data['growth']
        
        # Create feature dictionary
        features = {
            'plant_type': data['plantType'],
            'plant_age': data['plantAge'],
            'temperature': env['temperature'],
            'humidity': env['humidity'],
            'sunlight_hours': env['sunlightHours'],
            'soil_ph': env.get('soilPH', 6.5),
            'soil_type': env.get('soilType', 'loamy'),
            'watering_frequency': care['wateringFrequency'],
            'fertilizer_type': care['fertilizerType'],
            'fertilizer_frequency': care.get('fertilizerFrequency', 2),
            'pest_control': care.get('pestControl', 'as-needed'),
            'height': growth['height'],
            'leaf_count': growth['leafCount'],
            'stem_thickness': growth['stemThickness'],
            'health_rating': growth['healthRating']
        }
        
        # Create DataFrame
        df = pd.DataFrame([features])
        
        # Encode categorical features
        categorical_cols = ['plant_type', 'soil_type', 'fertilizer_type', 'pest_control']
        for col in categorical_cols:
            if col in self.encoders:
                try:
                    df[col] = self.encoders[col].transform(df[col])
                except ValueError:
                    # Handle unknown categories by using the most common class
                    df[col] = 0
        
        # Ensure correct feature order
        df = df[self.feature_names]
        
        return df
    
    def calculate_confidence(self, male_pred, female_pred, input_data):
        """Calculate prediction confidence based on input quality"""
        
        confidence = 100.0
        
        # Age factor
        plant_age = input_data['plantAge']
        if plant_age < 30:
            confidence -= 15
        elif plant_age > 100:
            confidence -= 10
        
        # Temperature factor
        temp = input_data['environmental']['temperature']
        if temp < 20 or temp > 35:
            confidence -= 15
        elif 25 <= temp <= 30:
            confidence += 5
        
        # Humidity factor
        humidity = input_data['environmental']['humidity']
        if humidity < 50 or humidity > 90:
            confidence -= 10
        elif 60 <= humidity <= 80:
            confidence += 5
        
        # Sunlight factor
        sunlight = input_data['environmental']['sunlightHours']
        if sunlight < 4:
            confidence -= 15
        elif 6 <= sunlight <= 8:
            confidence += 5
        
        # Health rating factor
        health = input_data['growth']['healthRating']
        if health <= 2:
            confidence -= 20
        elif health >= 4:
            confidence += 10
        
        # Watering factor
        watering = input_data['care']['wateringFrequency']
        if watering < 2:
            confidence -= 15
        elif 3 <= watering <= 5:
            confidence += 5
        
        return max(40, min(100, confidence))
    
    def generate_recommendations(self, input_data, male_pred, female_pred):
        """Generate recommendations based on input conditions"""
        
        recommendations = []
        env = input_data['environmental']
        care = input_data['care']
        growth = input_data['growth']
        
        # Temperature recommendations
        if env['temperature'] < 20:
            recommendations.append({
                'category': 'temperature',
                'suggestion': 'Temperature is too low. Consider using row covers or greenhouse protection to maintain optimal temperature (25-30°C).',
                'priority': 'high'
            })
        elif env['temperature'] > 35:
            recommendations.append({
                'category': 'temperature',
                'suggestion': 'Temperature is too high. Use shade cloth during peak heat hours and ensure adequate watering.',
                'priority': 'high'
            })
        
        # Humidity recommendations
        if env['humidity'] < 50:
            recommendations.append({
                'category': 'general',
                'suggestion': 'Low humidity detected. Increase watering frequency and consider mulching to retain moisture.',
                'priority': 'medium'
            })
        elif env['humidity'] > 90:
            recommendations.append({
                'category': 'general',
                'suggestion': 'Very high humidity may promote disease. Ensure good air circulation and avoid overhead watering.',
                'priority': 'medium'
            })
        
        # Sunlight recommendations
        if env['sunlightHours'] < 6:
            recommendations.append({
                'category': 'sunlight',
                'suggestion': 'Insufficient sunlight. Relocate plant to area with 6-8 hours of direct sunlight or prune surrounding vegetation.',
                'priority': 'high'
            })
        
        # Soil pH recommendations
        soil_ph = env.get('soilPH', 6.5)
        if soil_ph < 6.0:
            recommendations.append({
                'category': 'soil',
                'suggestion': 'Soil pH is too low. Add lime to raise pH to 6.0-6.8 range for optimal nutrient availability.',
                'priority': 'high'
            })
        elif soil_ph > 7.0:
            recommendations.append({
                'category': 'soil',
                'suggestion': 'Soil pH is too high. Add sulfur or organic matter to lower pH to 6.0-6.8 range.',
                'priority': 'high'
            })
        
        # Watering recommendations
        if care['wateringFrequency'] < 3:
            recommendations.append({
                'category': 'watering',
                'suggestion': 'Increase watering to 3-5 times per week. Consistent moisture is critical during flowering.',
                'priority': 'high'
            })
        elif care['wateringFrequency'] > 7:
            recommendations.append({
                'category': 'watering',
                'suggestion': 'Reduce watering frequency. Overwatering can lead to root rot and reduced flowering.',
                'priority': 'medium'
            })
        
        # Fertilizer recommendations
        if care['fertilizerType'] == 'none':
            recommendations.append({
                'category': 'fertilizer',
                'suggestion': 'Apply balanced fertilizer (NPK 10-10-10) or compost monthly to support healthy flowering.',
                'priority': 'high'
            })
        
        # Pest control recommendations
        if care.get('pestControl') == 'none':
            recommendations.append({
                'category': 'pest-control',
                'suggestion': 'Implement regular pest monitoring. Early detection prevents damage to flowers and fruits.',
                'priority': 'medium'
            })
        
        # Health recommendations
        if growth['healthRating'] <= 2:
            recommendations.append({
                'category': 'general',
                'suggestion': 'Poor plant health detected. Focus on improving overall plant vigor through proper nutrition, watering, and pest management.',
                'priority': 'high'
            })
        
        # Age recommendations
        if input_data['plantAge'] < 30:
            recommendations.append({
                'category': 'general',
                'suggestion': 'Plant is young. Expect flower production to increase as plant matures.',
                'priority': 'medium'
            })
        
        # General tip
        recommendations.append({
            'category': 'general',
            'suggestion': f"For {input_data['plantType']}, maintain consistent moisture during flowering period to maximize production.",
            'priority': 'low'
        })
        
        return recommendations
    
    def generate_influencing_factors(self, input_data):
        """Identify factors affecting flower production"""
        
        factors = []
        env = input_data['environmental']
        care = input_data['care']
        growth = input_data['growth']
        
        # Temperature
        temp = env['temperature']
        if 25 <= temp <= 30:
            factors.append({
                'factor': 'Temperature',
                'impact': 'positive',
                'description': 'Temperature is in optimal range for flowering'
            })
        elif temp < 20 or temp > 35:
            factors.append({
                'factor': 'Temperature',
                'impact': 'negative',
                'description': f'Temperature ({temp}°C) is outside optimal range (25-30°C)'
            })
        
        # Sunlight
        sunlight = env['sunlightHours']
        if 6 <= sunlight <= 8:
            factors.append({
                'factor': 'Sunlight',
                'impact': 'positive',
                'description': 'Sunlight exposure is optimal'
            })
        elif sunlight < 4:
            factors.append({
                'factor': 'Sunlight',
                'impact': 'negative',
                'description': f'Low sunlight ({sunlight}hrs) significantly reduces flowering'
            })
        
        # Health
        health = growth['healthRating']
        if health >= 4:
            factors.append({
                'factor': 'Plant Health',
                'impact': 'positive',
                'description': 'Good plant health promotes strong flowering'
            })
        elif health <= 2:
            factors.append({
                'factor': 'Plant Health',
                'impact': 'negative',
                'description': 'Poor plant health severely limits flowering'
            })
        
        # Watering
        watering = care['wateringFrequency']
        if 3 <= watering <= 5:
            factors.append({
                'factor': 'Watering',
                'impact': 'positive',
                'description': 'Watering frequency is optimal'
            })
        elif watering < 2:
            factors.append({
                'factor': 'Watering',
                'impact': 'negative',
                'description': 'Insufficient watering reduces flowering significantly'
            })
        
        # Fertilizer
        if care['fertilizerType'] in ['organic', 'mixed']:
            factors.append({
                'factor': 'Fertilization',
                'impact': 'positive',
                'description': 'Good fertilization promotes healthy flowering'
            })
        elif care['fertilizerType'] == 'none':
            factors.append({
                'factor': 'Fertilization',
                'impact': 'negative',
                'description': 'No fertilizer use limits nutrient availability for flowering'
            })
        
        return factors
    
    def predict(self, input_data):
        """Make prediction from input data"""
        
        # Validate input
        self.validate_input(input_data)
        
        # Preprocess
        features = self.preprocess_input(input_data)
        
        # Predict
        male_pred = self.male_model.predict(features)[0]
        female_pred = self.female_model.predict(features)[0]
        
        # Round predictions
        male_pred = max(1, int(round(male_pred)))
        female_pred = max(1, int(round(female_pred)))
        
        # Calculate ranges (±20%)
        male_min = max(1, int(male_pred * 0.8))
        male_max = int(male_pred * 1.2)
        female_min = max(1, int(female_pred * 0.8))
        female_max = int(female_pred * 1.2)
        
        # Calculate confidence
        confidence = self.calculate_confidence(male_pred, female_pred, input_data)
        
        # Generate recommendations
        recommendations = self.generate_recommendations(input_data, male_pred, female_pred)
        
        # Generate influencing factors
        influencing_factors = self.generate_influencing_factors(input_data)
        
        # Build result
        result = {
            'maleFlowers': {
                'min': male_min,
                'max': male_max,
                'average': male_pred
            },
            'femaleFlowers': {
                'min': female_min,
                'max': female_max,
                'average': female_pred
            },
            'confidence': int(confidence),
            'influencingFactors': influencing_factors,
            'recommendations': recommendations
        }
        
        return result

def main():
    """Main entry point for CLI usage"""
    
    try:
        # Read input from stdin
        input_json = sys.stdin.read()
        input_data = json.loads(input_json)
        
        # Initialize predictor
        predictor = FlowerPredictor()
        
        # Make prediction
        result = predictor.predict(input_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
        sys.exit(0)
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'message': 'Prediction failed'
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
