const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');

// Route to analyze image (Gemini)
router.post('/analyze', scanController.analyzeImage);

// Route to get harvest prediction
router.post('/predict-harvest', scanController.getHarvestPrediction);


// Route to save a new scan
router.post('/save', scanController.saveScan);

// Route to get scan history for a user
router.get('/history/:userId', scanController.getScanHistory);

// Route to get a single scan by ID
router.get('/:id', scanController.getScanById);

// Route to update a scan (name, notes, etc.)
router.put('/:id', scanController.updateScan);

// Route to delete a scan
router.delete('/:id', scanController.deleteScan);

module.exports = router;