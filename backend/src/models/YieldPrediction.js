const mongoose = require('mongoose');

const yieldPredictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    pollination: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pollination',
      default: null,
      index: true,
    },
    // Input data
    plantType: {
      type: String,
      required: true,
      enum: ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber', 'kalabasa'],
      index: true,
    },
    plantAgedays: {
      type: Number,
      required: true,
      min: 0,
      max: 200,
    },
    vineLengthCm: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
    },
    nodeCount: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maleFlowerCount: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    femaleFlowerCount: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    temperatureCelsius: {
      type: Number,
      required: true,
      min: 10,
      max: 45,
    },
    soilMoisturePercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // Prediction results
    predictedYieldKg: {
      type: Number,
      required: true,
      min: 0,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    recommendations: [
      {
        type: String,
      },
    ],
    // Model metadata
    modelVersion: {
      type: String,
      default: '1.0',
    },
    modelMetrics: {
      testR2: Number,
      testMae: Number,
    },
    // Optional actual yield (for validation)
    actualYieldKg: {
      type: Number,
      min: 0,
      default: null,
    },
    yieldRecordedAt: {
      type: Date,
      default: null,
    },
    // Metadata
    notes: {
      type: String,
      maxlength: 500,
    },
    isManualEntry: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient queries
yieldPredictionSchema.index({ createdAt: -1 });
yieldPredictionSchema.index({ user: 1, createdAt: -1 });
yieldPredictionSchema.index({ plantType: 1, createdAt: -1 });

// Virtual for prediction accuracy (if actual yield is recorded)
yieldPredictionSchema.virtual('predictionAccuracy').get(function () {
  if (this.actualYieldKg === null || this.actualYieldKg === undefined) {
    return null;
  }

  const error = Math.abs(this.predictedYieldKg - this.actualYieldKg);
  const accuracy = 100 - (error / this.actualYieldKg) * 100;
  return Math.max(0, Math.min(100, accuracy));
});

// Virtual for yield variance
yieldPredictionSchema.virtual('yieldVariance').get(function () {
  if (this.actualYieldKg === null || this.actualYieldKg === undefined) {
    return null;
  }

  return this.actualYieldKg - this.predictedYieldKg;
});

// Method to record actual yield
yieldPredictionSchema.methods.recordActualYield = function (actualYield) {
  this.actualYieldKg = actualYield;
  this.yieldRecordedAt = new Date();
  return this.save();
};

// Static method to get user's prediction history
yieldPredictionSchema.statics.getUserPredictions = function (userId, options = {}) {
  const { limit = 20, skip = 0, plantType = null, includeActualYield = null } = options;

  const query = { user: userId };

  if (plantType) {
    query.plantType = plantType;
  }

  if (includeActualYield !== null) {
    if (includeActualYield) {
      query.actualYieldKg = { $ne: null };
    } else {
      query.actualYieldKg = null;
    }
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('pollination', 'plantName pollinationDate')
    .lean();
};

// Static method to get prediction statistics
yieldPredictionSchema.statics.getPredictionStats = async function (userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$plantType',
        totalPredictions: { $sum: 1 },
        avgPredictedYield: { $avg: '$predictedYieldKg' },
        avgConfidence: { $avg: '$confidenceScore' },
        predictionsWithActual: {
          $sum: { $cond: [{ $ne: ['$actualYieldKg', null] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        plantType: '$_id',
        totalPredictions: 1,
        avgPredictedYield: { $round: ['$avgPredictedYield', 2] },
        avgConfidence: { $round: ['$avgConfidence', 1] },
        predictionsWithActual: 1,
      },
    },
  ]);

  return stats;
};

// Pre-save hook to ensure data consistency
yieldPredictionSchema.pre('save', function (next) {
  // Round numeric values
  this.predictedYieldKg = Math.round(this.predictedYieldKg * 100) / 100;
  this.confidenceScore = Math.round(this.confidenceScore * 10) / 10;

  next();
});

const YieldPrediction = mongoose.model('YieldPrediction', yieldPredictionSchema);

module.exports = YieldPrediction;
