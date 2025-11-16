import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from './apiConfig';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data || {};
    const firstValidationError = Array.isArray(data.errors) && data.errors.length > 0
      ? data.errors[0].message
      : null;

    const message =
      firstValidationError ||
      data.message ||
      error?.message ||
      'Unable to complete the request';

    const enrichedError = new Error(message);
    enrichedError.status = error?.response?.status;
    enrichedError.errors = data.errors || null;

    return Promise.reject(enrichedError);
  },
);

export default apiClient;

