import { test, expect } from './fixtures/auth.fixture.js';
import { SURFACE_SELECTOR } from './utils/copilot.js';

// ─── The post-deploy smoke check ─────────────────────────────────────────────
// The capability plan makes this mandatory: after a release, open /leads, ask one
// counting question, confirm a count-bearing answer renders. It is the replacement
// for the contract-drift safeguard the eng review declined (decision 4C), so it is
// not optional — it is the only thing standing between a contract mismatch and a
// silently empty panel.
//
// It needs a live stack AND a real model round trip: the answer is generated, so
// the counting question cannot be answered by a fixture. Run it against the local
// microservices stack (`cd Services && npm start`) with GEMINI_API_KEY set.

const DOCK = 'section[aria-labelledby="copilot-insights-heading"]';
const RANKED_ITEM = '[data-copilot-item]';
const BAND_RANK = { critical: 0, warning: 1, info: 2 };

test.describe('copilot smoke — the counting question', () => {
  test.describe.configure({ timeout: 180_000 });

  test('the /leads panel renders a ranked list that explains itself', async ({ adminPage: page }) => {
    await page.goto('/leads');

    const dock = page.locator(DOCK);
    await expect(dock).toBeVisible({ timeout: 30_000 });

    // The panel is "Insights", and the page it is anchored to is named beneath the
    // heading rather than in it — the rename this check exists to catch.
    await expect(dock.getByRole('heading', { name: 'Insights' })).toBeVisible();
    await expect(dock).toContainText('Leads');

    // Ranked rows, not the legacy sectioned list: these hooks exist only on the
    // ranked path, so finding one proves the client is rendering `ranked`.
    const firstItem = dock.locator(RANKED_ITEM).first();
    await expect(firstItem).toBeVisible({ timeout: 30_000 });

    const rows = await dock.locator(RANKED_ITEM).evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-copilot-item-id'),
        band: node.getAttribute('data-copilot-band'),
        score: Number(node.getAttribute('data-copilot-score')),
      })),
    );

    expect(rows.length).toBeGreaterThan(0);

    // Every row is identifiable and scored — a row without a score cannot answer
    // "why is this first?", which is the point of ranking at all.
    for (const row of rows) {
      expect(row.id).toBeTruthy();
      expect(Number.isFinite(row.score)).toBe(true);
    }

    // Never an info above a critical. The client renders server order rather than
    // re-sorting, so this asserts the SERVER's ordering survived to the DOM.
    const bands = rows.map((row) => BAND_RANK[row.band] ?? 99);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]).toBeGreaterThanOrEqual(bands[i - 1]);
    }

    // The explanation line is rendered from server-provided components.
    await expect(dock.getByText(/Why now:/).first()).toBeVisible();
  });

  // `@requires-model` marks this as needing a real model round trip, matching the
  // convention in copilot.spec.js: the job excludes these when no provider key is
  // configured, rather than letting them fail for a reason that has nothing to do
  // with the change. The panel test above is deterministic and always runs.
  test('a counting question gets an answer that carries the number @requires-model', async ({ adminPage: page }) => {
    await page.goto('/leads');

    const surface = page.locator(SURFACE_SELECTOR);
    await expect(surface).toBeVisible({ timeout: 30_000 });

    const composer = surface.getByRole('textbox', { name: /^Ask about / });
    await expect(composer).toBeVisible({ timeout: 30_000 });
    await composer.fill('which destinations have the most leads?');
    await surface.getByRole('button', { name: 'Ask' }).click();

    const conversation = surface.getByRole('region', { name: 'Conversation' });
    await expect(conversation).toBeVisible({ timeout: 30_000 });

    // The pending row is the completion signal: it is replaced by either the
    // answer or the refusal, so waiting for it to clear waits for the outcome
    // without polling for a shape.
    await expect(conversation).not.toContainText('Checking', { timeout: 90_000 });

    // THE ACCEPTANCE CRITERION. Before this work, this exact question produced
    // this exact sentence, on every page, every time.
    await expect(conversation).not.toContainText('No grounded answer for that question.');

    // A count-bearing answer, not merely a non-refusal: the rendered text has to
    // contain a number, which is what the old validator deleted.
    const text = await conversation.innerText();
    expect(text).toMatch(/\b\d+\b/);
  });
});
