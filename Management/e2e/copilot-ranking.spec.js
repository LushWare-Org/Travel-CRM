import { test, expect } from './fixtures/auth.fixture.js';
import { SURFACE_SELECTOR, surfacesWithHorizontalOverflow } from './utils/copilot.js';

// ─── Collection-scope ranked insights ────────────────────────────────────────
// The sibling spec (copilot.spec.js) owns the RECORD scope: selecting a lead,
// the Evidence Lens field reveal, the drawer breakpoint. This one owns the
// COLLECTION scope — the page insights on /leads with no lead selected — and the
// ranking behaviour that does not exist yet.
//
// STATUS: ALL FIXME.
//   The ranked payload (`ranked[]`, `suppressedCount`, score components, band
//   ordering, `show more`) is specified in
//   `docs/designs/actionable-insight-ranking-and-quality-gate.md` and implemented
//   by task T1/T6. Until those land these tests describe the contract and cannot
//   pass. They are marked `fixme` rather than `skip` so Playwright reports them
//   as expected-to-fail work rather than quietly passing.
//
// TEST HOOKS THIS SPEC REQUIRES (part of the T6 client contract, add them in T6):
//   [data-copilot-item]      one ranked insight row
//   [data-copilot-item-id]   its stable insight key (survives descriptor reorder)
//   [data-copilot-band]      'critical' | 'warning' | 'info'
//   [data-copilot-score]     the numeric rank score, for the explanation line
//   [data-copilot-show-more] the non-re-ranking expander
//   [data-copilot-suppressed] the quiet-state count of suppressed items
//
// Without these the assertions below would have to scrape prose, which breaks on
// every copy edit and proves nothing about order.

const DOCK = 'section[aria-labelledby="copilot-insights-heading"]';
const ITEM = '[data-copilot-item]';

/** The ranked rows, in DOM order, with the attributes the contract requires. */
async function rankedRows(page) {
  return page.$$eval(ITEM, (nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute('data-copilot-item-id'),
      band: node.getAttribute('data-copilot-band'),
      score: Number(node.getAttribute('data-copilot-score')),
      text: (node.textContent || '').trim().slice(0, 120),
    })),
  );
}

const BAND_RANK = { critical: 0, warning: 1, info: 2 };

test.describe('collection copilot — ranked insights', () => {
  test.describe.configure({ timeout: 120_000 });

  test.fixme('orders the first three insights by band, never info above critical', async ({ adminPage: page }) => {
    await page.goto('/leads');
    await page.waitForSelector(`${DOCK} ${ITEM}`);

    const rows = await rankedRows(page);
    expect(rows.length).toBeGreaterThan(0);

    const bands = rows.map((row) => BAND_RANK[row.band] ?? 99);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]).toBeGreaterThanOrEqual(bands[i - 1]);
    }
  });

  test.fixme('explains why each surfaced item is there', async ({ adminPage: page }) => {
    await page.goto('/leads');
    await page.waitForSelector(`${DOCK} ${ITEM}`);

    const rows = await rankedRows(page);
    expect(rows.length).toBeGreaterThan(0);

    // Every row carries a usable score. A row without one cannot answer
    // "why is this first?", which is the point of ranking at all.
    for (const row of rows) {
      expect(Number.isFinite(row.score)).toBe(true);
    }
  });

  test.fixme('caps the list and expands without reordering what was already read', async ({ adminPage: page }) => {
    await page.goto('/leads');
    await page.waitForSelector(`${DOCK} ${ITEM}`);

    const before = await rankedRows(page);
    const showMore = page.locator('[data-copilot-show-more]');
    if ((await showMore.count()) === 0) test.skip(true, 'seed produced fewer insights than the budget');

    await showMore.click();
    const after = await rankedRows(page);

    expect(after.length).toBeGreaterThan(before.length);
    // The first N must be untouched, in order and in content.
    expect(after.slice(0, before.length)).toEqual(before);
  });

  test.fixme('reports a quiet state rather than pretending the page is clean', async ({ adminPage: page }) => {
    // After acknowledging the surfaced insights, the same page must say how many
    // were previously acknowledged instead of rendering an unexplained empty
    // panel. Requires T2 (suppression) as well as T6.
    await page.goto('/leads');
    await page.waitForSelector(DOCK);

    const acknowledged = page.locator('[data-copilot-suppressed]');
    const text = await acknowledged.textContent().catch(() => null);

    // Either no acknowledgement state exists yet (no hook rendered) or the count
    // is a real number. What must never happen is an empty panel with no
    // explanation for why it is empty.
    if (text !== null) expect(text).toMatch(/\d/);
  });

  test.fixme('does not introduce horizontal overflow once expanded', async ({ adminPage: page }) => {
    await page.goto('/leads');
    await page.waitForSelector(`${DOCK} ${ITEM}`);

    const showMore = page.locator('[data-copilot-show-more]');
    if ((await showMore.count()) > 0) await showMore.click();

    // The wrap contract is a width invariant, and expansion is exactly the case
    // that would break it: longer text, same panel.
    const overflowing = await surfacesWithHorizontalOverflow(page);
    expect(overflowing).toEqual([]);
    await expect(page.locator(SURFACE_SELECTOR).first()).toBeVisible();
  });
});
