const DEFAULT_BASE_URL = 'https://api.harshkumar.space/api/v1';

export const API_BASE_URL = (
  import.meta?.env?.VITE_API_BASE_URL?.trim() || DEFAULT_BASE_URL
).replace(/\/+$/, '');

export const API_TIMEOUT = Number(import.meta?.env?.VITE_API_TIMEOUT) || 15000;
