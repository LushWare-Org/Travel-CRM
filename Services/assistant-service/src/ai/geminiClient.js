import { GoogleGenAI } from '@google/genai';
import AppError from '../utils/appError.js';
import logger from '../config/logger.js';
import { BAD_GATEWAY, SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';

// Single seam every AI controller calls through — swapping/adding a provider
// later means writing one new adapter, not touching every controller.
//
// Pinned to a specific, already-established GA model rather than the
// floating '-latest' alias. '-latest' sounds safer (never goes stale — see
// the dated-model-retirement note this file used to carry) but in practice
// it can point at whatever Google's newest release is, including a
// brand-new preview build — confirmed live: 'gemini-flash-latest' currently
// resolves to 'gemini-3.7-flash', which has only a 20-request/day free-tier
// quota and returned 503 "high demand" repeatedly. A one-version-old GA
// model has a far more mature quota allocation. Re-evaluate this pin
// periodically rather than chasing '-latest' automatically.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([429, 503]);
// Smallest slice of an overall `deadlineMs` budget worth starting another
// attempt on. A retry only earns its keep if it can plausibly finish: the
// fastest healthy 'gemini-3.5-flash' answer observed against this service took
// ~4.8s, so a retry handed less time than that just converts a clean provider
// failure into a client-side timeout while still spending the caller's
// remaining budget. Under this floor the last error propagates unchanged.
const MIN_RETRY_TIMEOUT_MS = 5_000;
// Real output ceiling for the flash model family (confirmed via the API's
// own model-metadata endpoint) — never escalate a truncation retry past this.
const MAX_OUTPUT_TOKENS_CEILING = 65536;

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI generation is not configured', SERVICE_UNAVAILABLE);
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function isAIConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(Object.assign(new Error('AI request timed out'), { isTimeout: true }));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function extractStatus(err) {
  return err?.status ?? err?.response?.status ?? err?.code;
}

// TODOS.md: "Honor Gemini's RetryInfo.retryDelay on 429 quota errors" — the
// @google/genai SDK's ApiError carries no structured `.details`; the raw
// Gemini error body (which DOES include RetryInfo when Google names a
// concrete retry window) is JSON-stringified into `err.message` by the
// SDK's throwErrorIfNotOK (see node_modules/@google/genai dist, "got status"
// / JSON.stringify(errorBody) path — confirmed against the installed SDK,
// not guessed). Parses that back out; returns null on any shape mismatch so
// callers always have a safe fallback to the existing fixed backoff.
const MAX_RETRY_DELAY_MS = 60_000;

function extractRetryDelayMs(err) {
  try {
    const parsed = JSON.parse(err?.message ?? '');
    const details = parsed?.error?.details;
    if (!Array.isArray(details)) return null;
    const retryInfo = details.find(
      (d) => typeof d?.['@type'] === 'string' && d['@type'].endsWith('RetryInfo'),
    );
    const raw = retryInfo?.retryDelay; // e.g. "27s"
    if (typeof raw !== 'string') return null;
    const seconds = parseFloat(raw.replace(/s$/, ''));
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
  } catch {
    return null;
  }
}

/**
 * Calls Gemini with a JSON-Schema-constrained response and returns the parsed
 * object. Retries transient failures (429/503, and client-side timeouts) with
 * capped exponential backoff + jitter; fails fast on anything else (bad key,
 * bad request, non-transient errors).
 *
 * `timeoutMs` caps ONE attempt. `deadlineMs` (optional) caps the WHOLE call —
 * every attempt plus the backoff slept between them — measured from the first
 * attempt, for callers that sit inside their own outer request timeout. With it
 * set, each attempt is given `min(timeoutMs, time left)`: the per-attempt
 * ceiling the caller already chose is never raised, and a healthy attempt is
 * never cut shorter than it. A retry is only started while the time left, after
 * paying that retry's backoff, still clears MIN_RETRY_TIMEOUT_MS; otherwise the
 * failure surfaces immediately, with the same typed error a final-attempt
 * failure produces. Callers that omit `deadlineMs` keep the previous behaviour
 * exactly: up to `maxAttempts` attempts, each bounded by `timeoutMs`.
 */
export async function generateStructured({
  prompt,
  schema,
  model = DEFAULT_MODEL,
  temperature = 0.7,
  maxOutputTokens = 8192,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = MAX_ATTEMPTS,
  deadlineMs,
}) {
  const ai = getClient();
  let lastError;
  // Escalated on retry if Gemini truncates at this budget (see below) — kept
  // separate from the caller's `maxOutputTokens` param so each attempt logs
  // the budget it actually used.
  let currentMaxOutputTokens = maxOutputTokens;
  // Terminal exit shared by "gave up retrying" and "no time left to retry":
  // a deadline stop must report the exact error shape a maxAttempts stop does.
  const failWith = (err, status, attempt) => {
    if (err instanceof AppError) throw err;
    if (err.isTruncated) {
      logger.error({ model, attempt, maxOutputTokens: currentMaxOutputTokens }, 'Gemini response repeatedly truncated at maxOutputTokens');
      throw Object.assign(
        new AppError('AI generation was too large to complete — try a shorter itinerary or fewer days', BAD_GATEWAY),
        { aiFailureCategory: 'schema' },
      );
    }
    logger.error({ err, model, attempt, status }, 'Gemini request failed');
    throw Object.assign(
      new AppError('AI generation failed', status === 401 || status === 403 ? SERVICE_UNAVAILABLE : BAD_GATEWAY),
      { aiFailureCategory: err.isTimeout ? 'timeout' : 'provider' },
    );
  };

  // Wall clock is measured from just before the first attempt, so `deadlineMs`
  // bounds all attempts and their backoffs together, not one call. A caller
  // that passes no deadline gets Infinity, which leaves the per-attempt timeout
  // below (`Math.min`) exactly as it was.
  const startedAt = Date.now();
  const remainingBudgetMs = () => (deadlineMs == null ? Infinity : deadlineMs - (Date.now() - startedAt));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature,
            maxOutputTokens: currentMaxOutputTokens,
          },
        }),
        Math.min(timeoutMs, remainingBudgetMs()),
      );

      // Structured-output decoding still closes the JSON validly when cut off
      // mid-generation, so a truncated response can otherwise sail through
      // JSON.parse looking "successful" but missing most of its content.
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw Object.assign(new Error('Gemini response truncated at maxOutputTokens'), { isTruncated: true });
      }

      const text = response.text;
      if (!text) throw new AppError('AI returned an empty response', BAD_GATEWAY);

      try {
        return JSON.parse(text);
      } catch (parseErr) {
        logger.error({ err: parseErr, model, attempt }, 'Failed to parse Gemini structured response as JSON');
        throw Object.assign(new AppError('AI did not return valid JSON', BAD_GATEWAY), { aiFailureCategory: 'schema' });
      }
    } catch (err) {
      lastError = err;
      const status = extractStatus(err);
      const retryable = err.isTimeout || err.isTruncated || RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        failWith(err, status, attempt);
      }

      // How long the retry would get to run: what is left of the budget minus
      // the backoff it sleeps first. Without a `deadlineMs` this is Infinity, so
      // the legacy fixed retry schedule is untouched. The check runs BEFORE the
      // sleep, so the backoff itself can never overshoot the deadline.
      const retryDelayMs = status === 429 ? extractRetryDelayMs(err) : null;
      const backoffMs = err.isTruncated ? 0 : retryDelayMs ?? (2 ** (attempt - 1) * 500 + Math.random() * 250);
      if (remainingBudgetMs() - backoffMs < MIN_RETRY_TIMEOUT_MS) {
        failWith(err, status, attempt);
      }

      if (err.isTruncated) {
        currentMaxOutputTokens = Math.min(MAX_OUTPUT_TOKENS_CEILING, Math.ceil(currentMaxOutputTokens * 1.5));
        logger.warn({ attempt, newMaxOutputTokens: currentMaxOutputTokens }, 'Retrying Gemini request with a larger token budget after truncation');
      } else {
        logger.warn({ status, attempt, backoffMs, usedRetryInfo: retryDelayMs != null }, 'Retrying Gemini request after transient failure');
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
}
