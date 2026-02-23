const mongoose = require('mongoose');
const { Pollination, FlowerPrediction, YieldPrediction } = require('../models');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const notificationScheduler = require('../utils/notificationScheduler');
const MLFlowerPredictionService = require('../services/mlFlowerPredictionService');
const MLYieldPredictionService = require('../services/mlYieldPredictionService');

// @desc    Get all pollination records for authenticated user
// @route   GET /api/pollination
// @access  Private
const getPollinations = async (req, res) => {
  try {
    const { status, name, sort = 'newest' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user.id };

    if (status) {
      query.status = status;
    }

    if (name) {
      query.name = name;
    }

    // Build sort object
    let sortObj = {};
    switch (sort) {
      case 'oldest':
        sortObj = { datePlanted: 1 };
        break;
      case 'name':
        sortObj = { name: 1, datePlanted: -1 };
        break;
      case 'status':
        sortObj = { status: 1, datePlanted: -1 };
        break;
      case 'pollination':
        sortObj = { 'estimatedDates.pollinationWindow.earliest': 1 };
        break;
      default: // newest
        sortObj = { datePlanted: -1 };
    }

    const pollinations = await Pollination.find(query)
      .sort(sortObj)
      .limit(limit)
      .skip(skip)
      .populate('user', 'username email');

    const total = await Pollination.countDocuments(query);

    res.status(200).json({
      success: true,
      data: pollinations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get pollinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pollination records',
      error: error.message,
    });
  }
};

// @desc    Get single pollination record
// @route   GET /api/pollination/:id
// @access  Private
const getPollination = async (req, res) => {
  try {
    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('user', 'username email');

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    res.status(200).json({
      success: true,
      data: pollination,
    });
  } catch (error) {
    console.error('Get pollination error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pollination record',
      error: error.message,
    });
  }
};

// @desc    Create new pollination record
// @route   POST /api/pollination
// @access  Private
const createPollination = async (req, res) => {
  try {
    const { name, datePlanted, gender, location: _location, notes } = req.body;

    // Validate required fields
    if (!name || !datePlanted) {
      return res.status(400).json({
        success: false,
        message: 'Plant name and planting date are required',
      });
    }

    // Get display names for the plant
    const displayNames = Pollination.getDisplayNames();

    console.log('Creating pollination with:', {
      name,
      displayName: displayNames[name],
      datePlanted,
      gender: gender || 'undetermined',
      userId: req.user.id,
    });

    // Create new pollination record
    const pollination = new Pollination({
      name,
      displayName: displayNames[name],
      datePlanted: new Date(datePlanted),
      gender: gender || 'undetermined',
      user: req.user.id,
    }); // Add initial note if provided
    if (notes) {
      pollination.notes.push({
        content: notes,
        type: 'observation',
        date: new Date(),
      });
    }

    await pollination.save();

    // Populate user data before sending response
    await pollination.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Pollination record created successfully',
      data: pollination,
    });
  } catch (error) {
    console.error('Create pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating pollination record',
      error: error.message,
    });
  }
};

// @desc    Update pollination record
// @route   PUT /api/pollination/:id
// @access  Private
const updatePollination = async (req, res) => {
  try {
    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'gender',
      'dateFirstFlowering',
      'datePollinated',
      'status',
      'location',
      'growth',
      'careSchedule',
    ];

    allowedUpdates.forEach((update) => {
      if (req.body[update] !== undefined) {
        pollination[update] = req.body[update];
      }
    });

    await pollination.save();
    await pollination.populate('user', 'username email');

    res.status(200).json({
      success: true,
      message: 'Pollination record updated successfully',
      data: pollination,
    });
  } catch (error) {
    console.error('Update pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating pollination record',
      error: error.message,
    });
  }
};

// @desc    Delete pollination record
// @route   DELETE /api/pollination/:id
// @access  Private
const deletePollination = async (req, res) => {
  try {
    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    // Delete image from cloudinary if it exists
    if (pollination.image && pollination.image.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(pollination.image.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from cloudinary:', cloudinaryError);
      }
    }

    await Pollination.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Pollination record deleted successfully',
    });
  } catch (error) {
    console.error('Delete pollination error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting pollination record',
      error: error.message,
    });
  }
};

