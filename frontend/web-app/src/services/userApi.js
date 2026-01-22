import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance for user API
const userApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
userApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
userApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      // Only redirect if on user pages, not admin
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = '/user/login';
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// User Auth Service
export const userAuthService = {
  login: async (email, password) => {
    const response = await userApi.post('/auth/local/login', { email, password });
    if (response.success && response.token) {
      localStorage.setItem('userToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
    }
    return response;
  },

  register: async (userData) => {
    const response = await userApi.post('/auth/local/register', userData);
    if (response.success && response.token) {
      localStorage.setItem('userToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
    }
    return response;
  },

  // Username-based authentication (no email verification required)
  loginWithUsername: async (username, password) => {
    const response = await userApi.post('/auth/local/login-username', { username, password });
    if (response.success && response.token) {
      localStorage.setItem('userToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
    }
    return response;
  },

  registerWithUsername: async (userData) => {
    const response = await userApi.post('/auth/local/register-username', userData);
    if (response.success && response.token) {
      localStorage.setItem('userToken', response.token);
      localStorage.setItem('userData', JSON.stringify(response.user));
    }
    return response;
  },

  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('userData');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('userToken');
  },

  getProfile: async () => {
    return await userApi.get('/auth/local/me');
  },

  updateProfile: async (data) => {
    return await userApi.put('/auth/local/profile', data);
  },

  changePassword: async (currentPassword, newPassword) => {
    return await userApi.put('/auth/local/password', { currentPassword, newPassword });
  },
};

// Forum Service for Users
export const userForumService = {
  getAllPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await userApi.get(`/forum/posts?${query}`);
  },

  getPostById: async (postId) => {
    return await userApi.get(`/forum/posts/${postId}`);
  },

  createPost: async (postData) => {
    return await userApi.post('/forum/posts', postData);
  },

  updatePost: async (postId, postData) => {
    return await userApi.put(`/forum/posts/${postId}`, postData);
  },

  deletePost: async (postId) => {
    return await userApi.delete(`/forum/posts/${postId}`);
  },

  toggleLike: async (postId) => {
    return await userApi.post(`/forum/posts/${postId}/like`);
  },

  addComment: async (postId, content) => {
    return await userApi.post(`/forum/posts/${postId}/comments`, { content });
  },

  addReply: async (postId, commentId, content) => {
    return await userApi.post(`/forum/posts/${postId}/comments/${commentId}/replies`, { content });
  },

  getMyPosts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await userApi.get(`/forum/my-posts?${query}`);
  },

  reportPost: async (postId) => {
    return await userApi.post(`/forum/posts/${postId}/report`);
  },

  getPopularTopics: async (limit = 10) => {
    return await userApi.get(`/forum/topics/popular?limit=${limit}`);
  },
};

// News Service for Users
export const userNewsService = {
  getAllNews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await userApi.get(`/news?${query}`);
  },

  getNewsById: async (newsId) => {
    return await userApi.get(`/news/${newsId}`);
  },

  getNewsByCategory: async (category, limit = 10) => {
    return await userApi.get(`/news/category/${category}?limit=${limit}`);
  },

  markAsRead: async (newsId) => {
    return await userApi.post(`/news/${newsId}/read`);
  },
};

// Email Verification Service
export const verificationService = {
  sendVerificationPin: async (email) => {
    return await userApi.post('/verification/send-pin', { email });
  },

  verifyEmailWithPin: async (email, pin) => {
    const response = await userApi.post('/verification/verify-email', { email, pin });
    // Update stored user data if verification successful
    if (response.success) {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        user.isEmailVerified = true;
        localStorage.setItem('userData', JSON.stringify(user));
      }
    }
    return response;
  },

  checkVerificationStatus: async (email) => {
    return await userApi.get(`/verification/status?email=${encodeURIComponent(email)}`);
  },
};

export default userApi;
