const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000/api/v1';

const careerApi = {
  getActiveVacancies: async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);

      const response = await fetch(
        `${API_URL}/vacancies${queryParams.toString() ? '?' + queryParams.toString() : ''}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch vacancies: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching vacancies:', error);
      throw error;
    }
  },

  submitApplication: async (applicationData) => {
    try {
      console.log('API: Sending to backend:', applicationData);
      console.log('API: URL:', `${API_URL}/careers/apply`);
      
      const response = await fetch(`${API_URL}/careers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      const data = await response.json();
      console.log('API: Backend raw response:', data);
      console.log('API: Response status:', response.status);
      console.log('API: Response ok:', response.ok);

      if (!response.ok) {
        console.error('API: Error from backend:', data);
        throw new Error(data.message || `Failed to submit application: ${response.statusText}`);
      }

      console.log('API: Success response:', data);
      return data;
    } catch (error) {
      console.error('API: Error submitting application:', error);
      throw error;
    }
  },
};

export default careerApi;
