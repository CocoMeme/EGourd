"""
Gourd Pollination Management ML Training Script
================================================

Trains multiple ML models for the pollination management system:
1. Flowering Prediction Model - Predicts days until first flower
2. Pollination Success Model - Predicts likelihood of successful pollination
3. Fruit Maturity Model - Predicts days to fruit maturity and yield

Uses Random Forest and Gradient Boosting algorithms.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score
import joblib
import json
import os
from datetime import datetime

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'data')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')

# Ensure models directory exists
os.makedirs(MODELS_DIR, exist_ok=True)


class FloweringPredictionModel:
    """Predicts days until first flower appears"""
    
    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        self.encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = [
            'gourd_type', 'variety_name', 'season', 'region_climate',
            'avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours',
            'soil_ph', 'soil_moisture', 'soil_type',
            'fertilizer_type', 'fertilizer_frequency', 'watering_frequency',
            'plant_health_score'
        ]
        self.categorical_columns = [
            'gourd_type', 'variety_name', 'season', 'region_climate',
            'soil_type', 'fertilizer_type', 'fertilizer_frequency', 'watering_frequency'
        ]
        self.numerical_columns = [
            'avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours',
            'soil_ph', 'soil_moisture', 'plant_health_score'
        ]
    
    def preprocess(self, df, fit=False):
        """Encode categorical variables and scale numerical ones"""
        df_processed = df.copy()
        
        # Encode categorical columns
        for col in self.categorical_columns:
            if col in df_processed.columns:
                if fit:
                    self.encoders[col] = LabelEncoder()
                    df_processed[col] = self.encoders[col].fit_transform(df_processed[col].astype(str))
                else:
                    # Handle unseen labels
                    df_processed[col] = df_processed[col].astype(str)
                    known_labels = set(self.encoders[col].classes_)
                    df_processed[col] = df_processed[col].apply(
                        lambda x: x if x in known_labels else self.encoders[col].classes_[0]
                    )
                    df_processed[col] = self.encoders[col].transform(df_processed[col])
        
        # Scale numerical columns
        if fit:
            df_processed[self.numerical_columns] = self.scaler.fit_transform(
                df_processed[self.numerical_columns]
            )
        else:
            df_processed[self.numerical_columns] = self.scaler.transform(
                df_processed[self.numerical_columns]
            )
        
        return df_processed
    
    def train(self, data_path):
        """Train the flowering prediction model"""
        print("\n" + "="*60)
        print("Training Flowering Prediction Model")
        print("="*60)
        
        # Load data
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records")
        
        # Prepare features and target
        X = df[self.feature_columns]
        y = df['predicted_days_to_flower']
        
        # Preprocess
        X_processed = self.preprocess(X, fit=True)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y, test_size=0.2, random_state=42
        )
        
        # Train model
        print("Training Random Forest model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'r2': r2_score(y_test, y_pred)
        }
        
        print(f"\nTest Results:")
        print(f"  MAE: {metrics['mae']:.2f} days")
        print(f"  RMSE: {metrics['rmse']:.2f} days")
        print(f"  R² Score: {metrics['r2']:.4f}")
        
        # Feature importance
        importance = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        print(f"\nTop 5 Important Features:")
        for _, row in importance.head().iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")
        
        return metrics
    
    def save(self, prefix='flowering'):
        """Save model and encoders"""
        joblib.dump(self.model, os.path.join(MODELS_DIR, f'{prefix}_model.joblib'))
        joblib.dump(self.encoders, os.path.join(MODELS_DIR, f'{prefix}_encoders.joblib'))
        joblib.dump(self.scaler, os.path.join(MODELS_DIR, f'{prefix}_scaler.joblib'))
        print(f"Model saved to {MODELS_DIR}")
    
    def predict(self, input_data):
        """Make prediction for new data"""
        df = pd.DataFrame([input_data])
        X_processed = self.preprocess(df, fit=False)
        prediction = self.model.predict(X_processed)[0]
        return round(prediction)


class PollinationSuccessModel:
    """Predicts pollination success rate"""
    
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=5,
            random_state=42
        )
        self.encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = [
            'gourd_type', 'variety_name', 'season',
            'avg_temperature', 'avg_humidity', 'sunlight_hours',
            'soil_moisture', 'fertilizer_type',
            'plant_health_score', 'vine_length_cm', 'leaf_count',
            'male_flower_count', 'female_flower_count', 'is_hand_pollinated'
        ]
        self.categorical_columns = ['gourd_type', 'variety_name', 'season', 'fertilizer_type']
        self.numerical_columns = [
            'avg_temperature', 'avg_humidity', 'sunlight_hours', 'soil_moisture',
            'plant_health_score', 'vine_length_cm', 'leaf_count',
            'male_flower_count', 'female_flower_count', 'is_hand_pollinated'
        ]
    
    def preprocess(self, df, fit=False):
        """Preprocess data for model"""
        df_processed = df.copy()
        
        for col in self.categorical_columns:
            if col in df_processed.columns:
                if fit:
                    self.encoders[col] = LabelEncoder()
                    df_processed[col] = self.encoders[col].fit_transform(df_processed[col].astype(str))
                else:
                    df_processed[col] = df_processed[col].astype(str)
                    known_labels = set(self.encoders[col].classes_)
                    df_processed[col] = df_processed[col].apply(
                        lambda x: x if x in known_labels else self.encoders[col].classes_[0]
                    )
                    df_processed[col] = self.encoders[col].transform(df_processed[col])
        
        if fit:
            df_processed[self.numerical_columns] = self.scaler.fit_transform(
                df_processed[self.numerical_columns]
            )
        else:
            df_processed[self.numerical_columns] = self.scaler.transform(
                df_processed[self.numerical_columns]
            )
        
        return df_processed
    
    def train(self, data_path):
        """Train the pollination success model"""
        print("\n" + "="*60)
        print("Training Pollination Success Model")
        print("="*60)
        
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records")
        
        X = df[self.feature_columns]
        y = df['pollination_success_rate']
        
        X_processed = self.preprocess(X, fit=True)
        
        X_train, X_test, y_train, y_test = train_test_split(
            X_processed, y, test_size=0.2, random_state=42
        )
        
        print("Training Gradient Boosting model...")
        self.model.fit(X_train, y_train)
        
        y_pred = self.model.predict(X_test)
        
        metrics = {
            'mae': mean_absolute_error(y_test, y_pred),
            'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
            'r2': r2_score(y_test, y_pred)
        }
        
        print(f"\nTest Results:")
        print(f"  MAE: {metrics['mae']:.4f}")
        print(f"  RMSE: {metrics['rmse']:.4f}")
        print(f"  R² Score: {metrics['r2']:.4f}")
        
        importance = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        print(f"\nTop 5 Important Features:")
        for _, row in importance.head().iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")
        
        return metrics
    
    def save(self, prefix='pollination_success'):
        """Save model and preprocessors"""
        joblib.dump(self.model, os.path.join(MODELS_DIR, f'{prefix}_model.joblib'))
        joblib.dump(self.encoders, os.path.join(MODELS_DIR, f'{prefix}_encoders.joblib'))
        joblib.dump(self.scaler, os.path.join(MODELS_DIR, f'{prefix}_scaler.joblib'))
        print(f"Model saved to {MODELS_DIR}")
    
    def predict(self, input_data):
        """Predict pollination success rate"""
        df = pd.DataFrame([input_data])
        X_processed = self.preprocess(df, fit=False)
        prediction = self.model.predict(X_processed)[0]
        return min(1.0, max(0.0, round(prediction, 3)))


class FruitMaturityModel:
    """Predicts days to fruit maturity and expected yield"""
    
    def __init__(self):
        self.maturity_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.yield_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=12,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.encoders = {}
        self.scaler = StandardScaler()
        self.feature_columns = [
            'gourd_type', 'variety_name', 'season',
            'avg_temperature', 'avg_humidity', 'avg_rainfall_mm',
            'soil_moisture', 'fertilizer_type', 'fertilizer_frequency',
            'plant_health_score', 'successful_pollinations'
        ]
        self.categorical_columns = ['gourd_type', 'variety_name', 'season', 'fertilizer_type', 'fertilizer_frequency']
        self.numerical_columns = [
            'avg_temperature', 'avg_humidity', 'avg_rainfall_mm',
            'soil_moisture', 'plant_health_score', 'successful_pollinations'
        ]
    
    def preprocess(self, df, fit=False):
        """Preprocess data"""
        df_processed = df.copy()
        
        for col in self.categorical_columns:
            if col in df_processed.columns:
                if fit:
                    self.encoders[col] = LabelEncoder()
                    df_processed[col] = self.encoders[col].fit_transform(df_processed[col].astype(str))
                else:
                    df_processed[col] = df_processed[col].astype(str)
                    known_labels = set(self.encoders[col].classes_)
                    df_processed[col] = df_processed[col].apply(
                        lambda x: x if x in known_labels else self.encoders[col].classes_[0]
                    )
                    df_processed[col] = self.encoders[col].transform(df_processed[col])
        
        if fit:
            df_processed[self.numerical_columns] = self.scaler.fit_transform(
                df_processed[self.numerical_columns]
            )
        else:
            df_processed[self.numerical_columns] = self.scaler.transform(
                df_processed[self.numerical_columns]
            )
        
        return df_processed
    
    def train(self, data_path):
        """Train maturity and yield models"""
        print("\n" + "="*60)
        print("Training Fruit Maturity & Yield Models")
        print("="*60)
        
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records")
        
        X = df[self.feature_columns]
        y_maturity = df['predicted_days_to_maturity']
        y_yield = df['total_yield_kg']
        
        X_processed = self.preprocess(X, fit=True)
        
        # Train maturity model
        X_train, X_test, y_mat_train, y_mat_test = train_test_split(
            X_processed, y_maturity, test_size=0.2, random_state=42
        )
        
        print("Training maturity prediction model...")
        self.maturity_model.fit(X_train, y_mat_train)
        
        y_mat_pred = self.maturity_model.predict(X_test)
        maturity_metrics = {
            'mae': mean_absolute_error(y_mat_test, y_mat_pred),
            'rmse': np.sqrt(mean_squared_error(y_mat_test, y_mat_pred)),
            'r2': r2_score(y_mat_test, y_mat_pred)
        }
        
        print(f"\nMaturity Model Test Results:")
        print(f"  MAE: {maturity_metrics['mae']:.2f} days")
        print(f"  RMSE: {maturity_metrics['rmse']:.2f} days")
        print(f"  R² Score: {maturity_metrics['r2']:.4f}")
        
        # Train yield model
        X_train, X_test, y_yield_train, y_yield_test = train_test_split(
            X_processed, y_yield, test_size=0.2, random_state=42
        )
        
        print("\nTraining yield prediction model...")
        self.yield_model.fit(X_train, y_yield_train)
        
        y_yield_pred = self.yield_model.predict(X_test)
        yield_metrics = {
            'mae': mean_absolute_error(y_yield_test, y_yield_pred),
            'rmse': np.sqrt(mean_squared_error(y_yield_test, y_yield_pred)),
            'r2': r2_score(y_yield_test, y_yield_pred)
        }
        
        print(f"\nYield Model Test Results:")
        print(f"  MAE: {yield_metrics['mae']:.2f} kg")
        print(f"  RMSE: {yield_metrics['rmse']:.2f} kg")
        print(f"  R² Score: {yield_metrics['r2']:.4f}")
        
        return {'maturity': maturity_metrics, 'yield': yield_metrics}
    
    def save(self, prefix='fruit_maturity'):
        """Save models and preprocessors"""
        joblib.dump(self.maturity_model, os.path.join(MODELS_DIR, f'{prefix}_model.joblib'))
        joblib.dump(self.yield_model, os.path.join(MODELS_DIR, f'{prefix}_yield_model.joblib'))
        joblib.dump(self.encoders, os.path.join(MODELS_DIR, f'{prefix}_encoders.joblib'))
        joblib.dump(self.scaler, os.path.join(MODELS_DIR, f'{prefix}_scaler.joblib'))
        print(f"Models saved to {MODELS_DIR}")
    
    def predict(self, input_data):
        """Predict maturity days and yield"""
        df = pd.DataFrame([input_data])
        X_processed = self.preprocess(df, fit=False)
        
        maturity_days = self.maturity_model.predict(X_processed)[0]
        expected_yield = self.yield_model.predict(X_processed)[0]
        
        return {
            'days_to_maturity': round(maturity_days),
            'expected_yield_kg': round(max(0, expected_yield), 2)
        }


def train_all_models():
    """Train and save all prediction models"""
    print("\n" + "="*70)
    print("  GOURD POLLINATION MANAGEMENT - ML MODEL TRAINING")
    print("="*70)
    print(f"Training started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    all_metrics = {}
    
    # 1. Flowering Prediction Model
    flowering_model = FloweringPredictionModel()
    flowering_metrics = flowering_model.train(
        os.path.join(DATA_DIR, 'flowering_prediction_dataset.csv')
    )
    flowering_model.save('flowering')
    all_metrics['flowering'] = flowering_metrics
    
    # 2. Pollination Success Model
    pollination_model = PollinationSuccessModel()
    pollination_metrics = pollination_model.train(
        os.path.join(DATA_DIR, 'pollination_success_dataset.csv')
    )
    pollination_model.save('pollination_success')
    all_metrics['pollination_success'] = pollination_metrics
    
    # 3. Fruit Maturity Model
    maturity_model = FruitMaturityModel()
    maturity_metrics = maturity_model.train(
        os.path.join(DATA_DIR, 'fruit_maturity_dataset.csv')
    )
    maturity_model.save('fruit_maturity')
    all_metrics['fruit_maturity'] = maturity_metrics
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'models': {
            'flowering_prediction': {
                'description': 'Predicts days until first flower appears',
                'algorithm': 'Random Forest Regressor',
                'metrics': flowering_metrics,
                'files': ['flowering_model.joblib', 'flowering_encoders.joblib', 'flowering_scaler.joblib']
            },
            'pollination_success': {
                'description': 'Predicts pollination success rate (0-1)',
                'algorithm': 'Gradient Boosting Regressor',
                'metrics': pollination_metrics,
                'files': ['pollination_success_model.joblib', 'pollination_success_encoders.joblib', 'pollination_success_scaler.joblib']
            },
            'fruit_maturity': {
                'description': 'Predicts days to fruit maturity and expected yield',
                'algorithm': 'Random Forest Regressor',
                'metrics': maturity_metrics,
                'files': ['fruit_maturity_model.joblib', 'fruit_maturity_yield_model.joblib', 'fruit_maturity_encoders.joblib', 'fruit_maturity_scaler.joblib']
            }
        },
        'input_features': {
            'gourd_types': ['bitter_gourd', 'bottle_gourd', 'sponge_gourd', 'cucumber'],
            'seasons': ['wet', 'dry'],
            'environmental': ['avg_temperature', 'avg_humidity', 'avg_rainfall_mm', 'sunlight_hours', 'soil_ph', 'soil_moisture'],
            'care': ['fertilizer_type', 'fertilizer_frequency', 'watering_frequency'],
            'plant_metrics': ['plant_health_score', 'vine_length_cm', 'leaf_count', 'flower_counts']
        }
    }
    
    with open(os.path.join(MODELS_DIR, 'pollination_models_metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("\n" + "="*70)
    print("  TRAINING COMPLETE!")
    print("="*70)
    print(f"\nAll models saved to: {MODELS_DIR}")
    print(f"Training completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    return all_metrics


if __name__ == '__main__':
    train_all_models()
