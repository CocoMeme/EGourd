const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scanController');
const { authenticate } = require('../middleware/auth');

/**
 * @swagger
 * /api/scans/history/{userId}:
 *   get:
 *     summary: Get scan history for a user
 *     tags: [Scans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: A list of scans
 *       401:
 *         description: Unauthorized
 */
// Route to analyze image (Gemini) - requires auth
router.post('/analyze', authenticate, scanController.analyzeImage);

// Route to analyze leaf image (Gemini) - requires auth
router.post('/analyze-leaf', authenticate, scanController.analyzeLeaf);

// Route to get harvest prediction - requires auth
router.post('/predict-harvest', authenticate, scanController.getHarvestPrediction);

// Route to get analytics data for a user - requires auth
router.get('/analytics/:userId', authenticate, scanController.getAnalytics);

// Route to save a new scan - requires auth
router.post('/save', authenticate, scanController.saveScan);

// Route to get scan history for a user - requires auth
router.get('/history/:userId', authenticate, scanController.getScanHistory);

// Route to get a single scan by ID - requires auth
router.get('/:id', authenticate, scanController.getScanById);

// Route to update a scan (name, notes, etc.) - requires auth
router.put('/:id', authenticate, scanController.updateScan);

// Route to add feedback to a scan - requires auth
router.post('/:id/feedback', authenticate, scanController.addFeedback);

// Route to re-run Gemini analysis on an existing scan - requires auth
router.post('/:id/reanalyze', authenticate, scanController.reanalyzeScan);

// Route to delete a scan - requires auth
router.delete('/:id', authenticate, scanController.deleteScan);

module.exports = router;
