// API Service for Itinerary and Package operations
// Handles all communication with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

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

  // Package Methods
  static async getPackages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/packages${queryString ? `?${queryString}` : ''}`);
  }

  static async getPackage(id) {
    return this.request(`/packages/${id}`);
  }

  static async createPackage(packageData) {
    return this.request('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    });
  }

  static async updatePackage(id, packageData) {
    return this.request(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    });
  }

  static async deletePackage(id) {
    return this.request(`/packages/${id}`, {
      method: 'DELETE',
    });
  }

  // Itinerary Methods
  static async getItineraries(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/itineraries${queryString ? `?${queryString}` : ''}`);
  }

  static async getItinerary(id) {
    return this.request(`/itineraries/${id}`);
  }

  static async getItineraryByPackage(packageId) {
    return this.request(`/itineraries/package/${packageId}`);
  }

  static async createItinerary(itineraryData) {
    return this.request('/itineraries', {
      method: 'POST',
      body: JSON.stringify(itineraryData),
    });
  }

  static async updateItinerary(id, itineraryData) {
    return this.request(`/itineraries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itineraryData),
    });
  }

  static async deleteItinerary(id) {
    return this.request(`/itineraries/${id}`, {
      method: 'DELETE',
    });
  }

  static async cloneItinerary(id, targetPackageId) {
    return this.request(`/itineraries/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify({ targetPackageId }),
    });
  }

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

    return response.blob();
  }

  static async getDropdownOptions() {
    return this.request('/itineraries/dropdown-options');
  }

  // Day Methods
  static async addDay(itineraryId, dayData) {
    return this.request(`/itineraries/${itineraryId}/days`, {
      method: 'POST',
      body: JSON.stringify(dayData),
    });
  }

  static async updateDay(itineraryId, dayNumber, dayData) {
    return this.request(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'PUT',
      body: JSON.stringify(dayData),
    });
  }

  static async deleteDay(itineraryId, dayNumber) {
    return this.request(`/itineraries/${itineraryId}/days/${dayNumber}`, {
      method: 'DELETE',
    });
  }

  static async previewItinerary(id) {
    return this.request(`/itineraries/${id}/preview`);
  }
}

export default ApiService;
