/**
 * API Service for packages and related endpoints.
 * Handles all communication with the package-service backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.lushtravelcloud.com/api/v1';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');

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
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      error.errors = data.errors || [];
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error.message);
    throw error;
  }
}

class ApiService {

  // ==================== PACKAGE ENDPOINTS ====================

  static async getPackages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/packages${queryString ? `?${queryString}` : ''}`);
  }

  static async getPackagesProtected(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/packages/protected/all${queryString ? `?${queryString}` : ''}`);
  }

  static async getPackage(id) {
    return makeRequest(`/packages/${id}`);
  }

  static async generateAIPackage(destination, packageType, category, nights, description = '') {
    return makeRequest('/packages/generate-ai', {
      method: 'POST',
      body: JSON.stringify({
        destination,
        packageType,
        category,
        duration: parseInt(nights, 10),
        description,
      }),
    });
  }

  static async createPackage(packageData) {
    const cleanData = {
      title: packageData.title || packageData.name,
      description: packageData.description,
      destination: packageData.destination,
      durationDays: packageData.durationDays || packageData.duration,
      category: packageData.category,
      coverImage: packageData.coverImage || packageData.coverImageUrl,
      inclusions: packageData.inclusions || [],
      exclusions: packageData.exclusions || [],
      termsAndConditions: packageData.termsAndConditions || (packageData.terms || []).join('. '),
      basePrice: packageData.basePrice ?? packageData.price,
      defaultMarginType: packageData.defaultMarginType || 'PERCENTAGE',
      defaultMarginInput: packageData.defaultMarginInput ?? 20,
      currency: packageData.currency || 'USD',
      isActive: packageData.isActive ?? (packageData.status === 'published'),
      isFeatured: packageData.isFeatured ?? false,
      images: (packageData.images || []).map((img) => ({
        url: img.url || img,
        altText: img.altText || img.alt_text,
      })),
      itineraryDays: (packageData.itineraryDays || packageData.days || []).map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title || '',
        description: day.description || '',
        breakfastCount: day.breakfastCount ?? (day.meals?.breakfast ? 1 : 0),
        lunchCount: day.lunchCount ?? (day.meals?.lunch ? 1 : 0),
        dinnerCount: day.dinnerCount ?? (day.meals?.dinner ? 1 : 0),
        mealPriceOverride: day.mealPriceOverride ?? null,
        places: (day.places || (day.locations || []).map((l, i) => ({ customName: l, orderIndex: i }))),
        activities: (day.activities || []).map((a, i) => ({
          activityId: a.activityId,
          name: typeof a === 'string' ? a : a.name,
          costOverride: a.costOverride ?? null,
          orderIndex: a.orderIndex ?? i,
        })),
        transports: (day.transports || (day.transport ? [{ routeType: 'DAILY_ROUTING', transportMode: String(day.transport).toUpperCase(), pricingModel: 'PER_VEHICLE', unitCost: 0 }] : [])),
      })),
    };

    delete cleanData.id;
    delete cleanData._id;
    delete cleanData._v;
    delete cleanData.__v;
    delete cleanData.createdAt;
    delete cleanData.createdBy;
    delete cleanData.slug;

    return makeRequest('/packages', {
      method: 'POST',
      body: JSON.stringify(cleanData, (key, value) => value === null ? undefined : value),
    });
  }

  static async updatePackage(id, packageData) {
    const cleanData = { ...packageData };
    delete cleanData._id;
    delete cleanData.id;
    delete cleanData._v;
    delete cleanData.__v;
    delete cleanData.createdAt;
    delete cleanData.createdBy;
    delete cleanData.slug;

    // Map legacy fields to new field names
    if (cleanData.name && !cleanData.title) cleanData.title = cleanData.name;
    if (cleanData.price !== undefined && cleanData.basePrice === undefined) cleanData.basePrice = cleanData.price;
    if (cleanData.terms && !cleanData.termsAndConditions) cleanData.termsAndConditions = cleanData.terms.join('. ');

    return makeRequest(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanData, (key, value) => value === null ? undefined : value),
    });
  }

  static async deletePackage(id) {
    return makeRequest(`/packages/${id}`, { method: 'DELETE' });
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

  // ==================== PLACES & ACTIVITIES ====================

  static async getPlaces(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/places${queryString ? `?${queryString}` : ''}`);
  }

  static async createPlace(data) {
    return makeRequest('/places', { method: 'POST', body: JSON.stringify(data) });
  }

  static async getActivities(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return makeRequest(`/activities${queryString ? `?${queryString}` : ''}`);
  }

  static async createActivity(data) {
    return makeRequest('/activities', { method: 'POST', body: JSON.stringify(data) });
  }
}

export default ApiService;