// @desc    Add image to pollination record
// @route   POST /api/pollination/:id/images
// @access  Private
const addImage = async (req, res) => {
  try {
    console.log('📸 Add image request for plant:', req.params.id);
    console.log('📸 req.file exists:', !!req.file);
    console.log('📸 req.file keys:', req.file ? Object.keys(req.file) : 'N/A');
    console.log('📸 req.file.buffer exists:', req.file ? !!req.file.buffer : false);
    console.log('📸 req.file.buffer length:', req.file ? req.file.buffer?.length : 'N/A');

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      console.log('❌ Pollination record not found');
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    if (!req.file) {
      console.log('❌ No image file provided');
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    if (!req.file.buffer) {
      console.log('❌ File received but no buffer:', req.file);
      return res.status(400).json({
        success: false,
        message: 'File buffer is empty',
      });
    }

    console.log('📤 Uploading to Cloudinary...');

    // Create a stream upload to Cloudinary (like uploadController)
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'pollination',
          allowed_formats: ['jpg', 'png', 'jpeg'],
          transformation: [{ width: 800, height: 600, crop: 'limit' }],
        },
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    console.log('✅ Cloudinary upload successful:', result.public_id);

    // Add image to pollination record
    const imageData = {
      url: result.secure_url,
      cloudinaryId: result.public_id,
      caption: req.body.caption || '',
    };

    await pollination.addImage(imageData);

    console.log('✅ Image added to pollination record');

    res.status(200).json({
      success: true,
      message: 'Image added successfully',
      data: pollination,
    });
  } catch (error) {
    console.error('❌ Error adding image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add image',
      error: error.message,
    });
  }
};

// @desc    Delete image from pollination record
// @route   DELETE /api/pollination/:id/images/:imageId
// @access  Private
const deleteImage = async (req, res) => {
  try {
    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    const image = pollination.image;
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    // Delete from cloudinary if it exists
    if (image.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryId);
      } catch (cloudinaryError) {
        console.error('Error deleting image from cloudinary:', cloudinaryError);
      }
    }

    // Remove image from pollination record
    pollination.image = undefined;
    await pollination.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: pollination,
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message,
    });
  }
};

// @desc    Add note to pollination record
// @route   POST /api/pollination/:id/notes
// @access  Private
const addNote = async (req, res) => {
  try {
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required',
      });
    }

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    await pollination.addNote(content, type);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: pollination.notes[pollination.notes.length - 1],
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(400).json({
      success: false,
      message: 'Error adding note',
      error: error.message,
    });
  }
};

// @desc    Mark flowering
// @route   POST /api/pollination/:id/flowering
// @access  Private
const markFlowering = async (req, res) => {
  try {
    const { gender, date } = req.body;

    if (!gender || !['male', 'female'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Valid gender (male/female) is required',
      });
    }

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    await pollination.markFlowering(gender, date ? new Date(date) : new Date());

    res.status(200).json({
      success: true,
      message: `${gender.charAt(0).toUpperCase() + gender.slice(1)} flowering marked successfully`,
      data: pollination,
    });
  } catch (error) {
    console.error('Mark flowering error:', error);
    res.status(400).json({
      success: false,
      message: 'Error marking flowering',
      error: error.message,
    });
  }
};

// @desc    Mark pollination
// @route   POST /api/pollination/:id/pollinate
// @access  Private
const markPollinated = async (req, res) => {
  try {
    const { date } = req.body;

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    await pollination.markPollinated(date ? new Date(date) : new Date());

    res.status(200).json({
      success: true,
      message: 'Pollination marked successfully',
      data: pollination,
    });
  } catch (error) {
    console.error('Mark pollination error:', error);
    res.status(400).json({
      success: false,
      message: 'Error marking pollination',
      error: error.message,
    });
  }
};

// @desc    Get plants needing attention
// @route   GET /api/pollination/attention
// @access  Private
const getPlantsNeedingAttention = async (req, res) => {
  try {
    const plants = await Pollination.getPlantsNeedingAttention(req.user.id);

    res.status(200).json({
      success: true,
      data: plants,
    });
  } catch (error) {
    console.error('Get plants needing attention error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plants needing attention',
      error: error.message,
    });
  }
};

// @desc    Get upcoming pollinations
// @route   GET /api/pollination/upcoming
// @access  Private
const getUpcomingPollinations = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const pollinations = await Pollination.getUpcomingPollinations(req.user.id, days);

    res.status(200).json({
      success: true,
      data: pollinations,
    });
  } catch (error) {
    console.error('Get upcoming pollinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming pollinations',
      error: error.message,
    });
  }
};

