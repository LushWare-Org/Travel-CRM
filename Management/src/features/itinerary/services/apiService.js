/**
 * API Service for Itinerary Management
 * Handles all backend API communication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  /**
   * Generic API request handler
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token'); // Adjust based on your auth implementation

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  /**
   * Get all packages
   */
  static async getPackages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/packages${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get single package
   */
  static async getPackage(id) {
    return this.request(`/packages/${id}`);
  }

  /**
   * Create new package
   */
  static async createPackage(packageData) {
    return this.request('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  /**
   * Update package
   */
  static async updatePackage(id, packageData) {
    return this.request(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    });
  }

  /**
   * Delete package
   */
  static async deletePackage(id) {
    return this.request(`/packages/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get all itineraries
   */
  static async getItineraries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/itineraries${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get single itinerary
   */
  static async getItinerary(id) {
    return this.request(`/itineraries/${id}`);
  }

  /**
   * Get itinerary by package ID
   */
  static async getItineraryByPackage(packageId) {
    return this.request(`/itineraries/package/${packageId}`);
  }

  /**
   * Create new itinerary
   */
  static async createItinerary(itineraryData) {
    return this.request('/itineraries', {
      method: 'POST',
      body: JSON.stringify(itineraryData),
    });
  }

  /**
   * Update itinerary
   */
  static async updateItinerary(id, itineraryData) {
    return this.request(`/itineraries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itineraryData),
    });
  }

  /**
   * Delete itinerary
   */
  static async deleteItinerary(id) {
    return this.request(`/itineraries/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Clone itinerary
   */
  static async cloneItinerary(id, targetPackageId) {
    return this.request(`/itineraries/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetPackageId }),
    });
  }

  /**
   * Download itinerary PDF
   */
  static async downloadItineraryPDF(id) {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/itineraries/${id}/pdf`;

    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }

    const blob = await response.blob();
    return blob;
  }

  /**
   * Get dropdown options
   */
  static async getDropdownOptions() {
    return this.request('/itineraries/dropdown-options');
  }

  /**
   * Add day to itinerary
   */
  static async addDay(itineraryId, dayData) {
    return this.request(`/itineraries/${itineraryId}/days`, {
      method: 'POST',
      body: JSON.stringify(dayData),
    });
  }

  /**
   * Update specific day
   */
  static async updateDay(itineraryId, dayNumber, dayData) {
    return this.request(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'PUT',
      body: JSON.stringify(dayData),
    });
  }

  /**
   * Delete specific day
   */
  static async deleteDay(itineraryId, dayNumber) {
    return this.request(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'DELETE',
    });
  }
}

export default ApiService;
