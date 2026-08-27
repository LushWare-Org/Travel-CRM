import { describe, expect, it, vi } from 'vitest';
import type { AxiosError, AxiosResponse } from 'axios';
import { computeDelayMs, shouldRetry } from '../retry';
import type { HttpConfig } from '../config';

const RETRY_CONFIG: HttpConfig['retry'] = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 4000,
  methods: ['GET', 'HEAD'],
  statusCodes: [408, 429, 500, 502, 503, 504],
};

const makeError = (status: number | undefined, headers: Record<string, string> = {}): AxiosError =>
  ({
    response: status === undefined ? undefined : ({ status, headers } as AxiosResponse),
    isAxiosError: true,
    toJSON: () => ({}),
    name: 'AxiosError',
    message: 'error',
  }) as AxiosError;

describe('shouldRetry', () => {
  it('retries a GET on a retryable status code', () => {
    const error = makeError(503);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'get' })).toBe(true);
  });

  it('does not retry a GET on a non-retryable status code', () => {
    const error = makeError(400);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'get' })).toBe(false);
  });

  it('does not retry a POST by default, even on a retryable status', () => {
    const error = makeError(503);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'post' })).toBe(false);
  });

  it('retries a POST when the request opts in via config.retry === true', () => {
    const error = makeError(503);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'post', retry: true })).toBe(true);
  });

  it('does not retry a GET when the request opts out via config.retry === false', () => {
    const error = makeError(503);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'get', retry: false })).toBe(false);
  });

  it('retries a network error (no response) regardless of method', () => {
    const error = makeError(undefined);
    expect(shouldRetry(error, 1, RETRY_CONFIG, { method: 'get' })).toBe(true);
  });

  it('stops retrying once attempt reaches maxAttempts', () => {
    const error = makeError(503);
    expect(shouldRetry(error, 3, RETRY_CONFIG, { method: 'get' })).toBe(false);
  });
});

describe('computeDelayMs', () => {
  it('computes capped exponential backoff with jitter bounded by baseDelayMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(computeDelayMs(1, RETRY_CONFIG, undefined)).toBe(300);
    expect(computeDelayMs(2, RETRY_CONFIG, undefined)).toBe(600);
    expect(computeDelayMs(3, RETRY_CONFIG, undefined)).toBe(1200);
    expect(computeDelayMs(4, RETRY_CONFIG, undefined)).toBe(2400);
    vi.restoreAllMocks();
  });

  it('caps the delay at maxDelayMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    // 2^6 * 300 = 19200, far above the 4000ms cap.
    expect(computeDelayMs(7, RETRY_CONFIG, undefined)).toBe(4000);
    vi.restoreAllMocks();
  });

  it('adds jitter up to baseDelayMs', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);
    // attempt 1: min(4000, 300) + 1 * 300 = 600
    expect(computeDelayMs(1, RETRY_CONFIG, undefined)).toBe(600);
    vi.restoreAllMocks();
  });

  it('prefers a numeric Retry-After header over the computed backoff', () => {
    const response = { headers: { 'retry-after': '2' } } as unknown as AxiosResponse;
    expect(computeDelayMs(1, RETRY_CONFIG, response)).toBe(2000);
  });

  it('falls back to computed backoff when Retry-After is absent', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const response = { headers: {} } as unknown as AxiosResponse;
    expect(computeDelayMs(1, RETRY_CONFIG, response)).toBe(300);
    vi.restoreAllMocks();
  });
});
