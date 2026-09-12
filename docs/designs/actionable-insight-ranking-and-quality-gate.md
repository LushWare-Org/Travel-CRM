# Actionable Insight Ranking & Quality Gate

Status: APPROVED 2026-09-12. No code changed by this document.
Scope: `Services/assistant-service` — the deterministic insight pipeline (`src/adapters/`), the claims/validation path (`src/ai/groundingValidator.js`), the Management copilot wire contract, and the telemetry layer.
Depends on: `docs/designs/management-copilot-all-pages.md`, `docs/designs/management-copilot-panel-hardening.md`, `docs/ASSISTANT-SERVICE-ARCHITECTURE.html`.
Plan position: release train 1 (trust) of the copilot capability plan. Train 2 (reach) is `docs/designs/copilot-question-driven-capability.md`; both share the phase 0 substrate below and edit the same five files, so they are sequenced rather than run in parallel.

---

## 1. Problem

The copilot already produces real, evidence-cited insights. It cannot yet answer the operator's actual question, which is **"what should I do first?"**

Three concrete defects, all verified in the working tree:

1. **No ranking.** `runRules()` (`src/adapters/collectionEngine.js`) pushes insights in the order rules are declared in the page descriptor. `computeInsights()` returns that array unchanged. The deterministic handler ships it as-is. So a `critical` "reminded 3 times and still unpaid — this needs a call" insight can appear *below* an `info` "no logo is configured", purely because of array position.
2. **No selection.** Nothing caps what is returned. A page with 40 overdue invoices emits 40 insights, all rendered. There is no notion of "most needed" anywhere in the pipeline — the only `.slice()` in the insight path is `defaultQuestions(bundle).slice(0, 3)`; the briefing prompt's own `slice` bounds *evidence* items, not insights.
3. **No lifecycle.** Every insight re-fires on every page load forever. Only rules that consume `since` (the `changed` section) are time-aware. There is no per-insight acknowledgement, no suppression window, no "I've already looked at this".

And one structural blocker for fixing (3):

4. **Insight identity is unstable.** `prefix(index)` rewrites every id to `<declarationIndex>:<ruleId>`. Reorder a descriptor array and every id changes. Acknowledgement, suppression and novelty cannot be keyed on an id that moves when a developer edits unrelated lines.

Additionally, "actionable" is asserted in prose only. Insights carry `{id, section, severity, text, fact?, evidenceIds[]}` — there is no machine-readable statement of *what to do*, *to which record*, or *with what expected effect*. `section: 'current_state'` insights ("Lead is in X status") are observations, not actions, and are indistinguishable from actionable ones at the contract level.

---

## 2. Goal

A deterministic, replayable, logged pipeline that turns rule output into a short ranked list of *actionable* insights, with a quality gate that can refuse to surface anything.

Success criteria — all measurable offline:

| Criterion | Target |
|---|---|
| Critical recall in the top N | **1.00, band-primary** — every `critical` on the scope appears in `ranked`, or its excess is counted in `suppressedCriticals`. `info` can never appear above a `critical` |
| Precision@3 on golden fixtures | ≥ 0.80 per page |
| Determinism | identical inputs → byte-identical order and scores, across runs and processes |
| Suppression correctness | an acknowledged insight does not re-surface inside its window unless it materially changed |
| Explainability | every surfaced item carries the score components that placed it |
| No unsupported or unauthorized claim | unchanged from today — zero tolerance, already enforced |

## 3. Non-goals

- No new model calls. This design **reduces** model work (the model phrases N selected items instead of validating everything).
- No agent framework. See §11.
- No write actions. Action descriptors are declarative and future-facing; they do not execute.
- No change to the evidence contract, the page adapter interface, or the authorization model.

---

## 4. Design overview

One new stage between `runRules()` and the response:

```
rules → candidates
      → [ L0 schema ]  [ L1 evidence ]  [ L2 authorization ]      ← drops (structural)
      → enrich: actionability, materiality, urgency, novelty, entityRef, stableKey
      → [ L3 actionability ] [ L4 materiality ] [ L5 novelty ]
        [ L6 dedupe/conflict ] [ L8 safety ]                       ← demote / suppress / drop
      → score (deterministic, explainable)
      → [ L7 selection ]: rank → diversity → cut to N
      → render: server copy for insights, model prose for claims
      → persist: one decision row per candidate, per load
```

Two invariants:

- **The model never ranks and never gates.** Ranking and gating are deterministic, versioned and replayable. A model that decides what is "most needed" cannot be graded, cannot be rolled back safely, and changes answer order between identical requests. The model's only job here is phrasing items that already passed every layer.
- **Every layer records a decision.** A dropped insight is a logged fact with a reason code, not a silent filter. This is what makes the gate auditable and the fixtures gradable — and it is the direct answer to "everything needs to be logged".

