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

/**
 * Calls Gemini with a JSON-Schema-constrained response and returns the parsed
 * object. Retries transient failures (429/503, and client-side timeouts) with
 * capped exponential backoff + jitter; fails fast on anything else (bad key,
 * bad request, non-transient errors).
 */
export async function generateStructured({
  prompt,
  schema,
  model = DEFAULT_MODEL,
  temperature = 0.7,
  maxOutputTokens = 8192,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const ai = getClient();
  let lastError;
  // Escalated on retry if Gemini truncates at this budget (see below) — kept
  // separate from the caller's `maxOutputTokens` param so each attempt logs
  // the budget it actually used.
  let currentMaxOutputTokens = maxOutputTokens;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
        timeoutMs,
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
        throw new AppError('AI did not return valid JSON', BAD_GATEWAY);
      }
    } catch (err) {
      lastError = err;
      const status = extractStatus(err);
      const retryable = err.isTimeout || err.isTruncated || RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === MAX_ATTEMPTS) {
        if (err instanceof AppError) throw err;
        if (err.isTruncated) {
          logger.error({ model, attempt, maxOutputTokens: currentMaxOutputTokens }, 'Gemini response repeatedly truncated at maxOutputTokens');
          throw new AppError('AI generation was too large to complete — try a shorter itinerary or fewer days', BAD_GATEWAY);
        }
        logger.error({ err, model, attempt, status }, 'Gemini request failed');
        throw new AppError('AI generation failed', status === 401 || status === 403 ? SERVICE_UNAVAILABLE : BAD_GATEWAY);
      }

      if (err.isTruncated) {
        currentMaxOutputTokens = Math.min(MAX_OUTPUT_TOKENS_CEILING, Math.ceil(currentMaxOutputTokens * 1.5));
        logger.warn({ attempt, newMaxOutputTokens: currentMaxOutputTokens }, 'Retrying Gemini request with a larger token budget after truncation');
      } else {
        const backoffMs = 2 ** (attempt - 1) * 500 + Math.random() * 250;
        logger.warn({ status, attempt, backoffMs }, 'Retrying Gemini request after transient failure');
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
}
