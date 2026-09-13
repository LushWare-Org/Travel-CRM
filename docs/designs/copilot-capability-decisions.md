# Copilot capability — decisions, findings, and state of work

A decision record for the work that produced `actionable-insight-ranking-and-quality-gate.md` and `copilot-question-driven-capability.md`. It exists so that the reasoning survives context loss: everything here was decided deliberately, and several items are the kind that get re-litigated by someone who was not in the room.

Branch: `feat/copilot-capability`, based on `microservices` at `bf0a0a3`.

---

## 1. What the work is

Two approved designs, run as one plan with two release trains:

- **Train 1, trust** — `actionable-insight-ranking-and-quality-gate.md`. Rank what the panel shows, gate what it refuses, record why.
- **Train 2, reach** — `copilot-question-driven-capability.md`. Make the chat able to answer a quantitative or cross-domain question.

One plan because they edit the same five files and share one prerequisite; two trains because their risk differs. Combined order: substrate → ranking → numeric rule → aggregate → lifecycle → actions.

---

## 2. Decisions taken in the eng review (all settled, do not re-open)

| # | Decision | Why it matters |
|---|---|---|
| Scope | **Full plan, both trains** (option C) | User's call after being offered a smaller wedge |
| 1A | Thread the upstream `pagination.total` through the aggregate read and label truncation | Without it a capped read presents a partial count as complete |
| 2A | Zod-validate `x-user-permissions` (fail closed to `[]`) and put the tool→permission map in `@travel-crm/contracts` | Tool access was about to depend on an unvalidated header |
| 3B | Precompute the aggregate **before** the generation loop, with question-shape detection | A slow tool read could consume the whole 17s and reproduce the empty answer |
| 4C | Ship the contract rename and reshape in lockstep, **downtime tolerated** (safeguard declined) | Management ships via Firebase Hosting, services via Cloud Run, so no shared ordering primitive exists. The replacement is a mandatory post-deploy smoke check |
| C1A | Extract the grounding rules into one shared module | The same policy was written out in two prompt files |
| C2A | Make `insightsToClaims` total, plus a shape parity test | It enumerated six fields, so the degraded path silently lost actions and score components |
| C4A | Fix the stale validator comments and add the gate pipeline diagram | The file documented behaviour the plan removes |
| E1 | Re-baseline existing eval fixtures **and** add per-page ranking fixtures | A fixture-scored release gate needs fixtures |
| T1 | Full test coverage for every planned path | User's preference: too many tests rather than too few |
| PERF-1A | The aggregate groups over already-loaded bundle rows | Avoids a second read of the same rows on the critical path |
| PERF-2/3A | One batched scope state read; decision rows only for candidates reaching L3+ | I/O proportional to what is shown, not to what is generated |
| OV-1A | Reconcile all six contradictions the outside voice found | Two were load-bearing: the recall gate was arithmetically unsatisfiable, and the gate could not accept model claims |

Two of those changed the design rather than the wording:

- **Severity is the primary sort key**, with `rankScore` ordering *within* a band. The actionability multiplier made the old formula self-contradictory: a critical observation scored ≈0.254 against an actionable info at ≈0.410, so "a critical is never out-ranked by an info" could not be satisfied. The critical band is unbounded by `N`, bounded by `CRITICAL_CEILING`, with overflow reported as `suppressedCriticals`.
- **The gate takes an `origin` discriminator.** Model claims carry no `action`, no rule threshold and no stable key, so running them through L3-L6 as written would demote every answer.

---

## 3. Findings worth remembering

### The root cause of "No grounded answer for that question."

`groundingValidator.js` rejected any claim whose prose contained a digit (`RESIDUAL_VALUE_PATTERNS[0] = /\b\d[\d,.]*(\.\d+)?\b/`), **and** both prompts told the model that prose must be qualitative only. So a correct answer like "12 leads want Bali" was generated, validated and deleted. Every counting question was impossible by construction. The rule, the fact shape and the prompt had to change together — fixing any one alone changes nothing.

### The panel advertises a question the backend cannot answer

