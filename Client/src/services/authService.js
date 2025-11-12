import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  timeout: 10000,
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token expiry and refresh
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication Service Functions
const authService = {
  /**
   * Register a new customer
   * @param {string} name - Full name
   * @param {string} email - Email address
   * @param {string} password - Password
   * @param {string} confirmPassword - Confirm password
   * @param {string} phone - Phone number in E.164 format (optional)
   * @param {string} phoneCountry - Country code (ISO 3166-1 alpha-2)
   * @returns {Promise} Response with user data and token
   */
  register: async (name, email, password, confirmPassword, phone = '', phoneCountry = 'US') => {
    try {
      const response = await apiClient.post('/register', {
        name,
        email,
        phone,
        phoneCountry,
        password,
        confirmPassword,
      });

      // Store token and user data
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Login user
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise} Response with user data and token
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/login', {
        email,
        password,
      });

      // Store token and user data
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Logout user
   * @returns {Promise} Response
   */
  logout: async () => {
    try {
      await apiClient.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user profile
   * @returns {Promise} User profile data
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/me');
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Update user profile
   * @param {object} profileData - Profile update data
   * @returns {Promise} Updated user data
   */
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put('/profile', profileData);
      if (response.data.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} confirmPassword - Confirm new password
   * @returns {Promise} Response
   */
  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await apiClient.put('/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Request password reset
   * @param {string} email - Email address
   * @returns {Promise} Response
   */
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token from email
   * @param {string} password - New password
   * @param {string} confirmPassword - Confirm new password
   * @returns {Promise} Response
   */
  resetPassword: async (token, password, confirmPassword) => {
    try {
      const response = await apiClient.put(`/reset-password/${token}`, {
        password,
        confirmPassword,
      });
      if (response.data.data.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Verify email with token
   * @param {string} token - Verification token from email
   * @returns {Promise} Response
   */
  verifyEmail: async (token) => {
    try {
      const response = await apiClient.get(`/verify-email/${token}`);
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Resend email verification
   * @returns {Promise} Response
   */
  resendVerification: async () => {
    try {
      const response = await apiClient.post('/resend-verification');
      return response.data;
    } catch (error) {
      throw authService._handleError(error);
    }
  },

  /**
   * Get token from local storage
   * @returns {string|null} Token or null
   */
  getToken: () => localStorage.getItem('token'),

  /**
   * Get user from local storage
   * @returns {object|null} User object or null
   */
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated: () => !!localStorage.getItem('token'),

  /**
   * Handle API errors consistently
   * @param {object} error - Axios error object
   * @returns {object} Formatted error object
   */
  _handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || error.response.statusText,
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request was made but no response
      return {
        message: 'No response from server. Please check your connection.',
        status: 0,
      };
    } else {
      // Error in request setup
      return {
        message: error.message || 'An error occurred',
        status: -1,
      };
    }
  },
};

export default authService;
