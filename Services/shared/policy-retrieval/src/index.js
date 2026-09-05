// Shared policy-retrieval matcher + policy-document fetch, used by every
// caller that implements an `answer_policy_question`/`answer_faq_policy`
// tool: package-service's wizard-turn today, assistant-service's
// assistant-turn as of docs/designs/site-wide-floating-assistant.md.
//
// Extracted here (rather than duplicated per caller) per that design doc's
// Eng Review Decisions — a second caller independently re-implementing this
// matcher would let the two surfaces' policy answers drift out of sync.
//
// Caching note: an earlier design (docs/designs/ai-trip-planning-assistant.md,
// Eng Review Addendum [P3]) explicitly declined a cache here as premature at
// wizard-turn's traffic/doc-count. That call is REVISED here: assistant-service
// widens this fetch from one caller (the planner tab) to every public page,
// materially higher call volume against content that changes rarely
// (admin-edited), which is what justifies the 60s TTL cache below.

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || '';
const FETCH_TIMEOUT_MS = 3_000;
const CACHE_TTL_MS = 60_000;

export const FALLBACK_POLICY_MESSAGE =
  "I don't have a confirmed answer to that — please reach out and our team will help.";

let cachedDocuments = null;
let cachedAt = 0;

/**
 * All policy documents, or [] if user-service can't be reached — a fetch
 * failure degrades the caller to FALLBACK_POLICY_MESSAGE rather than ever
 * blocking the turn or guessing. Cached for CACHE_TTL_MS across callers in
 * the same process; pass `skipCache: true` to force a fresh fetch (tests).
 */
export async function fetchPolicyDocuments({ fetchImpl = fetch, skipCache = false } = {}) {
  const now = Date.now();
  if (!skipCache && cachedDocuments && now - cachedAt < CACHE_TTL_MS) {
    return cachedDocuments;
  }

  try {
    const res = await fetchImpl(`${USER_SERVICE_URL}/api/v1/admin/internal/policy-documents`, {
      headers: { 'x-internal-token': INTERNAL_SERVICE_KEY },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return cachedDocuments || [];
    const body = await res.json();
    const documents = Array.isArray(body?.data?.documents) ? body.data.documents : [];
    cachedDocuments = documents;
    cachedAt = now;
    return documents;
  } catch {
    // A transient fetch failure still serves the last-known-good cache
    // rather than degrading to [] (and therefore the fallback message) —
    // stale-but-correct beats correct-but-unavailable for content that
    // rarely changes.
    return cachedDocuments || [];
  }
}

/** Test-only: clears the module-level cache between test cases. */
export function _resetPolicyDocumentsCache() {
  cachedDocuments = null;
  cachedAt = 0;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about', 'as', 'by', 'from', 'into', 'onto',
  'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'may', 'might', 'must',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'if', 'then', 'than', 'so', 'not', 'no', 'yes', 'please', 'me', 'us', 'them', 'him',
]);

function tokenize(text) {
  return (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

/** Words meaningful enough to score on — short/common words are noise. */
function meaningfulTokens(text) {
  return tokenize(text).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

/** Blank-line-separated sections — the smallest citable unit within a document. */
function splitSections(body) {
  return (body || '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Scores every section of every document against the question's meaningful
 * words and returns the top-scoring sections as verbatim, server-resolved
 * snippets. Returns [] when the question has no meaningful words or nothing
 * clears minScore — a caller treats an empty result as "no confirmed answer"
 * and overrides whatever the model does with FALLBACK_POLICY_MESSAGE.
 */
export function retrieveSnippets(documents, question, { maxSnippets = 2, minScore = 1 } = {}) {
  const queryTokens = new Set(meaningfulTokens(question));
  if (queryTokens.size === 0) return [];

  const candidates = [];
  for (const doc of documents || []) {
    for (const section of splitSections(doc.body)) {
      const score = meaningfulTokens(section).filter((t) => queryTokens.has(t)).length;
      if (score >= minScore) {
        candidates.push({ id: `snippet-${candidates.length}`, docId: doc.id, title: doc.title, quote: section, score });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, maxSnippets);
}