// @desc    Get plant types and their display names
// @route   GET /api/pollination/plant-types
// @access  Public
const getPlantTypes = async (req, res) => {
  try {
    const plantTypes = Pollination.getDisplayNames();

    res.status(200).json({
      success: true,
      data: plantTypes,
    });
  } catch (error) {
    console.error('Get plant types error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching plant types',
      error: error.message,
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/pollination/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get basic counts
    const totalPlants = await Pollination.countDocuments({ user: userId });
    const activePlants = await Pollination.countDocuments({
      user: userId,
      status: { $in: ['planted', 'flowering', 'pollinated', 'fruiting'] },
    });

    // Get status breakdown
    const statusCounts = await Pollination.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get plant type breakdown
    const plantTypeCounts = await Pollination.aggregate([
      { $match: { user: userObjectId } },
      { $group: { _id: '$name', count: { $sum: 1 } } },
    ]);

    // Get plants needing attention
    const needsAttention = await Pollination.getPlantsNeedingAttention(userId);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await Pollination.find({
      user: userId,
      $or: [
        { datePollinated: { $gte: sevenDaysAgo } },
        { dateFirstFlowering: { $gte: sevenDaysAgo } },
        { updatedAt: { $gte: sevenDaysAgo } },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        counts: {
          total: totalPlants,
          active: activePlants,
          needsAttention: needsAttention.length,
        },
        statusBreakdown: statusCounts,
        plantTypeBreakdown: plantTypeCounts,
        needsAttention: needsAttention.slice(0, 5), // Limit to 5 for dashboard
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message,
    });
  }
};

// @desc    Update pollination success status (Successful/Failed)
// @route   POST /api/pollination/:id/check-success
// @access  Private
const updatePollinationStatus = async (req, res) => {
  try {
    const { status } = req.body; // status should be 'Successful' or 'Failed'

    // Validate status
    if (!['Successful', 'Failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "Successful" or "Failed"',
      });
    }

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    // Add new pollination status entry
    pollination.pollinationStatus.push({
      statuspollination: status,
      date: new Date(),
    });

    // Update main status based on result
    if (status === 'Successful') {
      // Successful = advance to fruiting
      pollination.status = 'fruiting';
    } else if (status === 'Failed') {
      // Failed = pollination failed, cannot retry
      // Status stays as 'pollinated' but we mark it as complete/failed
      pollination.status = 'pollinated';
    }

    await pollination.save();

    res.status(200).json({
      success: true,
      message:
        status === 'Successful'
          ? '🌸 Pollination successful! Plant advancing to fruiting stage.'
          : '❌ Pollination failed. This flower cannot be re-pollinated.',
      data: pollination,
    });
  } catch (error) {
    console.error('Update pollination status error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating pollination status',
      error: error.message,
    });
  }
};

// @desc    Update plant status (e.g., fruiting to harvested)
// @route   POST /api/pollination/:id/status
// @access  Private
const updateStatus = async (req, res) => {
  try {
    const { newStatus } = req.body;

    // Validate status
    const validStatuses = ['planted', 'flowering', 'pollinated', 'fruiting', 'harvested'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    pollination.status = newStatus;
    await pollination.save();

    res.status(200).json({
      success: true,
      message: `Status updated to ${newStatus}`,
      data: pollination,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating status',
      error: error.message,
    });
  }
};

// @desc    Get pending pollination notifications
// @route   GET /api/pollination/notifications/pending
// @access  Private
const getPendingNotifications = async (req, res) => {
  try {
    const notifications = await notificationScheduler.getPendingNotifications(req.user.id);

    res.status(200).json({
      success: true,
      message: `Found ${notifications.length} pending notifications`,
      data: notifications,
    });
  } catch (error) {
    console.error('Get pending notifications error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching pending notifications',
      error: error.message,
    });
  }
};

