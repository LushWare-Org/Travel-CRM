/**
 * Enhanced API Service with Proper Error Handling
 * Handles all communication with the backend
 * Follows best practices for API integration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Enhanced request wrapper with error handling and logging
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    if (options.body) {
      console.log(`[API Request Body]:`, JSON.parse(options.body));
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      error.errors = data.errors || [];
      
      // Log detailed validation errors with FULL details
      if (data.errors && Array.isArray(data.errors)) {
        console.error('%c[VALIDATION ERRORS]:', 'color: red; font-weight: bold; font-size: 14px;');
        data.errors.forEach((err, index) => {
          console.error(`%c  Error ${index + 1}:`, 'color: red; font-weight: bold;');
          console.error('    Field:', err.param || err.field || 'unknown');
          console.error('    Message:', err.msg || err.message || 'No message');
          console.error('    Value:', err.value);
          console.error('    Location:', err.location || 'body');
        });
      }
      
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    if (error.errors && error.errors.length > 0) {
      console.error('%c[DETAILED ERRORS]:', 'color: red; font-weight: bold;');
      error.errors.forEach((err, index) => {
        console.error(`%c  Error ${index + 1}:`, 'color: red;');
        console.error('    Field:', err.param || err.field || 'unknown');
        console.error('    Message:', err.msg || err.message || 'No message');
        console.error('    Value:', err.value);
      });
    }
    throw error;
  }
}

class ApiService {

  // ==================== PACKAGE ENDPOINTS ====================

  static async getPackages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/packages${queryString ? `?${queryString}` : ''}`);
  }

  static async getPackage(id) {
    return makeRequest(`/packages/${id}`);
  }

  static async createPackage(packageData) {
    // Clean the data - remove _id fields and internal properties
    const cleanData = {
      ...packageData,
    };
    delete cleanData._id;
    delete cleanData.id;
    delete cleanData._v;
    delete cleanData.__v;
    delete cleanData.createdAt;
    delete cleanData.createdBy;
    delete cleanData.slug;
    
    return makeRequest('/packages', {
      method: 'POST',
      body: JSON.stringify(cleanData),
    });
  }

  static async updatePackage(id, packageData) {
    // Clean the data - remove _id fields and internal properties
    const cleanData = {
      ...packageData,
    };
    delete cleanData._id;
    delete cleanData._v;
    delete cleanData.__v;
    delete cleanData.createdAt;
    delete cleanData.createdBy;
    delete cleanData.slug;
    
    return makeRequest(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanData),
    });
  }

  static async deletePackage(id) {
    return makeRequest(`/packages/${id}`, {
      method: 'DELETE',
    });
  }

  static async getFeaturedPackages(limit = 6) {
    return makeRequest(`/packages/featured/all?limit=${limit}`);
  }

  static async getPackageStats() {
    return makeRequest('/packages/stats/all');
  }

  static async searchPackages(query) {
    return makeRequest(`/packages/search/query?query=${encodeURIComponent(query)}`);
  }

  static async getPackagesByCategory(category, limit = 10) {
    return makeRequest(`/packages/category/${category}?limit=${limit}`);
  }

  // ==================== ITINERARY ENDPOINTS ====================

  static async getItineraries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/itineraries${queryString ? `?${queryString}` : ''}`);
  }

  static async getItinerary(id) {
    return makeRequest(`/itineraries/${id}`);
  }

  static async getItineraryByPackage(packageId) {
    return makeRequest(`/itineraries/package/${packageId}`);
  }

  static async createItinerary(itineraryData) {
    return makeRequest('/itineraries', {
      method: 'POST',
      body: JSON.stringify(itineraryData),
    });
  }

  static async updateItinerary(id, itineraryData) {
    return makeRequest(`/itineraries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itineraryData),
    });
  }

  static async deleteItinerary(id) {
    return makeRequest(`/itineraries/${id}`, {
      method: 'DELETE',
    });
  }

  static async getDropdownOptions() {
    return makeRequest('/itineraries/dropdown-options');
  }

  // ==================== DAY ENDPOINTS ====================

  static async addDay(itineraryId, dayData) {
    return makeRequest(`/itineraries/${itineraryId}/days`, {
      method: 'POST',
      body: JSON.stringify(dayData),
    });
  }

  static async updateDay(itineraryId, dayNumber, dayData) {
    return makeRequest(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'PUT',
      body: JSON.stringify(dayData),
    });
  }

  static async deleteDay(itineraryId, dayNumber) {
    return makeRequest(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'DELETE',
    });
  }

  // ==================== PREVIEW & EXPORT ====================

  static async previewItinerary(id) {
    return makeRequest(`/itineraries/${id}/preview`);
  }

  static async downloadItineraryPDF(id) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const url = `${API_BASE_URL}/itineraries/${id}/pdf`;

    try {
      const response = await fetch(url, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      return response.blob();
    } catch (error) {
      console.error('[API Error] Download PDF failed:', error);
      throw error;
    }
  }

  // ==================== CLONE ENDPOINT ====================

  static async cloneItinerary(id, targetPackageId) {
    return makeRequest(`/itineraries/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetPackageId }),
    });
  }
}

export default ApiService;
