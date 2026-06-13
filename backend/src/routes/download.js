const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

/**
 * @route   GET /api/download/apk
 * @desc    Download the GourdVision Android APK
 * @access  Public
 */
router.get('/apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../apk/gourdvision.apk');

  // Check if the file exists
  if (!fs.existsSync(apkPath)) {
    return res.status(404).json({
      status: 'error',
      message: 'APK file not found',
      timestamp: new Date().toISOString(),
    });
  }

  const stat = fs.statSync(apkPath);

  res.set({
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Disposition': 'attachment; filename="GourdVision.apk"',
    'Content-Length': stat.size,
  });

  const readStream = fs.createReadStream(apkPath);
  readStream.pipe(res);
});

module.exports = router;
