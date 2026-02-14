const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { cloudinary } = require('../config/cloudinary');
const { AppError } = require('../middleware/errorHandler');

// Ensure uploads directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../../uploads');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Storage configuration for local files (temporary storage)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = await ensureUploadDir();
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path
      .basename(file.originalname, fileExtension)
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
      .substring(0, 20); // Limit length

    cb(null, `${baseName}_${uniqueSuffix}${fileExtension}`);
  },
});

// Memory storage for direct cloud uploads (alternative approach)
const memoryStorage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg').split(
    ','
  );

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
};

// Multer configuration for disk storage
const uploadToDisk = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 3 * 1024 * 1024, // 3MB for free tier memory
    files: 5, // Maximum 5 files
  },
});

// Multer configuration for memory storage (for direct cloud upload)
const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 3 * 1024 * 1024, // 3MB for free tier memory
    files: 5,
  },
});

/**
 * Upload single image to Cloudinary
 * @param {Object} file - File object (either from disk or memory)
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary response
 */
const uploadToCloudinary = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'gourd-classification',
      transformation: [
        { width: 1024, height: 1024, crop: 'limit', quality: 'auto' },
        { format: 'jpg' },
      ],
      ...options,
    };

    let uploadResult;

    if (file.path) {
      // Upload from disk
      uploadResult = await cloudinary.uploader.upload(file.path, defaultOptions);

      // Delete local file after upload
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn('Could not delete local file:', error.message);
      }
    } else if (file.buffer) {
      // Upload from memory buffer
      uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(defaultOptions, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(file.buffer);
      });
    } else {
      throw new AppError('Invalid file object', 400, 'INVALID_FILE_OBJECT');
    }

    return {
      cloudinaryId: uploadResult.public_id,
      url: uploadResult.secure_url,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      dimensions: {
        width: uploadResult.width,
        height: uploadResult.height,
      },
      format: uploadResult.format,
      bytes: uploadResult.bytes,
    };
  } catch (error) {
    // Clean up local file if upload failed
    if (file.path) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.warn('Could not delete local file after failed upload:', cleanupError.message);
      }
    }

    throw new AppError(`Image upload failed: ${error.message}`, 500, 'CLOUDINARY_UPLOAD_ERROR');
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} files - Array of file objects
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToCloudinary = async (files, options = {}) => {
  try {
    const uploadPromises = files.map((file, index) => {
      const fileOptions = {
        ...options,
        public_id: options.public_id ? `${options.public_id}_${index}` : undefined,
      };
      return uploadToCloudinary(file, fileOptions);
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new AppError(
      `Multiple image upload failed: ${error.message}`,
      500,
      'MULTIPLE_UPLOAD_ERROR'
    );
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} cloudinaryId - Public ID of the image to delete
 * @returns {Promise<Object>} Deletion result
 */
const deleteFromCloudinary = async (cloudinaryId) => {
  try {
    const result = await cloudinary.uploader.destroy(cloudinaryId);
    return result;
  } catch (error) {
    throw new AppError(`Failed to delete image: ${error.message}`, 500, 'CLOUDINARY_DELETE_ERROR');
  }
};

/**
 * Get image transformation URL
 * @param {string} cloudinaryId - Public ID of the image
 * @param {Object} transformations - Transformation options
 * @returns {string} Transformed image URL
 */
const getTransformedUrl = (cloudinaryId, transformations = {}) => {
  return cloudinary.url(cloudinaryId, {
    secure: true,
    ...transformations,
  });
};

/**
 * Generate thumbnail URL
 * @param {string} cloudinaryId - Public ID of the image
 * @param {number} width - Thumbnail width (default: 200)
 * @param {number} height - Thumbnail height (default: 200)
 * @returns {string} Thumbnail URL
 */
const getThumbnailUrl = (cloudinaryId, width = 200, height = 200) => {
  return getTransformedUrl(cloudinaryId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    format: 'jpg',
  });
};

/**
 * Middleware for single image upload with automatic Cloudinary upload
 */
const uploadSingleImage = (fieldName = 'image') => {
  return async (req, res, next) => {
    try {
      // Use multer to handle the upload
      uploadToDisk.single(fieldName)(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            let message = 'File upload error';
            let code = 'FILE_UPLOAD_ERROR';

            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                message = 'File too large';
                code = 'FILE_TOO_LARGE';
                break;
              case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field';
                code = 'UNEXPECTED_FILE';
                break;
            }

            return next(new AppError(message, 400, code));
          }
          return next(err);
        }

        if (!req.file) {
          return next(); // No file uploaded, continue
        }

        try {
          // Upload to Cloudinary
          const uploadResult = await uploadToCloudinary(req.file, {
            folder: `gourd-classification/${req.user?.id || 'anonymous'}`,
            public_id: `scan_${Date.now()}`,
          });

          // Add upload result to request
          req.uploadedImage = uploadResult;
          next();
        } catch (uploadError) {
          next(uploadError);
        }
      });
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware for multiple image upload with automatic Cloudinary upload
 */
const uploadMultipleImages = (fieldName = 'images', maxCount = 5) => {
  return async (req, res, next) => {
    try {
      uploadToDisk.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            let message = 'File upload error';
            let code = 'FILE_UPLOAD_ERROR';

            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                message = 'File too large';
                code = 'FILE_TOO_LARGE';
                break;
              case 'LIMIT_FILE_COUNT':
                message = 'Too many files';
                code = 'TOO_MANY_FILES';
                break;
            }

            return next(new AppError(message, 400, code));
          }
          return next(err);
        }

        if (!req.files || req.files.length === 0) {
          return next(); // No files uploaded, continue
        }

        try {
          // Upload all files to Cloudinary
          const uploadResults = await uploadMultipleToCloudinary(req.files, {
            folder: `gourd-classification/${req.user?.id || 'anonymous'}`,
          });

          // Add upload results to request
          req.uploadedImages = uploadResults;
          next();
        } catch (uploadError) {
          next(uploadError);
        }
      });
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  uploadToDisk,
  uploadToMemory,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  getTransformedUrl,
  getThumbnailUrl,
  uploadSingleImage,
  uploadMultipleImages,
};
