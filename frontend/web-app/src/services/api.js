import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Log API configuration on startup
console.log('🔗 API Configuration:');
console.log('   Base URL:', API_BASE_URL);
console.log('   Environment:', import.meta.env.MODE);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and log requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log outgoing requests
    console.log(`📤 [${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`, {
      params: config.params,
      data: config.data,
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`📥 [${response.status}] ${response.config.url}`, response.data);
    return response.data;
  },
  (error) => {
    // Log error responses
    console.error(`❌ [${error.response?.status || 'NETWORK'}] ${error.config?.url}`, {
      message: error.message,
      data: error.response?.data,
    });
    
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth Service
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/local/login', { email, password });
    if (response.success && response.token) {
      localStorage.setItem('adminToken', response.token);
      localStorage.setItem('adminUser', JSON.stringify(response.user));
    }
    return response;
  },

  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('adminToken');
  },
};

// Admin Service
export const adminService = {
  // Dashboard
  getDashboard: async () => {
    return await api.get('/admin/dashboard');
  },

  // User Management
  getAllUsers: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await api.get(`/admin/users?${query}`);
  },

  getUserProfile: async (userId) => {
    return await api.get(`/admin/users/${userId}`);
  },

  updateUser: async (userId, updates) => {
    return await api.put(`/admin/users/${userId}`, updates);
  },

  activateUser: async (userId) => {
    return await api.patch(`/admin/users/${userId}/activate`);
  },

  deactivateUser: async (userId, data = {}) => {
    return await api.patch(`/admin/users/${userId}/deactivate`, data);
  },

  suspendUser: async (userId, data) => {
    return await api.patch(`/admin/users/${userId}/suspend`, data);
  },

  deleteUser: async (userId) => {
    return await api.delete(`/admin/users/${userId}`);
  },

  changeUserRole: async (userId, role) => {
    return await api.patch(`/admin/users/${userId}/role`, { role });
  },

  getUserStats: async (userId) => {
    return await api.get(`/admin/users/${userId}/stats`);
  },

  bulkUpdateUsers: async (data) => {
    return await api.post('/admin/users/bulk-update', data);
  },

  // Forum Management
  getAllForumPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await api.get(`/admin/forum/posts?${query}`);
  },

  getForumPost: async (postId) => {
    return await api.get(`/admin/forum/posts/${postId}`);
  },

  updateForumPostStatus: async (postId, status) => {
    return await api.patch(`/admin/forum/posts/${postId}/status`, { status });
  },

  deleteForumPost: async (postId) => {
    return await api.delete(`/admin/forum/posts/${postId}`);
  },

  togglePinPost: async (postId) => {
    return await api.patch(`/admin/forum/posts/${postId}/pin`);
  },

  toggleLockPost: async (postId) => {
    return await api.patch(`/admin/forum/posts/${postId}/lock`);
  },

  approvePost: async (postId) => {
    return await api.patch(`/admin/forum/posts/${postId}/approve`);
  },

  rejectPost: async (postId) => {
    return await api.patch(`/admin/forum/posts/${postId}/reject`);
  },
};

// News Service
export const newsService = {
  getAllNews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await api.get(`/news?${query}`);
  },

  getNewsById: async (newsId) => {
    return await api.get(`/news/${newsId}`);
  },

  createNews: async (newsData) => {
    return await api.post('/news', newsData);
  },

  updateNews: async (newsId, newsData) => {
    return await api.put(`/news/${newsId}`, newsData);
  },

  deleteNews: async (newsId) => {
    return await api.delete(`/news/${newsId}`);
  },
};

export default api;