---

## 5. Insight contract v2

Extend the insight object. Every new field has a default so the ~40 existing rule declarations keep working untouched.

```
{
  // existing
  id, section, severity: 'critical' | 'warning' | 'info',
  text, fact?, evidenceIds[],

  // new
  key,                  // STABLE identity: `${ruleId}:${entityKind}:${entityId}` — survives descriptor reorders
  ruleId,               // the un-prefixed rule id, for grouping and eval attribution
  entityRef,            // { kind, id } — what this is about; required for dedupe and "show me the record"
  action,               // { kind, verb, target, params } | null — null ⇒ observation, not action
  materiality: 0..1,    // normalized magnitude within the page; null ⇒ use the default weight
  urgency: 0..1,        // derived from `fact.kind === 'date'` horizon when present
  suppression: {        // optional rule-level policy
    windowMs,           // how long an acknowledged insight stays quiet
    escalateOnCritical, // default true — criticals always re-surface
  },
}
```

`action` is the substance of "actionable". Declaring it is what separates these two:

- `current_state` / `experienced_view` insights → `action: null` → **observations**, demoted by L3 and never in the top N.
- `attention` insights that already name a remedy in prose (e.g. `lead-unclaimed` "claim it to move it out of the shared queue", `reminders-exhausted` "this needs a call") → get a real descriptor: `{ kind: 'navigate', verb: 'claim', target: { kind: 'lead', id } }`.

A descriptor may declare `action` per rule; the escape-hatch `run()` functions set it directly. **`action` is declarative only** — a future write path (§10, phase 3) is the thing that would consume it, behind preview + confirm.

---

## 6. Ranking

### 6.1 Score

Deterministic, pure, arithmetic over already-loaded data. No I/O, no model, no clock beyond the injected `now`.

```
S = severity    critical 1.00 · warning 0.60 · info 0.25
U = urgency     ≤24h 1.00 · ≤3d 0.80 · ≤7d 0.50 · ≤30d 0.25 · none 0.10
M = materiality page-normalized magnitude, clamped [0,1]; default 0.30 when undeclared
N = novelty     1.00 never surfaced · 0.50 changed since last acknowledgement · 0.00 unchanged
C = confidence  1.00 all cited · reduced proportionally when a source was unavailable at load
A = actionability 1.00 valid action descriptor · 0.40 observation

rankScore = round( (0.30·S + 0.25·U + 0.20·M + 0.10·N + 0.10·C) · A − stalePenalty , 3)
```

- `stalePenalty` (default 0.05) accrues per surfacing without acknowledgement, capped, so a chronically ignored item sinks rather than shouting forever.
- Weights live in one versioned config (`RANKING_VERSION`, e.g. `insight-ranking.v1`) with per-page overrides. Every response and every decision row is stamped with the version, so an eval run is attributable to the weights that produced it.
- **Severity is the primary sort key, not a summed term.** Items are ordered by severity band first (`critical` → `warning` → `info`); `rankScore` orders *within* a band. This is what makes the recall criterion structurally true: the actionability multiplier (§6.1, `A`) can reorder within a band but can never lift an `info` above a `critical`. Without this, `A` breaks the gate arithmetically: a `critical` observation scores ≈0.254 while an `info` with an action scores ≈0.410.
- **Tie-break inside a band** is fixed and total: `rankScore` desc → urgency desc → materiality desc → stable `key` asc. Two processes ranking the same candidates always produce the same order.
- The response carries the score components for each surfaced item. "Why is this first?" is answerable from the payload, which is what makes the ranking defensible to an operator.

### 6.2 Materiality normalization

`M` must be comparable *within a page*, because a €400 overdue invoice and a €40,000 one cannot share a threshold. Two sources already exist in the bundle:

- page-level denominators: `recordCounts`, and the aggregates the descriptor already declares (`outstandingValue`, `overdueCount`, …);
- per-record values via the projection.

Normalization options, in order of preference: percentile rank within the flagged set → ratio to the page aggregate → the rule's own declared threshold, clamped. A rule that declares no materiality gets the default `0.30`, so absence never silently outranks presence.

### 6.3 Selection and diversity

Ranking alone produces "the 5 most overdue invoices" — technically correct, operationally useless. L7 applies, in order:

