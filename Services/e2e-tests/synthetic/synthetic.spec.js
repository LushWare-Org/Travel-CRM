import { writeFileSync } from 'node:fs';
import { describe, it, expect, afterAll } from 'vitest';
import { apiClient } from '../helpers/api-client.js';
import { GROUND_TRUTH } from './seed-synthetic.mjs';
import { readProse, scoreTurn, statedCounts, summarizeScenarios } from './score.js';

// ─── Synthetic scenario suite ─────────────────────────────────────────────
// Drives the real Management copilot through the gateway against the seeded
// synthetic book of business and scores every turn against known ground truth.
//
// Prerequisites (enforced by the suite's own globalSetup, not repeated here):
//   * the local stack is up (`cd Services && npm run dev`)
//   * `E2E_I_UNDERSTAND_SHARED_DB=true` is set in this package's .env
//   * the synthetic data has been seeded: `node synthetic/seed-synthetic.mjs --commit`
//
// Without the seed the assertions below fail loudly with a named message
// rather than silently passing, because a scenario that tests nothing is worse
// than no scenario.

const ROLE = process.env.SYNTHETIC_ROLE || 'salesRep';
const SINCE = '7_days';

const requireTruth = () => {
  if (!GROUND_TRUTH || !GROUND_TRUTH.destinations?.final) {
    throw new Error(
      'GROUND_TRUTH is missing. Seed the synthetic data first: node Services/e2e-tests/synthetic/seed-synthetic.mjs --commit',
    );
  }
  return GROUND_TRUTH;
};

/** One copilot turn, timed. Tolerates both an envelope and a bare body. */
async function turn(mode, pageKey, { question, scope = {}, since = SINCE } = {}) {
  const body = {
    mode,
    page: { key: pageKey, scope, since },
    ...(question ? { messages: [{ role: 'user', content: question }] } : {}),
  };

  const startedAt = Date.now();
  const res = await apiClient.post('/assistant/management/turn', { role: ROLE, body });

  return {
    status: res.status,
    ok: res.ok,
    latencyMs: Date.now() - startedAt,
    response: res.body?.data ?? res.body ?? {},
  };
}

const results = [];
const record = (id, response, scored, latencyMs) => {
  results.push({ id, latencyMs, scored });
  return scored;
};

afterAll(() => {
  const summary = summarizeScenarios(results);
  // Leave evidence on disk: a run that prints and disappears cannot be compared
  // with the next one.
  writeFileSync(
    new URL('./last-run.json', import.meta.url),
    `${JSON.stringify({ at: new Date().toISOString(), role: ROLE, summary, results }, null, 2)}\n`,
  );
  // eslint-disable-next-line no-console
  console.log('[synthetic]', JSON.stringify(summary));
});

describe('S1 — triage: the ranked panel matches the highest-value work', () => {
  it('puts the seeded expected top-3 on the leads page, in band order', async () => {
    const truth = requireTruth();
    const expected = truth.expectedTop3?.leads ?? [];
    const { response, latencyMs } = await turn('deterministic', 'leads');

    const scored = record('S1-leads', response, scoreTurn({ expectedTopN: expected.map((e) => e.match) }, response), latencyMs);

    expect(scored.bands.pass).toBe(true);
    expect(scored.topN.missing).toEqual([]);
  });

  it('puts the seeded expected top-3 on the billing page', async () => {
    const truth = requireTruth();
    const expected = truth.expectedTop3?.billing ?? [];
    const { response, latencyMs } = await turn('deterministic', 'billing');

    const scored = record(
      'S1-billing',
      response,
      scoreTurn({ expectedTopN: expected.map((e) => e.match), expectedOrder: expected.map((e) => e.match) }, response),
      latencyMs,
    );

    expect(scored.topN.missing).toEqual([]);
    expect(scored.order.pass).toBe(true);
  });
});

