import { API_BASE_URL } from '../config/api';
import { authService } from './authService';

class ScanService {
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

      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
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
}

export const scanService = new ScanService();
export { ScanService };