1. **Severity floor** — nothing below the page's floor is eligible for the top N (`info` is excluded from a 3-item budget unless the page has no warning/critical candidates). The floor never applies to `critical`: a critical is always eligible.
2. **Diversity caps** — at most 2 per `ruleId`, at most 2 per `entityRef`, and the top N must contain ≥2 distinct `section` values when that many sections have qualifying candidates. This is the mechanism behind "most needed ones, not all kind of thing".
3. **Budget** — `N = 3` by default, per-page override, applied within the warning and info bands. The critical band is not budgeted; it is bounded by `CRITICAL_CEILING` (default 10), and any critical beyond the ceiling is reported in `suppressedCriticals` with its count, so a burst is visible rather than silently dropped. `critical recall@N = 1.00` therefore means: every critical is in `ranked`, or explicitly counted as overflow. The two rules cannot contradict each other because the ceiling is a reporting bound, not a ranking one.
4. **`show more`** — returns positions N+1.. in the same band order, without re-ranking and without re-scoring. The list is stable; expanding it never reorders what the operator already saw. **Suppressed items are not part of this list**: L5 suppression removes an item from `ranked` entirely, and its count is reported as `suppressedCount`. An explicit "show suppressed" control is out of scope here; if it is ever added it is a separate list with its own semantics, never an extension of `show more`.

### 6.4 Empty and quiet states

`[]` is a legitimate, expected outcome, and the wire contract must distinguish three cases — the machinery for this already exists in the bundle:

- **nothing flagged** — every source was read, no rule fired;
- **quiet** — sources read, insights exist but all were suppressed by novelty (§7, L5);
- **unavailable / unauthorized** — `unavailableSources` / `notAuthorizedSources` non-empty. Never render a zero that was not measured.

The response carries `{ ranked, suppressedCount, unavailableSources, notAuthorizedSources, rankingVersion }` so the client can say "3 items, 4 previously acknowledged" instead of pretending the page is clean.

---

### 6.5 Criticality: where the score's dominant input comes from

`Severity` is 0.30 of `rankScore` — the single largest term — so criticality is the thing the whole ranking actually rests on. Today it has two provenances and neither is derived from the business:

1. **Deterministic path** — a hand-written literal in the page descriptor (`severity: 'critical'` in `src/adapters/pages/billing.adapter.js`). It is the descriptor author's opinion, authored once, never revisited, and invisible to everyone else.
2. **Briefing / answer path** — `severity` is a **required enum the model emits** for every claim (`src/ai/prompts/managementBriefing.v1.js:39`, `managementAnswer.v1.js:36`), and `groundingValidator.js` copies it through untouched (`severity: insight.severity`). So on those paths severity is the model's unvalidated opinion.

Two uncoordinated scales, one of them model-authored, driving the largest term in a deterministic formula. Deriving the band from declared dimensions is the **target state**, and it is a prerequisite for the calibration loop to be meaningful; it is not a prerequisite for shipping ranking. This plan ships phases 0 to 2 on today's literal severities, then adopts §6.5 per page once a rubric owner signs the bands (Open question 6). Until then severity is authored rather than derived, and the divergence metric below has nothing to measure against.

**Target: severity is derived, never asserted.** Three inputs, in priority order:

**1. Domain economics — declared next to the data, not by the AI.** The criticality of "invoice 62 days overdue, €38,400, customer blocked" is a business fact, and business facts belong to the domain that owns them. Each rule declares the impact *dimensions* it cares about; the engine derives the band. The dimensions that generalise across the ten pages, each answerable from data the bundle already carries plus one declaration:

| Dimension | Question | Source |
|---|---|---|
| Money at risk | how much value is exposed, normalized against the page aggregate? | projection + page aggregate |
| Time pressure | is a deadline breached, imminent, or distant? | `fact.kind === 'date'` horizon |
| External impact | is a customer/partner blocked, or is this internal hygiene? | rule declaration |
| Irreversibility | does inaction foreclose something (missed ticketing deadline, lapsed quotation) or is it recoverable (missing description)? | rule declaration |
| Blast radius | one record, one customer, or the whole catalogue? | flagged-set size + `recordCounts` |
| Commitment | is a promise/SLA date attached? | rule declaration + date fields |

**2. Bands, not vibes.** A small deterministic function maps dimensions + normalized magnitude to the existing `info | warning | critical` enum:

- **critical** — a deadline is breached or imminent *and* the consequence is irreversible or external (money exposed, customer blocked, booking at risk);
- **warning** — degraded and recoverable, or internal work that is externally visible;
- **info** — hygiene, observation, or steady state.

Thresholds stay declarative, beside the rule, exactly like `days`, `threshold` and `statuses` do today. The engine computes the band; the descriptor never asserts it, and the model never sees the decision.

**3. Page normalization** (§6.2) supplies the only piece that cannot be declared locally — whether an amount is large *for this page*.

