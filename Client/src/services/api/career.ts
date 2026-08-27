import httpClient from '../http/client';

interface VacancyFilters {
  status?: string;
}

const careerApi = {
  getActiveVacancies: async (filters: VacancyFilters = {}) => {
    const params: VacancyFilters = {};
    if (filters.status) params.status = filters.status;
    const response = await httpClient.get('/vacancies', { params });
    return response.data;
  },

  submitApplication: async (applicationData: Record<string, unknown>) => {
    const response = await httpClient.post('/careers/apply', applicationData);
    return response.data;
  },
};

export default careerApi;
