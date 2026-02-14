const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

// Upload image to Cloudinary
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Create a stream upload to Cloudinary
    const streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'gourd-scans',
            allowed_formats: ['jpg', 'png', 'jpeg'],
            transformation: [{ width: 1000, crop: 'limit' }],
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
    };

    const result = await streamUpload(req);

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error while uploading image', error: error.message });
  }
};