`leadsCollection.adapter.js` already computes `groupedCount` by destination and its `questionTemplates` literally include "Where is demand clustering?". Ask mode declares only `listLeads`, cannot group, and would have had its numbers deleted anyway. The suggested-question button was a reliable path to a refusal.

### A configured page size presented as an outage

`collectionEngine.js` fails a paged source closed when its read is truncated, and `leadsCollection` pages at 200 with a `pagination.total` probe. **Past 200 leads the panel reports "partially loaded, 1 sources unavailable"** — the same banner as a dead service. The reason was computed at `fail()` and thrown away into a log line.

### A pre-existing contract break

`ManagementDeterministicResult` caps `insights` at 100, and three rules can fire per record — so a busy page could exceed the cap and have **every client reject the response**. Found by asserting the response against the strict contract. `insights` is now bounded.

### Tool access is role-based, because that is what the services enforce

The design said "tool→permission map". The platform does not authorize on permissions: every service guards with `authorize('admin', 'salesRep')`, and `permissions` is read in exactly **one** place platform-wide (`manage_leads` in `lead-service/src/controllers/lead.controller.js`, at five call sites, affecting which leads a salesRep may modify — not which tools exist). A permission-keyed map would have denied every tool to every operator holding no matching string, silently and by default.

`ManagementToolAccess` is therefore role-keyed, and it **mirrors the guard on the target route**, because the copilot is a second caller of that route and not a second authority. It is deliberately never wider than the route: `GET /api/v1/billing/invoices` is `requireAuth`-only, so `listInvoices` is reachable by any authenticated role, yet the map lists only the two management roles. Narrower is the safe direction — a tool absent from a vocabulary is a visible absence, never a 403 halfway through an answer — and the domain service's own ownership and role checks still run under the caller's forwarded identity.

A test asserts the map covers every registered tool: without it, a tool added to the registry but not to the map would be invisible to every actor forever and nothing would say so.

### The vocabulary moved from the page to the actor (a behaviour change)

`askTools(scope)` let the page decide what could be asked, so the same operator asking the same question had different capability on different screens and a question spanning two domains was unanswerable from either. The vocabulary now comes from the actor's role. The page still decides what is **volunteered unprompted**, which is what keeps the panel quiet.

Consequence to expect in review: the zero-tool single-shot branch is now selected by the **actor**, not the page. An actor with no reachable tools takes it; a page that declares no tools no longer does. Three tests encoded the old contract and were updated rather than accommodated.

### An unvalidated header could 500 every management route

`extractUser` did `JSON.parse(req.headers['x-user-permissions'] || '[]')` with no shape check, so a malformed header threw inside middleware — a 500 on every management route rather than a permission error, and a malformed header was indistinguishable from a valid one at every call site. Zod validation bounds it (array of ≤64 short strings) and the failure is now a narrowing to `[]`. `role` is validated too, so a paragraph or a number cannot be forwarded as a role.

### Where the strict contracts bite

`BriefingFactSchema`, `BriefingClaimSchema` and `DeterministicInsightSchema` are all `.strict()`. Any field the service adds and the contract does not declare fails on every client. Adding fields is therefore always a two-sided change.

### Test scaffolding limits what can be tested

`MockFlightClient` pins ticketing deadlines to now+24h and always returns a PNR; `MockHotelClient` fixes check-in dates and always returns a booking id. **The flight and hotel copilot pages cannot be exercised realistically until those mocks stop pinning dates**, and any claim about them from the synthetic suite is a claim about the mock.

### Deterministic but not meaningful

When candidates score identically (same severity, no date, no amount), the tie-break is the stable key, which is alphabetical — so `missingField` outranks `unassigned` for no reason an operator would recognise. A page that ties heavily would need a declared priority.

### Infrastructure absences

No scheduler, worker or queue anywhere, with `min_instances = 0`, so there is no background execution model. `AssistantEvent` has no retention and no consumer. The gateway originates `x-request-id` by mutating the header so the proxy forwards it, but `forwardActorHeaders` sends only `x-user-*`, so assistant-service's own outbound reads carry a fresh id and cannot be joined to the turn.

### Two prior learnings were stale

`assistant_ask_path_untested` (the ask path has no tests) and `deterministic_phase_ships_no_sources` were both false in the current tree. Verified by reading, corrected in the learnings log.

