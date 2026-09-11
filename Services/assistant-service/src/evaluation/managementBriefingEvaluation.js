// ─── Management briefing content gate ─────────────────────────────────────
// Fixture-based evaluation for the Management copilot briefing (design §16).
// Grounding alone is NOT the bar: a briefing whose claims cite a real field
// but say nothing that follows from it is "technically grounded and
// substantively empty", and must FAIL.
//
// Canned model output is replayed through the REAL validator
// (`validateClaims`) and the adapter's REAL insight rules
// (`computeInsights` → `insightsToClaims`), so no live Gemini quota is
// required. Two gates are applied to every surviving claim:
//
//   substance — the claim's prose must name the scalar value of a field it
//               cites, or the validator must have retained a typed fact
//               grounded in that field. A claim citing only a valid ID, with
//               no retained fact and no field value in its prose, fails.
//   window    — every `changed` claim must cite a field item whose record
//               update falls at or after the active boundary (the resolved
//               `lastSeenAt`), so a change summary cannot describe an update
//               the operator already saw.

import { z } from 'zod';
import { BriefingClaimSchema } from '@travel-crm/contracts';
import { canonicalizeBriefingResponse } from '../ai/prompts/managementBriefing.v1.js';
import { insightsToClaims, validateClaims } from '../ai/groundingValidator.js';

export const ManagementBriefingCannedRowSchema = z
  .object({
    id: z.string().min(1).max(255),
    description: z.string().min(1).max(500).optional(),
    // The resolved acknowledgement boundary this briefing is rendered against.
    boundary: z.string().datetime(),
    // The lead-service payload the adapter fetches for the fixture.
    lead: z.record(z.unknown()),
    // Raw canned model output (pre-canonicalization), exactly as Gemini would
    // return it.
    claims: z.array(z.unknown()),
    // Expected `${claimId}:${reason}` failures, compared as a sorted set.
    expectedFailures: z.array(z.string().min(1).max(255)),
  })
  .strict();

