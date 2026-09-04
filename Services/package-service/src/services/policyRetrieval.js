// Deterministic, non-LLM keyword retrieval over policyDocuments — the
// server-side half of the wizard's answer_policy_question tool. The model
// never sees or authors quoted text directly from this module's output: the
// wizard controller hands it these candidates (with the actual quote already
// resolved server-side) and only trusts the model to pick candidate ids and
// write a short lead-in sentence. See docs/designs/ai-trip-planning-assistant.md
// Premise 2 and this repo's Eng Review Addendum.
//
// Substring/keyword matching, not embeddings — an explicit, engineering-level
// choice for the current handful-of-documents scale (see that design doc's
// Open Questions); revisit only once the doc count outgrows this.

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
 * clears minScore — the wizard controller treats an empty result as "no
 * confirmed answer" and overrides whatever the model does with the fixed
 * fallback, per Premise 2.
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