---

## 4. What running it against a live stack found

Every claim above rests on unit tests, which mock the model and the database. Running it end to end locally — real gateway, real Postgres, real Gemini — applied the T2 migration and then found four things the unit tests could not.

### The counting question returned an empty answer, and the cause was a stale prompt instruction

The ask path ran, the aggregate precompute worked (`groupBy: destination`, 7 groups, 3 suppressed groups, 47 rows), and the response was still `answerBlocks: []`.

`managementAnswer.v2.js` told the model: *"For a question that asks for a COUNT, a RANKING or a GROUPING, gather the rows with a tool and state the number; **do not answer such a question from the initial evidence alone**."* That line predates the aggregate precompute — it was written to stop the model refusing counting questions, back when the server could not group. Now the server puts the finished grouping **into** the initial evidence, and the prompt ordered the model to ignore it. The model obeyed: it called `listLeads` four times trying to re-gather what it had been handed, exhausted its budget, and returned nothing.

**Why the unit tests missed it.** The controller test mocks `generateStructured`, so the prompt is never read by anything that can be contradicted by it; and the aggregate tests assert the evidence reaches the prompt, which it did. The two halves were each correct and wrong together — the same class of failure as the original "number deleted by the validator" bug, where the rule and the prompt disagreed.

Fixed by making the instruction conditional on the evidence actually carrying precomputed groups (detected by the `:aggregate:` id shape, so a page without them keeps the older, still-correct wording). Three regression tests pin it.

### Three silent failure paths, all of which reported "No grounded answer"

Diagnosing the above took several runs because every path that produces an empty answer did so silently:

- `runAgentLoop`'s `catch {}` swallowed a failed generation with no log.
- The controller destructured `const { claims }` and **threw away** `rejected`, so a claim refused by the validator left no trace of why.
- The worst: a tool call rejected by the tool's own args schema (`executeTool` returns `{ error }` for an unknown name or invalid args) never reaches a service, so it leaves no trace anywhere — and after four of them the loop exits with an empty answer and no line in any log.

All three now log. This is the same defect as the original complaint at one remove: the operator was told nothing, and so was the log.

**Still un-implemented, recorded as a finding:** the model called `listLeads` with `{ leadId }`, which its strict schema rejects. The error names the bad key but not the accepted shape, and the model repeated the identical call four times. Feeding the expected argument shape back would make recovery likelier, but the prompt fix removes the trigger, so it is noted rather than built.

### A test fixture that fails every afternoon

Three duration tests began failing mid-session: 61 days where the assertion said 62, 69 for 70, 8 for 9 — all exactly one day short. They had passed that morning.

`bundleFixture.js` defined `daysAgo(days)` and ignored the second argument. The tests pin `now = 2026-09-12T12:00:00.000Z` and call `daysAgo(62, now)`, so the record was placed 62 days before the **real** clock while the rule measured against the fixed noon — precise only while the real clock is before 12:00 UTC. It passed at 09:08 and failed at 13:32, and would have failed every afternoon in CI forever with no obvious relation to any change. Both helpers now take the anchor.

### The verification, against real data

The counting answer was checked against the source rows rather than trusted:

| Group | Answer | Counted from `/api/v1/leads` |
|---|---|---|
| Goa | 14 | 14 |
| Bali | 7 | 7 |
| Dubai / Japan | 5 / 5 | 5 / 5 |
| Lisbon / Paris | 4 / 4 | 4 / 4 |
| Tokyo | 3 | 3 |

47 rows read in total; the 3 suppressed groups account for the other 5. The `/leads` deterministic payload returned 39 insights alongside 3 ranked, `rankingVersion: insight-ranking.v1`, and a `suppressedCount` of 0 read from the **now-migrated** tables rather than failing open.

### Migration applied, and the smoke check is automated

`db:migrate:deploy` was applied to the local dev database (the only pending migration was this one; schema is now up to date). Reverting, if wanted, is `DROP TABLE "crm_assistant"."InsightState", "crm_assistant"."InsightDecision";` plus deleting the row for `20260912120000_add_insight_state_and_decisions` from `_prisma_migrations`.