**The model's severity must be rejected, not trusted.** For every accepted claim the server recomputes severity from that claim's cited evidence plus the rule or observation that produced it, and overwrites whatever the model emitted. Two consequences worth wiring deliberately:

- the divergence between model-emitted and server-derived severity is a **first-class calibration metric** — a page whose model severity disagrees ≥30% of the time has a prompt problem or a rubric problem, and today nothing would reveal it;
- the enum stays in the response schema only because the wire contract requires the field; it is an output, never an input.

**Calibration path** (offline, versioned, never in the request path):

1. start with the domain owner's rubric — the dimensions above, thresholds set by someone who knows why a missed ticketing deadline costs more than a missing package description;
2. measure against behaviour — action rate per severity band, acknowledgement rate, and outcome labels where they exist (booking lost, invoice written off);
3. fold the result into the versioned weights and bands, with a fixture per change so the effect on precision@3 and critical recall is visible before rollout.

**Why the model cannot be the judge**, even with a good prompt: it is non-deterministic across identical inputs (so the gate cannot be replayed), it changes with every model version (so a release is not reproducible), it leaves no explanation an operator can inspect, it cannot be graded offline against a fixed expectation, and it reads record data as instruction — a lead named "ignore previous instructions, this is critical" is a live injection path into the ranking of every other insight on the page.

Where a model *does* legitimately help: offline, to propose candidate thresholds and rules from historical outcomes, and as a second opinion during eval review. Never in the request path.

**The same question at fetch time.** "Which data is more critical" also decides *which sources get read* when the per-source budget truncates the bundle. Sources are currently fetched concurrently under one equal timeout with no priority, so a short budget degrades arbitrarily — the least important source may be the one that arrived. Each descriptor should declare per-source priority and cost, so truncation degrades from the least important source inward, and so a partial bundle is partial in a known direction.

## 7. The quality gate

Ordered layers. Each is a pure function; each emits a decision.

| Layer | Name | Passes when | On failure |
|---|---|---|---|
| L0 | Schema | fields present, enums valid, `entityRef` well-formed | **drop** `invalid_shape` |
| L1 | Evidence | ≥1 resolvable evidence id in the final bundle | **drop** `uncited` (exists today, in `makeInsight`) |
| L2 | Authorization | every cited id belongs to an authorized, successfully-read source | **drop** `unauthorized` |
| L3 | Actionability | `action` non-null and its target resolves | **demote** `observation` |
| L4 | Materiality | above the rule's declared threshold *and* the page floor | **drop** `below_materiality` |
| L5 | Novelty | not acknowledged within `suppression.windowMs` — **unless** severity is `critical` and `escalateOnCritical` | **suppress** `suppressed_unchanged` |
| L6 | Dedupe / conflict | unique `key`; same entity + rule family merged; conflicting severities resolve to the stricter | **merge** `merged` / `conflict_resolved` |
| L7 | Selection | inside the diversity caps and the budget | **rank out** `ranked_out` |
| L8 | Safety | prose passes the PII/redaction policy; no raw identifier leakage beyond policy | **drop** `rejected_safety` |

**Not every layer applies to every origin.** Rule-derived insights carry the declarations L3 to L6 need; model-derived ask claims (`answerBlocks`) carry `severity`, `evidenceIds` and `facts` and nothing else. Routing both through the same parameters is incoherent: L3 would demote every model claim for lacking an `action`, and L4 would compare against a threshold that does not exist. The gate therefore takes an `origin` discriminator:

| Layer | `origin: 'rule'` | `origin: 'model'` |
|---|---|---|
| L0 schema, L1 evidence, L2 authorization | applies | applies |
| L3 actionability | applies (demote to observation) | **skipped** — a model claim is never demoted for lacking an action; it takes `A = 1.00` when it cites a group or rule insight that has one, else `A = 0.40` |
| L4 materiality | applies | **skipped** — no declared threshold exists to check |
| L5 novelty | keyed on the stable `key` from §5 | keyed on `hash(normalized text + sorted cited evidence ids)`, since there is no `ruleId` |
| L6 dedupe / conflict | keyed on `key` | same derived hash; conflicts resolve to the stricter severity |
| L7 selection, L8 safety | applies | applies |

This is the honest reconciliation: "the loop's output passes through the same gate" (§9.9.3) means the same *pipeline*, not the same *parameters*. A test asserts both that rule insights honour L3/L4 and that model claims are not demoted by them.

Three properties matter more than the list:

