import api from '../config/api';

class AnalyticsService {
  /**
   * Get analytics data for a user
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters (startDate, endDate, scanType, variety)
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(userId, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.scanType) params.append('scanType', filters.scanType);
      if (filters.variety) params.append('variety', filters.variety);

      const queryString = params.toString();
      const url = `/scans/analytics/${userId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Get date range presets
   */
  getDateRangePresets() {
    const now = new Date();
    
    return {
      '7days': {
        label: 'Last 7 Days',
        startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
      },
      '30days': {
        label: 'Last 30 Days',
        startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
      },
      '90days': {
        label: 'Last 90 Days',
        startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: now.toISOString(),
      },
      'all': {
        label: 'All Time',
        startDate: null,
        endDate: null,
      },
    };
  }
}

export default new AnalyticsService();
