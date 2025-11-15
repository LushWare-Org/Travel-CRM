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
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Unable to complete the request';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;