function normalizeProse(value) {
  return String(value ?? '')
    .toLowerCase()
    // `-` at the end of a character class is already literal, so the escape was
    // redundant. Pre-existing: this package had no CI lint step until now.
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function boundaryMs(boundary) {
  const ms = boundary instanceof Date ? boundary.getTime() : new Date(boundary).getTime();
  return Number.isNaN(ms) ? null : ms;
}

// Citation-only field items are the ones carrying `fieldPaths`.
function fieldItemsById(bundle) {
  const map = new Map();
  for (const item of bundle.evidence ?? []) {
    if (Array.isArray(item.fieldPaths) && item.fieldPaths.length > 0) map.set(item.id, item);
  }
  return map;
}

// A claim is substantive iff, for a field item it actually cites:
//   - the validator retained a typed fact cited against that exact field
//     (`validateClaims` already pruned ungrounded facts), or
//   - its prose names that field's scalar string value.
function claimIsSubstantive(claim, citedFieldItems) {
  const prose = normalizeProse(claim.text);
  for (const item of citedFieldItems) {
    if (claim.facts.some((fact) => fact.evidenceId === item.id)) return true;
    if (typeof item.value === 'string') {
      const value = normalizeProse(item.value);
      if (value.length >= 3 && prose.includes(value)) return true;
    }
  }
  return false;
}

function claimInsideWindow(citedFieldItems, boundary) {
  const ms = boundaryMs(boundary);
  if (ms === null) return false;
  return citedFieldItems.some((item) => {
    const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : NaN;
    return !Number.isNaN(updated) && updated >= ms;
  });
}

// Judges already-accepted claims (output of `validateClaims`, or
// `insightsToClaims(adapter.computeInsights(bundle, boundary))`). Pure and
// deterministic — no model call, no clock read beyond the passed boundary.
export function judgeBriefingSubstance({ claims, bundle, boundary }) {
  const fieldById = fieldItemsById(bundle);
  const failures = [];

  for (const claim of claims) {
    const cited = claim.evidenceIds.map((id) => fieldById.get(id)).filter(Boolean);
    if (cited.length === 0) {
      failures.push({ claimId: claim.id, reason: 'no-field-citation' });
      continue;
    }
    if (!claimIsSubstantive(claim, cited)) {
      failures.push({ claimId: claim.id, reason: 'empty-claim' });
      continue;
    }
    if (claim.section === 'changed' && !claimInsideWindow(cited, boundary)) {
      failures.push({ claimId: claim.id, reason: 'changed-outside-window' });
    }
  }

  return { failures, passed: failures.length === 0 };
}

// Replays one canned row through the real validator and insight rules against
// a bundle the caller already loaded with the real adapter.
export function evaluateCannedBriefing(row, { bundle, adapter, enableGuidance = false }) {
  const boundary = new Date(row.boundary);
  const canonical = canonicalizeBriefingResponse({ claims: row.claims }, BriefingClaimSchema);
  const { claims: accepted, rejected } = validateClaims({ claims: canonical, bundle, enableGuidance });

  const modelJudge = judgeBriefingSubstance({ claims: accepted, bundle, boundary });
  const deterministicClaims = insightsToClaims(adapter.computeInsights(bundle, boundary));
  const insightJudge = judgeBriefingSubstance({ claims: deterministicClaims, bundle, boundary });

  const failures = [
    ...rejected.map((entry) => ({ claimId: entry.id, reason: entry.reason })),
    ...modelJudge.failures,
    ...insightJudge.failures,
  ];
  const failureKeys = failures.map((failure) => `${failure.claimId}:${failure.reason}`).sort();

  return {
    id: row.id,
    acceptedClaims: accepted,
    deterministicClaims,
    failures,
    failureKeys,
    passed: failures.length === 0,
  };
}

// Canned ASK fixtures. `answerInView` states whether the fetched bundle can
// answer the question at all, and `claims` is raw model output for the
// zero-tool single-shot call (the same canned replay, no live quota).
export const ManagementAskCannedRowSchema = z
  .object({
    id: z.string().min(1).max(255),
    description: z.string().min(1).max(500).optional(),
    question: z.string().min(1),
    answerInView: z.boolean(),
    claims: z.array(z.unknown()),
    expectedFailures: z.array(z.string().min(1).max(255)),
  })
  .strict();

// Replays one canned ask response through the REAL validator, exactly as
// `handleAsk` does after the loop returns. `notInView` is the explicit honest
// outcome the ask slot shows when the bundle cannot answer the question: every
// surviving claim against an out-of-bundle question is recorded as
// `${id}:restates-briefing`, so a restated list FAILS the gate instead of
// passing as an answer.
export function evaluateCannedAsk(row, { bundle, enableGuidance = false }) {
  const canonical = canonicalizeBriefingResponse({ claims: row.claims }, BriefingClaimSchema);
  const { claims: accepted, rejected } = validateClaims({ claims: canonical, bundle, enableGuidance });

  const failures = rejected.map((entry) => ({ claimId: entry.id, reason: entry.reason }));
  if (!row.answerInView) {
    for (const claim of accepted) failures.push({ claimId: claim.id, reason: 'restates-briefing' });
  }
  const failureKeys = failures.map((failure) => `${failure.claimId}:${failure.reason}`).sort();

  return {
    id: row.id,
    // What the route would place in the answer slot: accepted claims only.
    answerBlocks: accepted,
    // The outcome the route reaches: no accepted claim means there is nothing
    // to put in the answer slot. An unanswerable question whose claims still
    // grounded is NOT the honest outcome — that is the `restates-briefing`
    // failure recorded above, and `notInView` stays false for it.
    notInView: accepted.length === 0,
    failures,
    failureKeys,
    passed: failures.length === 0,
  };
}

// Rolls a set of row results into one gate verdict, mirroring
// routerEvaluation's report convention.
export function summarizeBriefingEvaluation(results) {
  const failed = results.filter((result) => !result.passed);
  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.map((result) => result.id),
    gate: failed.length === 0 ? 'pass' : 'fail',
  };
}
