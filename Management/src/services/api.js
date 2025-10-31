const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth token
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // Generic fetch method
  async fetch(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || data.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.fetch(url);
  }

  // POST request
  async post(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data) {
    return this.fetch(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.fetch(endpoint, {
      method: 'DELETE',
    });
  }
}

// Auth API Methods
export const authAPI = {
  // Login
  login: async (email, password) => {
    const api = new ApiService();
    return api.post('/auth/login', { email, password });
  },

  // Logout
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getMe: async () => {
    const api = new ApiService();
    return api.get('/auth/me');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Get stored user data
  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Store user data
  storeUser: (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  },
};

// Lead API Methods
export const leadAPI = {
  // Get all leads with filters
  getAllLeads: async (params = {}) => {
    const api = new ApiService();
    return api.get('/leads', params);
  },

  // Get single lead
  getLead: async (id) => {
    const api = new ApiService();
    return api.get(`/leads/${id}`);
  },

  // Create new lead
  createLead: async (leadData) => {
    const api = new ApiService();
    return api.post('/leads', leadData);
  },

  // Update lead
  updateLead: async (id, leadData) => {
    const api = new ApiService();
    return api.put(`/leads/${id}`, leadData);
  },

  // Delete lead
  deleteLead: async (id) => {
    const api = new ApiService();
    return api.delete(`/leads/${id}`);
  },

  // Get leads by status
  getLeadsByStatus: async (status) => {
    const api = new ApiService();
    return api.get(`/leads/status/${status}`);
  },

  // Search leads
  searchLeads: async (query) => {
    const api = new ApiService();
    return api.get('/leads/search', { query });
  },

  // Add remark
  addRemark: async (id, remarkData) => {
    const api = new ApiService();
    return api.post(`/leads/${id}/remarks`, remarkData);
  },

  // Get remarks
  getRemarks: async (id) => {
    const api = new ApiService();
    return api.get(`/leads/${id}/remarks`);
  },

  // Itinerary
  getItinerary: async (leadId) => {
    const api = new ApiService();
    return api.get(`/leads/${leadId}/itinerary`);
  },
  setItinerary: async (leadId, days) => {
    const api = new ApiService();
    return api.put(`/leads/${leadId}/itinerary`, { days });
  },
  downloadItineraryPDF: async (leadId) => {
    const url = `${API_BASE_URL}/leads/${leadId}/itinerary/pdf`;
    const response = await fetch(url, { headers: new ApiService().getAuthHeaders() });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `itinerary-${leadId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // Assign lead
  assignLead: async (id, userId) => {
    const api = new ApiService();
    return api.patch(`/leads/${id}/assign`, { assignedTo: userId });
  },

  // Unassign lead
  unassignLead: async (id) => {
    const api = new ApiService();
    return api.patch(`/leads/${id}/unassign`);
  },
};

// Admin/Settings API Methods
export const adminAPI = {
  getSettings: async () => {
    const api = new ApiService();
    return api.get('/admin/settings');
  },
  updateSettings: async (data) => {
    const api = new ApiService();
    return api.put('/admin/settings', data);
  },
  getSalesReps: async () => {
    const api = new ApiService();
    // fetch active sales reps, large limit to avoid pagination in UI
    return api.get('/admin/users', { role: 'salesRep', isActive: true, limit: 200, page: 1 });
  },
};

// Billing/Quotation API Methods
export const quotationAPI = {
  create: async (payload) => {
    const api = new ApiService();
    return api.post('/billing/quotations', payload);
  },
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get('/billing/quotations/lead/' + leadId);
  },
  send: async (quotationId) => {
    const api = new ApiService();
    return api.post(`/billing/quotations/${quotationId}/send`);
  },
  downloadPDF: async (quotationId) => {
    const url = `${API_BASE_URL}/billing/quotations/${quotationId}/pdf`;
    const response = await fetch(url, { headers: new ApiService().getAuthHeaders() });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `quotation-${quotationId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default new ApiService();