// @desc    Mark pollination notification as sent
// @route   POST /api/pollination/:id/notification-sent
// @access  Private
const markNotificationSent = async (req, res) => {
  try {
    const { notificationType } = req.body; // 'oneHourBefore' or 'thirtyMinsBefore'

    if (!['oneHourBefore', 'thirtyMinsBefore'].includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification type',
      });
    }

    const pollination = await Pollination.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!pollination) {
      return res.status(404).json({
        success: false,
        message: 'Pollination record not found',
      });
    }

    const updated = await notificationScheduler.markNotificationAsSent(
      req.params.id,
      notificationType
    );

    res.status(200).json({
      success: true,
      message: `Notification marked as sent: ${notificationType}`,
      data: updated,
    });
  } catch (error) {
    console.error('Mark notification sent error:', error);
    res.status(400).json({
      success: false,
      message: 'Error marking notification as sent',
      error: error.message,
    });
  }
};

// @desc    Predict flower production based on plant factors
// @route   POST /api/pollination/predict-flowers
// @access  Private
const predictFlowerProduction = async (req, res) => {
  try {
    const {
      pollinationId, // Optional - link to existing plant
      plantType,
      plantAge,
      environmental,
      care,
      growth,
      notes,
    } = req.body;

    // Validate required fields
    if (!plantType || !plantAge || !environmental || !care || !growth) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for prediction',
      });
    }

    // Validate plant type
    const validPlantTypes = ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber'];
    if (!validPlantTypes.includes(plantType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plant type',
      });
    }

    // If pollinationId is provided, verify it exists and belongs to user
    if (pollinationId) {
      const pollinationRecord = await Pollination.findOne({
        _id: pollinationId,
        user: req.user.id,
      });

      if (!pollinationRecord) {
        return res.status(404).json({
          success: false,
          message: 'Pollination record not found',
        });
      }
    }

    // Generate prediction using ML service
    const predictionResult = await MLFlowerPredictionService.predictFlowerProduction({
      plantType,
      plantAge,
      environmental,
      care,
      growth,
    });

    // Save prediction to database
    const flowerPrediction = new FlowerPrediction({
      pollination: pollinationId || undefined,
      plantType,
      plantAge,
      environmental,
      care,
      growth,
      prediction: predictionResult,
      user: req.user.id,
      notes: notes || undefined,
    });

    await flowerPrediction.save();

    res.status(201).json({
      success: true,
      message: 'Flower production prediction generated successfully',
      data: {
        predictionId: flowerPrediction._id,
        plantType,
        plantAge,
        maleFlowers: predictionResult.maleFlowers,
        femaleFlowers: predictionResult.femaleFlowers,
        totalFlowers: {
          min: predictionResult.maleFlowers.min + predictionResult.femaleFlowers.min,
          max: predictionResult.maleFlowers.max + predictionResult.femaleFlowers.max,
          average: predictionResult.maleFlowers.average + predictionResult.femaleFlowers.average,
        },
        confidence: predictionResult.confidence,
        influencingFactors: predictionResult.influencingFactors,
        recommendations: predictionResult.recommendations,
        createdAt: flowerPrediction.createdAt,
      },
    });
  } catch (error) {
    console.error('Predict flower production error:', error);
    res.status(400).json({
      success: false,
      message: 'Error generating flower production prediction',
      error: error.message,
    });
  }
};

// @desc    Get flower production predictions for authenticated user
// @route   GET /api/pollination/predictions
// @access  Private
const getFlowerPredictions = async (req, res) => {
  try {
    const { plantType, pollinationId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = { user: req.user.id };

    if (plantType) {
      query.plantType = plantType;
    }

    if (pollinationId) {
      query.pollination = pollinationId;
    }

    const predictions = await FlowerPrediction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('pollination', 'name displayName datePlanted status');

    const total = await FlowerPrediction.countDocuments(query);

    res.status(200).json({
      success: true,
      count: predictions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: predictions,
    });
  } catch (error) {
    console.error('Get flower predictions error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching flower predictions',
      error: error.message,
    });
  }
};

// @desc    Get single flower prediction by ID
// @route   GET /api/pollination/predictions/:id
// @access  Private
const getFlowerPrediction = async (req, res) => {
  try {
    const prediction = await FlowerPrediction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('pollination', 'name displayName datePlanted status gender image');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Get flower prediction error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching flower prediction',
      error: error.message,
    });
  }
};

// @desc    Delete flower prediction
// @route   DELETE /api/pollination/predictions/:id
// @access  Private
const deleteFlowerPrediction = async (req, res) => {
  try {
    const prediction = await FlowerPrediction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Prediction not found',
      });
    }

    await prediction.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Prediction deleted successfully',
    });
  } catch (error) {
    console.error('Delete flower prediction error:', error);
    res.status(400).json({
      success: false,
      message: 'Error deleting flower prediction',
      error: error.message,
    });
  }
};

