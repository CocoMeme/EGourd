/**
 * Plant Routes - Revised Pollination Management
 * ==============================================
 * 
 * API routes for complete plant lifecycle management with ML predictions.
 */

const express = require('express');
const router = express.Router();

// Import controller functions
const {
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
} = require('../controllers/plantController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { uploadToMemory } = require('../utils/uploadHelper');

// Configure multer for image uploads
const upload = uploadToMemory;

// ===== PUBLIC ROUTES =====
router.get('/gourd-types', getGourdTypes);

// ===== PROTECTED ROUTES =====
router.use(authenticate);

// Dashboard routes (must be before /:id)
router.get('/dashboard/stats', getDashboardStats);
router.get('/attention/needed', getPlantsNeedingAttention);

// Main CRUD routes
router.route('/')
  .get(getPlants)
  .post(createPlant);

router.route('/:id')
  .get(getPlant)
  .put(updatePlant)
  .delete(deletePlant);

// Image management
router.post('/:id/image', upload.single('image'), updateImage);

// Flowering routes
router.post('/:id/predict-flowering', predictFlowering);
router.post('/:id/flowering', recordFlowering);
router.put('/:id/flowers', updateFlowerCounts);

// Pollination routes
router.post('/:id/predict-pollination', predictPollinationSuccess);
router.get('/:id/pollinations', getPollinations);
router.post('/:id/pollinations', addPollination);
router.put('/:id/pollinations/:pollinationId', updatePollination);
router.delete('/:id/pollinations/:pollinationId', deletePollination);
router.put('/:id/pollinations/:pollinationId/result', recordPollinationResult);

// Fruit & Harvest routes
router.post('/:id/predict-maturity', predictFruitMaturity);
router.put('/:id/fruits/:fruitId/harvest', recordHarvest);

// Lifecycle prediction
router.post('/:id/lifecycle-prediction', getLifecyclePrediction);

module.exports = router;
