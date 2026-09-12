# Synthetic scenario suite

Measures whether the Management copilot reduces operator load, how it behaves on bad data and unexpected input, and whether its answers read like a colleague rather than a machine.

Everything here scores against **known ground truth**, which is the point: because we author the data, we know the right answer, so answer correctness is measurable. Production data can never do that.

## Run it, in this order

```bash
# 0. harness logic only, no stack needed (fast, safe, run often)
cd Services/e2e-tests && npm run test:unit

# 1. inspect the plan without touching anything
node Services/e2e-tests/synthetic/seed-synthetic.mjs --dry-run

# 2. the stack must be up for anything below
cd Services && npm run dev

# 3. seed (writes to the shared dev database, marker-tagged)
node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit

# 4. score the copilot against the seed
cd Services/e2e-tests && E2E_I_UNDERSTAND_SHARED_DB=true npm test

# 5. remove exactly this run
node Services/e2e-tests/synthetic/seed-synthetic.mjs --cleanup --run-id=<runId>
```

`--commit` prints the run id, which `--cleanup` needs. Add `--manifest=/tmp/synth.json` to get the resolved slot-to-id map, and `--with-adversarial` for the 23 bad-data rows (kept out of the default run so the clean workload stays clean).

## Do not do this

**Never run `--commit` to test the safety guard.** `E2E_I_UNDERSTAND_SHARED_DB=true` already lives in this package's `.env`, so the guard PASSES and the script proceeds to write real rows. To exercise the guard, unset the variable; do not invoke commit mode as a probe.

## What is here

| File | What it is |
|---|---|
| `scenarios.v1.md` | The scenario catalogue: workload, questions, ground truth, pass criteria, and the authorability gaps |
| `seed-synthetic.mjs` | Deterministic, marker-tagged generator. Also the single source of truth for every expected number (`GROUND_TRUTH`) |
| `synthetic.spec.js` | Drives the copilot through the gateway and scores every turn |
| `score.js` | Pure scoring: set match, order, counts, band order, tone. No network |
| `score.test.js` | Unit tests for the above, runnable without a stack |
| `adversarial.v1.jsonl` | 23 bad-data rows with the expected behaviour for each |
| `failure-injection.md` | The degraded paths, how to induce each, and what must hold |
| `baseline-time-and-motion.md` | The manual denominator: what the same answers cost today |
| `last-run.json` | Written by the spec on each run, so consecutive runs can be compared |

## Two things to know before trusting a green run

1. **Some scenarios cannot be seeded.** The mock flight and hotel clients pin dates and always return confirmation codes, so several bands in the catalogue are unreachable through the API, and staleness has no setter. Every such case is listed in `GROUND_TRUTH.authorability` with its reason and evidence. A green run means the scenarios that *can* be seeded pass, not that every scenario in the catalogue ran.
2. **A run costs about 22 minutes** of throttled requests against the gateway's 280-per-15-minutes window. That is deliberate: the suite paces itself rather than tripping the rate limiter and confusing a throttle for a failure.

## The one number that matters

`baseline-time-and-motion.md`. Everything else measures whether the copilot answers correctly. That file measures whether the answer was worth having, which is the only input to a claim about reducing agent load.