// @desc    Get flower prediction statistics for authenticated user
// @route   GET /api/pollination/predictions/stats
// @access  Private
const getFlowerPredictionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all flower predictions for this user
    const predictions = await FlowerPrediction.find({ user: userId });

    const totalPredictions = predictions.length;

    if (totalPredictions === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalPredictions: 0,
          averageConfidence: 0,
          totalMaleFlowers: { min: 0, max: 0, average: 0 },
          totalFemaleFlowers: { min: 0, max: 0, average: 0 },
          genderRatio: { male: 0, female: 0 },
          byPlantType: {},
          recentPredictions: [],
          weeklyStats: { thisWeek: 0, lastWeek: 0, change: 0 },
        },
      });
    }

    // Calculate averages
    let totalMaleMin = 0,
      totalMaleMax = 0,
      totalMaleAvg = 0;
    let totalFemaleMin = 0,
      totalFemaleMax = 0,
      totalFemaleAvg = 0;
    let totalConfidence = 0;

    const byPlantType = {};

    predictions.forEach((pred) => {
      const male = pred.prediction?.maleFlowers || { min: 0, max: 0, average: 0 };
      const female = pred.prediction?.femaleFlowers || { min: 0, max: 0, average: 0 };

      totalMaleMin += male.min || 0;
      totalMaleMax += male.max || 0;
      totalMaleAvg += male.average || 0;
      totalFemaleMin += female.min || 0;
      totalFemaleMax += female.max || 0;
      totalFemaleAvg += female.average || 0;
      totalConfidence += pred.prediction?.confidence || 0;

      // Group by plant type
      const plantType = pred.plantType || 'unknown';
      if (!byPlantType[plantType]) {
        byPlantType[plantType] = {
          count: 0,
          totalMale: 0,
          totalFemale: 0,
          avgConfidence: 0,
        };
      }
      byPlantType[plantType].count++;
      byPlantType[plantType].totalMale += male.average || 0;
      byPlantType[plantType].totalFemale += female.average || 0;
      byPlantType[plantType].avgConfidence += pred.prediction?.confidence || 0;
    });

    // Calculate per-type averages
    Object.keys(byPlantType).forEach((type) => {
      const data = byPlantType[type];
      data.avgMale = Math.round(data.totalMale / data.count);
      data.avgFemale = Math.round(data.totalFemale / data.count);
      data.avgConfidence = Math.round(data.avgConfidence / data.count);
      delete data.totalMale;
      delete data.totalFemale;
    });

    // Calculate gender ratio
    const totalMale = totalMaleAvg;
    const totalFemale = totalFemaleAvg;
    const total = totalMale + totalFemale;
    const genderRatio =
      total > 0
        ? {
            male: Math.round((totalMale / total) * 100),
            female: Math.round((totalFemale / total) * 100),
          }
        : { male: 50, female: 50 };

    // Weekly comparison
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekPreds = predictions.filter((p) => new Date(p.createdAt) >= weekAgo).length;
    const lastWeekPreds = predictions.filter(
      (p) => new Date(p.createdAt) >= twoWeeksAgo && new Date(p.createdAt) < weekAgo
    ).length;

    // Recent predictions (last 5)
    const recentPredictions = await FlowerPrediction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('plantType plantAge prediction createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalPredictions,
        averageConfidence: Math.round(totalConfidence / totalPredictions),
        totalMaleFlowers: {
          min: Math.round(totalMaleMin / totalPredictions),
          max: Math.round(totalMaleMax / totalPredictions),
          average: Math.round(totalMaleAvg / totalPredictions),
        },
        totalFemaleFlowers: {
          min: Math.round(totalFemaleMin / totalPredictions),
          max: Math.round(totalFemaleMax / totalPredictions),
          average: Math.round(totalFemaleAvg / totalPredictions),
        },
        genderRatio,
        byPlantType,
        recentPredictions: recentPredictions.map((p) => ({
          id: p._id,
          plantType: p.plantType,
          plantAge: p.plantAge,
          maleFlowers: p.prediction?.maleFlowers?.average || 0,
          femaleFlowers: p.prediction?.femaleFlowers?.average || 0,
          confidence: p.prediction?.confidence || 0,
          createdAt: p.createdAt,
        })),
        weeklyStats: {
          thisWeek: thisWeekPreds,
          lastWeek: lastWeekPreds,
          change: thisWeekPreds - lastWeekPreds,
        },
      },
    });
  } catch (error) {
    console.error('Get flower prediction stats error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching flower prediction statistics',
      error: error.message,
    });
  }
};

