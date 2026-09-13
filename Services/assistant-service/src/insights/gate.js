import { modelClaimKey, normalizeEntityRef } from './keys.js';
import { bandOf } from './score.js';

// ─── The quality gate ─────────────────────────────────────────────────────
// Ordered layers between rule output and the response. Each layer is a pure
// function and each emits a DECISION, so a dropped insight is a logged fact
// rather than a silent filter. That is what makes the gate auditable and the
// fixtures gradable.
//
//   L0 schema        structure usable                       drop invalid_shape
//   L1 evidence      at least one resolvable citation       drop uncited
//   L2 authorization cited evidence is readable by caller   drop unauthorized
//   L3 actionability carries an action (rule origin only)   demote observation
//   L4 materiality   above the declared threshold           drop below_materiality
//   L5 novelty       not acknowledged inside its window     suppress suppressed_unchanged
//   L6 dedupe        one survivor per key, strictest band   merge / conflict_resolved
//   L8 safety        prose carries no leaked identifier     drop rejected_safety
//
// NOT EVERY LAYER APPLIES TO EVERY ORIGIN. Rule-derived insights carry the
// declarations L3 and L4 need. Model-derived claims (`answerBlocks`) carry
// severity, evidence ids and facts and nothing else, so running them through the
// same parameters would demote every answer for lacking an action and compare
// against a threshold that does not exist. The gate therefore takes an `origin`
// and applies: L3/L4 to rules only, L5/L6 to both with origin-specific keys.

export const DECISIONS = Object.freeze(['accepted', 'dropped', 'demoted', 'suppressed', 'merged']);
export const REASONS = Object.freeze([
  'ok',
  'invalid_shape',
  'uncited',
  'unauthorized',
  'observation',
  'below_materiality',
  'suppressed_unchanged',
  'conflict_resolved',
  'rejected_safety',
]);

const DEFAULTS = Object.freeze({
  suppressionWindowMs: 7 * 86_400_000,
  escalateOnCritical: true,
});

