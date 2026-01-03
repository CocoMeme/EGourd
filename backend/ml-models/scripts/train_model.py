"""
ML Training Pipeline for Flower Production Prediction
=====================================================

Trains Random Forest Regressor models to predict male and female flower
production from environmental, care, and growth features.

Features:
- Multi-output regression (male and female flowers)
- Cross-validation with performance metrics
- Feature importance analysis
- Model persistence (joblib)
- Performance visualization
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
matplotlib.use('Agg')  # Non-GUI backend
import matplotlib.pyplot as plt

class FlowerProductionModel:
    def __init__(self):
        self.male_model = None
        self.female_model = None
        self.encoders = {}
        self.feature_names = []
        self.performance_metrics = {}
        
    def load_and_preprocess_data(self, data_path):
        """Load and preprocess the dataset"""
        print("Loading dataset...")
        df = pd.read_csv(data_path)
        
        print(f"Dataset shape: {df.shape}")
        print(f"Plant types: {df['plant_type'].unique()}")
        
        # Separate features and targets
        feature_cols = [col for col in df.columns if col not in ['male_flowers', 'female_flowers']]
        X = df[feature_cols].copy()
        y_male = df['male_flowers']
        y_female = df['female_flowers']
        
        # Encode categorical features
        categorical_cols = ['plant_type', 'soil_type', 'fertilizer_type', 'pest_control']
        
        for col in categorical_cols:
            self.encoders[col] = LabelEncoder()
            X[col] = self.encoders[col].fit_transform(X[col])
        
        self.feature_names = X.columns.tolist()
        
        return X, y_male, y_female
    
    def train_models(self, X, y_male, y_female):
        """Train separate models for male and female flower prediction"""
        
        # Split data
        X_train, X_test, y_male_train, y_male_test, y_female_train, y_female_test = train_test_split(
            X, y_male, y_female, test_size=0.2, random_state=42
        )
        
        print(f"\nTraining set size: {len(X_train)}")
        print(f"Test set size: {len(X_test)}")
        
        # Train male flower model
        print("\n" + "="*60)
        print("Training Male Flower Prediction Model...")
        print("="*60)
        
        self.male_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.male_model.fit(X_train, y_male_train)
        
        # Evaluate male model
        male_pred_train = self.male_model.predict(X_train)
        male_pred_test = self.male_model.predict(X_test)
        
        male_metrics = {
            'train': {
                'mae': mean_absolute_error(y_male_train, male_pred_train),
                'rmse': np.sqrt(mean_squared_error(y_male_train, male_pred_train)),
                'r2': r2_score(y_male_train, male_pred_train)
            },
            'test': {
                'mae': mean_absolute_error(y_male_test, male_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_male_test, male_pred_test)),
                'r2': r2_score(y_male_test, male_pred_test)
            }
        }
        
        print(f"\nMale Flower Model Performance:")
        print(f"  Train MAE: {male_metrics['train']['mae']:.2f}")
        print(f"  Train RMSE: {male_metrics['train']['rmse']:.2f}")
        print(f"  Train R²: {male_metrics['train']['r2']:.4f}")
        print(f"  Test MAE: {male_metrics['test']['mae']:.2f}")
        print(f"  Test RMSE: {male_metrics['test']['rmse']:.2f}")
        print(f"  Test R²: {male_metrics['test']['r2']:.4f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.male_model, X_train, y_male_train, 
                                    cv=5, scoring='neg_mean_absolute_error', n_jobs=-1)
        male_metrics['cv_mae'] = -cv_scores.mean()
        male_metrics['cv_mae_std'] = cv_scores.std()
        print(f"  5-Fold CV MAE: {male_metrics['cv_mae']:.2f} (+/- {male_metrics['cv_mae_std']:.2f})")
        
        # Train female flower model
        print("\n" + "="*60)
        print("Training Female Flower Prediction Model...")
        print("="*60)
        
        self.female_model = RandomForestRegressor(
            n_estimators=200,
            max_depth=20,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            n_jobs=-1
        )
        
        self.female_model.fit(X_train, y_female_train)
        
        # Evaluate female model
        female_pred_train = self.female_model.predict(X_train)
        female_pred_test = self.female_model.predict(X_test)
        
        female_metrics = {
            'train': {
                'mae': mean_absolute_error(y_female_train, female_pred_train),
                'rmse': np.sqrt(mean_squared_error(y_female_train, female_pred_train)),
                'r2': r2_score(y_female_train, female_pred_train)
            },
            'test': {
                'mae': mean_absolute_error(y_female_test, female_pred_test),
                'rmse': np.sqrt(mean_squared_error(y_female_test, female_pred_test)),
                'r2': r2_score(y_female_test, female_pred_test)
            }
        }
        
        print(f"\nFemale Flower Model Performance:")
        print(f"  Train MAE: {female_metrics['train']['mae']:.2f}")
        print(f"  Train RMSE: {female_metrics['train']['rmse']:.2f}")
        print(f"  Train R²: {female_metrics['train']['r2']:.4f}")
        print(f"  Test MAE: {female_metrics['test']['mae']:.2f}")
        print(f"  Test RMSE: {female_metrics['test']['rmse']:.2f}")
        print(f"  Test R²: {female_metrics['test']['r2']:.4f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.female_model, X_train, y_female_train,
                                    cv=5, scoring='neg_mean_absolute_error', n_jobs=-1)
        female_metrics['cv_mae'] = -cv_scores.mean()
        female_metrics['cv_mae_std'] = cv_scores.std()
        print(f"  5-Fold CV MAE: {female_metrics['cv_mae']:.2f} (+/- {female_metrics['cv_mae_std']:.2f})")
        
        self.performance_metrics = {
            'male': male_metrics,
            'female': female_metrics
        }
        
        return X_test, y_male_test, y_female_test, male_pred_test, female_pred_test
    
    def analyze_feature_importance(self):
        """Analyze and display feature importance"""
        print("\n" + "="*60)
        print("Feature Importance Analysis")
        print("="*60)
        
        male_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.male_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        female_importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.female_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Features for Male Flower Prediction:")
        print(male_importance.head(10).to_string(index=False))
        
        print("\nTop 10 Features for Female Flower Prediction:")
        print(female_importance.head(10).to_string(index=False))
        
        return male_importance, female_importance
    
    def save_models(self, output_dir):
        """Save trained models and metadata"""
        print("\n" + "="*60)
        print("Saving Models...")
        print("="*60)
        
        # Save models
        male_model_path = f"{output_dir}/male_flower_model.joblib"
        female_model_path = f"{output_dir}/female_flower_model.joblib"
        encoders_path = f"{output_dir}/encoders.joblib"
        
        joblib.dump(self.male_model, male_model_path)
        joblib.dump(self.female_model, female_model_path)
        joblib.dump(self.encoders, encoders_path)
        
        print(f"✓ Male model saved: {male_model_path}")
        print(f"✓ Female model saved: {female_model_path}")
        print(f"✓ Encoders saved: {encoders_path}")
        
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
            'categorical_features': list(self.encoders.keys()),
            'label_encodings': {
                col: {int(i): label for i, label in enumerate(encoder.classes_)}
                for col, encoder in self.encoders.items()
            }
        }
        
        metadata_path = f"{output_dir}/model_metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"✓ Metadata saved: {metadata_path}")
    
    def create_visualizations(self, X_test, y_male_test, y_female_test, 
                            male_pred_test, female_pred_test, output_dir):
        """Create performance visualization plots"""
        print("\n" + "="*60)
        print("Creating Visualizations...")
        print("="*60)
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Male flowers: Actual vs Predicted
        axes[0, 0].scatter(y_male_test, male_pred_test, alpha=0.5, s=20)
        axes[0, 0].plot([y_male_test.min(), y_male_test.max()], 
                       [y_male_test.min(), y_male_test.max()], 
                       'r--', lw=2)
        axes[0, 0].set_xlabel('Actual Male Flowers')
        axes[0, 0].set_ylabel('Predicted Male Flowers')
        axes[0, 0].set_title(f'Male Flowers: Actual vs Predicted\nR² = {self.performance_metrics["male"]["test"]["r2"]:.4f}')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Female flowers: Actual vs Predicted
        axes[0, 1].scatter(y_female_test, female_pred_test, alpha=0.5, s=20, color='pink')
        axes[0, 1].plot([y_female_test.min(), y_female_test.max()], 
                       [y_female_test.min(), y_female_test.max()], 
                       'r--', lw=2)
        axes[0, 1].set_xlabel('Actual Female Flowers')
        axes[0, 1].set_ylabel('Predicted Female Flowers')
        axes[0, 1].set_title(f'Female Flowers: Actual vs Predicted\nR² = {self.performance_metrics["female"]["test"]["r2"]:.4f}')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Male residuals
        male_residuals = y_male_test - male_pred_test
        axes[1, 0].scatter(male_pred_test, male_residuals, alpha=0.5, s=20)
        axes[1, 0].axhline(y=0, color='r', linestyle='--', lw=2)
        axes[1, 0].set_xlabel('Predicted Male Flowers')
        axes[1, 0].set_ylabel('Residuals')
        axes[1, 0].set_title(f'Male Flowers: Residual Plot\nMAE = {self.performance_metrics["male"]["test"]["mae"]:.2f}')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Female residuals
        female_residuals = y_female_test - female_pred_test
        axes[1, 1].scatter(female_pred_test, female_residuals, alpha=0.5, s=20, color='pink')
        axes[1, 1].axhline(y=0, color='r', linestyle='--', lw=2)
        axes[1, 1].set_xlabel('Predicted Female Flowers')
        axes[1, 1].set_ylabel('Residuals')
        axes[1, 1].set_title(f'Female Flowers: Residual Plot\nMAE = {self.performance_metrics["female"]["test"]["mae"]:.2f}')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plot_path = f"{output_dir}/model_performance.png"
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        print(f"✓ Performance plots saved: {plot_path}")
        plt.close()

def main():
    print("="*60)
    print("Flower Production ML Training Pipeline")
    print("="*60)
    
    # Initialize model
    model = FlowerProductionModel()
    
    # Load and preprocess data
    X, y_male, y_female = model.load_and_preprocess_data('../data/flower_production_dataset.csv')
    
    # Train models
    X_test, y_male_test, y_female_test, male_pred_test, female_pred_test = model.train_models(
        X, y_male, y_female
    )
    
    # Analyze feature importance
    model.analyze_feature_importance()
    
    # Save models
    model.save_models('../models')
    
    # Create visualizations
    model.create_visualizations(X_test, y_male_test, y_female_test,
                               male_pred_test, female_pred_test, '../models')
    
    print("\n" + "="*60)
    print("✓ Training Complete!")
    print("="*60)
    print(f"\nModel files location: backend/ml-models/models/")
    print(f"  - male_flower_model.joblib")
    print(f"  - female_flower_model.joblib")
    print(f"  - encoders.joblib")
    print(f"  - model_metadata.json")
    print(f"  - model_performance.png")

if __name__ == '__main__':
    main()
