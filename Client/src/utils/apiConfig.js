const DEFAULT_BASE_URL = 'http://localhost:5000/api/v1';

export const API_BASE_URL = (
  import.meta?.env?.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, '');

export const API_TIMEOUT = Number(import.meta?.env?.VITE_API_TIMEOUT) || 15000;
