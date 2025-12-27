import api from './api';

class CareerService {
  constructor() {
    this.api = api;
  }

  async getAllVacancies(params = {}) {
    try {
      const response = await this.api.get('/vacancies/admin/all', params);
      return response;
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      throw error;
    }
  }

  async getActiveVacancies(params = {}) {
    try {
      const response = await this.api.get('/vacancies', params);
      return response;
    } catch (error) {
      console.error('Error fetching active vacancies:', error);
      throw error;
    }
  }

  async createVacancy(vacancyData) {
    try {
      const response = await this.api.post('/vacancies', vacancyData);
      return response;
    } catch (error) {
      console.error('Error creating vacancy:', error);
      throw error;
    }
  }

  async updateVacancy(vacancyId, updateData) {
    try {
      const response = await this.api.patch(`/vacancies/${vacancyId}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating vacancy:', error);
      throw error;
    }
  }

  async deleteVacancy(vacancyId) {
    try {
      const response = await this.api.delete(`/vacancies/${vacancyId}`);
      return response;
    } catch (error) {
      console.error('Error deleting vacancy:', error);
      throw error;
    }
  }

  async getAllApplications(params = {}) {
    try {
      const response = await this.api.get('/careers/submissions', params);
      return response;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  }

  async getApplicationDetails(applicationId) {
    try {
      const response = await this.api.get(`/careers/submissions/${applicationId}`);
      return response;
    } catch (error) {
      console.error('Error fetching application details:', error);
      throw error;
    }
  }

  async submitApplication(formData) {
    try {
      const response = await this.api.post('/careers/apply', formData);
      return response;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  }

  async updateApplicationStatus(applicationId, updateData) {
    try {
      const response = await this.api.patch(
        `/careers/submissions/${applicationId}`,
        updateData
      );
      return response;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  async deleteApplication(applicationId) {
    try {
      const response = await this.api.delete(`/careers/submissions/${applicationId}`);
      return response;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  async getCareerStats() {
    try {
      const response = await this.api.get('/careers/stats');
      return response;
    } catch (error) {
      console.error('Error fetching career stats:', error);
      throw error;
    }
  }

  async searchApplications(query) {
    try {
      const response = await this.api.get('/careers/search', { query });
      return response;
    } catch (error) {
      console.error('Error searching applications:', error);
      throw error;
    }
  }
}

export default new CareerService();
