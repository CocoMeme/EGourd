import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveApiUrl } from '../config/api';

// Create axios instance (baseURL is updated per-request via interceptor for runtime override support)
const api = axios.create({
  baseURL: getActiveApiUrl(),
  timeout: 60000,
});

// Add auth token to requests and refresh baseURL in case of runtime override
api.interceptors.request.use(
  async (config) => {
    config.baseURL = getActiveApiUrl();
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('❌ Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('❌ Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

class PollinationService {
  constructor() {
    this.baseURL = '/pollination'; // Fixed: removed /api prefix since it's already in API_BASE_URL
  }

  // Get all pollination records
  async getPollinations(filters = {}) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const queryParams = new URLSearchParams();

        if (filters.status) queryParams.append('status', filters.status);
        if (filters.name) queryParams.append('name', filters.name);
        if (filters.sort) queryParams.append('sort', filters.sort);
        if (filters.page) queryParams.append('page', filters.page.toString());
        if (filters.limit) queryParams.append('limit', filters.limit.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;

        // Debug logging
        console.log(`🔍 Fetching pollinations (attempt ${attempt}/${maxRetries}) from:`, `${API_BASE_URL}${url}`);

        // Check if token exists
        const token = await AsyncStorage.getItem('userToken');
        console.log('🎟️ Token exists:', !!token);

        const response = await api.get(url);
        console.log('✅ Successfully fetched pollinations:', response.data);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        // Don't retry on 401/403 auth errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          console.error('❌ Auth error - not retrying');
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ All retry attempts failed');
    throw lastError;
  }

  // Get single pollination record
  async getPollination(id) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await api.get(`${this.baseURL}/${id}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed getting pollination:`, error.message);

        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // Create new pollination record
  async createPollination(data) {
    try {
      console.log('🌱 Creating pollination with data:', data);

      // If there's an image, we need to create the plant first, then add the image
      let imageData = null;
      if (data.image) {
        imageData = data.image;
        console.log('🖼️ Image will be uploaded after plant creation:', imageData);
        delete data.image; // Remove image from initial data
      }

      // Create the plant without image first
      console.log('🌱 Creating plant without image...');
      const response = await api.post(this.baseURL, data);
      const createdPlant = response.data.data;
      console.log('✅ Plant created:', createdPlant._id);

      // If there was an image, add it now
      if (imageData && createdPlant._id) {
        try {
          console.log('🖼️ Now uploading image to:', createdPlant._id);
          const imageResponse = await this.addImage(createdPlant._id, imageData);
          console.log('✅ Image uploaded successfully:', imageResponse);
        } catch (imageError) {
          console.error('⚠️ Plant created but image upload failed:', imageError);
          console.error('⚠️ Image error status:', imageError.response?.status);
          console.error('⚠️ Image error data:', imageError.response?.data);
          console.error('⚠️ Image error message:', imageError.message);
          // Throw the error so user knows
          throw new Error(`Plant created but image upload failed: ${imageError.message}`);
        }
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error creating pollination:', error);
      console.error('❌ Error details:', error.response?.data);
      throw error;
    }
  }

  // Update pollination record
  async updatePollination(id, data) {
    try {
      const response = await api.put(`${this.baseURL}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating pollination:', error);
      throw error;
    }
  }

  // Delete pollination record
  async deletePollination(id) {
    try {
      const response = await api.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting pollination:', error);
      throw error;
    }
  }

// Add image to pollination record
  async addImage(id, imageData, caption, imageType = 'general') {
    try {
      console.log('🖼️ Adding image to plant:', id);
      console.log('🖼️ Image data:', imageData);

      const formData = new FormData();

      // Handle both file path and blob
      if (imageData.uri) {
        const imageObject = {
          uri: imageData.uri,
          type: imageData.type || 'image/jpeg',
          name: imageData.name || `image_${Date.now()}.jpg`,
        };

        console.log('🖼️ Image object for FormData:', imageObject);
        formData.append('image', imageObject);
      } else if (imageData instanceof File || imageData instanceof Blob) {
        formData.append('image', imageData, `image_${Date.now()}.jpg`);
      }

      if (caption) formData.append('caption', caption);
      if (imageType) formData.append('imageType', imageType);

      console.log('🖼️ Uploading to:', `${this.baseURL}/${id}/images`);

      const response = await api.post(
        `${this.baseURL}/${id}/images`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Image upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error adding image:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error;
    }
  }

  // Delete image from pollination record
  async deleteImage(id, imageId) {
    try {
      const response = await api.delete(`${this.baseURL}/${id}/images/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  // Add note to pollination record
  async addNote(id, content, type = 'observation') {
    try {
      const response = await api.post(`${this.baseURL}/${id}/notes`, {
        content,
        type
      });
      return response.data;
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  }

  // Mark plant as flowering
  async markFlowering(id, gender, date) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/flowering`, {
        gender,
        date
      });
      return response.data;
    } catch (error) {
      console.error('Error marking flowering:', error);
      throw error;
    }
  }

  // Mark plant as pollinated
  async markPollinated(id, date) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/pollinate`, {
        date
      });
      return response.data;
    } catch (error) {
      console.error('Error marking pollination:', error);
      throw error;
    }
  }

  // Update pollination status (Successful/Failed)
  async updatePollinationStatus(id, status) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/check-success`, {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating pollination status:', error);
      throw error;
    }
  }

  // Update plant status (fruiting to harvested)
  async updateStatus(id, newStatus) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/status`, {
        newStatus
      });
      return response.data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  // Get pending pollination notifications
  async getPendingNotifications() {
    try {
      const response = await api.get(`${this.baseURL}/notifications/pending`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pending notifications:', error);
      throw error;
    }
  }

  // Mark pollination notification as sent
  async markNotificationSent(id, notificationType) {
    try {
      const response = await api.post(`${this.baseURL}/${id}/notification-sent`, {
        notificationType
      });
      return response.data;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      throw error;
    }
  }

  // Get plants needing attention
  async getPlantsNeedingAttention() {
    try {
      const response = await api.get(`${this.baseURL}/attention/needed`);
      return response.data;
    } catch (error) {
      console.error('Error fetching plants needing attention:', error);
      throw error;
    }
  }

  // Get upcoming pollinations
  async getUpcomingPollinations(days = 7) {
    try {
      const response = await api.get(`${this.baseURL}/upcoming/pollinations?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming pollinations:', error);
      throw error;
    }
  }

  // Get plant types
  async getPlantTypes() {
    try {
      const url = `${this.baseURL}/plant-types`;
      console.log('🌱 Fetching plant types from:', `${API_BASE_URL}${url}`);

      const response = await api.get(url);
      console.log('✅ Successfully fetched plant types:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plant types:', error.response?.status, error.response?.data || error.message);
      throw error;
    }
  }

  // Get dashboard statistics
  async getDashboardStats() {
    try {
      const response = await api.get(`${this.baseURL}/dashboard/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  // Helper method to format dates for API
  formatDate(date) {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }

  // Helper method to calculate days between dates
  calculateDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Helper method to format plant names for display
  formatPlantName(name) {
    const plantNames = {
      bitter_gourd: 'Bitter Gourd',
      sponge_gourd: 'Sponge Gourd',
      bottle_gourd: 'Bottle Gourd',
      kalabasa: 'Squash',
      cucumber: 'Cucumber',
    };

    return plantNames[name] || name;
  }

  // Helper method to get status color
  getStatusColor(status) {
    const statusColors = {
      planted: '#FF9800',
      flowering: '#9C27B0',
      pollinated: '#2196F3',
      fruiting: '#4CAF50',
      harvested: '#8BC34A',
    };

    return statusColors[status] || '#757575';
  }

  // Helper method to get pollination status
  getPollinationStatus(estimatedDates, datePollinated) {
    if (datePollinated) return { status: 'completed', color: '#4CAF50' };

    const today = new Date();
    const earliest = new Date(estimatedDates?.pollinationWindow?.earliest);
    const latest = new Date(estimatedDates?.pollinationWindow?.latest);

    if (today >= earliest && today <= latest) {
      return { status: 'ready', color: '#4CAF50' };
    }

    if (today > latest) {
      return { status: 'overdue', color: '#F44336' };
    }

    if (earliest && today < earliest) {
      const daysUntil = this.calculateDaysBetween(today, earliest);
      if (daysUntil <= 3) {
        return { status: 'upcoming', color: '#FF9800' };
      }
      return { status: 'not_ready', color: '#757575' };
    }

    return { status: 'unknown', color: '#757575' };
  }

  // ====================
  // Flower Prediction API
  // ====================

  /**
   * Generate flower production prediction
   * @param {Object} predictionData - Input data for prediction
   * @returns {Promise} API response with prediction results
   */
  async predictFlowers(predictionData) {
    try {
      console.log('📊 Generating flower prediction...');
      const response = await api.post(`${this.baseURL}/predict-flowers`, predictionData);
      console.log('✅ Prediction generated successfully');
      return response;
    } catch (error) {
      console.error('❌ Error predicting flowers:', error);
      throw error;
    }
  }

  /**
   * Get all flower predictions for user
   * @param {Object} filters - Optional filters (plantType, pollinationId, page, limit)
   * @returns {Promise} API response with predictions list
   */
  async getFlowerPredictions(filters = {}) {
    try {
      console.log('📊 Fetching flower predictions...');
      const response = await api.get(`${this.baseURL}/predictions`, { params: filters });
      console.log(`✅ Fetched ${response.data.count} predictions`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching predictions:', error);
      throw error;
    }
  }

  /**
   * Get single flower prediction by ID
   * @param {String} predictionId - Prediction ID
   * @returns {Promise} API response with prediction details
   */
  async getFlowerPrediction(predictionId) {
    try {
      console.log(`📊 Fetching prediction ${predictionId}...`);
      const response = await api.get(`${this.baseURL}/predictions/${predictionId}`);
      console.log('✅ Prediction fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching prediction:', error);
      throw error;
    }
  }

  /**
   * Delete flower prediction
   * @param {String} predictionId - Prediction ID to delete
   * @returns {Promise} API response
   */
  async deleteFlowerPrediction(predictionId) {
    try {
      console.log(`🗑️ Deleting prediction ${predictionId}...`);
      const response = await api.delete(`${this.baseURL}/predictions/${predictionId}`);
      console.log('✅ Prediction deleted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error deleting prediction:', error);
      throw error;
    }
  }

  /**
   * Predict crop yield using ML model
   * @param {Object} yieldData - Input data for yield prediction
   * @returns {Promise} API response with yield prediction
   */
  async predictYield(yieldData) {
    try {
      console.log('🌾 Generating yield prediction...');
      console.log('Input data:', yieldData);
      const response = await api.post(`${this.baseURL}/predict-yield`, yieldData);
      console.log('✅ Yield prediction generated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error predicting yield:', error);
      throw error;
    }
  }

  /**
   * Get yield predictions for user
   * @param {Object} params - Query parameters (page, limit, plantType)
   * @returns {Promise} API response with yield predictions
   */
  async getYieldPredictions(params = {}) {
    try {
      console.log('📊 Fetching yield predictions...');
      const response = await api.get(`${this.baseURL}/yield-predictions`, { params });
      console.log('✅ Yield predictions fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching yield predictions:', error);
      throw error;
    }
  }

  /**
   * Get single yield prediction
   * @param {String} predictionId - Prediction ID
   * @returns {Promise} API response with yield prediction details
   */
  async getYieldPrediction(predictionId) {
    try {
      console.log(`📊 Fetching yield prediction ${predictionId}...`);
      const response = await api.get(`${this.baseURL}/yield-predictions/${predictionId}`);
      console.log('✅ Yield prediction fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching yield prediction:', error);
      throw error;
    }
  }

  /**
   * Record actual yield for prediction
   * @param {String} predictionId - Prediction ID
   * @param {Number} actualYield - Actual yield in kg
   * @returns {Promise} API response
   */
  async recordActualYield(predictionId, actualYield) {
    try {
      console.log(`📝 Recording actual yield for prediction ${predictionId}...`);
      const response = await api.put(`${this.baseURL}/yield-predictions/${predictionId}/actual-yield`, {
        actualYield
      });
      console.log('✅ Actual yield recorded successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error recording actual yield:', error);
      throw error;
    }
  }

  /**
   * Get yield prediction statistics
   * @returns {Promise} API response with statistics
   */
  async getYieldPredictionStats() {
    try {
      console.log('📊 Fetching yield prediction statistics...');
      const response = await api.get(`${this.baseURL}/yield-predictions/stats`);
      console.log('✅ Statistics fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Delete yield prediction
   * @param {String} predictionId - Prediction ID to delete
   * @returns {Promise} API response
   */
  async deleteYieldPrediction(predictionId) {
    try {
      console.log(`🗑️ Deleting yield prediction ${predictionId}...`);
      const response = await api.delete(`${this.baseURL}/yield-predictions/${predictionId}`);
      console.log('✅ Yield prediction deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting yield prediction:', error);
      throw error;
    }
  }
}

export const pollinationService = new PollinationService();
