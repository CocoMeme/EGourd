/**
 * Plant (Pollination) Model - Revised
 * ====================================
 * 
 * Complete plant lifecycle tracking with ML-based predictions for:
 * 1. Flowering time prediction
 * 2. Pollination success rate
 * 3. Fruit maturity and yield prediction
 * 
 * New Concept:
 * - Plant info: type, name, planting date, notes, picture
 * - ML predictions based on planting date and conditions
 * - Track flower counts (male/female)
 * - Track pollinations (manual entry + predictions)
 * - Track fruit development and harvest
 */

const mongoose = require('mongoose');

// Gourd type configurations for predictions and display
const GOURD_CONFIGS = {
  bitter_gourd: {
    varieties: ['ampalaya_bilog', 'ampalaya_oblong', 'ampalaya_hybrid'],
    displayName: { english: 'Bitter Gourd', tagalog: 'Ampalaya' },
    daysToFlower: { min: 35, max: 48 },
    daysToMaturity: { min: 40, max: 50 },
    pollinationHours: { start: 6, end: 10 }
  },
  bottle_gourd: {
    varieties: ['upo_smooth', 'upo_long', 'upo_round'],
    displayName: { english: 'Bottle Gourd', tagalog: 'Upo' },
    daysToFlower: { min: 40, max: 55 },
    daysToMaturity: { min: 45, max: 60 },
    pollinationHours: { start: 17, end: 20 }
  },
  sponge_gourd: {
    varieties: ['patola', 'patola_smooth', 'patola_ridged'],
    displayName: { english: 'Sponge Gourd', tagalog: 'Patola' },
    daysToFlower: { min: 35, max: 45 },
    daysToMaturity: { min: 38, max: 48 },
    pollinationHours: { start: 6, end: 10 }
  },
  cucumber: {
    varieties: ['pipino', 'pipino_japanese', 'pipino_native'],
    displayName: { english: 'Cucumber', tagalog: 'Pipino' },
    daysToFlower: { min: 28, max: 38 },
    daysToMaturity: { min: 30, max: 40 },
    pollinationHours: { start: 6, end: 11 }
  }
};