`Management/e2e/copilot-smoke.spec.js` turns the mandatory post-deploy check into a test: the `/leads` panel renders ranked rows with the `data-copilot-*` hooks in band order, each with a finite score and a "Why now" line; and the counting question produces an answer that carries a number and does **not** produce "No grounded answer for that question." Both pass against the live stack and a real model round trip. This is the check that replaced the declined drift safeguard, so it should be run on every release.

---

## 5. Testing it by hand — the failures that only show up live

The first live pass asked the questions an operator actually asks, and they failed. Each failure had a different cause, and none of them could have been found by the unit suites.

### The loop never concluded

"Tell me about our best performing packages" failed on three pages. The log said `ask exhausted its tool calls without a final answer` — after four tool rounds the loop **returned an empty answer**. The model had the data; nothing ever told it to stop gathering. The tool budget was being treated as the answer budget.

Two fixes: a **forced final answer** after the tool rounds (claims-only schema, no tool block, told that a plain statement of what the scope cannot show is a correct answer), and a **6s answer reserve** carved out of the one 17s budget so the tool rounds cannot consume the time the answer needs. `MAX_TOOL_CALLS` went 4 → 3.

The reserve was not optional. With only the forced call, live asks still failed: each round costs ~3s, four rounds ate the whole 17s, and the forced call was skipped by its own budget guard. Measured: every ask on overview, billing and leads ended that way, including questions the tools can answer.

### An honest "I can't" was unrepresentable

The validator rejects any claim citing no evidence (`no-valid-evidence`), so a model-authored limitation could never survive — which is why the product's only vocabulary for "I can't answer that" was a bare refusal. The limitation is therefore **server-authored**: a single block, `facts` and `evidenceIds` empty (both valid on the wire, so the client renders it through the ordinary claim path with no change), built from the actor's catalogue.

**Its wording is keyed to the cause, and that matters.** The first version said "I could not answer that from this page" for everything — and then the Gemini key hit `429`, so the panel blamed the *page* for a *provider* fault. That would teach an operator to stop asking questions the scope can answer. The loop now returns a `reason` (`answered` / `no-final-answer` / `generation-failed` / `budget-exhausted`) and the wording follows it: a provider fault says so and is not a claim about the page.

### Whole budgets spent on rejected tool calls

The model systematically called `listInvoices({ leadId })` and `listLeads({ leadId })`. The strict arg schema rejected both, `executeTool` returned a bare "Unrecognized key", the model repeated the identical call, and three rounds were gone before the forced answer ran.

Two fixes. The error now names the accepted arguments, **derived from the tool's own schema** so it cannot drift. And `listInvoices` accepts `leadId` for real — "which of this lead's invoices are overdue" is a legitimate question and `GET /invoices/lead/:leadId` already existed; the tool simply never offered it. The by-lead endpoint returns a single record, so that is wrapped rather than discarded as "no rows".

### The worst one: the model relabelled an entity

On the Packages page, "Where is the catalogue concentrated?" answered **"Your lead catalogue is concentrated on Goa."** Every number in it was true and correctly cited — so the validator, which checks grounding, was satisfied. The error was *substitution*: the page measured leads and the sentence called them the catalogue.

Grounding cannot catch that by construction, so the fix is a prompt rule on all three ask paths: the scope names the subject, and a question about something the scope does not carry is answered by saying so — "a list of leads is not a catalogue". Verified live afterwards on the same question: *"This page is about packages, not leads, so the lead list cannot answer where the catalogue is concentrated."*

### Running the model locally: the DeepSeek route

The Gemini key's free-tier quota is spent (limit 20 requests per window, model `gemini-3.5-flash`), which surfaces as `status: 429` and an immediate failure. For local testing the assistant can be routed to DeepSeek:

```bash
# 1. the shim, which translates Gemini REST -> DeepSeek chat/completions
DEEPSEEK_API_KEY=... DEEPSEEK_MODEL=deepseek-flash node ~/.gstack/deepseek-gemini-shim.mjs
# 2. the app, with the host rewritten at the fetch layer
cd Services && NODE_OPTIONS=--import=file:///home/kevin/.gstack/gemini-redirect.mjs npm start
```

