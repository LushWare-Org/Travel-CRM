import { GoogleGenAI } from '@google/genai';
import AppError from '../utils/appError.js';
import { BAD_GATEWAY, SERVICE_UNAVAILABLE } from '../constants/httpStatus.js';

// ─── Grounded travel search ───────────────────────────────────────────────
// The one call in this service that answers from the open web rather than from
// our own records. It is deliberately NOT response-schema-constrained: the
// answer is prose the visitor reads, and the facts that make it trustworthy are
// the grounding citations, which arrive beside the text rather than inside it.
// Keeping the structured and grounded calls apart also means nothing here
// depends on how Gemini combines `tools` with `responseSchema`.
//
// The provider's grounded response has two shapes in the wild — the
// `groundingMetadata.groundingChunks` shape `models.generateContent` returns,
// and the `steps[].content[].annotations[].url_citation` shape of the newer
// interactions surface. Both are parsed here so the exported contract
// (`{ text, citations }`) never changes if the SDK surface moves underneath it.

// Its own client and its own timeout, rather than reaching into geminiClient.js
// for either. The structured seam exports one function on purpose — every
// controller test mocks that module with a factory, and a shared internal here
// would make every one of those mocks fail on a missing export. The model pin
// mirrors geminiClient's (same env var, same fallback); re-evaluate both
// together.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
export const GROUNDING_TIMEOUT_MS = 12_000;

const MAX_CITATIONS = 5;
const DEFAULT_TIMEOUT_MS = GROUNDING_TIMEOUT_MS;
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
const HTTP_SCHEME = /^https?:\/\//i;

const providerError = (message, category) =>
  Object.assign(new AppError(message, BAD_GATEWAY), { aiFailureCategory: category });

let client = null;

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('AI generation is not configured', SERVICE_UNAVAILABLE);
  }
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
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

const hostnameOf = (uri) => {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// Every citation is reduced to a label and an http(s) link. A source the client
// could not safely render as a link is dropped rather than passed on: this is
// the one place a provider-supplied string becomes something the page turns into
// an anchor, so the scheme is checked here and again in the widget.
export function toCitation(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const uri = typeof entry.uri === 'string' ? entry.uri : typeof entry.url === 'string' ? entry.url : '';
  if (!HTTP_SCHEME.test(uri)) return null;
  const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : hostnameOf(uri);
  if (!title) return null;
  return { title: title.slice(0, 200), uri: uri.slice(0, 500) };
}

/** Citations, deduped by uri and capped, from whichever grounded shape arrived. */
export function extractCitations(response) {
  const collected = [];

  const groundings = response?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (Array.isArray(groundings)) {
    for (const chunk of groundings) collected.push(toCitation(chunk?.web));
  }

  const steps = response?.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const contents = Array.isArray(step?.content) ? step.content : [];
      for (const content of contents) {
        const annotations = Array.isArray(content?.annotations) ? content.annotations : [];
        for (const annotation of annotations) {
          if (annotation?.type && annotation.type !== 'url_citation') continue;
          collected.push(toCitation(annotation));
        }
      }
    }
  }

  const seen = new Set();
  const citations = [];
  for (const citation of collected) {
    if (!citation || seen.has(citation.uri)) continue;
    seen.add(citation.uri);
    citations.push(citation);
    if (citations.length === MAX_CITATIONS) break;
  }
  return citations;
}

/** The answer text, from whichever shape arrived. */
export function extractText(response) {
  if (typeof response?.text === 'string' && response.text.trim()) return response.text.trim();
  if (typeof response?.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();

  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const joined = parts
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim();
    if (joined) return joined;
  }

  const steps = response?.steps;
  if (Array.isArray(steps)) {
    const joined = steps
      .flatMap((step) => (Array.isArray(step?.content) ? step.content : []))
      .map((content) => (typeof content?.text === 'string' ? content.text : ''))
      .join('')
      .trim();
    if (joined) return joined;
  }

  return '';
}

/**
 * One grounded answer. Single attempt, no retry: the caller shares the turn's
 * deadline with the resolver call that chose this tool, and a search that fails
 * degrades to server-owned copy rather than to a slow turn.
 *
 * Throws an AppError when the provider fails or when the answer came back
 * without a single usable source — an uncited answer to a question about the
 * outside world is the failure this tool exists to avoid, so it is not returned
 * as if it were grounded.
 */
export async function generateGrounded({
  prompt,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  model = DEFAULT_MODEL,
}) {
  const ai = getClient();

  let response;
  try {
    response = await withTimeout(
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          // Google Search grounding, and the answer as prose. The mime type is
          // pinned to text/plain because the alternative is not "unset" in
          // practice: with no schema the model still takes its cue from the
          // prompt, and a prompt that reads as instructional produced a JSON
          // object answered from memory — search never ran, so no grounding
          // metadata came back. No `responseSchema`: see the file header.
          tools: [{ googleSearch: {} }],
          responseMimeType: 'text/plain',
          temperature: 0.2,
          maxOutputTokens,
        },
      }),
      timeoutMs,
    );
  } catch (err) {
    throw providerError(
      err?.isTimeout ? 'AI search timed out' : 'AI search failed',
      err?.isTimeout ? 'timeout' : 'provider',
    );
  }

  const text = extractText(response);
  if (!text) throw providerError('AI returned an empty search response', 'provider');

  const citations = extractCitations(response);
  if (citations.length === 0) {
    // Its own marker, because it is a different failure from a provider error:
    // the call succeeded and the model simply answered without searching. That is
    // a model decision with no force-search setting to override it —
    // `googleSearchRetrieval`'s MODE_ALWAYS is rejected outright on this model
    // ("Please use google_search tool instead"), and plain `googleSearch` leaves
    // the choice to the model. Measured on a question the model believes it knows
    // ("the good locations of Afghanistan these days"), one call in five searched;
    // on ordinary travel questions most do. The caller retries this one, and only
    // this one, because asking again is what changes it.
    throw Object.assign(providerError('AI returned no grounding sources', 'provider'), { groundingMissing: true });
  }

  return { text, citations };
}
