import type { AxiosError, AxiosResponse } from 'axios';
import type { HttpConfig } from './config';

// Module augmentation so any caller of httpClient.{get,post,...} can pass
// `{ retry: false }` (or `true`) as a properly-typed request option, not
// just an untyped object the interceptor happens to read off `error.config`
// at runtime — e.g. sendAssistantTurn opts a non-idempotent, billed AI call
// out of the default retry-on-timeout behavior.
declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export interface AxiosRequestConfig<D = any> {
    retry?: boolean;
  }
}

// Extra fields axios doesn't declare but a request config can legitimately
// carry: our own retry-eligibility override and the interceptor's private
// attempt counter.
export interface RetryableRequestConfig {
  method?: string;
  retry?: boolean;
  __retryAttempt?: number;
  [key: string]: unknown;
}

/**
 * True when `error` (thrown for `config`, on its `attempt`-th try) should be
 * retried under `retryConfig`. Mirrors the retry-eligibility logic in
 * Services/package-service/src/ai/geminiClient.js: retryable-status
 * allowlist, fail fast otherwise. `config.retry === true|false` on the
 * request always wins over the method/status defaults, letting a caller
 * opt a specific request in (e.g. a safe idempotent PUT) or out.
 */
export const shouldRetry = (
  error: AxiosError,
  attempt: number,
  retryConfig: HttpConfig['retry'],
  config: RetryableRequestConfig,
): boolean => {
  if (attempt >= retryConfig.maxAttempts) return false;
  if (config.retry === true) return true;
  if (config.retry === false) return false;

  // No response at all (network error, DNS failure, timeout) is always a
  // transient-looking failure regardless of method.
  if (!error.response) return true;

  const method = (config.method || 'get').toUpperCase();
  if (!retryConfig.methods.includes(method)) return false;

  return retryConfig.statusCodes.includes(error.response.status);
};

const parseRetryAfterMs = (response: AxiosResponse | undefined): number | null => {
  const header = response?.headers?.['retry-after'];
  if (!header) return null;

  const asSeconds = Number(header);
  if (Number.isFinite(asSeconds)) return asSeconds * 1000;

  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());

  return null;
};

/**
 * Capped exponential backoff + full jitter, same shape as geminiClient.js's
 * `2 ** (attempt - 1) * 500 + Math.random() * 250` generalized to the
 * configured base/cap. A `Retry-After` header on the response (429/503)
 * always takes precedence over the computed delay.
 */
export const computeDelayMs = (
  attempt: number,
  retryConfig: HttpConfig['retry'],
  response: AxiosResponse | undefined,
): number => {
  const retryAfterMs = parseRetryAfterMs(response);
  if (retryAfterMs !== null) return retryAfterMs;

  const exponential = retryConfig.baseDelayMs * 2 ** (attempt - 1);
  return Math.min(retryConfig.maxDelayMs, exponential) + Math.random() * retryConfig.baseDelayMs;
};
