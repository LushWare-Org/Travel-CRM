// ─── Collection engine ────────────────────────────────────────────────────
// Turns a page descriptor (plain data) into an adapter implementing the frozen
// interface the controller calls: parseScope / loadEvidence / computeInsights /
// defaultQuestions.
//
// Why an engine rather than one adapter per page: nine of the ten pages do the
// same mechanical work — fetch bounded sources concurrently under a deadline,
// classify failures, project allowlisted fields into evidence, compute named
// aggregates, run rules, cite everything. Only the descriptor differs. The
// escape hatch for a page whose rules outgrow the vocabulary is a rule
// FUNCTION, not a forked adapter, so the evidence contract cannot drift.
//
// ── Two-pass evidence ──
// Rules cite evidence by ID, but which records a rule flags is only known after
// the rules run. So: pass one builds an index of every candidate evidence ID
// (and the item behind each), the rules run against that index, pass two keeps
// only the evidence actually cited — plus the protected per-source baselines —
// bounded by maxEvidence. The effect is "evidence only for records a rule
// flagged", without rules needing to know about bundling.
//
// ── Failure classification ──
//   403/404            → notAuthorizedSources   (a permission boundary)
//   5xx / network /    → unavailableSources     (a fault)
//     timeout
//   over a cap, or a   → unavailableSources     (a truncated count is a wrong
//     truncation probe                              count, so the source is
//                                                    dropped rather than sliced)
// `notAuthorizedSources` must be populated by propagating the domain service's
// own answer. Never pre-check ownership here: the ownership model has carve-outs
// (lead-service lets any salesRep open an unclaimed PENDING_VERIFICATION lead),
// and an adapter that guesses would deny exactly the queue the copilot targets.

import { pageEvidenceId } from '@travel-crm/contracts';
import AppError from '../utils/appError.js';
import { BAD_REQUEST } from '../constants/httpStatus.js';
import { domainAuthHeader } from '../utils/cloudRunAuth.js';
import { RULES, COLLECTION_RULES, DAY_MS, toMs, isBlank } from './rules.js';

// Per-source budgets differ by phase. The deterministic phase exists to be
// instant, so it gets a short leash and renders whatever arrived; the briefing
// phase is not latency-critical and can wait longer for completeness.
// Read at CALL time, not at import time. Module-load constants are frozen for
// the life of the process, which makes a cap impossible to exercise in a test
// and silently wrong if a test sets one before importing.
function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

// Per-source budgets differ by phase. The deterministic phase exists to be
// instant, so it gets a short leash and renders whatever arrived; the briefing
// phase is not latency-critical and can wait longer for completeness.
function timeoutFor(mode) {
  return mode === 'deterministic'
    ? num('MANAGEMENT_DETERMINISTIC_SOURCE_TIMEOUT_MS', 900)
    : num('MANAGEMENT_BRIEFING_SOURCE_TIMEOUT_MS', 2_500);
}

// Must not exceed the briefing prompt's own cap: serializeEvidence slices to 200
// (ai/prompts/managementBriefing.v1.js). Items past that slice are valid
// citation targets the model never sees, so a higher bundle cap silently
// desynchronizes the two budgets.
export function engineLimits() {
  return {
    deterministicTimeoutMs: num('MANAGEMENT_DETERMINISTIC_SOURCE_TIMEOUT_MS', 900),
    briefingTimeoutMs: num('MANAGEMENT_BRIEFING_SOURCE_TIMEOUT_MS', 2_500),
    maxFetchRows: num('MANAGEMENT_MAX_FETCH_ROWS', 1_000),
    maxFetchBytes: num('MANAGEMENT_MAX_FETCH_BYTES', 1_000_000),
    maxEvidence: num('MANAGEMENT_MAX_EVIDENCE', 200),
  };
}

/** Resolve a dotted path (`data.items`) against a parsed JSON body. */
function readPath(body, path) {
  if (!path) return body;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), body);
}

