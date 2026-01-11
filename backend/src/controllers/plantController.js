/**
 * Plant Controller - Revised Pollination Management
 * ==================================================
 * 
 * Complete plant lifecycle management with ML-based predictions.
 * 
 * Endpoints:
 * - CRUD operations for plants
 * - Flowering prediction and tracking
 * - Pollination management with success prediction
 * - Fruit development and harvest tracking
 * - Dashboard statistics
 */

const { Plant } = require('../models');
const pollinationMLService = require('../services/pollinationMLService');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// ===== PLANT CRUD OPERATIONS =====

/**
 * @desc    Get all plants for authenticated user
 * @route   GET /api/plants
 * @access  Private
 */
const getPlants = async (req, res) => {
  try {
    const { status, gourdType, sort = 'newest' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user.id };
    
    if (status) query.status = status;
    if (gourdType) query.gourdType = gourdType;

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { datePlanted: 1 };
        break;
      case 'name':
        sortObj = { plantName: 1 };
        break;
      case 'status':
        sortObj = { status: 1, datePlanted: -1 };
        break;
      case 'flowering':
        sortObj = { 'flowering.predictedFloweringDate': 1 };
        break;
      default:
        sortObj = { datePlanted: -1 };
    }

    const plants = await Plant.find(query)
      .sort(sortObj)
      .limit(limit)
      .skip(skip)
      .populate('user', 'username email');

    const total = await Plant.countDocuments(query);

    res.status(200).json({
      success: true,
      data: plants,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get plants error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plants',
      error: error.message
    });
  }
};

/**
 * @desc    Get single plant
 * @route   GET /api/plants/:id
 * @access  Private
 */
const getPlant = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'username email');

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: plant
    });
  } catch (error) {
    console.error('Get plant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plant',
      error: error.message
    });
  }
};

/**
 * @desc    Create new plant with ML predictions
 * @route   POST /api/plants
 * @access  Private
 */
const createPlant = async (req, res) => {
  try {
    const {
      gourdType,
      variety,
      plantName,
      datePlanted,
      notes,
      environment,
      care,
      plantHealth
    } = req.body;

    // Validate required fields
    if (!gourdType || !plantName || !datePlanted) {
      return res.status(400).json({
        success: false,
        message: 'Gourd type, plant name, and planting date are required'
      });
    }

    // Create plant
    const plant = new Plant({
      gourdType,
      variety,
      plantName,
      datePlanted: new Date(datePlanted),
      notes,
      environment: environment || {},
      care: care || {},
      plantHealth: plantHealth || 4,
      user: req.user.id
    });

    // Get ML predictions for the plant
    try {
      const predictionData = {
        gourdType,
        variety: variety || undefined,
        datePlanted,
        season: environment?.season,
        region: environment?.region,
        avgTemperature: environment?.avgTemperature,
        avgHumidity: environment?.avgHumidity,
        avgRainfall: environment?.avgRainfall,
        sunlightHours: environment?.sunlightHours,
        soilPh: environment?.soilPh,
        soilMoisture: environment?.soilMoisture,
        soilType: environment?.soilType,
        fertilizerType: care?.fertilizerType,
        fertilizerFrequency: care?.fertilizerFrequency,
        wateringFrequency: care?.wateringFrequency,
        plantHealth: plantHealth
      };

      const floweringPrediction = await pollinationMLService.predictFlowering(predictionData);
      
      plant.flowering.predictedDaysToFlower = floweringPrediction.predictedDaysToFlower;
      plant.flowering.predictedFloweringDate = new Date(floweringPrediction.expectedDate);
      plant.flowering.floweringPredictionConfidence = floweringPrediction.confidence;
      plant.flowering.floweringPredictionDate = new Date();
      
    } catch (predictionError) {
      console.warn('Could not get ML prediction:', predictionError.message);
      // Continue without prediction - will use defaults
    }

    await plant.save();
    await plant.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Plant created successfully',
      data: plant
    });
  } catch (error) {
    console.error('Create plant error:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating plant',
      error: error.message
    });
  }
};

