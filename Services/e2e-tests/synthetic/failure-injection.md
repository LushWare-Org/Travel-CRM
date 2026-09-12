# Failure injection

The degraded paths are where operators lose trust fastest, and they are the ones a happy-path suite never touches. Each case below names how to induce it locally, what must hold, and what a failure looks like.

Run these against the local stack only, with the shared dev DB and the same `E2E_I_UNDERSTAND_SHARED_DB=true` guard the rest of the suite uses.

## F1 — A domain service is down

**Induce:** stop one source service, for example lead-service, then open `/leads`.

**Must hold:**
- the panel still renders the sections it can
- the failed source is reported **with a reason**, not as a bare count
- an ask about the affected data returns a labelled partial, never a fabricated count
- no 500 and no unhandled rejection

**Failure looks like:** "partially loaded, 1 sources unavailable" with no reason, or a total presented as complete.

## F2 — The model provider is unavailable

**Induce:** set `GEMINI_API_KEY` to an invalid value and restart assistant-service.

**Must hold:**
- the deterministic phase renders normally, ranked, with actions
- the briefing falls back to deterministic insights without an error banner that implies data loss
- **actions and ordering explanations survive the fallback** (this is the specific regression the field mapping would cause)
- an ask returns an honest empty answer rather than a stack trace

**Failure looks like:** an empty panel, or a panel with no action affordances, in the degraded state.

## F3 — The model is slow

**Induce:** point the service at a local stub that delays the response past the stage-2 timeout. There is no env knob for this, so a stub is required; state that plainly rather than pretending the case is covered.

**Must hold:** the turn fails in one specific way with one specific category (timeout), inside the client's abort, and the panel keeps the deterministic list.

## F4 — The aggregate overruns its budget slice

**Induce:** set the precompute's budget slice to a tiny value, or add a delay to the stub.

**Must hold:** the answer still arrives, built on whatever came back, labelled partial. The floor reserved for generation is respected.

**Failure looks like:** an empty answer after the data was actually retrieved.

## F5 — The suppression state read fails

**Induce:** break the `InsightState` read (wrong table name, or a revoked connection).

**Must hold:** **fail open** — everything is shown. A read failure must never blank the panel.

**Failure looks like:** an empty panel on a transient DB blip. This is the single most damaging silent failure in the design, because it looks like a quiet page.

## F6 — The decision-log write fails

**Induce:** lock or rename the log table.

**Must hold:** the response is unaffected; the failure is logged; the operator sees nothing. Instrumentation must never be able to break the product.

## F7 — Rate limit reached

**Induce:** exceed the management route's limiter.

**Must hold:** a distinguishable error the client can render as "too many requests" rather than a generic outage.

## F8 — Returning the next day

**Induce:** seed an `InsightState` row with `lastSurfacedAt` in the past, or freeze the clock.

**Must hold:** the acknowledged insight stays quiet, `suppressedCount` reports it, and **a critical still surfaces**. Both halves matter: suppression that never releases is silence, and suppression that releases everything is not suppression.

## What every case must produce

| Output | Why |
|---|---|
| One specific failure category | The reason this suite exists is that today a dead end has five possible causes. Each injection must produce exactly one distinguishable signal |
| A labelled degraded state | "Partial" must be visible and must name the reason |
| No fabricated value | A degraded answer may be short; it may not be wrong |
| An unaffected panel | Instrumentation and optional features never take the product down with them |
