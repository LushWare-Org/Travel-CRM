// ─── Grounding validator ──────────────────────────────────────────────────
// Deterministic post-generation validation. No model judgment anywhere.
// Rejects or prunes claims so that zero unsupported IDs/dates/amounts/
// percentages/counts/durations survive into the rendered result.

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

// Conservative residual-value-token check: prose must not embed a value that
// should have been emitted as a typed fact. Detects numeric tokens, currency
// amounts, ISO-ish dates, and ID-shaped tokens (PREFIX-1234). Over-rejects
// legitimate numeric prose by design — under-generation is safer than an
// unsupported value surviving (the success criterion is zero unsupported
// values, not maximal claim count).
const RESIDUAL_VALUE_PATTERNS = [
  /\b\d[\d,.]*(\.\d+)?\b/, // plain numbers / decimals
  /[₹$€£]\s?\d/, // currency amounts
  /\b\d{4}-\d{2}-\d{2}\b/, // ISO dates
  /\b[A-Z]{2,}-\d[\w-]*\b/, // ID-shaped tokens (LEAD-8F21…)
];

function hasResidualValueToken(text) {
  return RESIDUAL_VALUE_PATTERNS.some((re) => re.test(text ?? ''));
}

// Validates and prunes model claims against the current evidence bundle.
// Returns { claims, rejected } where rejected is [{ id, reason }].
export function validateClaims({ claims, bundle, enableGuidance }) {
  const guidance = enableGuidance ?? guidanceEnabled();
  const evidenceById = new Map(bundle.evidence.map((e) => [e.id, e]));
  const accepted = [];
  const rejected = [];

  for (const claim of claims) {
    if (claim.evidenceType === 'guidance' && !guidance) {
      rejected.push({ id: claim.id, reason: 'guidance-disabled' });
      continue;
    }

    const validEvidenceIds = claim.evidenceIds.filter((id) => evidenceById.has(id));
    if (validEvidenceIds.length === 0) {
      rejected.push({ id: claim.id, reason: 'no-valid-evidence' });
      continue;
    }

    // Drop facts whose cited evidence is unknown or whose value is not grounded.
    const groundedFacts = claim.facts.filter(
      (fact) => evidenceById.has(fact.evidenceId) && factGroundedIn(fact.value, evidenceById.get(fact.evidenceId).value),
    );

    if (hasResidualValueToken(claim.text)) {
      rejected.push({ id: claim.id, reason: 'residual-value-token' });
      continue;
    }

    accepted.push({ ...claim, facts: groundedFacts, evidenceIds: validEvidenceIds });
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
export function insightsToClaims(insights) {
  return insights.map((insight) => ({
    id: insight.id,
    section: insight.section,
    text: insight.text,
    facts: insight.fact ? [insight.fact] : [],
    evidenceIds: insight.evidenceIds,
    evidenceType: 'computed',
    severity: insight.severity,
  }));
}