Both files live in `~/.gstack/` deliberately, outside the repo, so they cannot be committed. **`GEMINI_NEXT_GEN_API_BASE_URL` does not do this** — the plain `new GoogleGenAI({ apiKey })` client hard-codes the host and only the SDK's next-gen client reads that variable; the fetch hook is what actually redirects. `GEMINI_MODEL` is set to `deepseek-flash` so logs and telemetry name the model that answered.

Two caveats to keep in mind when judging behaviour: the shim's translation is **lossy** (DeepSeek accepts JSON mode but not a JSON schema, so the schema is injected into the prompt instead), and therefore **what you see is DeepSeek's behaviour, not Gemini's**. Revert with `unset NODE_OPTIONS` and stop the shim.

---

## 6. Cross-site insights, and the end of the "briefing" name

Two changes, one release. **Reach**: the chat reads any domain from any page, while the panel keeps
ranking what the page volunteers unprompted — the mechanism the approved reach design specifies
(actor catalogue + bounded domain reads), not the multi-scope bundles it rejected. **Name**: the panel,
its copy, the client identifiers and the wire mode are all **Insights**.

### What was added

Six tools, each calling a route that already existed, each gated by the same roles as that route's own
guard: `getDashboardSnapshot`, `getLeadAnalytics`, `getPackagePerformance`, `getSalesPerformance`,
`getMyPerformance`, `searchPackages`. The catalogue went from three tools to nine, and a superadmin
still gets everything while an unrecognised role still gets nothing.

Two of them encode a decision worth keeping: `/dashboard/stats` and the personal-performance route both
embed `recentLeads` rows carrying customer **email** addresses, and those are simply not in the
projection — a model prompt is not a place for PII, and the rows are record-level detail rather than
cross-site intelligence. The capability line an operator sees is built from coarse **subjects** that
dedupe, so it reads "company performance, invoices, leads, packages and your performance" rather than
enumerating nine tool names.

The two prompt rules that the widening invalidated were rewritten rather than left to contradict it:
the entity rule now says the scope names what is **volunteered**, not what may be **read**, and keeps
its ban on relabelling one entity as another; the counting rule now points at the tool that carries the
subject rather than at counting a capped list by hand.

### What was removed

`adapter.askTools(scope)` and the per-page `tools` declarations, plus `describeCatalogue` and its
"page declared a tool this role forbids" warning. The catalogue replaced that gate two releases ago,
so after the widening the only thing keeping it alive was its own tests — and a gate that looks live
but gates nothing is an invitation to re-wire it. The per-scope `isRecordScope` discriminator stays,
because `loadEvidence` still needs it.

The wire mode is renamed with a **tolerant read**: the contract accepts both `'briefing'` and
`'insights'`, the controller normalises the old value and logs that it arrived. Whoever ships this
drops `'briefing'` in the release after the client is out, and that warning is what tells them when.

Both panels now carry `data-copilot-panel="record" | "collection"`. The e2e swap assertion used to
distinguish them by heading text; with both titled "Insights" that assertion would have proved nothing,
so it now asserts on the marker instead.

### Evidence

The two questions that were unanswerable, asked live on `/packages` through the gateway:

- *"tell me about our best performing packages"* → "Japan Cultural Journey is your clear best performer,
  carrying every inquiry in the catalogue", with the inquiry trend and a warning that nothing has
  converted. The log shows `ask tool call tool: "getPackagePerformance"`.
- *"Where is the catalogue concentrated?"* → "the catalogue holds seven itineraries… concentrated on
  Japan… every other destination shows zero inquiries". It no longer answers about leads.

Cross-site from a page that carries none of it: on `/billing`, *"how are we doing overall?"* answers
from the company snapshot. The `/leads` counting question is unchanged (Goa 14, Bali 7, Dubai 5,
Japan 5, Lisbon 4, Paris 4, Tokyo 3), so the widening did not disturb it.

Suites: 706 service, 116 contracts, 535 client, 22 harness; lint and `tsc --noEmit` clean. The smoke
spec — which now also asserts the heading reads "Insights" with the page named beneath it — passes
against the live stack.

### A computed answer needs no citation (the follow-up defect)