/**
 * @desc    Update plant
 * @route   PUT /api/plants/:id
 * @access  Private
 */
const updatePlant = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'plantName', 'notes', 'variety', 'environment', 'care',
      'plantHealth', 'vineLength', 'leafCount', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'environment' || field === 'care') {
          // Merge nested objects
          plant[field] = { ...plant[field].toObject(), ...req.body[field] };
        } else {
          plant[field] = req.body[field];
        }
      }
    });

    // If conditions changed, update flowering prediction
    if (req.body.environment || req.body.care || req.body.plantHealth) {
      try {
        const predictionData = {
          gourdType: plant.gourdType,
          variety: plant.variety,
          datePlanted: plant.datePlanted,
          ...plant.environment.toObject(),
          ...plant.care.toObject(),
          plantHealth: plant.plantHealth
        };

        const floweringPrediction = await pollinationMLService.predictFlowering(predictionData);
        plant.flowering.predictedDaysToFlower = floweringPrediction.predictedDaysToFlower;
        plant.flowering.predictedFloweringDate = new Date(floweringPrediction.expectedDate);
        plant.flowering.floweringPredictionConfidence = floweringPrediction.confidence;
        plant.flowering.floweringPredictionDate = new Date();
      } catch (err) {
        console.warn('Could not update prediction:', err.message);
      }
    }

    plant.addTimelineEvent('conditions_updated', 'Plant conditions updated');
    
    await plant.save();
    await plant.populate('user', 'username email');

    res.status(200).json({
      success: true,
      message: 'Plant updated successfully',
      data: plant
    });
  } catch (error) {
    console.error('Update plant error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating plant',
      error: error.message
    });
  }
};

/**
 * @desc    Delete plant
 * @route   DELETE /api/plants/:id
 * @access  Private
 */
const deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Delete image from Cloudinary if exists
    if (plant.image?.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(plant.image.cloudinaryId);
      } catch (err) {
        console.warn('Could not delete image from Cloudinary:', err.message);
      }
    }

    await plant.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Plant deleted successfully'
    });
  } catch (error) {
    console.error('Delete plant error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting plant',
      error: error.message
    });
  }
};

// ===== IMAGE MANAGEMENT =====

/**
 * @desc    Add or update plant image
 * @route   POST /api/plants/:id/image
 * @access  Private
 */
const updateImage = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Delete old image if exists
    if (plant.image?.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(plant.image.cloudinaryId);
      } catch (err) {
        console.warn('Could not delete old image:', err.message);
      }
    }

    // Upload new image
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'egourd/plants',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    plant.image = {
      url: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
      caption: req.body.caption || '',
      uploadDate: new Date()
    };

    plant.addTimelineEvent('image_updated', 'Plant image updated');
    
    await plant.save();

    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      data: plant.image
    });
  } catch (error) {
    console.error('Update image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating image',
      error: error.message
    });
  }
};

// ===== FLOWERING MANAGEMENT =====

/**
 * @desc    Get flowering prediction for plant
 * @route   POST /api/plants/:id/predict-flowering
 * @access  Private
 */
const predictFlowering = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    const predictionData = {
      gourdType: plant.gourdType,
      variety: plant.variety,
      datePlanted: plant.datePlanted,
      ...plant.environment.toObject(),
      ...plant.care.toObject(),
      plantHealth: plant.plantHealth,
      ...req.body // Allow overriding with request data
    };

    const prediction = await pollinationMLService.predictFlowering(predictionData);

    // Update plant with new prediction
    plant.flowering.predictedDaysToFlower = prediction.predictedDaysToFlower;
    plant.flowering.predictedFloweringDate = new Date(prediction.expectedDate);
    plant.flowering.floweringPredictionConfidence = prediction.confidence;
    plant.flowering.floweringPredictionDate = new Date();
    
    await plant.save();

    res.status(200).json({
      success: true,
      data: {
        prediction,
        plant: {
          _id: plant._id,
          plantName: plant.plantName,
          gourdType: plant.gourdType,
          ageInDays: plant.ageInDays
        }
      }
    });
  } catch (error) {
    console.error('Flowering prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting flowering',
      error: error.message
    });
  }
};

