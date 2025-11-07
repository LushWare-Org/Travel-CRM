/**
 * Website Users API Service
 * Handles all website user management API calls
 * Website Users = Customer/Regular platform users (different from admin users)
 */

import api from './api';

class WebsiteUserService {
  constructor() {
    this.api = api;
  }

  /**
   * ==================== USER MANAGEMENT ====================
   */

  /**
   * Get all website users (customers) with filtering, sorting, and pagination
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 10, max: 100)
   * @param {string} params.sort - Sort field (e.g., '-createdAt')
   * @param {string} params.search - Search query (searches name, email, phone)
   * @param {boolean} params.isActive - Filter by active status
   * @param {boolean} params.isEmailVerified - Filter by email verification status
   * @returns {Promise<Object>} User list with pagination info
   */
  async getAllUsers(params = {}) {
    try {
      // Build query parameters, excluding undefined values
      const queryParams = {
        role: 'customer',
        limit: params.limit || 10,
        page: params.page || 1,
      };

      // Only add optional parameters if they have values
      if (params.sort && params.sort !== '') {
        queryParams.sort = params.sort;
      }

      if (params.search && params.search !== '') {
        queryParams.search = params.search;
      }

      // Only add boolean filters if explicitly set
      if (params.isActive !== undefined && params.isActive !== null) {
        queryParams.isActive = params.isActive;
      }

      if (params.isEmailVerified !== undefined && params.isEmailVerified !== null) {
        queryParams.isEmailVerified = params.isEmailVerified;
      }

      const response = await this.api.get('/users', queryParams);
      return response;
    } catch (error) {
      console.error('Error fetching website users:', error);
      throw error;
    }
  }

  /**
   * Get single website user by ID
   * @param {string} userId - User ID (MongoDB ObjectId)
   * @returns {Promise<Object>} User data
   */
  async getUserById(userId) {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create new website user (customer)
   * @param {Object} userData - User data
   * @param {string} userData.name - User name (required)
   * @param {string} userData.email - User email (required)
   * @param {string} userData.phone - User phone number
   * @param {string} userData.password - User password (required)
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    try {
      const response = await this.api.post('/users', {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: userData.password,
        role: 'customer', // Always create as customer role
      });
      return response;
    } catch (error) {
      console.error('Error creating website user:', error);
      throw error;
    }
  }

  /**
   * Update website user details
   * @param {string} userId - User ID
   * @param {Object} updateData - Data to update
   * @param {string} updateData.name - User name
   * @param {string} updateData.phone - Phone number
   * @param {string} updateData.email - Email address
   * @param {boolean} updateData.isActive - Active status
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData) {
    try {
      const response = await this.api.put(`/users/${userId}`, updateData);
      return response;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete website user permanently
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success response
   */
  async deleteUser(userId) {
    try {
      const response = await this.api.delete(`/users/${userId}?confirmDelete=true`);
      return response;
    } catch (error) {
      console.error(`Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle website user active status (soft deactivate/reactivate)
   * @param {string} userId - User ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<Object>} Updated user
   */
  async toggleUserStatus(userId, isActive) {
    try {
      const response = await this.api.patch(`/users/${userId}/toggle-status`, { isActive });
      return response;
    } catch (error) {
      console.error(`Error toggling user status for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get website user statistics for dashboard
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      const response = await this.api.get('/users/stats');
      return response;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }

  /**
   * Search website users
   * @param {Object} params - Search parameters
   * @param {string} params.search - Search query
   * @param {string} params.sort - Sort field
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Object>} Search results
   */
  async searchUsers(params = {}) {
    try {
      const queryParams = {
        role: 'customer',
        limit: params.limit || 10,
        page: params.page || 1,
      };

      if (params.search && params.search !== '') {
        queryParams.search = params.search;
      }

      if (params.sort && params.sort !== '') {
        queryParams.sort = params.sort;
      }

      const response = await this.api.get('/users', queryParams);
      return response;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * ==================== UTILITY METHODS ====================
   */

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date (e.g., "Oct 22, 2024")
   */
  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency (e.g., "$1,234.50")
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number') return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Transform API user response to frontend format
   * @param {Object} apiUser - User data from API
   * @returns {Object} Formatted user data for frontend
   */
  transformUserData(apiUser) {
    return {
      id: apiUser._id || apiUser.id,
      name: apiUser.name,
      email: apiUser.email,
      phone: apiUser.phone || '',
      status: apiUser.isActive ? 'active' : 'inactive',
      createdAt: apiUser.createdAt,
      lastLogin: apiUser.lastLogin,
      isEmailVerified: apiUser.isEmailVerified,
      bookings: apiUser.bookings || 0,
      totalSpent: apiUser.totalSpent || 0,
    };
  }

  /**
   * Transform frontend user data to API format
   * @param {Object} frontendUser - User data from frontend form
   * @returns {Object} Formatted user data for API
   */
  transformToApiFormat(frontendUser) {
    // Extract only digits from phone
    const phoneDigitsOnly = frontendUser.phone ? frontendUser.phone.replace(/\D/g, '') : '';
    
    return {
      name: frontendUser.name,
      email: frontendUser.email,
      phone: phoneDigitsOnly,
      password: frontendUser.password,
      isActive: frontendUser.status === 'active',
    };
  }

  /**
   * Validate user email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*([.]\w{2,3})+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format (10 digits)
   * @param {string} phone - Phone to validate
   * @returns {boolean} Is valid phone
   */
  isValidPhone(phone) {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    // Check if it's exactly 10 digits
    return digitsOnly.length === 10;
  }

  /**
   * Validate user form data
   * @param {Object} userData - User data to validate
   * @returns {Object} Validation result { valid: boolean, errors: Object }
   */
  validateUserData(userData) {
    const errors = {};

    // Name validation
    if (!userData.name || userData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (userData.name && userData.name.length > 50) {
      errors.name = 'Name cannot exceed 50 characters';
    }

    // Email validation
    if (!userData.email) {
      errors.email = 'Email is required';
    } else if (!this.isValidEmail(userData.email)) {
      errors.email = 'Invalid email format';
    }

    // Phone validation
    if (userData.phone && !this.isValidPhone(userData.phone)) {
      errors.phone = 'Phone must be 10 digits';
    }

    // Password validation (only for new users)
    if (userData.password) {
      if (userData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (userData.password.length > 128) {
        errors.password = 'Password cannot exceed 128 characters';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export default new WebsiteUserService();
