"""
ML Training Pipeline for Yield Prediction
==========================================

Trains Random Forest Regressor model to predict fruit yield (kg) from
plant growth metrics and environmental conditions.

Features (7):
- plant_age_days, vine_length_cm, node_count
- male_flower_count, female_flower_count
- temperature_celsius, soil_moisture_percent

Target:
- yield_kg
"""

import pandas as pd
import numpy as np
import joblib
import json
from datetime import datetime
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

class YieldPredictionModel:
    def __init__(self):
        self.model = None
        self.encoder = None
        self.feature_names = []
        self.performance_metrics = {}
        
    def load_and_preprocess_data(self, data_path):
        """Load and preprocess the dataset"""
        print("Loading yield dataset...")
        df = pd.read_csv(data_path)
        
        print(f"Dataset shape: {df.shape}")
        print(f"Plant types: {df['plant_type'].unique()}")
        
        # Separate features and target
        X = df.drop('yield_kg', axis=1).copy()
        y = df['yield_kg']
        
        # Encode plant_type
        self.encoder = LabelEncoder()
        X['plant_type'] = self.encoder.fit_transform(X['plant_type'])
        
        self.feature_names = X.columns.tolist()
        
        return X, y
    
    def train_model(self, X, y):
        """Train yield prediction model"""
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        print(f"\nTraining set size: {len(X_train)}")
        print(f"Test set size: {len(X_test)}")
        
        print("\n" + "="*60)
        print("Training Yield Prediction Model...")
        print("="*60)
        
        self.model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred_train = self.model.predict(X_train)
        y_pred_test = self.model.predict(X_test)
        
        self.performance_metrics = {
            'train': {
                'mae': mean_absolute_error(y_train, y_pred_train),
                'rmse': np.sqrt(mean_squared_error(y_train, y_pred_train)),
                'r2': r2_score(y_train, y_pred_train)
            },
            'test': {
                'mae': mean_absolute_error(y_test, y_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_test, y_pred_test)),
                'r2': r2_score(y_test, y_pred_test)
            }
        }
        
        print(f"\nYield Prediction Model Performance:")
        print(f"  Train MAE: {self.performance_metrics['train']['mae']:.3f} kg")
        print(f"  Train RMSE: {self.performance_metrics['train']['rmse']:.3f} kg")
        print(f"  Train R²: {self.performance_metrics['train']['r2']:.4f}")
        print(f"  Test MAE: {self.performance_metrics['test']['mae']:.3f} kg")
        print(f"  Test RMSE: {self.performance_metrics['test']['rmse']:.3f} kg")
        print(f"  Test R²: {self.performance_metrics['test']['r2']:.4f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train, y_train, 
                                    cv=5, scoring='neg_mean_absolute_error', n_jobs=-1)
        self.performance_metrics['cv_mae'] = -cv_scores.mean()
        self.performance_metrics['cv_mae_std'] = cv_scores.std()
        print(f"  5-Fold CV MAE: {self.performance_metrics['cv_mae']:.3f} (+/- {self.performance_metrics['cv_mae_std']:.3f}) kg")
        
        return X_test, y_test, y_pred_test
    
    def analyze_feature_importance(self):
        """Analyze and display feature importance"""
        print("\n" + "="*60)
        print("Feature Importance Analysis")
        print("="*60)
        
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nFeature Importance:")
        print(importance.to_string(index=False))
        
        return importance
    
    def save_models(self, output_dir):
        """Save trained model and metadata"""
        print("\n" + "="*60)
        print("Saving Model...")
        print("="*60)
        
        # Save model
        model_path = f"{output_dir}/yield_model.joblib"
        encoder_path = f"{output_dir}/yield_encoder.joblib"
        
        joblib.dump(self.model, model_path)
        joblib.dump(self.encoder, encoder_path)
        
        print(f"✓ Model saved: {model_path}")
        print(f"✓ Encoder saved: {encoder_path}")
        
        # Save metadata
        metadata = {
            'trained_at': datetime.now().isoformat(),
            'version': '1.0',
            'feature_names': self.feature_names,
            'performance_metrics': self.performance_metrics,
            'model_params': {
                'n_estimators': 200,
                'max_depth': 20,
                'min_samples_split': 5,
                'min_samples_leaf': 2
            },
            'plant_types': self.encoder.classes_.tolist(),
            'label_encodings': {
                int(i): label for i, label in enumerate(self.encoder.classes_)
            }
        }
        
        metadata_path = f"{output_dir}/yield_model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✓ Metadata saved: {metadata_path}")
    
    def create_visualizations(self, X_test, y_test, y_pred_test, output_dir):
        """Create performance visualization plots"""
        print("\n" + "="*60)
        print("Creating Visualizations...")
        print("="*60)
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Actual vs Predicted
        axes[0, 0].scatter(y_test, y_pred_test, alpha=0.5, s=20)
        axes[0, 0].plot([y_test.min(), y_test.max()], 
                       [y_test.min(), y_test.max()], 
                       'r--', lw=2)
        axes[0, 0].set_xlabel('Actual Yield (kg)')
        axes[0, 0].set_ylabel('Predicted Yield (kg)')
        axes[0, 0].set_title(f'Yield Prediction: Actual vs Predicted\nR² = {self.performance_metrics["test"]["r2"]:.4f}')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Residuals
        residuals = y_test - y_pred_test
        axes[0, 1].scatter(y_pred_test, residuals, alpha=0.5, s=20)
        axes[0, 1].axhline(y=0, color='r', linestyle='--', lw=2)
        axes[0, 1].set_xlabel('Predicted Yield (kg)')
        axes[0, 1].set_ylabel('Residuals (kg)')
        axes[0, 1].set_title(f'Residual Plot\nMAE = {self.performance_metrics["test"]["mae"]:.3f} kg')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Distribution comparison
        axes[1, 0].hist(y_test, bins=30, alpha=0.5, label='Actual', color='blue')
        axes[1, 0].hist(y_pred_test, bins=30, alpha=0.5, label='Predicted', color='orange')
        axes[1, 0].set_xlabel('Yield (kg)')
        axes[1, 0].set_ylabel('Frequency')
        axes[1, 0].set_title('Distribution: Actual vs Predicted')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
        
        # Feature importance
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.model.feature_importances_
        }).sort_values('importance', ascending=True)
        
        axes[1, 1].barh(importance['feature'], importance['importance'])
        axes[1, 1].set_xlabel('Importance')
        axes[1, 1].set_title('Feature Importance')
        axes[1, 1].grid(True, alpha=0.3, axis='x')
        
        plt.tight_layout()
        plot_path = f"{output_dir}/yield_model_performance.png"
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        print(f"✓ Performance plots saved: {plot_path}")
        plt.close()

def main():
    print("="*60)
    print("Yield Prediction ML Training Pipeline")
    print("="*60)
    
    # Initialize model
    model = YieldPredictionModel()
    
    # Load and preprocess data
    X, y = model.load_and_preprocess_data('../data/yield_prediction_dataset.csv')
    
    # Train model
    X_test, y_test, y_pred_test = model.train_model(X, y)
    
    # Analyze feature importance
    model.analyze_feature_importance()
    
    # Save model
    model.save_models('../models')
    
    # Create visualizations
    model.create_visualizations(X_test, y_test, y_pred_test, '../models')
    
    print("\n" + "="*60)
    print("✓ Training Complete!")
    print("="*60)
    print(f"\nModel files location: backend/ml-models/models/")
    print(f"  - yield_model.joblib")
    print(f"  - yield_encoder.joblib")
    print(f"  - yield_model_metadata.json")
    print(f"  - yield_model_performance.png")

if __name__ == '__main__':
    main()