/**
 * @desc    Record flowering start and flower counts
 * @route   POST /api/plants/:id/flowering
 * @access  Private
 */
const recordFlowering = async (req, res) => {
  try {
    const { maleFlowerCount, femaleFlowerCount } = req.body;
    
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    await plant.recordFlowering(
      maleFlowerCount || 0,
      femaleFlowerCount || 0
    );

    res.status(200).json({
      success: true,
      message: 'Flowering recorded successfully',
      data: plant
    });
  } catch (error) {
    console.error('Record flowering error:', error);
    res.status(400).json({
      success: false,
      message: 'Error recording flowering',
      error: error.message
    });
  }
};

/**
 * @desc    Update flower counts
 * @route   PUT /api/plants/:id/flowers
 * @access  Private
 */
const updateFlowerCounts = async (req, res) => {
  try {
    const { maleFlowerCount, femaleFlowerCount } = req.body;
    
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    if (maleFlowerCount !== undefined) {
      plant.flowering.maleFlowerCount = maleFlowerCount;
    }
    if (femaleFlowerCount !== undefined) {
      plant.flowering.femaleFlowerCount = femaleFlowerCount;
    }

    await plant.save();

    res.status(200).json({
      success: true,
      message: 'Flower counts updated',
      data: {
        maleFlowerCount: plant.flowering.maleFlowerCount,
        femaleFlowerCount: plant.flowering.femaleFlowerCount
      }
    });
  } catch (error) {
    console.error('Update flower counts error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating flower counts',
      error: error.message
    });
  }
};

// ===== POLLINATION MANAGEMENT =====

/**
 * @desc    Predict pollination success rate
 * @route   POST /api/plants/:id/predict-pollination
 * @access  Private
 */
const predictPollinationSuccess = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    const predictionData = {
      gourdType: plant.gourdType,
      variety: plant.variety,
      ...plant.environment.toObject(),
      plantHealth: plant.plantHealth,
      vineLength: plant.vineLength || 200,
      leafCount: plant.leafCount || 40,
      maleFlowerCount: req.body.maleFlowerCount || plant.flowering.maleFlowerCount || 10,
      femaleFlowerCount: req.body.femaleFlowerCount || plant.flowering.femaleFlowerCount || 5,
      isHandPollinated: req.body.isHandPollinated !== false
    };

    const prediction = await pollinationMLService.predictPollinationSuccess(predictionData);

    res.status(200).json({
      success: true,
      data: {
        prediction,
        plant: {
          _id: plant._id,
          plantName: plant.plantName,
          gourdType: plant.gourdType
        }
      }
    });
  } catch (error) {
    console.error('Pollination prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting pollination success',
      error: error.message
    });
  }
};

/**
 * @desc    Add pollination event with ML prediction
 * @route   POST /api/plants/:id/pollinations
 * @access  Private
 */
