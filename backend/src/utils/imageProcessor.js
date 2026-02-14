/**
 * Image Processor Module
 * Memory-efficient image processing using Sharp for Gemini API optimization
 */

const sharp = require('sharp');

// Configuration for memory-efficient processing
const CONFIG = {
  MAX_DIMENSION: 1024, // Max width/height for Gemini
  JPEG_QUALITY: 80, // Good quality with compression
  MEMORY_LIMIT_MB: 50, // Sharp memory limit per operation
};

// Configure Sharp for low memory usage
sharp.cache({ memory: CONFIG.MEMORY_LIMIT_MB });
sharp.concurrency(1); // Process one image at a time to limit memory

/**
 * Compress a base64 image for Gemini API
 * Resizes to max 1024px and compresses to JPEG 80%
 *
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @returns {Promise<string>} Compressed base64 image (without data URI prefix)
 */
async function compressForGemini(base64Image) {
  try {
    // Remove data URI prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

    // Convert base64 to buffer
    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Get image metadata to determine resize strategy
    const metadata = await sharp(inputBuffer).metadata();

    // Calculate new dimensions (maintain aspect ratio)
    let width = metadata.width;
    let height = metadata.height;

    if (width > CONFIG.MAX_DIMENSION || height > CONFIG.MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height / width) * CONFIG.MAX_DIMENSION);
        width = CONFIG.MAX_DIMENSION;
      } else {
        width = Math.round((width / height) * CONFIG.MAX_DIMENSION);
        height = CONFIG.MAX_DIMENSION;
      }
    }

    // Process image: resize and compress
    const outputBuffer = await sharp(inputBuffer)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: CONFIG.JPEG_QUALITY,
        mozjpeg: true, // Better compression
      })
      .toBuffer();

    // Convert back to base64
    const compressedBase64 = outputBuffer.toString('base64');

    // Log compression stats
    const originalSize = inputBuffer.length;
    const compressedSize = outputBuffer.length;
    const savings = Math.round((1 - compressedSize / originalSize) * 100);

    console.log(
      `🖼️ Image compressed: ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (${savings}% saved)`
    );

    // Let buffers be garbage collected
    inputBuffer.fill(0);
    outputBuffer.fill(0);

    return compressedBase64;
  } catch (error) {
    console.error('❌ Image compression failed:', error.message);
    // Return original if compression fails
    return base64Image.replace(/^data:image\/\w+;base64,/, '');
  }
}

/**
 * Optimize an image buffer for upload
 *
 * @param {Buffer} buffer - Image buffer
 * @param {Object} options - Processing options
 * @returns {Promise<Buffer>} Optimized buffer
 */
async function optimizeBuffer(buffer, options = {}) {
  const { maxDimension = CONFIG.MAX_DIMENSION, quality = CONFIG.JPEG_QUALITY } = options;

  try {
    const optimized = await sharp(buffer)
      .resize(maxDimension, maxDimension, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error('❌ Buffer optimization failed:', error.message);
    return buffer;
  }
}

/**
 * Get image dimensions without loading full image into memory
 *
 * @param {Buffer|string} input - Buffer or file path
 * @returns {Promise<{width: number, height: number}>}
 */
async function getImageDimensions(input) {
  const metadata = await sharp(input).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
  };
}

module.exports = {
  compressForGemini,
  optimizeBuffer,
  getImageDimensions,
  CONFIG,
};