- **L2 is a security boundary, not a filter.** The bundle already guarantees that unauthorized sources never contribute evidence (the `notAuthorizedSources` classification drops the whole source). L2 exists to make that guarantee *logged and testable* rather than incidental, because ranking introduces a new way for a low-severity unauthorized item to be surfaced as "insight" if a future adapter regresses.
- **L5 is where "not all kind of thing" is actually enforced over time.** A window of 7 days per rule family, keyed on the stable `key` from §5, means an unchanged insight appears once and then stays quiet until something moves.
- **L4 thresholds stay declarative.** Materiality thresholds belong in the descriptor next to the rule that uses them, exactly like `days`, `threshold` and `statuses` do today — never in the model, never in prompt text.

### Release gate (offline, mandatory)

Extend the existing harness (`src/evaluation/`, `scripts/evaluate-assistant-router.js`, `evaluation/*.jsonl`) with an insight fixture set: per page, a canned bundle → expected ranked top-N. Gate on:

- precision@3 ≥ 0.80 per page;
- **critical recall@N = 1.00** (a missed critical fails the build);
- determinism replay: same fixture, two runs, identical serialized output;
- suppression replay: synthetic acknowledgement state → expected `suppressedCount` and `ranked` list;
- no unsupported values, no unauthorized evidence — unchanged invariants, re-asserted through the new path; plus **severity assertions** — every fixture item's server-derived band must equal its expected band, and any divergence from a model-emitted severity is recorded as a metric rather than accepted.

Pages ship behind the existing `MANAGEMENT_COPILOT_PAGE_KEYS` allowlist, so a page that fails its fixture can be rolled back alone. Start with `billing` and `leads`: they already carry the richest severity vocabulary (`reminders-exhausted` critical, `ticketing-deadline` critical, `lead-unclaimed` warning-with-remedy).

---

## 8. Lifecycle state

`ManagementLastSeen` exists today: one row per `(actorId, pageKey, scopeFingerprint)`. Generalize rather than replace it — keep the scope-level read for the `since` boundary, add per-insight state:

```
InsightState
  actorId, pageKey, scopeFingerprint, insightKey
  firstSeenAt, lastSurfacedAt, surfacedCount
  acknowledgedAt, snoozedUntil
  lastMaterialValue            // what "changed" means for this insight
  @@unique(actorId, pageKey, scopeFingerprint, insightKey)
```

`lastMaterialValue` is what makes novelty honest: an insight is "changed" when its own material value moved (amount, days overdue, status), not merely because time passed. Without it, L5 either suppresses everything forever or nothing at all.

