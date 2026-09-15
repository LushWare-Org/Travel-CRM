// ─── Grounding validator ──────────────────────────────────────────────────
// Deterministic post-generation validation. No model judgment anywhere.
//
// THE INVARIANT IS "NO UNSUPPORTED VALUE", NOT "NO DIGITS". This file used to
// enforce the second one by rejecting any claim whose prose contained a number,
// which made every quantitative question unanswerable: a correct "12 leads want
// Bali" was generated, validated and discarded, and the operator saw "No
// grounded answer for that question." Counting was impossible by construction,
// and replacing that rule is what this file is for.
//
// What holds now: a numeric token in prose is allowed when it RESOLVES, by exact
// equality against a canonical scalar, to something the claim already cites —
// the cited evidence's own value, a fact on the claim, or a declared derivation.
// Anything resolving to nothing still rejects the claim.
//
// A claim answering from what this turn COMPUTED — a tool result, or a page
// aggregate — needs no citation at all: neither is a renderable field, and the
// model is never shown an id for either (a tool result reaches it as
// {tool,result}). Its numbers are still checked, against those same computed
// results, so a computed answer cannot invent one. Page-field evidence keeps the
// citation rule above.
//
// Matching is exact, never substring: the old check would have accepted "3"
// because some date or amount in the cited record happened to contain a 3.

const GUIDANCE_GATING_FLAG = 'MANAGEMENT_COPILOT_GUIDANCE_ENABLED';

function guidanceEnabled() {
  return process.env[GUIDANCE_GATING_FLAG] === 'true';
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// A fact is grounded iff its normalized value appears within the normalized
// serialization of its cited evidence item's value. Adapters MUST place
// canonical values in evidence.value so this holds; see the per-kind
// canonicalization note in the design (fieldPaths-scoped grounding).
function factGroundedIn(factValue, evidenceValue) {
  const f = normalize(factValue);
  if (f === '') return false;
  const ev = normalize(JSON.stringify(evidenceValue ?? ''));
  return ev.includes(f);
}

// Values that must never appear in operator-facing prose for safety reasons,
// independent of whether they are grounded. Numbers are deliberately absent.
const UNSAFE_PROSE_PATTERNS = [
  // Internal record ids. Every id this system mints is a UUID — that is what must
  // never reach operator prose. The prefix-shaped rule this replaced
  // (`[A-Z]{2,}-\d[\w-]*`) matched the operator-facing DOCUMENT numbers instead
  // (`INV-202608-00027`, the number the panel and the billing list both show)
  // while missing every UUID it was written to catch.
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  /\btool:[a-zA-Z_]+:\d+\b/, // tool-call ids
  /\bevidenceIds?\b|\bfieldPaths?\b|\bpageKey\b/, // evidence plumbing
  /\{[\s\S]{0,200}?"[a-zA-Z_]+"\s*:/, // serialized objects
];

export function hasUnsafeProse(text) {
  return UNSAFE_PROSE_PATTERNS.some((re) => re.test(text ?? ''));
}

// ─── Canonical scalars ────────────────────────────────────────────────────
// An evidence value can be a string, a number, a boolean or a nested object, so
// "what does this evidence actually say" is defined once here and shared, rather
// than re-derived at each call site.

/** Canonical form of one scalar. Case-insensitive on strings. */
export function canonicalScalar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed.toLowerCase();
  }
  return null;
}

/**
 * Every scalar reachable inside an evidence value, flattened. An object-valued
 * tool result contributes its leaves, so a token can resolve against a row field
 * inside a tool result and not only against a top-level number.
 */
export function canonicalScalars(value, out = new Set()) {
  const scalar = canonicalScalar(value);
  if (scalar !== null) {
    out.add(scalar);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) canonicalScalars(item, out);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) canonicalScalars(item, out);
  }
  return out;
}

const ISO_DATE = /\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?/g;
// A document number ("INV-202608-00027") is ONE token, for the same reason an ISO
// date is: split into its numeric runs it becomes "202608" and "00027", neither of
// which is a value any evidence item carries, so a correctly cited invoice number
// was rejected as an unsupported number. Two-or-more `-digits` groups is what
// separates it from ordinary hyphenated prose ("top-10" is not a document number);
// the real format is always `<prefix>-<YYYYMM>-<sequence>`.
const DOC_NUMBER = /\b[A-Za-z]{2,}(?:-\d+){2,}\b/g;
// A quantity spelled as a word is a value like any other and must resolve like one.
// Deliberately NARROW: it counts only a bare number-word that reaches a plural noun
// within a few words ("twenty past due invoices"), and it is fenced off from the
// constructions where the same word is prose or a fragment —
//
// - "one of the leads", "one-off": a partitive or hyphenated word is not a count;
// - "eighty-two", "one hundred": read piecewise a compound figure yields meaningless
//   fragments, and "two" out of "eighty-two dollars" resolves to nothing, which would
//   reject a true sentence.
//
// The asymmetry is deliberate: a missed quantity stays unchecked exactly as it is
// today, while a false positive rejects an honest answer — the over-rejection that
// made counting questions unanswerable in the first place.
const WORD_NUMBER =
  /(?<![\w-])(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?![\w-])(?!\s+(?:of|off|or|hundred|thousand|million)\b)(?=(?:\s+[a-z][a-z-]*){0,3}\s+[a-z][a-z-]*s\b)/gi;
