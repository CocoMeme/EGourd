const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },

  // ===== CORE PREDICTION DATA (backward compatible) =====
  prediction: {
    type: String,
    required: true  // 'male' or 'female'
  },
  confidence: {
    type: Number,
    required: true  // Main confidence score (0-100)
  },

  // ===== MULTI-CLASS SUPPORT =====
  variety: {
    type: String,
    enum: ['Ampalaya Bilog', 'Patola', 'Upo (Smooth)', 'Cucumber', null],
    default: null,
    description: 'Gourd variety detected'
  },

  // ===== USER-EDITABLE NAME =====
  name: {
    type: String,
    default: '',
    description: 'User-editable name for the scan'
  },

  // ===== VALIDATION TRACKING =====
  validationStatus: {
    type: String,
    enum: ['tflite_only', 'validated', 'manual_override', 'conflict', null],
    default: 'tflite_only',
    description: 'How the prediction was validated (tflite_only: on-device only, validated: both models agree, manual_override: user chose between conflicting predictions, conflict: models disagreed but not yet resolved)'
  },

  // ===== AI PREDICTION METADATA =====
  aiPrediction: {
    // Which model's prediction was ultimately used
    finalSource: {
      type: String,
      enum: ['tflite', 'gemini', 'manual', null],
      default: 'tflite',
      description: 'Source of final prediction'
    },

    // TFLite model prediction data
    tflite: {
      variety: String,
      gender: String,
      confidence: Number,        // Raw confidence (0-100)
      modelVersion: String,      // e.g., '3.0.0-multiclass'
      processingTime: Number,    // Milliseconds
      modelType: String          // e.g., 'MobileNetV2 (Multi-Class)'
    },

    // Gemini AI prediction data (if available)
    gemini: {
      variety: String,
      gender: String,
      confidence: Number,        // Raw confidence (0-100)
      reasoning: String,         // AI's explanation of classification
      keyFeatures: [String],     // Features identified by Gemini
      processingTime: Number,    // Milliseconds
      modelVersion: String,      // e.g., 'gemini-2.5-flash'

      // Extended Gemini analysis data
      flowerQuality: {
        overallScore: Number,
        petalCondition: String,
        sizeAssessment: String,
        healthIndicators: [String]
      },
      harvestPrediction: {
        daysToHarvest: Number,
        currentStage: String,
        pollinationReady: Boolean,
        optimalHarvestWindow: String,
        bestPollinationTime: String
      },
      qualityMetrics: {
        petalQuality: Number,
        colorScore: Number,
        developmentScore: Number,
        healthScore: Number,
        pollinationPotential: Number
      },
      observations: {
        strengths: [String],
        concerns: [String],
        recommendations: [String]
      }
    },

    // Comparison result when both models ran
    comparison: {
      modelsAgree: Boolean,      // Did both models give same result?
      varietyMatch: Boolean,     // Did varieties match?
      genderMatch: Boolean,      // Did genders match?
      confidenceGap: Number,     // Absolute difference in confidence
      recommendation: String     // Which model was recommended ('tflite', 'gemini', or 'manual')
    }
  },

  // ===== EXISTING FIELDS (unchanged) =====
  diseaseInfo: {
    type: Object,
    default: {}
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Pre-save hook to generate default name if not provided
scanSchema.pre('save', function(next) {
  if (!this.name || this.name === '') {
    const variety = this.variety || 'Unknown';
    const gender = this.prediction || 'unknown';
    const date = new Date(this.date || Date.now());
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.name = `${variety} ${gender} ${dateStr}`;
  }
  next();
});

module.exports = mongoose.model('Scan', scanSchema);