The cross-site tools above shipped working, and the very next hand test refused the same questions. The
log said `every ask claim was rejected`, all five claims `no-valid-evidence` — not "unsupported number",
not a tool failure.

**The mechanism.** The server mints an id for every tool result (`tool:<name>:<n>`, in
`agentRunner.js`'s `historyToEvidence`) and registers it as evidence, but the prompt prints a tool result
as `{"tool":…,"result":…}` — **the id is never shown to the model**. The shared grounding rule says every
claim must cite `evidenceIds`, so the model invented one; when the invention missed, every claim was
deleted and the panel said "No grounded answer for that question." It was intermittent exactly because it
was a guess: `tool:getPackagePerformance:1` is both the natural guess and the real shape, so it landed
sometimes and the same question answered or refused depending on luck.

**The fix, and the decision that mattered.** `validateClaims` now admits a claim whose support is what the
turn computed, and checks its numbers against **every** computed result of the turn rather than a cited
subset. The selector is the **id shape** (`tool:` prefix, or `:aggregate:`), never `type === 'computed'`:
page evidence already carries items with `type: 'computed'` that are renderable and citable — the
validator's own fixture has `metric:conv` — so a type-keyed rule would have admitted claims that must
still cite. A test asserts both halves of that: a citation-less claim is refused when the turn computed
nothing, and the page path keeps its strictness.

The floor is untouched: a number that resolves to nothing is still `unsupported-number`, unsafe prose is
still rejected, and a citation-less claim with nothing computed is still `no-valid-evidence`. The prompt
gained one answer-only line (`COMPUTED_CLAIM_RULE`) saying a tool-derived claim may cite nothing — the
shared `GROUNDING_RULES` block is unchanged, because it stays true for the briefing and for page evidence,
and a test asserts both prompts still use it verbatim.

**Evidence.** All three reported questions now answer on `/packages` — "Japan Cultural Journey is the clear
leader, drawing all five inquiries", with the honest warning that nothing has converted — and the newest
run accepted 6 of 6 claims with no rejection at all. Suites: 715 service, 116 contracts, 535 client,
22 harness; lint and `tsc --noEmit` clean; the browser smoke check 2/2.

---

## 8. State of the work

### Done and verified

| Area | Status |
|---|---|
| Harness (synthetic book of business, scenarios, adversarial corpus, tone gate, action seam, CI workflow) | 63 tests + `--dry-run` verified; the HTTP suite is written and **never executed** (no live stack) |
| T1 — identity, scoring, gate, selection, pipeline | `src/insights/{keys,score,gate,rank,pipeline,actions}.js`, 626 service tests green |
| Engine | All 11 predicates emit derivation facts and `entityRef` |
| Validation | Number resolution by exact token equality; derivation facts proved by their own rule |
| Contracts | Extended additively; strict-parse test in place |
| Prompts | `groundingRules.js` shared; `managementAnswer.v2` and `managementBriefing.v2`; v1 untouched |
| Response | `ranked`, `suppressedCount`, `suppressedCriticals`, `rankingVersion` exposed **alongside** the unchanged `insights` |

### Not switched on

The ranked view is exposed but **not rendered**: `insights` still drives the panel. Flipping it is the client half of the lockstep change, and doing it alone would show fewer items with no way to expand them.

Suppression logic exists and is proven by fixtures, but nothing populates `priorState` — `InsightState` arrives with T2. That is why `suppressedCount` reports a real `0`: a true zero for "not implemented" is distinguishable from asserting nothing was flagged.

### T2 — lifecycle state (server side complete)

`InsightState` and `InsightDecision` models plus a migration, `src/insights/state.js` for access, and the controller wired: one batched scope read before ranking, plus fire-and-forget decision rows and surfacing counters. `suppressedCount` is now real, computed from the pipeline's decisions.

Two policies are deliberately opposite and both are tested:

- **the suppression read fails OPEN.** An unreadable state shows everything. The alternative's failure mode is the worst in this design: an empty panel on a transient blip that an operator cannot tell from a quiet page.
- **writes never break the product.** Decision rows and counters swallow failures and log. An acknowledgement does not: it is awaited and fails loudly, because an acknowledgement the operator believes happened and did not is worse than an error.

**The migration is written but NOT applied.** The shared dev database has no `InsightState` or `InsightDecision` table yet, so today the read throws and fails open (no suppression) and the writes warn. That is why the tests pass without a database, and it means applying the migration is a separate, deliberate step: `cd Services/assistant-service && npm run db:migrate:deploy`.

### T8 — correlation id (done)

`forwardActorHeaders` now propagates `x-request-id`, so a domain read can be joined to the turn that made it. Before this, every evidence read and tool call arrived at lead-service, billing-service and the rest without it and each minted a fresh id — leaving the decision log unjoinable to the very reads it describes.

### T3 — the aggregate precompute (done)

`src/insights/aggregate.js` plus the wiring in `handleAsk`. The grouping runs **before** generation, over the rows the bundle already holds, so no second read is issued on the critical path and the panel's own evidence and the answer's number describe the same read.

Two rules keep it honest:

- **The field comes from the operator's own words.** "by destination" groups by destination; a question with no named field produces no aggregate at all and falls through to the tool loop. Guessing a field yields a confident answer to a question nobody asked, which is worse than not answering.
- **A group smaller than `MIN_GROUP_SIZE` (3) is dropped and counted**, not shown: a group of one or two is a record wearing a summary's clothes.

The aggregate items are citable at validation time as well as in the prompt; otherwise a correct count would be deleted for citing evidence the validator could not see. End-to-end test: a counting question now returns a count-bearing answer, while a claim stating a number with nothing behind it is still refused.

Note the per-number invariant, found by writing that test: a claim stating two numbers must declare both as facts, or the undeclared one rejects the claim.

### T4 — the actor-derived vocabulary (done)

`src/insights/catalogue.js` (`toolsForActor`, `mayUseTool`, `describeCatalogue`, `CATALOGUE_VERSION`) reading `ManagementToolAccess`, plus Zod-validated identity headers. Superadmin gets everything, matching every service's bypass; an unrecognised role gets an empty vocabulary rather than a guess. The controller logs when a page declares a tool the role may not use — informative, since the page no longer gates it.

### T6 — the ranked view is rendered (done)

`types.ts` gained the ranking fields and the session surface; `useCopilotSession` maps `ranked`, `suppressedCount`, `suppressedCriticals` and `rankingVersion`; `CollectionBriefing` renders the ranked list behind the six `data-copilot-*` hooks the e2e spec pins.

Three rules the rendering holds to, each with a test:

- **Server order is rendered as received.** A test feeds an `info` above a `critical` and asserts the DOM keeps that order. A client that re-sorted would replace the ranking with its own opinion, and the two would disagree in exactly the case the ranking exists for.
- **`show more` is a slice, not a second sort.** It appends the remainder in server order, and the expansion resets when the scope changes, so an expanded list cannot leak onto the next page.
- **The quiet count never stands in for a hidden critical.** `suppressedCount` and `suppressedCriticals` render as two separate statements; collapsing them would hide the one that matters.

Model claims keep the sectioned rendering: they carry no score, so presenting them as ranked would display an explanation the server never produced. `insights` remains the fallback, so a server without the ranking renders exactly as before — the client deploys before the service without a broken window, and the flip is complete once the service ships.

Also fixed while mapping the payload: the client mapper read only the singular `fact`, so the plural `facts` a computed rule emits were dropped. It now reads both, and the fields are checked rather than asserted because the type is lost at the JS service boundary.

### T7 — contract drift test (still deferred, deliberately)

Recorded in `TODOS.md` under the eng-review 4C decision: the safeguard was declined in favour of downtime plus the mandatory post-deploy smoke check. Left deferred rather than implemented, because building it now would re-open a settled decision.

### Post-deploy smoke check (mandatory, now automated and passing)

`Management/e2e/copilot-smoke.spec.js`. It is the replacement for the declined drift safeguard, so it is not optional — run it on every release. Both cases passed against the live stack on 2026-09-12; see section 4 for what that run found.

The unit suites still touch no database and mock the model, so the live run remains the only end-to-end evidence.

### Uncommitted

Nothing is committed on the branch. The harness, docs, CI workflow and all of T1 are in the working tree, along with pre-existing staged worktrunk files that are not part of this change.