const WORD_VALUES = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
  sixty: '60',
  seventy: '70',
  eighty: '80',
  ninety: '90',
};
const NUMBER_TOKEN = /\d[\d,]*(?:\.\d+)?/g;

/**
 * The numbers a reader sees in a sentence, canonicalised.
 *
 * ISO dates and document numbers are extracted FIRST and as whole tokens, so
 * "2026-09-12" resolves against a date value instead of splitting into "2026",
 * "09" and "12" and failing, and "INV-202608-00027" resolves against the invoice
 * row that carries it instead of splitting into two unresolvable runs. Thousands
 * separators are stripped, so "₹1,500" yields "1500" and resolves against a
 * canonical 1500. A quantity spelled as a word is read as the number it names and
 * must then resolve like any other (see WORD_NUMBER).
 */
export function proseNumericTokens(text) {
  const source = String(text ?? '');
  const tokens = [];
  const blank = (match) => ' '.repeat(match.length);
  const withoutDates = source.replace(ISO_DATE, (match) => {
    tokens.push(match);
    return blank(match);
  });
  const withoutDocNumbers = withoutDates.replace(DOC_NUMBER, (match) => {
    tokens.push(match);
    return blank(match);
  });
  // A spelled-out quantity resolves against the same values a digit one does, because
  // canonicalScalar lowercases strings: a pushed '20' matches a canonical 20. Blanked
  // after capture for the same reason dates and document numbers are — the replaced
  // span keeps its offsets and cannot re-enter NUMBER_TOKEN.
  const withoutWordNumbers = withoutDocNumbers.replace(WORD_NUMBER, (match) => {
    tokens.push(WORD_VALUES[match.toLowerCase()]);
    return blank(match);
  });
  for (const match of withoutWordNumbers.match(NUMBER_TOKEN) ?? []) tokens.push(match.replace(/,/g, ''));
  return tokens;
}

/**
 * Tokens in the prose that resolve to nothing the claim can support. Empty means
 * the claim is allowed through.
 */
export function unresolvedNumericTokens(text, { factValues = new Set(), evidenceValues = new Set() } = {}) {
  return proseNumericTokens(text).filter((token) => {
    const canonical = canonicalScalar(token);
    if (canonical === null) return false;
    return !factValues.has(canonical) && !evidenceValues.has(canonical);
  });
}

// Evidence the TURN computed rather than read from a rendered field: a tool result
// (`tool:<name>:<n>`, minted by agentRunner's historyToEvidence) or a precomputed
// group (`<page>:aggregate:…`, minted by the aggregate pass). Neither is a field
// the panel can reveal, and neither id is ever shown to the model — which is why a
// claim built from one used to be deleted for citing nothing.
//
// Selected by ID SHAPE, not by `type`: page evidence already carries items with
// `type: 'computed'` that ARE renderable and ARE citable (the validator's own
// fixture has `metric:conv`), so keying on the type would admit claims that should
// still cite.
function isComputedEvidence(item) {
  const id = item?.id;
  return typeof id === 'string' && (id.startsWith('tool:') || id.includes(':aggregate:'));
}

