/**
 * Plant Management Service - Revised
 * ===================================
 * 
 * Complete plant lifecycle management with ML-based predictions.
 * Communicates with the new /api/plants endpoints.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

// Add auth token to requests
api.interceptors.request.use(
  async (config) => {
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
  (error) => Promise.reject(error)
);

// Response error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response:', error.request);
    } else {
      console.error('❌ Request error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Gourd type display configuration
const GOURD_DISPLAY = {
  bitter_gourd: {
    english: 'Bitter Gourd',
    tagalog: 'Ampalaya',
    icon: '🥒',
    color: '#4CAF50'
  },
  bottle_gourd: {
    english: 'Bottle Gourd',
    tagalog: 'Upo',
    icon: '🫛',
    color: '#8BC34A'
  },
  sponge_gourd: {
    english: 'Sponge Gourd',
    tagalog: 'Patola',
    icon: '🥬',
    color: '#CDDC39'
  },
  cucumber: {
    english: 'Cucumber',
    tagalog: 'Pipino',
    icon: '🥒',
    color: '#009688'
  }
};

class PlantService {
  constructor() {
    this.baseURL = '/plants';
  }

  // ===== HELPER METHODS =====
  
  /**
   * Format gourd type for display
   */
  formatGourdType(type, language = 'english') {
    const display = GOURD_DISPLAY[type];
    if (!display) return type;
    return language === 'tagalog' ? display.tagalog : display.english;
  }

  /**
   * Get gourd display config
   */
  getGourdDisplay(type) {
    return GOURD_DISPLAY[type] || { english: type, tagalog: type, icon: '🌱', color: '#4CAF50' };
  }

  /**
   * Format date for display
   */
  formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  /**
   * Calculate days until date
   */
  daysUntil(date) {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  // ===== CRUD OPERATIONS =====

  /**
   * Get all plants for current user
   */
  async getPlants(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.gourdType) queryParams.append('gourdType', filters.gourdType);
      if (filters.sort) queryParams.append('sort', filters.sort);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());

      const queryString = queryParams.toString();
      const url = queryString ? `${this.baseURL}?${queryString}` : this.baseURL;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('❌ Get plants error:', error.message);
      throw error;
    }
  }

  /**
   * Get single plant
   */
  async getPlant(id) {
    try {
      const response = await api.get(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Get plant error:', error.message);
      throw error;
    }
  }

  /**
   * Create new plant
   */
  async createPlant(plantData) {
    try {
      console.log('🌱 Creating plant:', plantData);
      const response = await api.post(this.baseURL, plantData);
      return response.data;
    } catch (error) {
      console.error('❌ Create plant error:', error.message);
      throw error;
    }
  }

  /**
   * Update plant
   */
  async updatePlant(id, plantData) {
    try {
      const response = await api.put(`${this.baseURL}/${id}`, plantData);
      return response.data;
    } catch (error) {
      console.error('❌ Update plant error:', error.message);
      throw error;
    }
  }

  /**
   * Delete plant
   */
  async deletePlant(id) {
    try {
      const response = await api.delete(`${this.baseURL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Delete plant error:', error.message);
      throw error;
    }
  }

  // ===== IMAGE MANAGEMENT =====

  /**
   * Upload plant image
   */
  async uploadImage(plantId, imageUri, caption = '') {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'plant_image.jpg'
      });
      if (caption) formData.append('caption', caption);

      const response = await api.post(`${this.baseURL}/${plantId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('❌ Upload image error:', error.message);
      throw error;
    }
  }

  // ===== FLOWERING =====

  /**
   * Get flowering prediction for plant
   */
  async predictFlowering(plantId, additionalData = {}) {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/predict-flowering`, additionalData);
      return response.data;
    } catch (error) {
      console.error('❌ Predict flowering error:', error.message);
      throw error;
    }
  }

  /**
   * Record flowering start
   */
  async recordFlowering(plantId, maleCount = 0, femaleCount = 0) {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/flowering`, {
        maleFlowerCount: maleCount,
        femaleFlowerCount: femaleCount
      });
      return response.data;
    } catch (error) {
      console.error('❌ Record flowering error:', error.message);
      throw error;
    }
  }

  /**
   * Update flower counts
   */
  async updateFlowerCounts(plantId, maleCount, femaleCount) {
    try {
      const response = await api.put(`${this.baseURL}/${plantId}/flowers`, {
        maleFlowerCount: maleCount,
        femaleFlowerCount: femaleCount
      });
      return response.data;
    } catch (error) {
      console.error('❌ Update flower counts error:', error.message);
      throw error;
    }
  }

  // ===== POLLINATION =====

  /**
   * Predict pollination success
   */
  async predictPollinationSuccess(plantId, data = {}) {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/predict-pollination`, data);
      return response.data;
    } catch (error) {
      console.error('❌ Predict pollination error:', error.message);
      throw error;
    }
  }

  /**
   * Add pollination event
   */
  async addPollination(plantId, femaleFlowersPollinated, isHandPollinated = true, notes = '') {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/pollinations`, {
        femaleFlowersPollinated,
        isHandPollinated,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('❌ Add pollination error:', error.message);
      throw error;
    }
  }

  /**
   * Get all pollinations for a plant
   */
  async getPollinations(plantId) {
    try {
      const response = await api.get(`${this.baseURL}/${plantId}/pollinations`);
      return response.data;
    } catch (error) {
      console.error('❌ Get pollinations error:', error.message);
      throw error;
    }
  }

  /**
   * Update pollination entry
   */
  async updatePollination(plantId, pollinationId, updateData) {
    try {
      const response = await api.put(
        `${this.baseURL}/${plantId}/pollinations/${pollinationId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('❌ Update pollination error:', error.message);
      throw error;
    }
  }

  /**
   * Delete pollination entry
   */
  async deletePollination(plantId, pollinationId) {
    try {
      const response = await api.delete(
        `${this.baseURL}/${plantId}/pollinations/${pollinationId}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Delete pollination error:', error.message);
      throw error;
    }
  }

  /**
   * Record pollination result
   */
  async recordPollinationResult(plantId, pollinationId, successfulCount) {
    try {
      const response = await api.put(
        `${this.baseURL}/${plantId}/pollinations/${pollinationId}/result`,
        { successfulCount }
      );
      return response.data;
    } catch (error) {
      console.error('❌ Record pollination result error:', error.message);
      throw error;
    }
  }

  // ===== FRUIT & HARVEST =====

  /**
   * Predict fruit maturity
   */
  async predictFruitMaturity(plantId, successfulPollinations = 1) {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/predict-maturity`, {
        successfulPollinations
      });
      return response.data;
    } catch (error) {
      console.error('❌ Predict maturity error:', error.message);
      throw error;
    }
  }

  /**
   * Record harvest
   */
  async recordHarvest(plantId, fruitId, yieldKg, fruitCount = 1, notes = '') {
    try {
      const response = await api.put(`${this.baseURL}/${plantId}/fruits/${fruitId}/harvest`, {
        yieldKg,
        fruitCount,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('❌ Record harvest error:', error.message);
      throw error;
    }
  }

  // ===== DASHBOARD =====

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      const response = await api.get(`${this.baseURL}/dashboard/stats`);
      return response.data;
    } catch (error) {
      console.error('❌ Get dashboard stats error:', error.message);
      throw error;
    }
  }

  /**
   * Get plants needing attention
   */
  async getPlantsNeedingAttention() {
    try {
      const response = await api.get(`${this.baseURL}/attention/needed`);
      return response.data;
    } catch (error) {
      console.error('❌ Get attention plants error:', error.message);
      throw error;
    }
  }

  /**
   * Get gourd types
   */
  async getGourdTypes() {
    try {
      const response = await api.get(`${this.baseURL}/gourd-types`);
      return response.data;
    } catch (error) {
      console.error('❌ Get gourd types error:', error.message);
      throw error;
    }
  }

  /**
   * Get full lifecycle prediction
   */
  async getLifecyclePrediction(plantId) {
    try {
      const response = await api.post(`${this.baseURL}/${plantId}/lifecycle-prediction`);
      return response.data;
    } catch (error) {
      console.error('❌ Get lifecycle prediction error:', error.message);
      throw error;
    }
  }

  // ===== STATUS HELPERS =====

  /**
   * Get status display info
   */
  getStatusDisplay(status) {
    const statusMap = {
      planted: { label: 'Planted', color: '#9E9E9E', icon: 'leaf' },
      growing: { label: 'Growing', color: '#4CAF50', icon: 'trending-up' },
      flowering: { label: 'Flowering', color: '#FF9800', icon: 'flower' },
      pollinating: { label: 'Pollinating', color: '#2196F3', icon: 'sync' },
      fruiting: { label: 'Fruiting', color: '#8BC34A', icon: 'nutrition' },
      harvesting: { label: 'Harvesting', color: '#FF5722', icon: 'basket' },
      completed: { label: 'Completed', color: '#607D8B', icon: 'checkmark-circle' },
      failed: { label: 'Failed', color: '#F44336', icon: 'close-circle' }
    };
    return statusMap[status] || { label: status, color: '#9E9E9E', icon: 'help-circle' };
  }

  /**
   * Get progress percentage for plant lifecycle
   */
  getLifecycleProgress(plant) {
    const statusProgress = {
      planted: 10,
      growing: 25,
      flowering: 40,
      pollinating: 55,
      fruiting: 75,
      harvesting: 90,
      completed: 100,
      failed: 0
    };
    return statusProgress[plant.status] || 0;
  }
}

// Export singleton instance
export const plantService = new PlantService();
export default plantService;