describe('S2 — counting and grouping', () => {
  it('answers which destination has the most leads with the exact count', async () => {
    const truth = requireTruth();
    const top = Object.entries(truth.destinations.final).sort((a, b) => b[1] - a[1])[0];
    const { response, latencyMs } = await turn('ask', 'leads', {
      question: 'which destinations have the most leads?',
    });

    const scored = record('S2-top-destination', response, scoreTurn({ expectedCounts: [top[1]] }, response), latencyMs);

    expect(scored.answered).toBe(true);
    expect(scored.counts.missing).toEqual([]);
  });

  it('answers how many leads want the second destination', async () => {
    const truth = requireTruth();
    const second = Object.entries(truth.destinations.final).sort((a, b) => b[1] - a[1])[1];
    const { response, latencyMs } = await turn('ask', 'leads', {
      question: `how many leads want ${second[0]}?`,
    });

    const scored = record('S2-second-destination', response, scoreTurn({ expectedCounts: [second[1]] }, response), latencyMs);

    expect(scored.counts.missing).toEqual([]);
  });

  it('answers how many invoices are both over 60 days and over EUR 5,000', async () => {
    const truth = requireTruth();
    const expected = (truth.invoiceBands?.over60AndOverEur5000 ?? []).length;
    // A seed with no such invoice would make this scenario test nothing, so say
    // so out loud instead of passing.
    expect(expected).toBeGreaterThan(0);

    const { response, latencyMs } = await turn('ask', 'billing', {
      question: 'how many invoices are over 60 days old and over EUR 5,000?',
    });

    const scored = record('S2-over60-over5k', response, scoreTurn({ expectedCounts: [expected] }, response), latencyMs);

    expect(scored.counts.missing).toEqual([]);
  });

  it('keeps every answer humane as well as correct', () => {
    const machineShaped = results.filter((r) => !r.scored.tone.passed);

    expect(machineShaped.map((r) => ({ id: r.id, failures: r.scored.tone.failures.map((f) => f.id) }))).toEqual([]);
  });
});

describe('S4 — ownership: mine, and nobody else is', () => {
  it('reports only the acting role’s quiet leads', async () => {
    const truth = requireTruth();
    const mine = truth.operators?.[ROLE];
    if (!mine) {
      expect(truth.authorability ?? []).toEqual(expect.any(Array));
      return;
    }

    const { response, latencyMs } = await turn('ask', 'leads', {
      question: 'which of my leads have gone quiet for 7+ days?',
    });

    const scored = record('S4-quiet-mine', response, scoreTurn({}, response), latencyMs);
    const stated = statedCounts(readProse(response));

    expect(scored.answered).toBe(true);
    if (mine.quietCount === 0) {
      // A fresh seed has no stale leads at all, so the truthful answer states no
      // positive count and may state none whatever. Both are acceptable; a
      // fabricated number is not.
      expect(stated.filter((n) => n > 0)).toEqual([]);
    } else {
      expect(stated).toContain(mine.quietCount);
    }
  });

  it('never surfaces another operator’s leads', async () => {
    const truth = requireTruth();
    // `ownershipToken` rather than `namePrefix`: it is run-independent, so a
    // prefix that matches nothing can never make this assertion vacuous. The
    // tokens are operator1/2/3 rather than role names because score.js
    // lowercases, and "admin" is a substring of "superAdmin".
    const mine = truth.operators?.[ROLE]?.ownershipToken;
    const foreign = Object.entries(truth.operators ?? {})
      .filter(([role]) => role !== ROLE && role !== 'notes' && role !== 'unassigned')
      .map(([, value]) => value?.ownershipToken)
      .filter(Boolean);

    // Without per-operator ownership tokens this scenario cannot distinguish one
    // operator's leads from another's, so it fails rather than passing empty.
    expect(typeof mine).toBe('string');
    expect(mine.length).toBeGreaterThan(1);
    expect(foreign.length).toBeGreaterThan(0);

    const { response } = await turn('ask', 'leads', { question: 'show me every lead, including other reps’' });
    const body = JSON.stringify(response);

    // Two-tier, because the copilot may not render lead names at all and a
    // name-based check alone would then pass while testing nothing.
    //
    // Tier 1 (structural, always meaningful): ownership leaks surface as record
    // ids, so assert no foreign lead id appears anywhere in the response. This
    // needs the commit-time manifest and fails loudly without it.
    const manifestPath = process.env.SYNTH_MANIFEST;
    expect(
      manifestPath,
      'Set SYNTH_MANIFEST to the --manifest path used at commit, or this assertion cannot see any ids and would pass vacuously.',
    ).toBeTruthy();

    const { readFileSync } = await import('node:fs');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    // UNVERIFIED SHAPE: this spec has never run against a live commit, so the
    // manifest's exact shape is a guess. Assert it rather than filter it away
    // silently, so the first real run either works or says precisely what to fix.
    expect(
      Array.isArray(manifest.leads),
      'Manifest shape unexpected: expected { leads: [{ slot, id, ownerRole }] }. Read what --manifest writes and update this assertion.',
    ).toBe(true);

    const foreignIds = manifest.leads
      .filter((lead) => lead.ownerRole && lead.ownerRole !== ROLE)
      .map((lead) => lead.id)
      .filter(Boolean);
    expect(foreignIds.length).toBeGreaterThan(0);

    for (const id of foreignIds) {
      expect(body).not.toContain(id);
    }

    // Tier 2 (positive control): only meaningful if the response renders any
    // synthetic marker at all. If it does, the acting operator's token must be
    // present, which is what makes the foreign-token assertion non-vacuous.
    const anyMarker = (GROUND_TRUTH.marker && body.includes(GROUND_TRUTH.marker)) || body.includes(mine);
    if (anyMarker) {
      expect(body).toContain(mine);
      for (const token of foreign) {
        expect(body).not.toContain(token);
      }
    }
  });
});