const plantSchema = new mongoose.Schema({
  // ===== BASIC PLANT INFO =====
  gourdType: {
    type: String,
    required: [true, 'Gourd type is required'],
    enum: {
      values: ['bitter_gourd', 'bottle_gourd', 'sponge_gourd', 'cucumber'],
      message: 'Gourd type must be one of: bitter_gourd, bottle_gourd, sponge_gourd, cucumber'
    }
  },
  
  variety: {
    type: String,
    required: false,
    description: 'Specific variety of the gourd (e.g., ampalaya_bilog, upo_smooth)'
  },
  
  plantName: {
    type: String,
    required: [true, 'Plant name is required'],
    trim: true,
    maxlength: [100, 'Plant name cannot exceed 100 characters'],
    description: 'User-given name for the plant'
  },
  
  datePlanted: {
    type: Date,
    required: [true, 'Planting date is required']
  },
  
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    description: 'General notes about the plant'
  },
  
  image: {
    url: String,
    cloudinaryId: String,
    caption: String,
    uploadDate: { type: Date, default: Date.now }
  },

  // ===== ENVIRONMENTAL CONDITIONS =====
  environment: {
    avgTemperature: { type: Number, default: 28, min: 15, max: 45 },
    avgHumidity: { type: Number, default: 70, min: 30, max: 100 },
    avgRainfall: { type: Number, default: 10, min: 0, max: 100 },
    sunlightHours: { type: Number, default: 7, min: 0, max: 14 },
    soilPh: { type: Number, default: 6.5, min: 4.0, max: 9.0 },
    soilMoisture: { type: Number, default: 65, min: 0, max: 100 },
    soilType: { 
      type: String, 
      enum: ['loamy', 'sandy', 'clay', 'silty'],
      default: 'loamy'
    },
    season: {
      type: String,
      enum: ['wet', 'dry'],
      default: 'wet'
    },
    region: {
      type: String,
      enum: ['tropical_lowland', 'tropical_highland', 'subtropical'],
      default: 'tropical_lowland'
    }
  },

  // ===== CARE PRACTICES =====
  care: {
    fertilizerType: {
      type: String,
      enum: ['organic', 'chemical', 'mixed', 'none'],
      default: 'organic'
    },
    fertilizerFrequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'none'],
      default: 'weekly'
    },
    wateringFrequency: {
      type: String,
      enum: ['daily', 'twice_daily', 'every_other_day'],
      default: 'daily'
    }
  },

  // ===== PLANT METRICS =====
  plantHealth: {
    type: Number,
    min: 1,
    max: 5,
    default: 4,
    description: 'Overall plant health score (1-5)'
  },
  
  vineLength: {
    type: Number,
    default: 0,
    description: 'Current vine length in cm'
  },
  
  leafCount: {
    type: Number,
    default: 0,
    description: 'Approximate leaf count'
  },

  // ===== FLOWERING TRACKING =====
  flowering: {
    // ML Prediction
    predictedDaysToFlower: { type: Number },
    predictedFloweringDate: { type: Date },
    floweringPredictionConfidence: { type: Number },
    floweringPredictionDate: { type: Date },
    
    // Actual flowering data (user entered)
    actualFirstFlowerDate: { type: Date },
    maleFlowerCount: { type: Number, default: 0 },
    femaleFlowerCount: { type: Number, default: 0 },
    
    // Flowering status
    hasStartedFlowering: { type: Boolean, default: false }
  },

  // ===== POLLINATION TRACKING =====
  pollinations: [{
    // Pollination event
    date: { type: Date, default: Date.now },
    femaleFlowersPollinated: { type: Number, required: true },
    isHandPollinated: { type: Boolean, default: true },
    
    // ML Prediction for this pollination
    predictedSuccessRate: { type: Number },
    expectedSuccessfulCount: { type: Number },
    daysUntilResultVisible: { type: Number, default: 7 },
    predictionConfidence: { type: Number },
    
    // Actual results (entered later)
    actualSuccessfulCount: { type: Number },
    resultRecordedDate: { type: Date },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'success', 'partial', 'failed'],
      default: 'pending'
    },
    
    notes: String
  }],

  // ===== FRUIT DEVELOPMENT TRACKING =====
  fruits: [{
    // From successful pollination
    pollinationId: { type: mongoose.Schema.Types.ObjectId },
    startDate: { type: Date, default: Date.now },
    
    // ML Prediction
    predictedDaysToMaturity: { type: Number },
    predictedHarvestDate: { type: Date },
    expectedYieldKg: { type: Number },
    predictionConfidence: { type: Number },
    
    // Actual results
    actualHarvestDate: { type: Date },
    actualYieldKg: { type: Number },
    fruitCount: { type: Number },
    avgFruitWeightKg: { type: Number },
    
    // Status
    status: {
      type: String,
      enum: ['developing', 'ready_to_harvest', 'harvested', 'failed'],
      default: 'developing'
    },
    
    notes: String
  }],

  // ===== OVERALL STATUS =====
  status: {
    type: String,
    enum: ['planted', 'growing', 'flowering', 'pollinating', 'fruiting', 'harvesting', 'completed', 'failed'],
    default: 'planted'
  },

  // ===== TIMELINE LOG =====
  timeline: [{
    event: {
      type: String,
      enum: ['planted', 'first_flower', 'pollinated', 'pollination_result', 'fruit_developing', 'harvested', 'note_added', 'image_updated', 'conditions_updated']
    },
    date: { type: Date, default: Date.now },
    description: String,
    data: mongoose.Schema.Types.Mixed
  }],

  // ===== USER REFERENCE =====
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
plantSchema.index({ user: 1, createdAt: -1 });
plantSchema.index({ gourdType: 1, status: 1 });
plantSchema.index({ datePlanted: 1 });
plantSchema.index({ 'flowering.predictedFloweringDate': 1 });

// ===== VIRTUALS =====

// Age in days
plantSchema.virtual('ageInDays').get(function() {
  if (!this.datePlanted) return 0;
  const today = new Date();
  const timeDiff = today.getTime() - this.datePlanted.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
});

// Display name
plantSchema.virtual('displayName').get(function() {
  const config = GOURD_CONFIGS[this.gourdType];
  return config ? config.displayName : { english: this.gourdType, tagalog: this.gourdType };
});

// Total successful pollinations
plantSchema.virtual('totalSuccessfulPollinations').get(function() {
  return this.pollinations.reduce((total, p) => {
    return total + (p.actualSuccessfulCount || 0);
  }, 0);
});

// Total yield
plantSchema.virtual('totalYieldKg').get(function() {
  return this.fruits.reduce((total, f) => {
    return total + (f.actualYieldKg || 0);
  }, 0);
});

