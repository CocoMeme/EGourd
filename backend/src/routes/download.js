const express = require('express');
const router = express.Router();

// Google Drive file ID extracted from the sharing link
const GOOGLE_DRIVE_FILE_ID = '10POHgvYcucO7PUh7bfAU4HX0bq1Bg489';
const GOOGLE_DRIVE_DOWNLOAD_URL = `https://drive.usercontent.google.com/download?export=download&confirm=t&id=${GOOGLE_DRIVE_FILE_ID}`;

/**
 * @route   GET /api/download/apk
 * @desc    Redirect to the GourdVision Android APK hosted on Google Drive
 * @access  Public
 */
router.get('/apk', (req, res) => {
  res.redirect(GOOGLE_DRIVE_DOWNLOAD_URL);
});

module.exports = router;
