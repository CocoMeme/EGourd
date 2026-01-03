const mongoose = require('mongoose');

const flowerPredictionSchema = new mongoose.Schema({
  // Reference to the plant (optional - user can make prediction without existing plant record)
  pollination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pollination',
    required: false
  },

  // Basic plant information (for standalone predictions)
  plantType: {
    type: String,
    required: [true, 'Plant type is required'],
    enum: {
      values: ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber'],
      message: 'Plant type must be one of: ampalaya_bilog, upo_smooth, patola, cucumber'
    }
  },

  plantAge: {
    type: Number, // Age in days
    required: [true, 'Plant age is required'],
    min: [0, 'Plant age cannot be negative']
  },

  // Environmental factors
  environmental: {
    // Temperature in Celsius
    temperature: {
      type: Number,
      required: true,
      min: [15, 'Temperature must be at least 15°C'],
      max: [45, 'Temperature must be at most 45°C']
    },
    
    // Relative humidity percentage
    humidity: {
      type: Number,
      required: true,
      min: [0, 'Humidity must be at least 0%'],
      max: [100, 'Humidity must be at most 100%']
    },
    
    // Average sunlight hours per day
    sunlightHours: {
      type: Number,
      required: true,
      min: [0, 'Sunlight hours must be at least 0'],
      max: [24, 'Sunlight hours must be at most 24']
    },
    
    // Soil pH level
    soilPH: {
      type: Number,
      required: false,
      min: [4, 'Soil pH must be at least 4'],
      max: [9, 'Soil pH must be at most 9']
    },
    
    // Soil type
    soilType: {
      type: String,
      enum: ['loamy', 'clay', 'sandy', 'silt', 'peat', 'chalky', 'mixed'],
      required: false
    }
  },

  // Plant care data
  care: {
    // Watering frequency (times per week)
    wateringFrequency: {
      type: Number,
      required: true,
      min: [0, 'Watering frequency cannot be negative'],
      max: [21, 'Watering frequency cannot exceed 21 times per week']
    },
    
    // Fertilizer usage
    fertilizerType: {
      type: String,
      enum: ['organic', 'chemical', 'mixed', 'none'],
      required: true
    },
    
    // Fertilizer frequency (times per month)
    fertilizerFrequency: {
      type: Number,
      required: false,
      min: [0, 'Fertilizer frequency cannot be negative']
    },
    
    // Pest control status
    pestControl: {
      type: String,
      enum: ['regular', 'occasional', 'none', 'as-needed'],
      required: false,
      default: 'as-needed'
    }
  },

  // Growth metrics
  growth: {
    // Plant height in centimeters
    height: {
      type: Number,
      required: false,
      min: [0, 'Height cannot be negative']
    },
    
    // Number of leaves
    leafCount: {
      type: Number,
      required: false,
      min: [0, 'Leaf count cannot be negative']
    },
    
    // Stem thickness in millimeters
    stemThickness: {
      type: Number,
      required: false,
      min: [0, 'Stem thickness cannot be negative']
    },
    
    // Overall plant health rating (1-5)
    healthRating: {
      type: Number,
      required: true,
      min: [1, 'Health rating must be between 1-5'],
      max: [5, 'Health rating must be between 1-5']
    }
  },

  // Prediction results
  prediction: {
    // Male flower count (range)
    maleFlowers: {
      min: {
        type: Number,
        required: true
      },
      max: {
        type: Number,
        required: true
      },
      average: {
        type: Number,
        required: true
      }
    },
    
    // Female flower count (range)
    femaleFlowers: {
      min: {
        type: Number,
        required: true
      },
      max: {
        type: Number,
        required: true
      },
      average: {
        type: Number,
        required: true
      }
    },
    
    // Confidence score (0-100)
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    
    // Key factors that influenced the prediction
    influencingFactors: [{
      factor: String,
      impact: {
        type: String,
        enum: ['positive', 'negative', 'neutral']
      },
      description: String
    }],
    
    // Recommendations to improve flower production
    recommendations: [{
      category: {
        type: String,
        enum: ['watering', 'fertilizer', 'sunlight', 'temperature', 'soil', 'pest-control', 'general']
      },
      suggestion: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      }
    }]
  },

  // User who made the prediction
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },

  // Optional notes from user
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }

}, {
  timestamps: true
});

// Indexes for better query performance
flowerPredictionSchema.index({ user: 1, createdAt: -1 });
flowerPredictionSchema.index({ pollination: 1 });
flowerPredictionSchema.index({ plantType: 1 });

// Virtual for total predicted flowers
flowerPredictionSchema.virtual('totalPredictedFlowers').get(function() {
  return {
    min: this.prediction.maleFlowers.min + this.prediction.femaleFlowers.min,
    max: this.prediction.maleFlowers.max + this.prediction.femaleFlowers.max,
    average: this.prediction.maleFlowers.average + this.prediction.femaleFlowers.average
  };
});

// Virtual for male to female ratio
flowerPredictionSchema.virtual('maleToFemaleRatio').get(function() {
  const maleAvg = this.prediction.maleFlowers.average;
  const femaleAvg = this.prediction.femaleFlowers.average;
  
  if (femaleAvg === 0) return 'N/A';
  
  const ratio = (maleAvg / femaleAvg).toFixed(2);
  return `${ratio}:1`;
});

const FlowerPrediction = mongoose.model('FlowerPrediction', flowerPredictionSchema);

module.exports = FlowerPrediction;