// @desc    Predict crop yield using ML model
// @route   POST /api/pollination/predict-yield
// @access  Private
const predictYield = async (req, res) => {
  try {
    const {
      pollinationId,
      plantType,
      plantAgeDays,
      vineLengthCm,
      nodeCount,
      maleFlowerCount,
      femaleFlowerCount,
      temperatureCelsius,
      soilMoisturePercent,
      notes,
    } = req.body;

    let inputData;

    // If pollinationId provided, fetch data from existing plant
    if (pollinationId) {
      const pollination = await Pollination.findOne({
        _id: pollinationId,
        user: req.user.id,
      });

      if (!pollination) {
        return res.status(404).json({
          success: false,
          message: 'Pollination record not found',
        });
      }

      // Format data from pollination record
      inputData = MLYieldPredictionService.formatPollinationDataForPrediction(pollination);

      // Override with any manually provided values
      if (plantAgeDays !== undefined) inputData.plant_age_days = plantAgeDays;
      if (vineLengthCm !== undefined) inputData.vine_length_cm = vineLengthCm;
      if (nodeCount !== undefined) inputData.node_count = nodeCount;
      if (maleFlowerCount !== undefined) inputData.male_flower_count = maleFlowerCount;
      if (femaleFlowerCount !== undefined) inputData.female_flower_count = femaleFlowerCount;
      if (temperatureCelsius !== undefined) inputData.temperature_celsius = temperatureCelsius;
      if (soilMoisturePercent !== undefined) inputData.soil_moisture_percent = soilMoisturePercent;
    } else {
      // Manual entry - validate required fields
      const validation = MLYieldPredictionService.validateInput({
        plant_type: plantType,
        plant_age_days: plantAgeDays,
        vine_length_cm: vineLengthCm,
        node_count: nodeCount,
        male_flower_count: maleFlowerCount,
        female_flower_count: femaleFlowerCount,
        temperature_celsius: temperatureCelsius,
        soil_moisture_percent: soilMoisturePercent,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data',
          errors: validation.errors,
        });
      }

      inputData = {
        plant_type: plantType,
        plant_age_days: parseFloat(plantAgeDays),
        vine_length_cm: parseFloat(vineLengthCm),
        node_count: parseFloat(nodeCount),
        male_flower_count: parseFloat(maleFlowerCount),
        female_flower_count: parseFloat(femaleFlowerCount),
        temperature_celsius: parseFloat(temperatureCelsius),
        soil_moisture_percent: parseFloat(soilMoisturePercent),
      };
    }

    // Call ML prediction service
    const predictionResult = await MLYieldPredictionService.predictYield(inputData);

    if (!predictionResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Prediction failed',
        error: predictionResult.error,
      });
    }

    // Save prediction to database
    const yieldPrediction = new YieldPrediction({
      user: req.user.id,
      pollination: pollinationId || null,
      plantType: inputData.plant_type,
      plantAgedays: inputData.plant_age_days,
      vineLengthCm: inputData.vine_length_cm,
      nodeCount: inputData.node_count,
      maleFlowerCount: inputData.male_flower_count,
      femaleFlowerCount: inputData.female_flower_count,
      temperatureCelsius: inputData.temperature_celsius,
      soilMoisturePercent: inputData.soil_moisture_percent,
      predictedYieldKg: predictionResult.prediction.yield_kg,
      confidenceScore: predictionResult.prediction.confidence_score,
      recommendations: predictionResult.prediction.recommendations,
      modelMetrics:
        predictionResult.model_info?.test_r2 && predictionResult.model_info?.test_mae
          ? {
              testR2: predictionResult.model_info.test_r2,
              testMae: predictionResult.model_info.test_mae,
            }
          : undefined,
      notes: notes || '',
      isManualEntry: !pollinationId,
    });

    await yieldPrediction.save();

    res.status(201).json({
      success: true,
      message: 'Yield prediction generated successfully',
      data: {
        prediction: {
          id: yieldPrediction._id,
          yield_kg: yieldPrediction.predictedYieldKg,
          confidence_score: yieldPrediction.confidenceScore,
          recommendations: yieldPrediction.recommendations,
        },
        input_summary: predictionResult.input_summary,
        model_info: predictionResult.model_info,
        expected_range: MLYieldPredictionService.getExpectedYieldRange(inputData.plant_type),
      },
    });
  } catch (error) {
    console.error('Yield prediction error:', error);
    res.status(400).json({
      success: false,
      message: 'Error generating yield prediction',
      error: error.message,
    });
  }
};