const addPollination = async (req, res) => {
  try {
    const { femaleFlowersPollinated, isHandPollinated, notes } = req.body;
    
    if (!femaleFlowersPollinated || femaleFlowersPollinated < 1) {
      return res.status(400).json({
        success: false,
        message: 'Number of pollinated female flowers is required'
      });
    }

    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Get pollination success prediction
    let prediction = {};
    try {
      const predictionData = {
        gourdType: plant.gourdType,
        variety: plant.variety,
        ...plant.environment.toObject(),
        plantHealth: plant.plantHealth,
        vineLength: plant.vineLength || 200,
        leafCount: plant.leafCount || 40,
        maleFlowerCount: plant.flowering.maleFlowerCount || 10,
        femaleFlowerCount: femaleFlowersPollinated,
        isHandPollinated: isHandPollinated !== false
      };

      prediction = await pollinationMLService.predictPollinationSuccess(predictionData);
    } catch (err) {
      console.warn('Could not get pollination prediction:', err.message);
      // Use default values
      prediction = {
        successRate: 0.75,
        expectedSuccessfulPollinations: Math.round(femaleFlowersPollinated * 0.75),
        daysUntilResultVisible: 7,
        confidence: 0.7
      };
    }

    // Add pollination event
    await plant.addPollination({
      femaleFlowersPollinated,
      isHandPollinated: isHandPollinated !== false,
      predictedSuccessRate: prediction.successRate,
      expectedSuccessfulCount: prediction.expectedSuccessfulPollinations,
      daysUntilResultVisible: prediction.daysUntilResultVisible,
      predictionConfidence: prediction.confidence,
      notes
    });

    // Get the newly added pollination (last one in array)
    const newPollination = plant.pollinations[plant.pollinations.length - 1];

    res.status(201).json({
      success: true,
      message: 'Pollination recorded successfully',
      data: {
        plant,
        pollination: newPollination,
        prediction
      }
    });
  } catch (error) {
    console.error('Add pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error adding pollination',
      error: error.message
    });
  }
};

/**
 * @desc    Record pollination result
 * @route   PUT /api/plants/:id/pollinations/:pollinationId/result
 * @access  Private
 */
const recordPollinationResult = async (req, res) => {
  try {
    const { successfulCount } = req.body;
    
    if (successfulCount === undefined || successfulCount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Successful pollination count is required'
      });
    }

    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    await plant.recordPollinationResult(req.params.pollinationId, successfulCount);

    // If successful pollinations, get fruit maturity prediction
    let maturityPrediction = null;
    if (successfulCount > 0) {
      try {
        const predictionData = {
          gourdType: plant.gourdType,
          variety: plant.variety,
          ...plant.environment.toObject(),
          ...plant.care.toObject(),
          plantHealth: plant.plantHealth,
          successfulPollinations: successfulCount
        };

        maturityPrediction = await pollinationMLService.predictFruitMaturity(predictionData);

        // Add fruit development tracking
        await plant.addFruitDevelopment({
          pollinationId: req.params.pollinationId,
          predictedDaysToMaturity: maturityPrediction.daysToMaturity,
          predictedHarvestDate: maturityPrediction.expectedHarvestDate,
          expectedYieldKg: maturityPrediction.expectedYieldKg,
          predictionConfidence: maturityPrediction.confidence,
          fruitCount: successfulCount
        });
      } catch (err) {
        console.warn('Could not get maturity prediction:', err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Pollination result recorded',
      data: {
        plant,
        maturityPrediction
      }
    });
  } catch (error) {
    console.error('Record pollination result error:', error);
    res.status(400).json({
      success: false,
      message: 'Error recording pollination result',
      error: error.message
    });
  }
};

/**
 * @desc    Update pollination entry
 * @route   PUT /api/plants/:id/pollinations/:pollinationId
 * @access  Private
 */
const updatePollination = async (req, res) => {
  try {
    const { femaleFlowersPollinated, isHandPollinated, notes, status, actualSuccessfulCount, notificationScheduled, notificationId } = req.body;

    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    await plant.updatePollination(req.params.pollinationId, {
      femaleFlowersPollinated,
      isHandPollinated,
      notes,
      status,
      actualSuccessfulCount,
      notificationScheduled,
      notificationId
    });

    // Find the updated pollination
    const updatedPollination = plant.pollinations.id(req.params.pollinationId);

    res.status(200).json({
      success: true,
      message: 'Pollination updated successfully',
      data: {
        plant,
        pollination: updatedPollination
      }
    });
  } catch (error) {
    console.error('Update pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating pollination',
      error: error.message
    });
  }
};