// Optimal pollination time
plantSchema.virtual('pollinationTimeWindow').get(function() {
  const config = GOURD_CONFIGS[this.gourdType];
  if (!config) return null;
  
  const hours = config.pollinationHours;
  const formatHour = (h) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12}:00 ${period}`;
  };
  
  return {
    start: formatHour(hours.start),
    end: formatHour(hours.end),
    startHour: hours.start,
    endHour: hours.end,
    description: hours.start < 12 ? 'Morning' : 'Evening'
  };
});

// ===== STATIC METHODS =====

// Get gourd configurations
plantSchema.statics.getGourdConfigs = function() {
  return GOURD_CONFIGS;
};

// Get display names for all gourd types
plantSchema.statics.getDisplayNames = function() {
  const names = {};
  Object.entries(GOURD_CONFIGS).forEach(([type, config]) => {
    names[type] = config.displayName;
    // Also add variety mappings
    config.varieties.forEach(v => {
      names[v] = config.displayName;
    });
  });
  return names;
};

// Get plants that need attention (flowering soon, pollination needed)
plantSchema.statics.getPlantsNeedingAttention = async function(userId) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  return this.find({
    user: userId,
    status: { $in: ['planted', 'growing', 'flowering', 'pollinating'] },
    $or: [
      // Flowering expected soon
      { 'flowering.predictedFloweringDate': { $lte: nextWeek } },
      // Currently flowering
      { status: 'flowering' },
      // Has pending pollinations
      { 'pollinations.status': 'pending' }
    ]
  }).sort({ 'flowering.predictedFloweringDate': 1 });
};

// Get dashboard stats
plantSchema.statics.getDashboardStats = async function(userId) {
  const plants = await this.find({ user: userId });
  
  const stats = {
    totalPlants: plants.length,
    byStatus: {},
    byGourdType: {},
    totalMaleFlowers: 0,
    totalFemaleFlowers: 0,
    totalPollinations: 0,
    successfulPollinations: 0,
    totalHarvested: 0,
    totalYieldKg: 0
  };
  
  plants.forEach(plant => {
    // By status
    stats.byStatus[plant.status] = (stats.byStatus[plant.status] || 0) + 1;
    
    // By gourd type
    stats.byGourdType[plant.gourdType] = (stats.byGourdType[plant.gourdType] || 0) + 1;
    
    // Flowers
    stats.totalMaleFlowers += plant.flowering.maleFlowerCount || 0;
    stats.totalFemaleFlowers += plant.flowering.femaleFlowerCount || 0;
    
    // Pollinations
    plant.pollinations.forEach(p => {
      stats.totalPollinations += p.femaleFlowersPollinated || 0;
      stats.successfulPollinations += p.actualSuccessfulCount || 0;
    });
    
    // Harvests
    plant.fruits.forEach(f => {
      if (f.status === 'harvested') {
        stats.totalHarvested += f.fruitCount || 0;
        stats.totalYieldKg += f.actualYieldKg || 0;
      }
    });
  });
  
  stats.totalYieldKg = Math.round(stats.totalYieldKg * 100) / 100;
  
  return stats;
};

// ===== INSTANCE METHODS =====

// Add to timeline
plantSchema.methods.addTimelineEvent = function(event, description, data = {}) {
  this.timeline.push({
    event,
    date: new Date(),
    description,
    data
  });
};

// Update flowering prediction
plantSchema.methods.updateFloweringPrediction = function(prediction) {
  this.flowering.predictedDaysToFlower = prediction.predicted_days_to_flower;
  this.flowering.predictedFloweringDate = new Date(prediction.expected_date);
  this.flowering.floweringPredictionConfidence = prediction.confidence;
  this.flowering.floweringPredictionDate = new Date();
  
  this.addTimelineEvent('conditions_updated', 'Flowering prediction updated', prediction);
  
  return this.save();
};

// Record actual flowering start
plantSchema.methods.recordFlowering = function(maleCount = 0, femaleCount = 0) {
  if (!this.flowering.hasStartedFlowering) {
    this.flowering.actualFirstFlowerDate = new Date();
    this.flowering.hasStartedFlowering = true;
    this.status = 'flowering';
    
    this.addTimelineEvent('first_flower', `First flower appeared! Male: ${maleCount}, Female: ${femaleCount}`);
  }
  
  this.flowering.maleFlowerCount = maleCount;
  this.flowering.femaleFlowerCount = femaleCount;
  
  return this.save();
};

// Add pollination event
plantSchema.methods.addPollination = function(pollinationData) {
  const pollination = {
    date: pollinationData.date || new Date(),
    femaleFlowersPollinated: pollinationData.femaleFlowersPollinated,
    isHandPollinated: pollinationData.isHandPollinated !== false,
    predictedSuccessRate: pollinationData.predictedSuccessRate,
    expectedSuccessfulCount: pollinationData.expectedSuccessfulCount,
    daysUntilResultVisible: pollinationData.daysUntilResultVisible || 7,
    predictionConfidence: pollinationData.predictionConfidence,
    status: 'pending',
    notes: pollinationData.notes
  };
  
  this.pollinations.push(pollination);
  this.status = 'pollinating';
  
  this.addTimelineEvent('pollinated', 
    `Pollinated ${pollinationData.femaleFlowersPollinated} female flower(s). Expected success: ${pollination.expectedSuccessfulCount}`
  );
  
  return this.save();
};

// Record pollination result
plantSchema.methods.recordPollinationResult = function(pollinationId, successfulCount) {
  const pollination = this.pollinations.id(pollinationId);
  if (!pollination) {
    throw new Error('Pollination not found');
  }
  
  pollination.actualSuccessfulCount = successfulCount;
  pollination.resultRecordedDate = new Date();
  
  if (successfulCount === 0) {
    pollination.status = 'failed';
  } else if (successfulCount >= pollination.expectedSuccessfulCount) {
    pollination.status = 'success';
  } else {
    pollination.status = 'partial';
  }
  
  this.addTimelineEvent('pollination_result', 
    `Pollination result: ${successfulCount} successful out of ${pollination.femaleFlowersPollinated}`
  );
  
  // If we have successful pollinations, add fruit tracking
  if (successfulCount > 0) {
    this.status = 'fruiting';
  }
  
  return this.save();
};

// Add fruit development tracking
plantSchema.methods.addFruitDevelopment = function(fruitData) {
  const fruit = {
    pollinationId: fruitData.pollinationId,
    startDate: fruitData.startDate || new Date(),
    predictedDaysToMaturity: fruitData.predictedDaysToMaturity,
    predictedHarvestDate: fruitData.predictedHarvestDate ? new Date(fruitData.predictedHarvestDate) : null,
    expectedYieldKg: fruitData.expectedYieldKg,
    predictionConfidence: fruitData.predictionConfidence,
    fruitCount: fruitData.fruitCount,
    status: 'developing',
    notes: fruitData.notes
  };
  
  this.fruits.push(fruit);
  
  this.addTimelineEvent('fruit_developing', 
    `${fruitData.fruitCount || 1} fruit(s) developing. Expected harvest: ${fruit.predictedHarvestDate?.toLocaleDateString() || 'TBD'}`
  );
  
  return this.save();
};

// Record harvest
plantSchema.methods.recordHarvest = function(fruitId, harvestData) {
  const fruit = this.fruits.id(fruitId);
  if (!fruit) {
    throw new Error('Fruit record not found');
  }
  
  fruit.actualHarvestDate = harvestData.harvestDate || new Date();
  fruit.actualYieldKg = harvestData.yieldKg;
  fruit.fruitCount = harvestData.fruitCount || fruit.fruitCount;
  fruit.avgFruitWeightKg = harvestData.fruitCount ? harvestData.yieldKg / harvestData.fruitCount : null;
  fruit.status = 'harvested';
  fruit.notes = harvestData.notes;
  
  this.status = 'harvesting';
  
  this.addTimelineEvent('harvested', 
    `Harvested ${fruit.fruitCount} fruit(s), total yield: ${fruit.actualYieldKg}kg`
  );
  
  return this.save();
};

// Pre-save middleware
plantSchema.pre('save', function(next) {
  // Set variety if not set
  if (!this.variety && this.gourdType) {
    const config = GOURD_CONFIGS[this.gourdType];
    if (config) {
      this.variety = config.varieties[0];
    }
  }
  
  // Determine season based on planting date
  if (this.datePlanted && !this.environment.season) {
    const month = this.datePlanted.getMonth() + 1;
    this.environment.season = (month >= 6 && month <= 11) ? 'wet' : 'dry';
  }
  
  // Add planted event to timeline if new
  if (this.isNew) {
    this.timeline.push({
      event: 'planted',
      date: this.datePlanted,
      description: `${this.plantName} (${this.gourdType}) planted`
    });
  }
  
  next();
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