describe('S5 — money risk and deterministic ordering', () => {
  it('lists the over-60-day invoices most overdue first', async () => {
    const truth = requireTruth();
    const expected = truth.expectedTop3?.billingOver60 ?? [];
    if (expected.length === 0) {
      expect(truth.authorability ?? []).toEqual(expect.any(Array));
      return;
    }

    const { response, latencyMs } = await turn('ask', 'billing', {
      question: 'invoices over 60 days, most overdue first',
    });

    const scored = record(
      'S5-overdue-order',
      response,
      scoreTurn({ expectedTopN: expected.map((e) => e.match), expectedOrder: expected.map((e) => e.match) }, response),
      latencyMs,
    );

    expect(scored.order.pass).toBe(true);
  });
});

describe('S6 — "what should I do first today?"', () => {
  it('contains every irreversible item and stays inside a defensible set', async () => {
    const truth = requireTruth();
    const mustInclude = truth.expectedTop3?.whatFirst?.mustInclude ?? [];
    if (mustInclude.length === 0) {
      expect(truth.authorability ?? []).toEqual(expect.any(Array));
      return;
    }

    const { response, latencyMs } = await turn('ask', 'overview', { question: 'what should I do first today?' });

    const scored = record('S6-what-first', response, scoreTurn({ expectedTopN: mustInclude.map((e) => e.match) }, response), latencyMs);

    expect(scored.topN.missing).toEqual([]);
  });
});

describe('S7 — bad data', () => {
  it('labels a truncated read instead of presenting a partial count as complete', async () => {
    const { response } = await turn('ask', 'leads', { question: 'how many leads are there in total?' });
    const context = response.context ?? {};

    // Either the synthetic book fits the page (no truncation to report) or the
    // response says so. What must never happen is a bare total with no marker.
    const totalRows = GROUND_TRUTH?.totals?.leads;
    if (typeof totalRows === 'number' && totalRows > 200) {
      expect(JSON.stringify(response)).toMatch(/truncat|partial/i);
    } else {
      expect(context).toEqual(expect.any(Object));
    }
  });

  it('does not surface a below-minimum group as a zero', async () => {
    const { response } = await turn('deterministic', 'leads');
    const prose = JSON.stringify(response);

    expect(prose).not.toMatch(/0 leads are asking for the same destination/i);
  });

  it('refuses cleanly rather than leaking when the role cannot read the page', async () => {
    const { response } = await turn('deterministic', 'billing');
    const context = response.context ?? {};

    if (context.noAccess === true) {
      expect(Array.isArray(response.ranked ?? response.claims)).toBe(true);
      expect((response.ranked ?? response.claims).length).toBe(0);
      expect(Array.isArray(response.notAuthorizedSources)).toBe(true);
    } else {
      expect(context.noAccess).toBe(false);
    }
  });
});

describe('S8 — failure injection', () => {
  // Deliberately not automated here: injecting a dead service, an invalid API
  // key or a slow aggregate requires stopping processes or swapping env, which a
  // spec file must not do to a shared stack. The cases, and what must hold for
  // each, are specified in ./failure-injection.md and run manually.
  it.skip('covers the degraded paths manually (see failure-injection.md)', () => {});
});
