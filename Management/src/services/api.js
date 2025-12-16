const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth token
  getAuthHeaders() {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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

      // ✅ Handle blob responses FIRST (before any JSON parsing)
      if (options.responseType === "blob") {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Handle non-JSON responses (like rate limit errors)
        const text = await response.text();
        if (!response.ok) {
          // Try to parse as JSON if it looks like JSON
          try {
            data = JSON.parse(text);
          } catch {
            // If not JSON, create error object
            data = {
              message: text || `HTTP error! status: ${response.status}`,
              error: text || `HTTP error! status: ${response.status}`,
            };
          }
        } else {
          data = { message: text };
        }
      }

      if (!response.ok) {
        // Extract detailed error information
        let errorMessage =
          data.message ||
          data.error?.message ||
          data.error ||
          `HTTP error! status: ${response.status}`;

        // Log full error response for debugging
        console.log("Full error response:", data);

        // Special handling for 401 (authentication errors)
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem("token");
          errorMessage =
            data.message || "Your session has expired. Please login again.";
        }

        // Include validation errors if available
        if (data.error?.errors && Array.isArray(data.error.errors)) {
          const validationErrors = data.error.errors
            .map((err) => `${err.field}: ${err.message}`)
            .join("; ");
          errorMessage = `${errorMessage} - ${validationErrors}`;
        } else if (data.error?.details && Array.isArray(data.error.details)) {
          const validationErrors = data.error.details
            .map((err) => `${err.field}: ${err.message}`)
            .join("; ");
          errorMessage = `${errorMessage} - ${validationErrors}`;
        } else if (data.details?.validation) {
          // Handle new error format from backend
          const validationErrors = Object.entries(data.details.validation)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("; ");
          errorMessage = `${errorMessage} - ${validationErrors}`;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusCode = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Handle network errors (connection refused, etc.)
      if (
        error.message === "Failed to fetch" ||
        error.name === "TypeError" ||
        error.message.includes("ERR_CONNECTION_REFUSED") ||
        error.message.includes("NetworkError")
      ) {
        const networkError = new Error(
          "Cannot connect to server. Please make sure the server is running on port 5000."
        );
        networkError.status = 0;
        networkError.statusCode = 0;
        networkError.isNetworkError = true;
        throw networkError;
      }

      console.error("API Error:", error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    // Handle blob responseType separately
    if (params.responseType === "blob") {
      return this.fetch(endpoint, { responseType: "blob" });
    }

    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.fetch(url);
  }

  // POST request
  async post(endpoint, data) {
    return this.fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.fetch(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // PATCH request
  async patch(endpoint, data) {
    return this.fetch(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.fetch(endpoint, {
      method: "DELETE",
    });
  }
}

// Auth API Methods
export const authAPI = {
  // Login
  login: async (email, password) => {
    const api = new ApiService();
    return api.post("/auth/login", { email, password });
  },

  // Logout
  logout: async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // Get current user
  getMe: async () => {
    const api = new ApiService();
    return api.get("/auth/me");
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // Get stored user data
  getStoredUser: () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Store user data
  storeUser: (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
  },
};

// Lead API Methods
export const leadAPI = {
  // Get all leads with filters
  getAllLeads: async (params = {}) => {
    const api = new ApiService();
    return api.get("/leads", params);
  },

  // Get single lead
  getLead: async (id) => {
    const api = new ApiService();
    return api.get(`/leads/${id}`);
  },

  // Create new lead
  createLead: async (leadData) => {
    const api = new ApiService();
    return api.post("/leads", leadData);
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
    return api.get("/leads/search", { query });
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
    const response = await fetch(url, {
      headers: new ApiService().getAuthHeaders(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Download failed (${response.status})`);
    }
    const blob = await response.blob();
    const link = document.createElement("a");
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

  // Get all documents for a lead- Ashan
  getLeadDocuments: async (leadId) => {
    const api = new ApiService();

    // Fetch all document types in parallel
    const [quotationsRes, invoicesRes, receiptsRes, vouchersRes] =
      await Promise.all([
        api
          .get(`/billing/quotations/lead/${leadId}`)
          .catch(() => ({ data: [] })),
        api.get(`/billing/invoices/lead/${leadId}`).catch(() => ({ data: [] })),
        api.get(`/billing/receipts/lead/${leadId}`).catch(() => ({ data: [] })),
        api.get(`/billing/vouchers/lead/${leadId}`).catch(() => ({ data: [] })),
      ]);

    return {
      success: true,
      data: {
        quotations: Array.isArray(quotationsRes.data)
          ? quotationsRes.data
          : quotationsRes.data?.quotations || [],
        invoices: Array.isArray(invoicesRes.data)
          ? invoicesRes.data
          : invoicesRes.data?.invoices || [],
        receipts: Array.isArray(receiptsRes.data)
          ? receiptsRes.data
          : receiptsRes.data?.receipts || [],
        vouchers: Array.isArray(vouchersRes.data)
          ? vouchersRes.data
          : vouchersRes.data?.vouchers || [],
      },
    };
  },
};

// Admin/Settings API Methods
export const adminAPI = {
  getSettings: async () => {
    const api = new ApiService();
    return api.get("/admin/settings");
  },
  updateSettings: async (data) => {
    const api = new ApiService();
    return api.put("/admin/settings", data);
  },
  getSalesReps: async () => {
    const api = new ApiService();
    // fetch active sales reps, large limit to avoid pagination in UI
    return api.get("/admin/users", {
      role: "salesRep",
      isActive: true,
      limit: 200,
      page: 1,
    });
  },
  getSalesRepsAndAdmins: async () => {
    const api = new ApiService();
    // fetch both active sales reps and admins, large limit to avoid pagination in UI
    // Make two separate calls and combine results
    const [salesRepsRes, adminsRes] = await Promise.all([
      api.get("/admin/users", {
        role: "salesRep",
        isActive: true,
        limit: 200,
        page: 1,
      }),
      api.get("/admin/users", {
        role: "admin",
        isActive: true,
        limit: 200,
        page: 1,
      }),
    ]);

    // Combine results
    const salesReps =
      salesRepsRes.status === "success" && salesRepsRes.data?.users
        ? salesRepsRes.data.users
        : [];
    const admins =
      adminsRes.status === "success" && adminsRes.data?.users
        ? adminsRes.data.users
        : [];

    return {
      status: "success",
      data: {
        users: [...salesReps, ...admins],
      },
    };
  },
};

// Manual Itinerary API Methods
export const manualItineraryAPI = {
  // Get manual itinerary by lead ID
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get(`/manual-itineraries/lead/${leadId}`);
  },
  // Create or update manual itinerary
  createOrUpdate: async (leadId, days) => {
    const api = new ApiService();
    return api.post(`/manual-itineraries/lead/${leadId}`, { days });
  },
  // Delete manual itinerary
  delete: async (itineraryId) => {
    const api = new ApiService();
    return api.delete(`/manual-itineraries/${itineraryId}`);
  },
};

// Analytics API Methods
export const analyticsAPI = {
  getLeadOverview: async (params = {}) => {
    const api = new ApiService();
    return api.get("/analytics/leads/overview", params);
  },
  getBillingOverview: async (params = {}) => {
    const api = new ApiService();
    return api.get("/analytics/billing/overview", params);
  },
};

// Billing/Quotation API Methods
export const quotationAPI = {
  getAll: async (params = {}) => {
    const api = new ApiService();
    return api.get("/billing/quotations", params);
  },
  create: async (payload) => {
    const api = new ApiService();
    return api.post("/billing/quotations", payload);
  },
  getById: async (quotationId) => {
    const api = new ApiService();
    return api.get(`/billing/quotations/${quotationId}`);
  },
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get("/billing/quotations/lead/" + leadId);
  },
  update: async (quotationId, payload) => {
    const api = new ApiService();
    return api.put(`/billing/quotations/${quotationId}`, payload);
  },
  send: async (quotationId, payload = {}) => {
    const api = new ApiService();
    return api.post(`/billing/quotations/${quotationId}/send`, payload);
  },
  //Ashan
  //downloadpdf
  downloadPDF: async (quotationId) => {
    const api = new ApiService();
    const response = await api.get(`/billing/quotations/${quotationId}/pdf`, {
      responseType: "blob",
    });

    // Trigger download
    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `quotation-${quotationId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  // New method for viewing PDF
  getPDFBlob: async (quotationId) => {
    const api = new ApiService();
    const blob = await api.get(`/billing/quotations/${quotationId}/pdf`, {
      responseType: "blob",
    });
    return blob; // Already a Blob, no need to wrap it
  },
};

// Invoice API Methods
export const invoiceAPI = {
  getAll: async (params = {}) => {
    const api = new ApiService();
    return api.get("/billing/invoices", params);
  },
  create: async (payload) => {
    const api = new ApiService();
    return api.post("/billing/invoices", payload);
  },
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get("/billing/invoices/lead/" + leadId);
  },
  getById: async (invoiceId) => {
    const api = new ApiService();
    return api.get(`/billing/invoices/${invoiceId}`);
  },
  update: async (invoiceId, payload) => {
    const api = new ApiService();
    return api.put(`/billing/invoices/${invoiceId}`, payload);
  },
  send: async (invoiceId, payload = {}) => {
    const api = new ApiService();
    return api.post(`/billing/invoices/${invoiceId}/send`, payload);
  },
  //Ashan
  //downloadpdf
  downloadPDF: async (invoiceId) => {
    const api = new ApiService();
    const response = await api.get(`/billing/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `invoice-${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getPDFBlob: async (invoiceId) => {
    const api = new ApiService();
    const blob = await api.get(`/billing/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });
    return blob; // Already a Blob, no need to wrap it
  },
};

// Payment Receipt API Methods
export const receiptAPI = {
  getAll: async (params = {}) => {
    const api = new ApiService();
    return api.get("/billing/receipts", params);
  },
  create: async (payload) => {
    const api = new ApiService();
    return api.post("/billing/receipts", payload);
  },
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get("/billing/receipts/lead/" + leadId);
  },
  getById: async (receiptId) => {
    const api = new ApiService();
    return api.get(`/billing/receipts/${receiptId}`);
  },
  update: async (receiptId, payload) => {
    const api = new ApiService();
    return api.put(`/billing/receipts/${receiptId}`, payload);
  },
  send: async (receiptId, payload = {}) => {
    const api = new ApiService();
    return api.post(`/billing/receipts/${receiptId}/send`, payload);
  },
  //Ashan
  downloadPDF: async (receiptId) => {
    const api = new ApiService();
    const response = await api.get(`/billing/receipts/${receiptId}/pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `receipt-${receiptId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getPDFBlob: async (receiptId) => {
    const api = new ApiService();
    const blob = await api.get(`/billing/receipts/${receiptId}/pdf`, {
      responseType: "blob",
    });
    return blob; // Already a Blob, no need to wrap it
  },
};

export const voucherAPI = {
  getAll: async (params = {}) => {
    const api = new ApiService();
    return api.get("/billing/vouchers", params);
  },
  create: async (payload) => {
    const api = new ApiService();
    return api.post("/billing/vouchers", payload);
  },
  getByLead: async (leadId) => {
    const api = new ApiService();
    return api.get("/billing/vouchers/lead/" + leadId);
  },
  getById: async (voucherId) => {
    const api = new ApiService();
    return api.get(`/billing/vouchers/${voucherId}`);
  },
  update: async (voucherId, payload) => {
    const api = new ApiService();
    return api.put(`/billing/vouchers/${voucherId}`, payload);
  },

  sendEmail: async (voucherId, email) => {
    const api = new ApiService();
    return api.post(`/billing/vouchers/${voucherId}/send`, { email });
  },

  downloadPDF: async (voucherId) => {
    const api = new ApiService();
    const response = await api.get(`/billing/vouchers/${voucherId}/pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `voucher-${voucherId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  getPDFBlob: async (voucherId) => {
    const api = new ApiService();
    const blob = await api.get(`/billing/vouchers/${voucherId}/pdf`, {
      responseType: "blob",
    });
    return blob; // Already a Blob, no need to wrap it
  },
};

// Hotel Suggestion API Methods
export const hotelAPI = {
  suggest: async (destination, packageType, category, location, count = 5) => {
    const api = new ApiService();
    return api.post("/hotels/suggest", {
      destination,
      packageType,
      category,
      location,
      count,
    });
  },
};

// Package API Methods
export const packageAPI = {
  // Get all packages
  getAll: async (params = {}) => {
    const api = new ApiService();
    // Validator only allows limit up to 100, so use that
    const queryParams = { limit: 100, page: 1, ...params };
    return api.get("/packages", queryParams);
  },
  // Get single package
  getById: async (id) => {
    const api = new ApiService();
    return api.get(`/packages/${id}`);
  },
  // Create new package
  create: async (packageData) => {
    const api = new ApiService();
    return api.post("/packages", packageData);
  },
  // Update package
  update: async (id, packageData) => {
    const api = new ApiService();
    return api.put(`/packages/${id}`, packageData);
  },
  // Get itinerary by package ID
  getItineraryByPackage: async (packageId) => {
    const api = new ApiService();
    return api.get(`/itineraries/package/${packageId}`);
  },
};

// Customized Package API Methods
export const customizedPackageAPI = {
  // Get customized package by ID
  getById: async (id) => {
    const api = new ApiService();
    return api.get(`/customized-packages/${id}`);
  },
  // Get itinerary by customized package ID
  getItineraryByPackage: async (packageId) => {
    const api = new ApiService();
    return api.get(`/itineraries/package/${packageId}`);
  },
  update: async (id, payload) => {
    const api = new ApiService();
    return api.put(`/customized-packages/${id}`, payload);
  },
};

// Itinerary API Methods
export const itineraryAPI = {
  getById: async (id) => {
    const api = new ApiService();
    return api.get(`/itineraries/${id}`);
  },
  getByPackage: async (packageId) => {
    const api = new ApiService();
    return api.get(`/itineraries/package/${packageId}`);
  },
};

export default new ApiService();
