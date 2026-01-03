import { API_BASE_URL } from '../config/api';
import { authService } from './authService';
import * as ImageManipulator from 'expo-image-manipulator';

// Max dimensions and quality for upload compression
const MAX_UPLOAD_WIDTH = 1200;
const MAX_UPLOAD_HEIGHT = 1200;
const UPLOAD_QUALITY = 0.7; // 70% quality - good balance of size and quality

class ScanService {
  /**
   * Compress an image before upload to stay under backend size limit
   * @param {string} imageUri - The local URI of the image
   * @returns {Promise<string>} The URI of the compressed image
   */
  async compressImage(imageUri) {
    try {
      console.log('📦 Compressing image for upload...');

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_UPLOAD_WIDTH, height: MAX_UPLOAD_HEIGHT } }],
        {
          compress: UPLOAD_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG
        }
      );

      console.log('✅ Image compressed successfully');
      return result.uri;
    } catch (error) {
      console.warn('⚠️ Image compression failed, using original:', error.message);
      return imageUri; // Fallback to original if compression fails
    }
  }

  /**
   * Upload an image to the server
   * @param {string} imageUri - The local URI of the image
   * @returns {Promise<string>} The URL of the uploaded image
   */
  async uploadImage(imageUri) {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Compress the image before upload to stay under 5MB limit
      const compressedUri = await this.compressImage(imageUri);

      const formData = new FormData();
      const filename = `scan_${Date.now()}.jpg`; // Use consistent naming

      formData.append('image', {
        uri: compressedUri,
        name: filename,
        type: 'image/jpeg',
      });

      const response = await fetch(`${API_BASE_URL}/uploads/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Content-Type is handled automatically by fetch when body is FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload image');
      }

      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Save a new scan
   * @param {Object} scanData - The scan data to save
   * @param {string} imageUri - Optional local image URI to upload
   * @returns {Promise<Object>} The saved scan object
   */
  async saveScan(scanData, imageUri = null) {
    try {
      let user = authService.getCurrentUser();

      // If user is not loaded but we might have a token, try to fetch profile
      if (!user && authService.getToken()) {
        const result = await authService.fetchProfile();
        if (result.success) {
          user = result.user;
        }
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      let imageUrl = scanData.imageUrl;

      // If local image URI is provided, upload it first
      if (imageUri) {
        imageUrl = await this.uploadImage(imageUri);
      }

      const payload = {
        ...scanData,
        imageUrl,
        userId: user.id || user._id, // Handle different ID formats
        // Include validation data if present
        variety: scanData.variety || null,
        validationStatus: scanData.validationStatus || 'tflite_only',
        aiPrediction: scanData.aiPrediction || {}
      };

      const response = await authService.authenticatedRequest('/scans/save', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save scan');
      }

      return data.scan;
    } catch (error) {
      console.error('Error saving scan:', error);
      throw error;
    }
  }

  /**
   * Get scan history for the current user
   * @returns {Promise<Array>} List of scans
   */
  async getScanHistory() {
    try {
      let user = authService.getCurrentUser();

      // If user is not loaded but we might have a token, try to fetch profile
      if (!user && authService.getToken()) {
        const result = await authService.fetchProfile();
        if (result.success) {
          user = result.user;
        }
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      const userId = user.id || user._id;
      const response = await authService.authenticatedRequest(`/scans/history/${userId}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch scan history');
      }

      return data;
    } catch (error) {
      console.error('Error fetching scan history:', error);
      throw error;
    }
  }

  /**
   * Get a single scan by ID
   * @param {string} scanId - The ID of the scan to retrieve
   * @returns {Promise<Object>} The scan object
   */
  async getScanById(scanId) {
    try {
      const response = await authService.authenticatedRequest(`/scans/${scanId}`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch scan');
      }

      return data;
    } catch (error) {
      console.error('Error fetching scan:', error);
      throw error;
    }
  }

  /**
   * Get harvest prediction from Gemini
   * @param {Object} scanData - Data about the scanned flower
   * @param {Object} environmentalData - Weather and location context
   * @returns {Promise<Object>} The prediction object
   */
  async getHarvestPrediction(scanData, environmentalData = {}) {
    try {
      const response = await authService.authenticatedRequest('/scans/predict-harvest', {
        method: 'POST',
        body: JSON.stringify({ scanData, environmentalData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get harvest prediction');
      }

      return data;
    } catch (error) {
      console.error('Error getting harvest prediction:', error);
      throw error;
    }
  }

  /**
   * Delete a scan
   * @param {string} scanId - The ID of the scan to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteScan(scanId) {
    try {
      const response = await authService.authenticatedRequest(`/scans/${scanId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete scan');
      }

      return true;
    } catch (error) {
      console.error('Error deleting scan:', error);
      throw error;
    }
  }

  /**
   * Update a scan (name, notes, etc.)
   * @param {string} scanId - The ID of the scan to update
   * @param {Object} updates - The fields to update (name, notes)
   * @returns {Promise<Object>} The updated scan object
   */
  async updateScan(scanId, updates) {
    try {
      const response = await authService.authenticatedRequest(`/scans/${scanId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update scan');
      }

      return data.scan;
    } catch (error) {
      console.error('Error updating scan:', error);
      throw error;
    }
  }
}

export const scanService = new ScanService();
export { ScanService };
