// tone.v1 — what "not machine-like" means, as data.
//
// This is the rule set the copilot's prose is checked against. It exists
// because "do not sound like a machine" is otherwise a taste argument that
// nobody can fail a build on.
//
// Two layers, deliberately separated:
//
//   hard  — machine-SHAPED output. Structural, deterministic, always a failure.
//   soft  — colleague-voice signals. Scored, never a hard failure, because a
//           short factual answer can legitimately skip them.
//
// The judged layer (a reviewer model scoring the prose against `rubric`) runs
// offline in evaluation, never in the request path.
//
// EXEMPT FROM ALL OF THIS: the structured fields. Suggestion questions, action
// rows, evidence chips and score breakdowns are allowed to be machine-shaped —
// that is where structured output belongs. Only `prose` is checked.

export const TONE_VERSION = 'tone.v1';

// Numbers are NOT banned. The whole point of the numeric work is that a count
// may appear in a sentence when it is grounded ("12 leads want Bali").
// What is banned is machine SHAPE: serialized objects, internal ids, field
// paths, canned assistant phrasing, and tabular structure in a sentence.
export const HARD_RULES = [
  {
    id: 'raw-json',
    pattern: /\{[\s\S]{0,200}?"[a-zA-Z_]+"\s*:/,
    why: 'Serialized object in prose. Structured data belongs in the action row, not in a sentence.',
  },
  {
    id: 'evidence-id',
    pattern: /\btool:[a-zA-Z_]+:\d+\b|\bevidenceIds?\b|\bfieldPaths?\b|\bpageKey\b/,
    why: 'Internal evidence plumbing leaked into prose. The operator sees a citation chip, not an identifier.',
  },
  {
    id: 'record-id',
    pattern: /\b[A-Z]{2,}-\d[\w-]*\b/,
    why: 'Raw record id in prose. Name the record, do not key it.',
  },
  {
    id: 'canned-search-phrase',
    pattern: /\bI (found|located|retrieved) \d+ (results?|records?|matches|items)\b/i,
    why: 'Machine report phrasing. Say what is true, not how many rows the query returned.',
  },
  {
    id: 'boilerplate-opener',
    pattern:
      /^(based on the (data|information|evidence|provided)|here is a summary of|i have analyzed|as an ai|i don't have access to real-time)/i,
    why: 'Assistant boilerplate. A colleague does not preface a fact with a disclaimer.',
  },
  {
    id: 'question-restatement',
    pattern: /^(you asked|your question|regarding your question|to answer your question)/i,
    why: 'Restating the question before answering. Lead with the answer.',
  },
  {
    id: 'table-in-prose',
    pattern: /\|.*\||^\s*[-*]\s+\w+:\s|```/m,
    why: 'Tabular or fenced structure inside a sentence. Use the structured fields for lists.',
  },
  {
    id: 'filler',
    pattern: /\b(it is important to note|please note that|needless to say|it should be noted)\b/i,
    why: 'Filler that costs the reader time and carries no information.',
  },
  {
    id: 'apology-loop',
    pattern: /i apologi[sz]e for the confusion|i'm sorry for the confusion/i,
    why: 'Apologising for a previous turn instead of answering this one.',
  },
];

export const SOFT_SIGNALS = [
  {
    id: 'second-person',
    pattern: /\b(you|your|yours)\b/i,
    why: 'Speaking to the operator, not about the data in the abstract.',
  },
  {
    id: 'leads-with-substance',
    // A first sentence that is only a greeting or a hedge.
    pattern: /^(ok|okay|sure|certainly|alright|got it)[,.]?\s/i,
    negative: true,
    why: 'Leading with acknowledgement instead of the answer.',
  },
];

// Portable limits. Deliberately tight: a bubble is read in a side panel, not a
// document. These are checked against prose only.
export const LIMITS = Object.freeze({
  maxWords: 70,
  maxSentences: 3,
  maxChars: 420,
});

// The judged layer, run offline by a reviewer model. Kept as text here so the
// rubric lives next to the deterministic rules it complements rather than
// floating in the evaluation harness.
export const RUBRIC = [
  'Would a competent colleague say this out loud to another operator? Score 1-5.',
  'Does the first sentence carry the answer, not a preamble? Score 1-5.',
  'Is every number in the prose traceable to something the operator can click? Score 1-5.',
  'Does it avoid over-explaining what the operator can already see on the page? Score 1-5.',
  'Return the four scores and, for any score below 4, quote the phrase that caused it.',
].join('\n');

export function sentenceCount(text) {
  return (String(text ?? '').match(/[.!?]+(\s|$)/g) || []).length || (String(text ?? '').trim() ? 1 : 0);
}

export function wordCount(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