// Identifier-shaped tokens that must never reach prose. Numbers are explicitly
// NOT banned: a grounded count in a sentence is the point of the numeric work.
const SAFETY_PATTERNS = [
  { id: 'record-id', pattern: /\b[A-Z]{2,}-\d[\w-]*\b/ },
  { id: 'evidence-id', pattern: /\btool:[a-zA-Z_]+:\d+\b|\bevidenceIds?\b|\bfieldPaths?\b/ },
  { id: 'raw-json', pattern: /\{[\s\S]{0,200}?"[a-zA-Z_]+"\s*:/ },
];

function hasUnsafeText(text) {
  return SAFETY_PATTERNS.some((rule) => rule.pattern.test(String(text ?? '')));
}

/**
 * @param {object} args
 * @param {Array} args.candidates        insights to gate
 * @param {'rule'|'model'} [args.origin]
 * @param {Set<string>} [args.resolvableEvidenceIds]  ids present in the final bundle
 * @param {Set<string>} [args.unauthorizedEvidenceIds] ids that came from a denied source
 * @param {Map<string, {lastSurfacedAt?: Date, acknowledgedAt?: Date, surfacedCount?: number, lastMaterialValue?: string}>} [args.priorState]
 * @param {Date} [args.now]
 * @returns {{ accepted: Array, decisions: Array }}
 */
export function gateInsights({
  candidates = [],
  origin = 'rule',
  resolvableEvidenceIds = new Set(),
  unauthorizedEvidenceIds = new Set(),
  priorState = new Map(),
  now = new Date(),
} = {}) {
  const decisions = [];
  const byKey = new Map();

  for (const candidate of candidates) {
    const key = candidate.key ?? keyFor(candidate, origin);
    const record = (decision, reason, extra = {}) => decisions.push({ key, layer: extra.layer ?? null, decision, reason, ...extra });

    // ── L0 schema ──────────────────────────────────────────────────────────
    const entityRef = normalizeEntityRef(candidate.entityRef);
    if (!key || !entityRef || typeof candidate.text !== 'string' || candidate.text.trim() === '') {
      record('dropped', 'invalid_shape', { layer: 'L0' });
      continue;
    }

    // ── L1 evidence ────────────────────────────────────────────────────────
    const evidenceIds = Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds.filter(Boolean) : [];
    const resolvable = evidenceIds.filter((id) => resolvableEvidenceIds.has(id));
    if (resolvable.length === 0) {
      record('dropped', 'uncited', { layer: 'L1' });
      continue;
    }

    // ── L2 authorization ───────────────────────────────────────────────────
    // This is an ASSERTION of an invariant, not a filter that does the work. A
    // denied source contributes no evidence at all: `collectionEngine` drops it
    // whole, so its rows never enter the candidate map and nothing can cite it.
    // The layer exists because ranking is a new way for a low-severity item to
    // reach an operator if an adapter ever regresses, and because a security
    // guarantee that is only implicit cannot be tested.
    //
    // The engine therefore passes an empty set in normal operation, and the
    // fixture that simulates a regressed adapter passes the ids it smuggled in.
    // Matching on source NAMES here would be wrong: an evidence id begins with a
    // page key, not a source name.
    const denied = resolvable.some((id) => unauthorizedEvidenceIds.has(id));
    if (denied) {
      record('dropped', 'unauthorized', { layer: 'L2', evidenceIds: resolvable });
      continue;
    }

    // ── L3 actionability (rule origin only) ────────────────────────────────
    const isObservation = origin === 'rule' && !candidate.action;
    // Observations are DEMOTED, not dropped: they are legitimate content, they
    // simply lose the top of the panel to something an operator can act on. The
    // analytical insights live here, which is why the ranking work must author
    // actions for them rather than let this layer hide them.

    // ── L4 materiality (rule origin only) ──────────────────────────────────
    if (origin === 'rule' && candidate.belowMateriality === true) {
      record('dropped', 'below_materiality', { layer: 'L4' });
      continue;
    }

    // ── L5 novelty ─────────────────────────────────────────────────────────
    const state = priorState.get(key);
    if (state && shouldSuppress(candidate, state, now)) {
      record('suppressed', 'suppressed_unchanged', { layer: 'L5' });
      continue;
    }

    // ── L8 safety ──────────────────────────────────────────────────────────
    if (hasUnsafeText(candidate.text)) {
      record('dropped', 'rejected_safety', { layer: 'L8' });
      continue;
    }

    // ── L6 dedupe and conflict ─────────────────────────────────────────────
    const existing = byKey.get(key);
    if (existing) {
      const merged = mergeConflict(existing, candidate);
      byKey.set(key, merged);
      record('merged', merged.severity === existing.severity ? 'ok' : 'conflict_resolved', {
        layer: 'L6',
        severity: merged.severity,
        previousSeverity: existing.severity,
      });
      continue;
    }

    byKey.set(key, { ...candidate, key, entityRef, evidenceIds: resolvable, origin, observation: isObservation });
    record('accepted', isObservation ? 'observation' : 'ok', { layer: null });
  }

  return { accepted: [...byKey.values()], decisions };
}

/** Identity per origin: rules key on their stable key, model claims on their prose plus evidence. */
function keyFor(candidate, origin) {
  if (origin === 'model') return modelClaimKey({ text: candidate.text, evidenceIds: candidate.evidenceIds });
  return candidate.key ?? null;
}

/**
 * Suppression. Acknowledged and materially unchanged stays quiet; a critical
 * re-surfaces unless the rule opts out, because a silence that hides a critical
 * is worse than a repeat.
 */
export function shouldSuppress(candidate, state, now = new Date()) {
  const escalated = candidate.severity === 'critical' && (candidate.escalationAllowed ?? DEFAULTS.escalateOnCritical);
  if (escalated) return false;

  const windowMs = Number.isFinite(candidate.suppressionWindowMs) ? candidate.suppressionWindowMs : DEFAULTS.suppressionWindowMs;
  const acknowledgedAt = state.acknowledgedAt ?? state.lastSurfacedAt;
  if (!acknowledgedAt) return false;

  const acknowledged = acknowledgedAt instanceof Date ? acknowledgedAt : new Date(acknowledgedAt);
  if (Number.isNaN(acknowledged.getTime())) return false;
  if (now.getTime() - acknowledged.getTime() >= windowMs) return false;

  // "Changed since you acknowledged it" beats the window: an insight whose own
  // material value moved is news again.
  if (state.lastMaterialValue !== undefined && candidate.materialValue !== undefined) {
    return String(state.lastMaterialValue) === String(candidate.materialValue);
  }
  return true;
}

/** Same key from two rules: the stricter severity wins and both citations survive. */
function mergeConflict(existing, incoming) {
  const stricter = bandOf(incoming.severity) < bandOf(existing.severity) ? incoming : existing;
  return {
    ...existing,
    ...stricter,
    severity: stricter.severity,
    evidenceIds: [...new Set([...(existing.evidenceIds ?? []), ...(incoming.evidenceIds ?? [])])],
    mergedFrom: [...(existing.mergedFrom ?? []), incoming.text].filter(Boolean).slice(0, 3),
  };
}

/** Counts per layer and reason, for the metrics the design requires. */
export function summarizeDecisions(decisions) {
  const byReason = new Map();
  const byLayer = new Map();
  for (const entry of decisions) {
    byReason.set(entry.reason, (byReason.get(entry.reason) || 0) + 1);
    if (entry.layer) byLayer.set(entry.layer, (byLayer.get(entry.layer) || 0) + 1);
  }
  return {
    total: decisions.length,
    byReason: [...byReason.entries()].sort((a, b) => b[1] - a[1]),
    byLayer: [...byLayer.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}
