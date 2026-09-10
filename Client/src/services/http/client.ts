import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { HTTP_CONFIG } from './config';
import { computeDelayMs, shouldRetry, type RetryableRequestConfig } from './retry';
import { getToken, clear as clearToken, setPostLoginRedirect } from '../auth/tokenStorage';
import { apiErrorMessage } from './apiErrorMessage';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const httpClient = axios.create({
  baseURL: HTTP_CONFIG.baseURL,
  timeout: HTTP_CONFIG.timeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

httpClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers.set('x-request-id', crypto.randomUUID());
    return config;
  },
  (error) => Promise.reject(error),
);

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & RetryableRequestConfig) | undefined;

    if (config) {
      const attempt = (config.__retryAttempt ?? 0) + 1;
      if (shouldRetry(error, attempt, HTTP_CONFIG.retry, config)) {
        config.__retryAttempt = attempt;
        await sleep(computeDelayMs(attempt, HTTP_CONFIG.retry, error.response));
        return httpClient(config);
      }
    }

    if (error.response?.status === 401) {
      const url = config?.url || '';
      const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
      if (!isAuthAttempt) {
        clearToken();
        setPostLoginRedirect(window.location.pathname + window.location.search);
        window.location.assign('/login');
      }
    }
    // Same error-enrichment shape the old utils/apiClient.js used — every
    // existing catch block across the app reads err.message/.status/.errors.
    //
    // The message comes from the mapper and never from error.message: that is
    // exactly where axios leaves "Request failed with status code 500" and
    // "Network Error", which every catch block then renders verbatim.
    const data =
      (error.response?.data as {
        message?: string;
        errors?: Array<{ field?: string; message: string }>;
        code?: string;
      }) || {};

    const message = apiErrorMessage({
      data,
      status: error.response?.status,
      isNetworkError: !error.response,
    });

    const enrichedError = Object.assign(new Error(message), {
      status: error.response?.status,
      code: data.code,
      errors: data.errors || null,
    });

    return Promise.reject(enrichedError);
  },
);

export default httpClient;
