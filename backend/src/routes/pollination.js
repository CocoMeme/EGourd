const express = require('express');
const router = express.Router();

// Import controller functions
const {
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
} = require('../controllers/pollinationController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { validatePollination, validateNote } = require('../middleware/validation');
const { uploadToMemory } = require('../utils/uploadHelper');

// Configure multer for image uploads using memory storage
const upload = uploadToMemory;

// Public routes
router.get('/plant-types', getPlantTypes);

// Protected routes - require authentication
router.use(authenticate);

// Special functionality routes (must be before /:id routes)
router.get('/dashboard/stats', getDashboardStats);
router.get('/attention/needed', getPlantsNeedingAttention);
router.get('/upcoming/pollinations', getUpcomingPollinations);
router.get('/notifications/pending', getPendingNotifications);

// Flower production prediction routes (must be before /:id routes)
router.post('/predict-flowers', predictFlowerProduction);
router.get('/predictions/stats', getFlowerPredictionStats);
router.get('/predictions', getFlowerPredictions);
router.route('/predictions/:id').get(getFlowerPrediction).delete(deleteFlowerPrediction);

// Yield prediction routes (must be before /:id routes)
router.post('/predict-yield', predictYield);
router.get('/yield-predictions/stats', getYieldPredictionStats);
router.get('/yield-predictions', getYieldPredictions);
router
  .route('/yield-predictions/:id')
  .get(getYieldPrediction)
  .put(recordActualYield)
  .delete(deleteYieldPrediction);
router.put('/yield-predictions/:id/actual-yield', recordActualYield);

// Main CRUD routes
router.route('/').get(getPollinations).post(validatePollination, createPollination);

router.route('/:id').get(getPollination).put(updatePollination).delete(deletePollination);

// Image management routes
router.post('/:id/images', upload.single('image'), addImage);
// @route   DELETE /api/pollination/:id/images
// @access  Private
router.delete('/:id/images', authenticate, deleteImage);

// Note management routes
router.post('/:id/notes', validateNote, addNote);

// Plant lifecycle management routes
router.post('/:id/flowering', markFlowering);
router.post('/:id/pollinate', markPollinated);
router.post('/:id/check-success', updatePollinationStatus);
router.post('/:id/status', updateStatus);
router.post('/:id/notification-sent', markNotificationSent);

module.exports = router;
