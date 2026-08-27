const DEFAULT_BASE_URL = 'http://localhost:3000/api/v1';

const parseIntList = (value: string | undefined, fallback: number[]): number[] => {
  if (!value?.trim()) return fallback;
  const parsed = value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
  return parsed.length > 0 ? parsed : fallback;
};

const parseMethodList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value?.trim()) return fallback;
  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
};

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  methods: string[];
  statusCodes: number[];
}

export interface HttpConfig {
  baseURL: string;
  timeoutMs: number;
  retry: RetryConfig;
}

const env = import.meta.env;

export const HTTP_CONFIG: HttpConfig = {
  baseURL: (env.VITE_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
  timeoutMs: Number(env.VITE_API_TIMEOUT) || 15000,
  retry: {
    maxAttempts: Number(env.VITE_API_RETRY_MAX_ATTEMPTS) || 3,
    baseDelayMs: Number(env.VITE_API_RETRY_BASE_DELAY_MS) || 300,
    maxDelayMs: Number(env.VITE_API_RETRY_MAX_DELAY_MS) || 4000,
    methods: parseMethodList(env.VITE_API_RETRY_METHODS, ['GET', 'HEAD']),
    statusCodes: parseIntList(env.VITE_API_RETRY_STATUS_CODES, [408, 429, 500, 502, 503, 504]),
  },
};