async function fetchSource(source, ctx, mode, bundle) {
  const base = process.env[source.envKey];
  if (!base) {
    // A missing environment URL is a deployment fault, not a denial. Reported
    // as unavailable so the page still renders everything else.
    bundle.attemptedSources.push(source.name);
    bundle.unavailableSources.push(source.name);
    return [];
  }

  const url = new URL(source.path, base).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutFor(mode));

  try {
    const auth = await domainAuthHeader(base);
    const res = await fetch(url, {
      headers: { ...ctx.headers, accept: 'application/json', ...auth },
      signal: controller.signal,
    });

    if (res.status === 403 || res.status === 404) {
      bundle.attemptedSources.push(source.name);
      bundle.notAuthorizedSources.push(source.name);
      return [];
    }
    if (!res.ok) {
      bundle.attemptedSources.push(source.name);
      bundle.unavailableSources.push(source.name);
      return [];
    }

    const raw = await res.text();
    if (raw.length > engineLimits().maxFetchBytes) {
      // Over the byte cap: the response is not usable as a complete view, and a
      // count taken from it would be a wrong count.
      bundle.attemptedSources.push(source.name);
      bundle.unavailableSources.push(source.name);
      return [];
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      bundle.attemptedSources.push(source.name);
      bundle.unavailableSources.push(source.name);
      return [];
    }

    const extracted = readPath(body, source.listPath);
    const shape = source.shape ?? 'collection';
    let rows;
    if (shape === 'singleton') {
      // Stats and settings endpoints return one object rather than an array.
      // A missing singleton is a successful empty source, not an outage.
      if (extracted === null || extracted === undefined) rows = [];
      else if (typeof extracted === 'object' && !Array.isArray(extracted)) rows = [extracted];
      else {
        bundle.attemptedSources.push(source.name);
        bundle.unavailableSources.push(source.name);
        return [];
      }
    } else if (Array.isArray(extracted)) {
      rows = extracted;
    } else {
      bundle.attemptedSources.push(source.name);
      bundle.unavailableSources.push(source.name);
      return [];
    }

    if (rows.length > engineLimits().maxFetchRows) {
      bundle.attemptedSources.push(source.name);
      bundle.unavailableSources.push(source.name);
      return [];
    }

    // Truncation applies to collection endpoints only. A singleton is already
    // complete by construction.
    if (shape === 'collection' && source.paging) {
      const total = readPath(body, source.paging.totalPath);
      if (typeof total === 'number' && Number.isFinite(total)) {
        if (total > rows.length) {
          bundle.attemptedSources.push(source.name);
          bundle.unavailableSources.push(source.name);
          return [];
        }
      } else if (rows.length >= (source.paging.defaultLimit ?? rows.length)) {
        bundle.attemptedSources.push(source.name);
        bundle.unavailableSources.push(source.name);
        return [];
      }
    }

    bundle.attemptedSources.push(source.name);
    bundle.recordCounts[source.name] = rows.length;

    const projected = rows.map((row) => {
      // A source transform is the explicit seam for nested analytics/settings
      // envelopes. It returns a flat record; fields still go through the source
      // allowlist below, so a transform cannot widen what reaches the model.
      const normalized = source.transform ? source.transform(row, body, ctx) : row;
      const out = {};
      for (const field of source.fields) out[field] = normalized?.[field];
      return out;
    });
    for (const record of projected) record.__source = source.name;
    return projected;
  } catch {
    // Abort (timeout) and network errors land here, both of which are faults.
    bundle.attemptedSources.push(source.name);
    bundle.unavailableSources.push(source.name);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Evaluate a descriptor's declared aggregates over the fetched records. */
function computeAggregates(descriptor, records) {
  const out = {};
  for (const aggregate of descriptor.aggregates ?? []) {
    const matching = records.filter((record) => {
      if (!aggregate.field) return true;
      if (aggregate.cmp === 'ltNow') {
        const at = toMs(record[aggregate.field]);
        return at !== null && at < Date.now();
      }
      if (aggregate.cmp === 'eq') return record[aggregate.field] === aggregate.value;
      return true;
    });
    if (aggregate.op === 'count') out[aggregate.name] = records.length;
    else if (aggregate.op === 'countWhere') out[aggregate.name] = matching.length;
    else if (aggregate.op === 'sumWhere') {
      out[aggregate.name] = matching.reduce(
        (sum, record) => (typeof record[aggregate.sumField] === 'number' ? sum + record[aggregate.sumField] : sum),
        0,
      );
    }
  }
  return out;
}

export function createPageAdapter(descriptor) {
  const {
    key,
    scopeSchema,
    scopeLabel,
    sources = [],
    rules = [],
    aggregates = [],
    questionTemplates = [],
  } = descriptor;

  if (!key) throw new Error('A page descriptor needs a key');
  if (!scopeSchema) throw new Error(`Descriptor '${key}' needs a scopeSchema`);

  return {
    key,

    // The descriptor itself, for debugging and for tests that need to assert
    // properties of the DECLARATION (which sources declare paging, which
    // predicates gate on which field). Read-only by convention; the engine never
    // mutates it.
    descriptor,

    parseScope(input) {
      const result = scopeSchema.safeParse(input ?? {});
      if (!result.success) {
        throw new AppError(
          `Invalid ${key} scope: ${result.error.issues.map((i) => i.message).join('; ')}`,
          BAD_REQUEST,
        );
      }
      return result.data;
    },

    async loadEvidence(ctx, scope, options = {}) {
      const mode = options.mode;
      const asOf = new Date().toISOString();
      const bundle = {
        context: { pageKey: key, scopeLabel: scopeLabel(scope, ctx), actorRole: ctx.user.role, asOf },
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
        // Kept so computeInsights can re-run the rules against the same scope
        // with the resolved `since` boundary rather than a second guess at it.
        scope,
      };

      // `when(ctx)` is the single conditional-source mechanism: analytics uses
      // it for the active tab, role-scoped sources use it so an admin-only
      // endpoint is never declared for a salesRep (which would otherwise render
      // a permanently denied marker on the busiest page).
      const eligible = sources.filter((source) => (source.when ? source.when(ctx, scope) : true));

      // Concurrency is the point: sequential fetching means one slow service
      // costs the sum of all of them, and the deterministic phase's ~1s target
      // becomes unreachable. allSettled is also what makes a per-source budget
      // degrade to a named partial state instead of failing the page.
      const settled = await Promise.allSettled(
        eligible.map((source) => fetchSource(source, ctx, mode, bundle)),
      );
      for (const result of settled) {
        if (result.status === 'fulfilled') bundle.records.push(...result.value);
      }

      // Pass one: index every candidate evidence ID. Nothing is added to
      // `bundle.evidence` yet — the rules cite from the index, and pass two
      // keeps only what they cited.
      const candidateById = new Map();
      for (const source of eligible) {
        const sourceRecords = bundle.records.filter((record) => record.__source === source.name);
        for (const record of sourceRecords) {
          const recordId = String(record[source.idField ?? 'id']);
          bundle.index[recordId] = {};
          for (const field of source.fields) {
            const value = record[field];
            if (isBlank(value)) continue;
            const id = pageEvidenceId(key, source.recordKind, recordId, field);
            bundle.index[recordId][field] = id;
            candidateById.set(id, {
              id,
              type: 'record',
              label: `${source.recordKind} ${recordId} · ${field}`,
              value,
              recordRef: { kind: source.recordKind, id: recordId },
              fieldPaths: [field],
              asOf,
            });
          }
        }
      }

      // Aggregates are declared, so their evidence is protected in pass two:
      // they are what a collection-level claim cites when there is no single
      // record behind it.
      const succeeded = eligible.filter(
        (source) =>
          bundle.attemptedSources.includes(source.name) &&
          !bundle.unavailableSources.includes(source.name) &&
          !bundle.notAuthorizedSources.includes(source.name),
      );

      // An aggregate over no data is UNKNOWN, not zero. If every source failed,
      // emitting `0` would be a fabricated fact — and worse, it would put an
      // item in `evidence`, which is what `isNoAccess` tests for, so a fully
      // denied page would render as merely empty instead of forbidden.
      bundle.aggregates = succeeded.length > 0 ? computeAggregates(descriptor, bundle.records) : {};
      for (const aggregate of succeeded.length > 0 ? aggregates : []) {
        const id = pageEvidenceId(key, 'aggregate', aggregate.name, 'value');
        bundle.aggregateIndex[aggregate.name] = id;
        candidateById.set(id, {
          id,
          type: 'computed',
          label: aggregate.label ?? aggregate.name,
          value: bundle.aggregates[aggregate.name],
          asOf,
        });
      }

      // One baseline per successfully-attempted source. Without these a quiet
      // page yields an empty evidence array, which `isNoAccess` then misreads as
      // a denial — an empty collection must render as empty, never as forbidden.
      const baselines = [];
      for (const source of eligible) {
        if (!bundle.attemptedSources.includes(source.name)) continue;
        if (bundle.unavailableSources.includes(source.name)) continue;
        if (bundle.notAuthorizedSources.includes(source.name)) continue;
        const id = pageEvidenceId(key, 'source', source.name, 'recordCount');
        baselines.push(id);
        candidateById.set(id, {
          id,
          type: 'computed',
          label: source.label ?? source.name,
          value: bundle.recordCounts[source.name] ?? 0,
          // Tagged structurally rather than by ID shape: the deterministic
          // handler ships these alongside the cited sources so the client can
          // report how much was examined. `fieldPaths` is what makes
          // `buildSources` carry the scalar through as `capturedValue`.
          recordRef: { kind: 'source', id: source.name },
          fieldPaths: ['recordCount'],
          asOf,
        });
      }

      const now = Date.now();
      bundle.deterministicInsights = runRules(rules, bundle, scope, now, undefined);

      // Pass two: keep cited evidence, with the budget precedence the design
      // specifies — baselines and aggregates are protected, record-field
      // evidence truncates first, and any insight left citing dropped evidence
      // is pruned rather than shipped unsourced.
      const protectedIds = new Set([...baselines, ...Object.values(bundle.aggregateIndex)]);
      const cited = new Set();
      for (const insight of bundle.deterministicInsights) {
        for (const id of insight.evidenceIds) cited.add(id);
      }

      const kept = new Set(protectedIds);
      for (const id of cited) {
        if (kept.size >= engineLimits().maxEvidence) break;
        kept.add(id);
      }

      bundle.evidence = [...kept].map((id) => candidateById.get(id)).filter(Boolean);

      bundle.deterministicInsights = bundle.deterministicInsights.filter((insight) =>
        insight.evidenceIds.every((id) => kept.has(id)),
      );

      return bundle;
    },

    computeInsights(bundle, since) {
      // Re-runs against the FINAL bundle so the boundary is the resolved one and
      // every citation is present. `since` is a Date, so a `changed` insight
      // means "changed since the operator last acknowledged this scope" rather
      // than "changed recently".
      const insights = runRules(rules, bundle, bundle.scope ?? {}, Date.now(), since);
      const present = new Set(bundle.evidence.map((item) => item.id));
      return insights.filter((insight) => insight.evidenceIds.every((id) => present.has(id)));
    },

    defaultQuestions(bundle) {
      const questions = [];
      for (const template of questionTemplates) {
        const value = typeof template === 'function' ? template(bundle) : template;
        if (typeof value === 'string' && value.trim()) questions.push(value);
      }
      return questions.slice(0, 3);
    },
  };
}

function runRules(rules, bundle, scope, now, since) {
  const insights = [];
  // A record-scope bundle (the legacy leads adapter) carries `record`, not
  // `records`. Reading through this once means a missing list cannot crash a
  // page, and the escape hatch still receives the original bundle untouched.
  const records = Array.isArray(bundle.records) ? bundle.records : [];
  // Escape-hatch rules receive a bundle whose `records` is always an array, so
  // page code never has to defend against the record-scope shape.
  const safeBundle = records === bundle.records ? bundle : { ...bundle, records };
  for (const [declarationIndex, declaration] of rules.entries()) {
    const name = declaration.rule;
    const def = name ? RULES[name] : null;

    if (def) {
      if (COLLECTION_RULES.has(name)) {
        // Collection rules may still be source-scoped. Grouping invoice rows
        // together with a stats singleton would produce nonsense.
        const ruleBundle = declaration.source
          ? { ...bundle, records: records.filter((record) => record.__source === declaration.source) }
          : safeBundle;
        insights.push(...def.run(ruleBundle, declaration, now, since).map(prefix(declarationIndex)));
        continue;
      }
      for (const record of records) {
        if (declaration.source && record.__source !== declaration.source) continue;
        insights.push(...def.run(bundle, declaration, record, now, since).map(prefix(declarationIndex)));
      }
      continue;
    }

    // Escape hatch: page-specific code, same contract.
    if (typeof declaration.run === 'function') {
      insights.push(...declaration.run(safeBundle, since).map(prefix(declarationIndex)));
      continue;
    }

    throw new Error(`Unknown rule '${name}' in a page descriptor`);
  }
  return insights.filter(Boolean);
}

/** Rules are shared across records, so IDs collide unless scoped per rule. */
function prefix(index) {
  return (insight) => ({ ...insight, id: `${index}:${insight.id}` });
}

export { DAY_MS };
