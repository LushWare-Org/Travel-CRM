import { pageEvidenceId } from '@travel-crm/contracts';

// Shared bundle fixture for the adapter tests. Not a test file itself — vitest's
// include pattern only picks up `*.test.js` — so it is safe to import from more
// than one suite.

export function makeBundle(overrides = {}) {
  return {
    context: {
      pageKey: 'test',
      scopeLabel: 'Test',
      actorRole: 'admin',
      asOf: new Date().toISOString(),
    },
    record: null,
    records: [],
    aggregates: {},
    evidence: [],
    index: {},
    aggregateIndex: {},
    deterministicInsights: [],
    recordCounts: {},
    unavailableSources: [],
    notAuthorizedSources: [],
    attemptedSources: [],
    ...overrides,
  };
}

/**
 * Add a record and the field evidence an engine would have emitted for it.
 * Mirrors collectionEngine's pass-one index so rules can resolve citations.
 */
export function addRecord(bundle, record, fields, recordKind = 'thing') {
  bundle.records.push(record);
  bundle.index[record.id] = {};
  for (const field of fields) {
    const value = record[field];
    if (value === null || value === undefined) continue;
    const id = pageEvidenceId(bundle.context.pageKey, recordKind, record.id, field);
    bundle.index[record.id][field] = id;
    bundle.evidence.push({
      id,
      type: 'record',
      label: `${recordKind} ${record.id} · ${field}`,
      value,
      recordRef: { kind: recordKind, id: record.id },
      fieldPaths: [field],
      asOf: bundle.context.asOf,
    });
  }
  return record;
}

export function addAggregate(bundle, name, value, label = name) {
  bundle.aggregates[name] = value;
  const id = pageEvidenceId(bundle.context.pageKey, 'aggregate', name, 'value');
  bundle.aggregateIndex[name] = id;
  bundle.evidence.push({ id, type: 'computed', label, value, asOf: bundle.context.asOf });
  return id;
}

export function addBaseline(bundle, name, count) {
  const id = pageEvidenceId(bundle.context.pageKey, 'source', name, 'recordCount');
  bundle.evidence.push({ id, type: 'computed', label: name, value: count, asOf: bundle.context.asOf });
  bundle.attemptedSources.push(name);
  bundle.recordCounts[name] = count;
  return id;
}

export const DAY_MS = 86_400_000;

export function daysAgo(days) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export function daysAhead(days) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}
