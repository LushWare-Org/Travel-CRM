import apiClient from './apiClient';

const careerApi = {
  getActiveVacancies: async (filters = {}) => {
    const params = {};
    if (filters.status) params.status = filters.status;
    const response = await apiClient.get('/vacancies', { params });
    return response.data;
  },

  submitApplication: async (applicationData) => {
    const response = await apiClient.post('/careers/apply', applicationData);
    return response.data;
  },
};

export default careerApi;
