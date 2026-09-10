// ─── Shared rule vocabulary ───────────────────────────────────────────────
// The predicates every page descriptor declares rules from. A rule is a
// DECLARATION, not code:
//
//   { rule: 'overdueBy', field: 'dueDate', statusField: 'status',
//     statuses: ['sent', 'partial', 'overdue'], severity: 'critical',
//     text: 'Invoice is past its due date.' }
//
// A descriptor with needs the vocabulary cannot express contributes a function
// instead (`{ run: (bundle, since) => insight[] }`) — same engine, same evidence
// contract, same validation. That escape hatch is deliberate: it keeps the
// vocabulary honest instead of growing a predicate for every page.
//
// Every insight this module returns cites evidence IDs that already exist in
// the bundle. A rule that cannot cite anything returns nothing rather than an
// uncited claim — an unsourced sentence is the one thing the whole design
// forbids, so the omission is enforced here rather than downstream.
//
// Roles:
//   'record'     — evaluated once per record; the engine iterates
//   'collection' — evaluated once over the whole record list
//
// Adding a predicate? Add it here, give it a role, and cover all three cases in
// __tests__/rules.test.js: fires, boundary, and no-evidence (returns nothing).

const DAY_MS = 86_400_000;

// ─── Shared helpers ───────────────────────────────────────────────────────

