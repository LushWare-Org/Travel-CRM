import crypto from 'node:crypto';

// ─── Insight identity ─────────────────────────────────────────────────────
// Two jobs, both prerequisites for ranking and suppression:
//
//   1. A STABLE key. Today ids come from `prefix(declarationIndex)` in
//      `collectionEngine.js`, so reordering a descriptor array renames every
//      insight and any stored acknowledgement points at nothing. A key built
//      from what the insight is ABOUT survives authoring changes.
//   2. What each insight is about (`entityRef`), which dedupe, suppression and
//      the future action path all need. Not every insight is about a record:
//      the grouping rules are about a group, and the aggregate-only rules are
//      about a whole collection, and both say so in their own comments.

export const ENTITY_KINDS = Object.freeze(['record', 'group', 'collection']);

/**
 * Validate and normalise an entity reference. Returns `null` rather than throwing
 * so the gate can record an `invalid_shape` decision instead of a 500: a
 * malformed ref is data to reject, not an exception to propagate.
 */
export function normalizeEntityRef(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { kind, id } = raw;
  if (!ENTITY_KINDS.includes(kind)) return null;
  if (typeof id !== 'string' || id.trim() === '' || id.length > 512) return null;
  return { kind, id };
}

/** A record-scope insight: the one lead, invoice, booking this is about. */
export function recordEntityRef(id) {
  return normalizeEntityRef({ kind: 'record', id: String(id ?? '') });
}

const isBlankPart = (part) => part === null || part === undefined || String(part).trim() === '';

/**
 * A grouping insight, e.g. "12 leads want Bali".
 *
 * Every part is required: a blank group key would produce `leads:destination:`,
 * which is a valid-LOOKING id for a group that does not exist. The adversarial
 * corpus has a lead with a blank destination precisely because that case must be
 * excluded from grouping rather than counted as its own bucket.
 */
export function groupEntityRef({ source, groupBy, key } = {}) {
  if ([source, groupBy, key].some(isBlankPart)) return null;
  return normalizeEntityRef({ kind: 'group', id: `${source}:${groupBy}:${key}` });
}

/** An aggregate insight with no single record behind it, e.g. "no invoices are past due". */
export function collectionEntityRef({ pageKey, source } = {}) {
  if ([pageKey, source].some(isBlankPart)) return null;
  return normalizeEntityRef({ kind: 'collection', id: `${pageKey}:${source}` });
}

/**
 * The stable key. `ruleId` is the UN-prefixed rule id (`unassigned`, not
 * `3:unassigned`), and `entityRef` decides identity within that rule, so the key
 * changes when the thing changes and never when the array is reordered.
 *
 * Returns null when either half is unusable, which the gate turns into a drop.
 */
export function stableKey({ ruleId, entityRef }) {
  if (typeof ruleId !== 'string' || ruleId.trim() === '') return null;
  const ref = normalizeEntityRef(entityRef);
  if (!ref) return null;
  return `${ruleId.trim()}:${ref.kind}:${ref.id}`;
}

/**
 * Suppression key for a MODEL-authored claim, which has no rule and no entity to
 * key on. Derived from the normalised prose plus the evidence it cites, so the
 * same claim about the same evidence is recognised as the same claim while a
 * changed answer is not.
 */
export function modelClaimKey({ text, evidenceIds = [] }) {
  const normalised = String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const cited = [...new Set((evidenceIds ?? []).map(String))].sort().join(',');
  if (normalised === '' && cited === '') return null;
  return `model:${crypto.createHash('sha256').update(`${normalised}|${cited}`).digest('hex').slice(0, 24)}`;
}

/**
 * Split a legacy `<declarationIndex>:<ruleId>` id into its parts. Used once, by
 * the pipeline swap, so the old shape can still be read while the engine moves
 * to stable keys.
 */
export function parseLegacyInsightId(id) {
  const match = /^(\d+):(.+)$/.exec(String(id ?? ''));
  if (!match) return null;
  return { declarationIndex: Number(match[1]), ruleId: match[2] };
}