/**
 * @desc    Delete pollination entry
 * @route   DELETE /api/plants/:id/pollinations/:pollinationId
 * @access  Private
 */
const deletePollination = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    await plant.deletePollination(req.params.pollinationId);

    res.status(200).json({
      success: true,
      message: 'Pollination deleted successfully',
      data: { plant }
    });
  } catch (error) {
    console.error('Delete pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error deleting pollination',
      error: error.message
    });
  }
};

/**
 * @desc    Get all pollinations for a plant
 * @route   GET /api/plants/:id/pollinations
 * @access  Private
 */
const getPollinations = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Sort by entry number
    const pollinations = plant.pollinations.sort((a, b) => a.entryNumber - b.entryNumber);

    res.status(200).json({
      success: true,
      data: {
        pollinations,
        summary: {
          total: pollinations.length,
          pending: pollinations.filter(p => p.status === 'pending').length,
          successful: pollinations.filter(p => p.status === 'success').length,
          failed: pollinations.filter(p => p.status === 'failed').length,
          partial: pollinations.filter(p => p.status === 'partial').length
        }
      }
    });
  } catch (error) {
    console.error('Get pollinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pollinations',
      error: error.message
    });
  }
};

// ===== FRUIT & HARVEST MANAGEMENT =====

/**
 * @desc    Predict fruit maturity
 * @route   POST /api/plants/:id/predict-maturity
 * @access  Private
 */
const predictFruitMaturity = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    const predictionData = {
      gourdType: plant.gourdType,
      variety: plant.variety,
      ...plant.environment.toObject(),
      ...plant.care.toObject(),
      plantHealth: plant.plantHealth,
      successfulPollinations: req.body.successfulPollinations || plant.totalSuccessfulPollinations || 1
    };

    const prediction = await pollinationMLService.predictFruitMaturity(predictionData);

    res.status(200).json({
      success: true,
      data: {
        prediction,
        plant: {
          _id: plant._id,
          plantName: plant.plantName,
          gourdType: plant.gourdType
        }
      }
    });
  } catch (error) {
    console.error('Fruit maturity prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting fruit maturity',
      error: error.message
    });
  }
};

/**
 * @desc    Record harvest
 * @route   PUT /api/plants/:id/fruits/:fruitId/harvest
 * @access  Private
 */
const recordHarvest = async (req, res) => {
  try {
    const { yieldKg, fruitCount, notes } = req.body;
    
    if (!yieldKg || yieldKg < 0) {
      return res.status(400).json({
        success: false,
        message: 'Harvest yield is required'
      });
    }

    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    await plant.recordHarvest(req.params.fruitId, {
      yieldKg,
      fruitCount,
      notes
    });

    res.status(200).json({
      success: true,
      message: 'Harvest recorded successfully',
      data: plant
    });
  } catch (error) {
    console.error('Record harvest error:', error);
    res.status(400).json({
      success: false,
      message: 'Error recording harvest',
      error: error.message
    });
  }
};

// ===== DASHBOARD & STATISTICS =====

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/plants/dashboard/stats
 * @access  Private
 */
const getDashboardStats = async (req, res) => {
  try {
    const stats = await Plant.getDashboardStats(req.user.id);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

/**
 * @desc    Get plants needing attention
 * @route   GET /api/plants/attention/needed
 * @access  Private
 */
const getPlantsNeedingAttention = async (req, res) => {
  try {
    const plants = await Plant.getPlantsNeedingAttention(req.user.id);
    
    res.status(200).json({
      success: true,
      data: plants,
      count: plants.length
    });
  } catch (error) {
    console.error('Get plants needing attention error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plants needing attention',
      error: error.message
    });
  }
};

/**
 * @desc    Get gourd types and configurations
 * @route   GET /api/plants/gourd-types
 * @access  Public
 */
const getGourdTypes = async (req, res) => {
  try {
    const configs = Plant.getGourdConfigs();
    
    const gourdTypes = Object.entries(configs).map(([type, config]) => ({
      type,
      varieties: config.varieties,
      displayName: config.displayName,
      daysToFlower: config.daysToFlower,
      daysToMaturity: config.daysToMaturity,
      pollinationHours: config.pollinationHours
    }));

    res.status(200).json({
      success: true,
      data: gourdTypes
    });
  } catch (error) {
    console.error('Get gourd types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gourd types',
      error: error.message
    });
  }
};