function toMs(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** The evidence ID for one field of one record, or null when the engine did not
 *  emit one (an unallowlisted field, or a record no rule flagged). */
export function fieldEvidenceId(bundle, recordId, field) {
  return bundle.index?.[recordId]?.[field] ?? null;
}

/** The evidence ID for a named aggregate, or null when the descriptor did not
 *  declare it. */
export function aggregateEvidenceId(bundle, name) {
  return bundle.aggregateIndex?.[name] ?? null;
}

/** Build an insight, dropping it entirely when it cannot cite anything. */
function makeInsight(bundle, { id, section, severity, text, fact, evidenceIds }) {
  const cited = (evidenceIds ?? []).filter(Boolean);
  if (cited.length === 0) return null;
  const insight = { id, section, severity, text, evidenceIds: cited };
  // A fact must cite evidence that is both present and already cited by the
  // claim it belongs to, or the client cannot resolve it.
  if (fact && fact.evidenceId && cited.includes(fact.evidenceId)) insight.fact = fact;
  return insight;
}

/** `since` is a Date resolved by the controller. Rules that reason about
 *  "changed" must use it rather than `Date.now()`, so a `changed` insight means
 *  "changed since the operator last acknowledged this scope". */
// ─── Predicates ───────────────────────────────────────────────────────────

const staleForDays = {
  role: 'record',
  run(bundle, decl, record, now) {
    const at = toMs(record[decl.field]);
    if (at === null) return [];
    const days = Math.floor((now - at) / DAY_MS);
    if (days < decl.days) return [];
    const evidenceId = fieldEvidenceId(bundle, record.id, decl.field);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'info',
        text: decl.text ?? `Record has not been updated in ${days} days.`,
        fact: evidenceId ? { kind: 'date', value: new Date(at).toISOString(), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const expiringWithin = {
  role: 'record',
  run(bundle, decl, record, now) {
    const at = toMs(record[decl.field]);
    if (at === null) return [];
    const msUntil = at - now;
    // Already past is `overdueBy`'s job, not this one's.
    if (msUntil < 0 || msUntil > decl.days * DAY_MS) return [];
    const evidenceId = fieldEvidenceId(bundle, record.id, decl.field);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'warning',
        text: decl.text ?? `Expires within ${decl.days} days.`,
        fact: evidenceId ? { kind: 'date', value: new Date(at).toISOString(), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const overdueBy = {
  role: 'record',
  run(bundle, decl, record, now) {
    const at = toMs(record[decl.field]);
    if (at === null || at >= now) return [];
    // Status gate: the point of this predicate is "past due AND still open".
    // Without the gate it also fires on records that were settled afterwards.
    if (decl.statuses && !decl.statuses.includes(record[decl.statusField])) return [];
    const days = Math.floor((now - at) / DAY_MS);
    const evidenceId = fieldEvidenceId(bundle, record.id, decl.field);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? (days >= (decl.criticalAfterDays ?? 60) ? 'critical' : 'warning'),
        text: decl.text ?? `Past ${decl.field} by ${days} day(s).`,
        fact: evidenceId ? { kind: 'date', value: new Date(at).toISOString(), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const stuckInStatus = {
  role: 'record',
  // NOTE: there is no status-transition timestamp anywhere in these services.
  // This uses `updatedAt` as a proxy, so ANY edit resets the clock. The default
  // text says "unedited" rather than "stuck" so the insight cannot overclaim.
  run(bundle, decl, record, now) {
    if (decl.statuses && !decl.statuses.includes(record[decl.statusField])) return [];
    const field = decl.dateField ?? 'updatedAt';
    const at = toMs(record[field]);
    if (at === null) return [];
    const days = Math.floor((now - at) / DAY_MS);
    if (days < decl.days) return [];
    const evidenceId = fieldEvidenceId(bundle, record.id, field);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'warning',
        text: decl.text ?? `Unedited for ${days} day(s) while in ${record[decl.statusField]}.`,
        fact: evidenceId ? { kind: 'date', value: new Date(at).toISOString(), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const unassigned = {
  role: 'record',
  run(bundle, decl, record) {
    if (!isBlank(record[decl.field])) return [];
    // A blank field usually has no evidence item (the engine skips nulls), so
    // cite the record identifier instead — the claim is about the absence.
    const evidenceId =
      fieldEvidenceId(bundle, record.id, decl.field) ?? fieldEvidenceId(bundle, record.id, 'id');
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'warning',
        text: decl.text ?? `${decl.field} is not set.`,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const missingField = {
  role: 'record',
  run(bundle, decl, record) {
    if (!isBlank(record[decl.field])) return [];
    const evidenceId = fieldEvidenceId(bundle, record.id, 'id');
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'info',
        text: decl.text ?? `${decl.field} is missing.`,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const ratioBelow = {
  role: 'record',
  run(bundle, decl, record) {
    const numerator = record[decl.numeratorField];
    const denominator = record[decl.denominatorField];
    if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator) || denominator <= 0) return [];
    const ratio = numerator / denominator;
    if (ratio >= decl.threshold) return [];
    const evidenceId =
      fieldEvidenceId(bundle, record.id, decl.numeratorField) ??
      fieldEvidenceId(bundle, record.id, decl.denominatorField);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'info',
        text: decl.text ?? `${decl.numeratorField} is ${Math.round(ratio * 100)}% of ${decl.denominatorField}.`,
        fact: evidenceId ? { kind: 'percentage', value: String(Math.round(ratio * 100)), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const thresholdExceeded = {
  role: 'record',
  run(bundle, decl, record) {
    const value = record[decl.field];
    if (!isFiniteNumber(value) || value <= decl.threshold) return [];
    const evidenceId = fieldEvidenceId(bundle, record.id, decl.field);
    return [
      makeInsight(bundle, {
        id: `${decl.id ?? `${decl.rule}:${record.id}`}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'warning',
        text: decl.text ?? `${decl.field} is above ${decl.threshold}.`,
        fact: evidenceId
          ? { kind: decl.factKind ?? 'count', value: String(value), evidenceId }
          : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

const zeroOrLowCount = {
  role: 'collection',
  run(bundle, decl) {
    // Cites a named aggregate rather than a record: the claim is about the
    // collection, so there is no single record to point at.
    const aggregate = bundle.aggregates?.[decl.aggregate];
    if (!isFiniteNumber(aggregate) || aggregate > decl.threshold) return [];
    const evidenceId = aggregateEvidenceId(bundle, decl.aggregate);
    return [
      makeInsight(bundle, {
        id: decl.id ?? `${decl.rule}:${decl.aggregate}`,
        section: decl.section ?? 'attention',
        severity: decl.severity ?? 'info',
        text: decl.text ?? `${decl.aggregate} is at or below ${decl.threshold}.`,
        fact: evidenceId ? { kind: 'count', value: String(aggregate), evidenceId } : undefined,
        evidenceIds: [evidenceId],
      }),
    ].filter(Boolean);
  },
};

// ─── Relational predicates ────────────────────────────────────────────────
// The two below exist because the Assignment (see the design doc) found that
// every claim the original nine predicates could not express was relational:
// they all needed to relate records to each other rather than judge one record
// alone. "One customer has three overdue invoices" and "two customers are most
// of what we owe" were both unwritable without them.

const groupedCount = {
  role: 'collection',
  run(bundle, decl) {
    const groups = new Map();
    for (const record of bundle.records ?? []) {
      const key = record[decl.byKey];
      if (isBlank(key)) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const insights = [];
    for (const [key, members] of groups) {
      if (members.length < decl.threshold) continue;
      // Evidence has to come from the flagged members. The engine emitted field
      // evidence for them because this rule declared them.
      const evidenceId = fieldEvidenceId(bundle, members[0].id, decl.byKey);
      insights.push(
        makeInsight(bundle, {
          id: `${decl.rule}:${key}`,
          section: decl.section ?? 'attention',
          severity: decl.severity ?? 'warning',
          text: (decl.text ?? 'One {byKey} accounts for {count} matching records.')
            .replace('{byKey}', String(key))
            .replace('{count}', String(members.length)),
          evidenceIds: [evidenceId],
        }),
      );
    }
    return insights.filter(Boolean);
  },
};

const groupedShare = {
  role: 'collection',
  run(bundle, decl) {
    const records = bundle.records ?? [];
    const totals = new Map();
    let grand = 0;
    for (const record of records) {
      const value = record[decl.sumField];
      if (!isFiniteNumber(value) || value <= 0) continue;
      const key = record[decl.byKey];
      if (isBlank(key)) continue;
      totals.set(key, (totals.get(key) ?? 0) + value);
      grand += value;
    }
    if (grand <= 0) return [];
    const insights = [];
    for (const [key, total] of totals) {
      const pct = (total / grand) * 100;
      if (pct < decl.threshold) continue;
      const representative = records.find((r) => r[decl.byKey] === key);
      const evidenceId = fieldEvidenceId(bundle, representative?.id, decl.byKey);
      insights.push(
        makeInsight(bundle, {
          id: `${decl.rule}:${key}`,
          section: decl.section ?? 'changed',
          severity: decl.severity ?? 'info',
          text: (decl.text ?? '{byKey} accounts for {pct}% of the value in this view.')
            .replace('{byKey}', String(key))
            .replace('{pct}', String(Math.round(pct))),
          evidenceIds: [evidenceId],
        }),
      );
    }
    return insights;
  },
};

export const RULES = {
  staleForDays,
  expiringWithin,
  overdueBy,
  stuckInStatus,
  unassigned,
  missingField,
  ratioBelow,
  thresholdExceeded,
  zeroOrLowCount,
  groupedCount,
  groupedShare,
};

export const RULE_NAMES = Object.keys(RULES);

/** Names of the predicates that evaluate the collection as a whole. The engine
 *  uses this to decide whether a rule runs per record or once. */
export const COLLECTION_RULES = new Set(
  Object.entries(RULES)
    .filter(([, def]) => def.role === 'collection')
    .map(([name]) => name),
);

export { DAY_MS, toMs, isBlank };