// Validates and prunes model claims against the current evidence bundle.
// Returns { claims, rejected } where rejected is [{ id, reason }].
export function validateClaims({ claims, bundle, enableGuidance }) {
  const guidance = enableGuidance ?? guidanceEnabled();
  const evidenceById = new Map(bundle.evidence.map((e) => [e.id, e]));
  const computed = bundle.evidence.filter(isComputedEvidence);
  const computedIds = new Set(computed.map((item) => item.id));
  const accepted = [];
  const rejected = [];

  for (const claim of claims) {
    if (claim.evidenceType === 'guidance' && !guidance) {
      rejected.push({ id: claim.id, reason: 'guidance-disabled' });
      continue;
    }

    const validEvidenceIds = claim.evidenceIds.filter((id) => evidenceById.has(id));

    // A claim answering from what this turn computed needs no citation: there is
    // nothing renderable to point at and the model was never shown an id. What it
    // must still do is speak only in numbers those results carry — checked below,
    // against EVERY computed result rather than a cited subset, so nothing can be
    // invented. With nothing computed in the turn, the rule is unchanged.
    const answersFromComputed =
      computed.length > 0 && (validEvidenceIds.length === 0 || validEvidenceIds.some((id) => computedIds.has(id)));

    if (validEvidenceIds.length === 0 && !answersFromComputed) {
      rejected.push({ id: claim.id, reason: 'no-valid-evidence' });
      continue;
    }

    // Facts split by how they must be proved, because one test cannot cover
    // both. A plain fact is grounded when its value appears inside the cited
    // evidence. A DERIVATION cannot be: "62 days" is the elapsed time since the
    // cited date, not a value stored in it, so it would be pruned by the same
    // check that correctly prunes an invented amount. Derivations are therefore
    // proved by their own rule — every id they came from is cited by the claim.
    //
    // What this claim may draw on: what it cited, plus — for a computed answer —
    // every computed result of the turn. For every other claim `support` is exactly
    // the cited set it was before.
    const cited = new Set(validEvidenceIds);
    const support = answersFromComputed ? new Set([...cited, ...computedIds]) : cited;
    const groundedFacts = [];
    const derivationFacts = [];

    for (const fact of claim.facts ?? []) {
      if (!fact?.evidenceId || !support.has(fact.evidenceId)) continue;
      if (fact.derivation) {
        const derivedFrom = Array.isArray(fact.derivedFrom) && fact.derivedFrom.length > 0 ? fact.derivedFrom : [fact.evidenceId];
        if (derivedFrom.every((id) => support.has(id))) derivationFacts.push(fact);
        continue;
      }
      if (factGroundedIn(fact.value, evidenceById.get(fact.evidenceId)?.value)) groundedFacts.push(fact);
    }

    if (hasUnsafeProse(claim.text)) {
      rejected.push({ id: claim.id, reason: 'unsafe-prose' });
      continue;
    }

    // The numeric rule: every number the reader sees must resolve to something
    // this claim may draw on. Unresolved numbers reject the claim; resolved ones
    // pass, which is what makes a counting answer possible at all.
    const factValues = new Set();
    for (const fact of [...groundedFacts, ...derivationFacts]) {
      const canonical = canonicalScalar(fact.value);
      if (canonical !== null) factValues.add(canonical);
    }

    const evidenceValues = new Set();
    for (const id of support) canonicalScalars(evidenceById.get(id)?.value, evidenceValues);

    const unresolved = unresolvedNumericTokens(claim.text, { factValues, evidenceValues });
    if (unresolved.length > 0) {
      rejected.push({ id: claim.id, reason: 'unsupported-number' });
      continue;
    }

    accepted.push({ ...claim, facts: [...groundedFacts, ...derivationFacts], evidenceIds: validEvidenceIds });
  }

  return { claims: accepted, rejected };
}

// A source `capturedValue` is copied ONLY from a cited allowlisted field
// evidence item (an item carrying `fieldPaths`). Computed/aggregate items and
// any non-scalar value never yield a captured value — nothing is fabricated.
function capturedValueFor(item) {
  if (!Array.isArray(item.fieldPaths) || item.fieldPaths.length === 0) return undefined;
  const { value } = item;
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
  return undefined;
}

// Builds the server-owned sources list from accepted evidence IDs — never from
// model-authored labels/URLs.
export function buildSources(acceptedClaims, bundle) {
  const evidenceById = new Map(bundle.evidence.map((e) => [e.id, e]));
  const seen = new Set();
  const sources = [];
  for (const claim of acceptedClaims) {
    for (const id of claim.evidenceIds) {
      if (seen.has(id)) continue;
      const item = evidenceById.get(id);
      if (!item) continue;
      seen.add(id);
      const target = item.recordRef
        ? { kind: item.recordRef.kind, id: item.recordRef.id, fieldPaths: item.fieldPaths }
        : undefined;
      const capturedValue = capturedValueFor(item);
      sources.push({
        id: item.id,
        label: item.label,
        type: item.type,
        updatedAt: item.updatedAt,
        ...(target ? { target } : {}),
        ...(capturedValue !== undefined ? { capturedValue } : {}),
      });
    }
  }
  return sources;
}

// Converts deterministic insights into claims for the fallback path, so
// partial/provider-failure states render through the same claims contract.
/**
 * Deterministic insights rendered through the claim contract, for the fallback
 * path where no model call happens.
 *
 * TOTAL ON PURPOSE. This mapper used to enumerate six fields, which meant every
 * field added to an insight was silently dropped on the paths that use it — and
 * one of those paths is the degraded one the panel shows when the model is
 * unavailable. The result was a fallback with no actions and no ordering
 * explanation at exactly the moment an operator most needs to trust the panel.
 * Everything an insight carries therefore travels, and a parity test in
 * `groundingValidator.test.js` fails the build when a new field is added and
 * forgotten here.
 */
export function insightsToClaims(insights) {
  return (insights ?? []).map((insight) => ({
    id: insight.id,
    section: insight.section,
    text: insight.text,
    facts: insight.facts ?? (insight.fact ? [insight.fact] : []),
    evidenceIds: insight.evidenceIds,
    evidenceType: 'computed',
    severity: insight.severity,
    ...(insight.key ? { key: insight.key } : {}),
    ...(insight.ruleId ? { ruleId: insight.ruleId } : {}),
    ...(insight.entityRef ? { entityRef: insight.entityRef } : {}),
    ...(insight.action ? { action: insight.action } : {}),
    ...(Number.isFinite(insight.score) ? { score: insight.score } : {}),
    ...(insight.components ? { scoreComponents: insight.components } : {}),
  }));
}
