import { test, expect } from './fixtures/auth.fixture.js';

// ─── The site-wide business notification surface ─────────────────────────────
// Needs a live stack: the signals come from analytics-service, the gates and the
// read state from assistant-service. Deterministic — no model round trip.

const BAR = 'header';
const BELL = 'header [aria-label="Notifications"]';
const PANEL = '[data-slot="popover-content"]';

/**
 * Opening is idempotent: an unread critical auto-opens the panel once per
 * session, so a bare click would close the panel this assertion is about.
 */
async function openPanel(page) {
  const panel = page.locator(PANEL);
  if (!(await panel.isVisible().catch(() => false))) {
    await page.locator(BELL).click();
  }
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
}

test.describe('business notifications', () => {
  test('every page carries one bar with its own name and the bell at the right', async ({ adminPage: page }) => {
    const routes = [
      { path: '/', title: 'Dashboard' },
      { path: '/leads', title: 'Lead Management' },
      { path: '/billing', title: 'Billing' },
      { path: '/analytics', title: 'Analytics' },
      { path: '/settings', title: 'Organization Settings' },
    ];

    for (const route of routes) {
      await page.goto(route.path);

      // Exactly one bar, named for the page — the duplicate-title failure this
      // replaced is a second `h1` repeating the same string.
      const bar = page.locator(BAR);
      await expect(bar).toHaveCount(1);
      await expect(bar.getByRole('heading', { level: 1 })).toHaveText(route.title);

      // The bell is the right-most control in the bar.
      const lastControl = bar.locator('button').last();
      await expect(lastControl).toHaveAttribute('aria-label', 'Notifications');
    }
  });

  test('the bell opens the panel, which either lists insights or states a quiet state', async ({ adminPage: page }) => {
    await page.goto('/leads');
    const panel = await openPanel(page);
    await expect(panel.getByText('Notifications', { exact: true })).toBeVisible();

    // The feed cannot be assumed non-empty: acknowledgements suppress a
    // notification until its own value moves, so a stack that has been used has
    // a legitimately quiet feed. The invariant is that the panel says one thing
    // or the other — a blank panel with no explanation is the failure.
    const rows = panel.locator('[data-copilot-item]');
    await expect.poll(
      async () => (await rows.count()) > 0 || await panel.getByText('Nothing needs you right now.').isVisible(),
      { timeout: 20_000 },
    ).toBe(true);

    if (await rows.count() === 0) return;

    // Severity is described with the same vocabulary as the copilot panel.
    const severities = (await panel.locator('.sr-only').allTextContents()).map((text) => text.trim());
    expect(severities.filter((text) => /^(Critical|Warning|Information):$/.test(text)).length).toBeGreaterThan(0);

    const view = panel.getByRole('button', { name: /^View / }).first();
    expect((await view.textContent())?.trim().length ?? 0).toBeGreaterThan(4);

    await view.click();

    // The panel closes and the route carries the server-authored target.
    await expect(panel).toBeHidden();
    expect(page.url()).toMatch(/\/(leads|billing|packages|analytics)(\?|$)/);
  });

  test('a sales representative sees their own book and no organization-wide signal', async ({ salesRepPage: page }) => {
    await page.goto('/leads');
    const panel = await openPanel(page);
    await expect(panel.getByText('Your book')).toBeVisible();

    const text = await panel.innerText();
    // Both of these are org-scoped rules: a rep must never see them.
    expect(text).not.toContain('have had no owner assigned');
    expect(text).not.toContain('active packages have had no inquiries');
  });
});