/**
 * @desc    Get lifecycle prediction for plant
 * @route   POST /api/plants/:id/lifecycle-prediction
 * @access  Private
 */
const getLifecyclePrediction = async (req, res) => {
  try {
    const plant = await Plant.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!plant) {
      return res.status(404).json({
        success: false,
        message: 'Plant not found'
      });
    }

    // Build prediction data with proper field mappings
    const env = plant.environment || {};
    const care = plant.care || {};
    
    const predictionData = {
      gourdType: plant.gourdType,
      gourd_type: plant.gourdType,
      variety: plant.variety,
      variety_name: plant.variety,
      datePlanted: plant.datePlanted,
      planting_date: plant.datePlanted ? plant.datePlanted.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      // Environment fields - map to both formats
      avgTemperature: env.avgTemperature || 28,
      avg_temperature: env.avgTemperature || 28,
      avgHumidity: env.avgHumidity || 70,
      avg_humidity: env.avgHumidity || 70,
      avgRainfall: env.avgRainfall || 10,
      avg_rainfall_mm: env.avgRainfall || 10,
      sunlightHours: env.sunlightHours || 7,
      sunlight_hours: env.sunlightHours || 7,
      soilPh: env.soilPh || 6.5,
      soil_ph: env.soilPh || 6.5,
      soilMoisture: env.soilMoisture || 65,
      soil_moisture: env.soilMoisture || 65,
      soilType: env.soilType || 'silty',  // Philippine standard
      soil_type: env.soilType || 'silty',  // Philippine standard
      season: env.season || 'wet',
      region: env.region || 'tropical_lowland',
      region_climate: env.region || 'tropical_lowland',
      // Care fields
      fertilizerType: care.fertilizerType || 'organic',
      fertilizer_type: care.fertilizerType || 'organic',
      fertilizerFrequency: care.fertilizerFrequency || 'weekly',
      fertilizer_frequency: care.fertilizerFrequency || 'weekly',
      wateringFrequency: care.wateringFrequency || 'daily',
      watering_frequency: care.wateringFrequency || 'daily',
      // Plant metrics
      plantHealth: plant.plantHealth || 4,
      plant_health_score: plant.plantHealth || 4,
      vineLength: plant.vineLength || 200,
      vine_length_cm: plant.vineLength || 200,
      leafCount: plant.leafCount || 40,
      leaf_count: plant.leafCount || 40
    };

    const prediction = await pollinationMLService.getLifecyclePredictions(predictionData);

    res.status(200).json({
      success: true,
      data: {
        plant: {
          _id: plant._id,
          plantName: plant.plantName,
          gourdType: plant.gourdType,
          ageInDays: plant.ageInDays,
          datePlanted: plant.datePlanted
        },
        predictions: prediction
      }
    });
  } catch (error) {
    console.error('Get lifecycle prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting lifecycle prediction',
      error: error.message
    });
  }
};

module.exports = {
  // CRUD
  getPlants,
  getPlant,
  createPlant,
  updatePlant,
  deletePlant,
  
  // Image
  updateImage,
  
  // Flowering
  predictFlowering,
  recordFlowering,
  updateFlowerCounts,
  
  // Pollination
  predictPollinationSuccess,
  addPollination,
  updatePollination,
  deletePollination,
  getPollinations,
  recordPollinationResult,
  
  // Fruit & Harvest
  predictFruitMaturity,
  recordHarvest,
  
  // Dashboard
  getDashboardStats,
  getPlantsNeedingAttention,
  getGourdTypes,
  getLifecyclePrediction
};