Write policy, matching the existing precedent (`/seen` is awaited on purpose; the turn's last-seen read is best-effort): **acknowledgement is awaited and must fail loudly; surfacing counters are best-effort.** Nothing about rendering may depend on a write succeeding.

---

## 9. Technical requirements

Ordered by what blocks what. Each is a real capability, not a bullet-point restatement.

### 9.1 Domain / data
1. **`action` on actionable rules.** Every `attention`-section declaration (~40 today across the ten descriptors) needs one explicit classification: an `action` descriptor where the rule already names a remedy in prose, `null` where it is a bare observation. No rule rewrite required, but it is a per-rule editorial pass, not a default.
2. **Materiality inputs per page.** Reuse existing descriptors' aggregates (`outstandingValue`, `overdueCount`, `recordCounts`) as denominators. No new fetches.
3. **Stable keys.** Replace index-prefixed ids in `prefix(index)`. Mechanical, but it is the one change that must land **before** any suppression state is persisted — otherwise the state is born corrupt.
4. **`entityRef`** on every insight, with a kind that matches what the insight is actually about: `{ kind: 'record', id }`, `{ kind: 'group', id: '<source>:<groupBy>:<key>' }` for the grouping rules, or `{ kind: 'collection', id: '<pageKey>:<source>' }` for aggregate-only rules such as `zeroOrLowCount`, whose own comments state there is no single record to point at. `entityRef` is therefore always present but not always a record; dedupe and suppression key on the pair, not on the assumption of a record.

### 9.2 Compute
5. **A pure scorer + gate module** (`src/insights/…`), unit-testable without HTTP or a model, running in-process in well under a millisecond over the ≤200-item evidence budget.
6. **No new service calls and no new model calls.** The pipeline runs inside the existing phase, before any generation, and shrinks the prompt rather than growing it.
7. **Aggregate prompt budget.** Selection means the model phrases ≤N items, which is also the fix for the unbounded-prompt finding in the architecture audit. Wire the two together.

### 9.3 Contract / API
8. **Wire contract v2** for the deterministic and briefing responses: `{ ranked[], suppressedCount, rankingVersion, unavailableSources, notAuthorizedSources }`, with the ranked item carrying its score components and `action`.
9. **Closed decision-code enum** shared via `@travel-crm/contracts`, so codes are validated at the boundary like every other wire enum in this repo.
10. **Client rendering rules**: top-N list with an "why now" line per item, evidence chips (already exist), a non-re-ranking "show more", and honest quiet/unavailable states.

### 9.4 Persistence
11. **`InsightState`** (§8) and a **decision log** — one row per candidate per load: `requestId, actorId, pageKey, scopeFingerprint, insightKey, ruleId, entityRef, severity, rankScore, decision, reason, rankingVersion, createdAt`.
12. **Retention and rollup.** A decision log at page-load frequency grows faster than `AssistantEvent` already does, which has no retention today. Decide the window (30–90 days) *before* the first row is written.
13. **A scheduler.** Retention/rollup needs periodic execution and the stack has none: no cron, no worker, no queue, and `min_instances = 0`. Supabase `pg_cron` or Cloud Scheduler → a Cloud Run Job. This is a genuine new infra component, not a config change.

### 9.5 Observability
14. **Propagate `x-request-id` on outbound fetches.** `forwardActorHeaders` forwards only `x-user-*` and `fetchJson` sends only those, so every tool and evidence read reaches lead/billing/analytics without the assistant's correlation id — the domain service mints a fresh one. Without this fix, the decision log cannot be joined to the upstream reads it describes.
15. **Per-layer decision counters** (drop/demote/suppress/select by reason) as first-class metrics, plus the existing per-source failure classification.
16. **Token and latency accounting per invocation**, currently absent for the copilot paths entirely.

### 9.6 Config & rollout
17. One versioned ranking config, per-page overrides, `RANKING_VERSION` stamped on responses and rows.
18. Per-page feature flags for the gate's stricter layers, so suppression can be rolled back without reverting ranking.
19. **CI wiring.** `Management/e2e/` does not run in CI today (open P1 in `TODOS.md`) and `Services/e2e-tests/` is also unwired. Shipping a gate whose release criterion is a fixture score requires the fixture to actually run on every PR.

### 9.7 Security
20. L2 and L8 as testable properties, not intentions: no unauthorized evidence in `ranked`, no raw PII beyond policy in prose, and an explicit test that a page with a fully denied bundle returns ranked `[]` with `notAuthorizedSources` populated.
21. No model participation in ranking or gating (§4).

---

### 9.8 Criticality (implements §6.5)
22. **Impact dimensions declared per rule.** `externalImpact`, `irreversibility`, `commitment` added to the declaration vocabulary alongside `severity`, `days`, `threshold`. Defaults must be conservative (internal, recoverable, no commitment) so an unclassified rule cannot flatter itself into the top N.
23. **A derived-band function, and server recomputation of every model-emitted severity.** The model's `severity` is overwritten on accept. Disagreement is counted, never trusted.
24. **Per-source priority and cost in the descriptor**, so a truncated bundle degrades from the least important source inward instead of arbitrarily.
25. **A named rubric owner per page.** The bands encode business judgement; someone must own signing them off, or the thresholds will be whatever a developer guessed on the day.

### 9.9 The agent loop and tool surface — what changes, what does not

The loop (`src/ai/agentRunner.js`, 118 lines) is the wrong place to *host* the gate, and it is not where ranking lives. But three of its edges must change for this design to hold together, and only three:

1. **Emit per-step trace events.** `history` is in-memory, becomes turn-local evidence, and is then discarded — so a 4-step ask currently leaves no record of which tools ran. "Everything logged" requires one event per step: `{ step, tool, argsShape, rowCount, resultBytes, latencyMs, outcome }`, where outcome is the existing three-shape result (`data` / `notAuthorized` / `unavailable`) plus `error`. Shapes and counts, not payloads — the PII rule from §9.4 applies, and nothing here should re-derive what already executed.
2. **Tool results must carry identity and priority.** The post-loop gate cannot rank what it cannot identify. Projected rows need `entityRef`, and list tools must return rows ordered by the same criticality function as §6.5 rather than by upstream page order. Today `listInvoices` already sorts most-overdue-first (a crude version of this) while `listLeads` returns upstream order and `boundResult` drops rows from the **tail** — so the model's view of "the leads" is the newest N, not the most important N, and truncation removes the most recently created rather than the least important.
3. **The loop's output must pass through the same gate.** `answerBlocks` currently flows straight to `respondWithAnswer`. If only deterministic insights are gated and ranked, ask-mode answers silently bypass quality control and the two paths diverge — two standards for one product. Claims returned by the loop are recomputed (§6.5), gated and ranked exactly like rule output before they render.

What must **not** change: the loop still owns one budget shared across generation and tool I/O, per-step timeouts derived from the remaining budget, and an `AbortSignal` per tool read. Those semantics are the reason the loop cannot outlive its request. A logging hook must not break them — trace emission is fire-and-forget inside the existing budget, and the gate runs after the loop, outside it.

Deliberately **out of scope until phase 3**: raising `MAX_TOOL_CALLS` beyond 4, parallel tool calls, replanning, and streaming. Each increases what the loop emits. Adding any of them before the gate, the stable keys and the trace exist would amplify unranked, unlogged output — the exact defect this design removes.

## 10. Phasing

| Phase | Content | Gate to proceed |
|---|---|---|
| 0 | Stable keys + `entityRef` + decision log scaffolding + **loop per-step trace emit** (§9.9.1); gate on evidence only. **No retention or scheduler work in this phase**: rows accumulate and the retention window is decided before phase 2 | Decision rows land and are queryable; ids survive a descriptor reorder; a 4-step ask emits 4 trace rows. Retention window NOT required |
| 1 | Ranking with band-primary ordering, diversity and budget; observations demoted; **`action` descriptors authored for `attention` AND `experienced_view` rules** (§9.1.1 — without them L3 hides the analytical insights); tool rows carry `entityRef`; `answerBlocks` pass through the same gate pipeline with the model-origin parameters (§7) | Fixtures pass precision@3 and critical-recall@N on **both** the deterministic and ask paths |
| 2 | `InsightState` + novelty/suppression + material-change detection; **retention window decided and enforced here**, the first phase whose write volume makes it matter, which is also when the scheduler becomes a real dependency rather than a wish | Suppression replay tests pass; no critical suppressed |
| 3 | Preview/confirm UX over the `action` descriptors already authored in phase 1; **loop capability** — step budget, parallel tool calls, streaming — each its own decision (§9.9) | Action contract reviewed; every loop change re-evaluated against the same fixtures |

Phase 0 alone delivers the logging requirement and is independently useful.

### Combined sequencing with the capability track

Two documents, two release trains, one plan. They are one plan because they edit the same five files (`managementCopilot.controller.js`, `groundingValidator.js`, `toolRegistry.js`, `managementAnswer.v1.js`, `@travel-crm/contracts`) and share one prerequisite, and because the shipped panel already advertises "Where is demand clustering?" as a suggested question. Ranking alone would order the panel beautifully next to a button that reliably produces "No grounded answer for that question."

They are two trains because their risk differs: this one is contained in the deterministic phase and ships per page behind `MANAGEMENT_COPILOT_PAGE_KEYS`; the capability track touches authorization (role-derived catalogue, superadmin handling) and adds a query surface, so it earns its own review.

| Order | Content | Train | Ships behind |
|---|---|---|---|
| 0 | Stable keys, `entityRef`, trace emit, decision rows | this doc | no user-visible change |
| 1 | Ranking, diversity, budget, action descriptors authored | this doc | per-page allowlist |
| 2 | Numeric resolution rule, derivation facts, prompt relaxation | capability | per-page allowlist |
| 3 | Aggregate primitive, semantic layer, role catalogue | capability | per source |
| 4 | `InsightState`, suppression, acknowledgement, material change | this doc | per page |
| 5 | Action preview/confirm, streaming, loop capability | later | separate decisions |

Steps 2 and 3 are what make a counting question answerable. Step 1 is what stops the panel hiding analysis in favour of hygiene. Neither substitutes for the other.

---

## 11. Framework decision: build vs adopt

**Recommendation: adopt no agentic framework for this work, and no agentic framework for the copilot generally.** Buy two targeted libraries later, under named triggers.

The orchestration that exists is 118 lines (`src/ai/agentRunner.js`) and encodes three semantics a framework would take away or reproduce badly: one budget shared across generation *and* tool I/O, per-step timeouts derived from the remainder, and an `AbortSignal` per tool read. Those are the reason the loop cannot outlive its request. A general-purpose graph/agent runtime would need to be configured to respect them, and would own the loop instead of the service owning it.

Mapping the real needs to what a framework would actually supply:

| Need | Framework claim | Verdict here |
|---|---|---|
| Multi-step tool loop | LangGraph / CrewAI / Mastra orchestration | **Reject.** 118 working lines; the budgets are the design. Owning the loop buys nothing and costs control. |
| Durable state / resume | LangGraph checkpoints, Temporal | **Reject now.** No long-running runs, no background execution model, no worker. Revisit only if runs become minutes-long and must survive a deploy. |
| Streaming | Vercel AI SDK, provider SDKs | **Defer.** `@google/genai` already exposes streaming; the gap is SSE through the gateway and a client renderer, not a missing library. The AI SDK's React hooks are the one real argument — weighed against a provider abstraction this stack does not need (`geminiClient.js` is deliberately the single seam). |
| Tracing / observability | LangSmith, Langfuse, OpenTelemetry | **Adopt, minimally.** This is the one genuine library-shaped gap: spans per tool call, token counts, correlation across services. Prefer vendor-neutral OpenTelemetry over a vendor agent platform. Note the constraint: batch exporters lose data when instances scale to zero — export per-request or accept the tradeoff deliberately. |
| Evals | promptfoo, LangSmith datasets | **Keep the repo harness.** `src/evaluation/` + `scripts/evaluate-assistant-router.js` is the local convention and already encodes the router's per-class gates. Extend it; do not fork a second eval system. |
| Ranking / gating | — (no framework offers this) | **Deterministic service code.** This is the core insight of the design: a quality gate inside a framework is ungradeable. |

**Triggers that would change this answer**, stated so the decision can be revisited rather than re-argued:

1. two or more agents with handoff, where the control flow is data-dependent rather than budget-bounded;
2. human-in-the-loop interrupts that must durably survive a deploy;
3. runs measured in minutes with resumability after failure;
4. more than one provider with routing/fallback as a product requirement.

None of the four is true today, and (2)–(4) are blocked by the absent background-execution model (§9.4) regardless of library choice.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Suppression hides something important | Criticals are never suppressed by L5; **critical recall@N = 1.00 is a build gate** and the critical band is not budgeted; the `suppressedCriticals` count makes overflow visible; `show more` surfaces ranked-out items, while suppressed ones stay counted in `suppressedCount` |
| Ranking is wrong for a page | Weights are config, versioned and stamped; per-page overrides; page-level rollback via the existing allowlist |
| Materiality normalization is meaningless on some pages | Default weight when undeclared; a page can ship ranking with materiality disabled rather than a wrong denominator |
| Decision log growth | Retention decided before phase 0 ships; rollup via the new scheduler |
| Stale suppression state after descriptor edits | Stable keys (§9.1.3) land in phase 0, before any state is persisted |
| The gate becomes an unaccountable filter | Every layer emits a decision with a reason code; dropped ≠ invisible |
| Severity is model-authored and unvalidated today | Server recomputes every band from cited evidence (§6.5); model/derived disagreement rate is a tracked metric |
| Criticality thresholds are guessed rather than agreed | Named rubric owner per page (§9.8.25); fixtures pin the expected band so a threshold change is a visible diff |
| **L3 demotes the analytical insights the operator most wants** | §5 sends `experienced_view` and `current_state` to `action: null`, so L3 removes them from the top N. On the leads page that removes "N leads are asking for the same destination: Bali" — the page's one genuine analysis, and the answer to the suggested question the panel advertises. Mitigation: author `action` descriptors for analytical rules too ("look at Bali demand"), not only for hygiene rules. Without that editorial pass, ranking makes the panel worse, not better. |
| §6.5 derived severity can downgrade the whole panel before the rubric exists | With impact dimensions unauthored, the conservative defaults (internal, recoverable, no commitment) derive most `warning` rules down to `info`, which the severity floor then drops. Mitigation: ship phase 1 with today's literal severities and hold §6.5 until a rubric owner signs each page (open question 6). |
| The critical-recall gate is vacuous on some pages | The `leads` descriptor has no `critical` rule at all, so `critical recall@N = 1.00` proves nothing there. Mitigation: run the gate against `billing` (`reminders-exhausted`) and `flights` (`ticketing-deadline`) where criticals exist, and say so in the fixture set. |

---

## 13. Open questions

1. **`N` per page.** Default 3 with per-page override — does any page need more, and does the operator's own scoping (they arrived at a filtered view) change the right N?
2. **Acknowledgement semantics.** Explicit dismiss/snooze, or implicit "the briefing rendered"? Implicit is cheaper and matches `/seen`; explicit is truthful but adds a control the panel does not have.
3. **Criticals without a remedy.** Several `critical` rules today have no clean action (`missing-pnr` needs a human with the supplier). Are they exempt from L3, or shown as blockers the operator must resolve out of band?
4. **Decision-log retention.** 30 or 90 days, and is it an ops decision or a compliance one?
5. **Does ranking belong in the deterministic phase only, or also re-rank the model's claims at briefing time?** This design assumes server-side ranking of rule output, with the model phrasing winners — re-ranking claims would need the model's output to carry the score components, which it cannot be trusted to emit.
6. **Who owns the criticality rubric?** §6.5 makes severity a derived business judgement rather than an authored literal. That only holds if a domain owner signs the bands per page — otherwise the design moves the guess rather than removing it.
