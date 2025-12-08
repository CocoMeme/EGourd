const Scan = require('../models/Scan');

// Save a new scan
exports.saveScan = async (req, res) => {
  try {
    const { 
      userId, 
      imageUrl, 
      prediction, 
      confidence, 
      diseaseInfo, 
      location, 
      notes,
      // New Gemini validation fields
      variety,
      validationStatus,
      aiPrediction
    } = req.body;

    if (!userId || !imageUrl || !prediction || !confidence) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newScan = new Scan({
      userId,
      imageUrl,
      prediction,
      confidence,
      diseaseInfo,
      location,
      notes,
      // Save new validation fields if provided
      variety: variety || null,
      validationStatus: validationStatus || 'tflite_only',
      aiPrediction: aiPrediction || {}
    });

    const savedScan = await newScan.save();

    res.status(201).json({
      message: 'Scan saved successfully',
      scan: savedScan
    });
  } catch (error) {
    console.error('Error saving scan:', error);
    res.status(500).json({ message: 'Server error while saving scan', error: error.message });
  }
};

// Get scan history for a user
exports.getScanHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const scans = await Scan.find({ userId }).sort({ date: -1 });

    res.status(200).json(scans);
  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({ message: 'Server error while fetching history', error: error.message });
  }
};

// Get a single scan by ID
exports.getScanById = async (req, res) => {
  try {
    const { id } = req.params;

    const scan = await Scan.findById(id);

    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    res.status(200).json(scan);
  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({ message: 'Server error while fetching scan', error: error.message });
  }
};

// Delete a scan
exports.deleteScan = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedScan = await Scan.findByIdAndDelete(id);

    if (!deletedScan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    res.status(200).json({ message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan:', error);
    res.status(500).json({ message: 'Server error while deleting scan', error: error.message });
  }
};