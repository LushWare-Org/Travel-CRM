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
  /\b[A-Z]{2,}-\d[\w-]*\b/, // record ids (LEAD-8F21…)
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
const NUMBER_TOKEN = /\d[\d,]*(?:\.\d+)?/g;

/**
 * The numbers a reader sees in a sentence, canonicalised.
 *
 * ISO dates are extracted FIRST and as whole tokens, so "2026-09-12" resolves
 * against a date value instead of splitting into "2026", "09" and "12" and
 * failing. Thousands separators are stripped, so "₹1,500" yields "1500" and
 * resolves against a canonical 1500.
 */
export function proseNumericTokens(text) {
  const source = String(text ?? '');
  const tokens = [];
  const withoutDates = source.replace(ISO_DATE, (match) => {
    tokens.push(match);
    return ' '.repeat(match.length);
  });
  for (const match of withoutDates.match(NUMBER_TOKEN) ?? []) tokens.push(match.replace(/,/g, ''));
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