// @desc    Get all yield predictions for authenticated user
// @route   GET /api/pollination/yield-predictions
// @access  Private
const getYieldPredictions = async (req, res) => {
  try {
    const { plantType, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const options = {
      limit: parseInt(limit),
      skip,
      plantType: plantType || null,
    };

    const predictions = await YieldPrediction.getUserPredictions(req.user.id, options);
    const total = await YieldPrediction.countDocuments({
      user: req.user.id,
      ...(plantType && { plantType }),
    });

    res.status(200).json({
      success: true,
      count: predictions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: predictions,
    });
  } catch (error) {
    console.error('Get yield predictions error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching yield predictions',
      error: error.message,
    });
  }
};

// @desc    Get single yield prediction
// @route   GET /api/pollination/yield-predictions/:id
// @access  Private
const getYieldPrediction = async (req, res) => {
  try {
    const prediction = await YieldPrediction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('pollination', 'plantName pollinationDate plantType');

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Yield prediction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    console.error('Get yield prediction error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching yield prediction',
      error: error.message,
    });
  }
};

// @desc    Record actual yield for prediction
// @route   PUT /api/pollination/yield-predictions/:id/actual-yield
// @access  Private
const recordActualYield = async (req, res) => {
  try {
    const { actualYield } = req.body;

    if (!actualYield || actualYield < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid actual yield is required',
      });
    }

    const prediction = await YieldPrediction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Yield prediction not found',
      });
    }

    await prediction.recordActualYield(parseFloat(actualYield));

    res.status(200).json({
      success: true,
      message: 'Actual yield recorded successfully',
      data: {
        predicted: prediction.predictedYieldKg,
        actual: prediction.actualYieldKg,
        accuracy: prediction.predictionAccuracy,
        variance: prediction.yieldVariance,
      },
    });
  } catch (error) {
    console.error('Record actual yield error:', error);
    res.status(400).json({
      success: false,
      message: 'Error recording actual yield',
      error: error.message,
    });
  }
};

// @desc    Get yield prediction statistics
// @route   GET /api/pollination/yield-predictions/stats
// @access  Private
const getYieldPredictionStats = async (req, res) => {
  try {
    const stats = await YieldPrediction.getPredictionStats(req.user.id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get yield prediction stats error:', error);
    res.status(400).json({
      success: false,
      message: 'Error fetching yield prediction statistics',
      error: error.message,
    });
  }
};

// @desc    Delete yield prediction
// @route   DELETE /api/pollination/yield-predictions/:id
// @access  Private
const deleteYieldPrediction = async (req, res) => {
  try {
    const prediction = await YieldPrediction.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'Yield prediction not found',
      });
    }

    await prediction.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Yield prediction deleted successfully',
    });
  } catch (error) {
    console.error('Delete yield prediction error:', error);
    res.status(400).json({
      success: false,
      message: 'Error deleting yield prediction',
      error: error.message,
    });
  }
};

module.exports = {
  getPollinations,
  getPollination,
  createPollination,
  updatePollination,
  deletePollination,
  addImage,
  deleteImage,
  addNote,
  markFlowering,
  markPollinated,
  getPlantsNeedingAttention,
  getUpcomingPollinations,
  getPlantTypes,
  getDashboardStats,
  updatePollinationStatus,
  updateStatus,
  getPendingNotifications,
  markNotificationSent,
  predictFlowerProduction,
  getFlowerPredictions,
  getFlowerPrediction,
  getFlowerPredictionStats,
  deleteFlowerPrediction,
  predictYield,
  getYieldPredictions,
  getYieldPrediction,
  recordActualYield,
  getYieldPredictionStats,
  deleteYieldPrediction,
};
