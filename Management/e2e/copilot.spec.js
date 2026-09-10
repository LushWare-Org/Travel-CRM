import { test, expect, getToken } from './fixtures/auth.fixture.js';
import { inputByTestId, phoneInputByTestId, leadRowByName } from './utils/selectors.js';

// The Management copilot Evidence Lens, driven through the real gateway and the
// real assistant-service. Like lead-lifecycle.spec.js this creates its own lead
// through the actual UI and deletes it afterwards, so the shared DB does not
// accumulate rows.
//
// The unit suites own the exhaustive state matrix (no scope, partial, no
// access, stale-response suppression, reduced motion, missing anchors). This
// spec owns the things only a real browser against a real stack can prove:
// the dock never covers the record, the field reveal actually moves focus into
// the lead record, the operator-scoped visibility preference survives a reload,
// and the breakpoint flip changes the surface.

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const DOCK = 'section[aria-labelledby="copilot-briefing-heading"]';
const DETAIL_PANE = '[aria-label="Lead detail"]';

let createdLeadId;

test.afterAll(async () => {
  if (!createdLeadId) return;
  const token = await getToken('superAdmin');
  await fetch(`${API_URL}/leads/${createdLeadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
});

test.describe('Management copilot — Evidence Lens', () => {
  // One journey across lead creation, two model round-trips, a reload, and a
  // breakpoint flip — well past Playwright's 30s default.
  test.describe.configure({ timeout: 120_000 });

  test('selecting a lead opens the briefing and reveals the field a claim cites', async ({ adminPage: page }) => {
    const leadName = `E2E Copilot Lead ${Date.now()}`;

    await test.step('create a lead through the UI', async () => {
      await page.goto('/leads');
      await page.getByRole('button', { name: 'New Lead' }).click();
      await inputByTestId(page, 'new-lead-name').fill(leadName);
      await phoneInputByTestId(page, 'new-lead-phone').fill('712345678');
      await inputByTestId(page, 'new-lead-package').selectOption({ label: 'Manual Itinerary (No Package)' });

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) => res.request().method() === 'POST' && /\/api\/v1\/leads$/.test(new URL(res.url()).pathname)
        ),
        page.getByRole('button', { name: 'Create Lead' }).click(),
      ]);
      createdLeadId = (await response.json())?.data?.id;
      await expect(page.getByText('Create New Lead')).toHaveCount(0, { timeout: 15_000 });
    });

    await test.step('row selection renders the record pane and binds the copilot scope', async () => {
      // Click a neutral cell: several action cells in the row stop propagation,
      // and Playwright's default row click lands on the row's centre.
      await leadRowByName(page, leadName).getByText(leadName, { exact: true }).click();
      const pane = page.locator(DETAIL_PANE);
      await expect(pane).toBeVisible();
      await expect(pane).toContainText(leadName);

      // Every allowlisted field publishes the id the adapter emits, so the
      // reveal resolver has a target for each claim it can render.
      for (const field of ['id', 'lifecycleStatus', 'name', 'destination', 'createdAt', 'updatedAt']) {
        await expect(pane.locator(`[data-copilot-evidence-id="lead:${createdLeadId}:${field}"]`)).toHaveCount(1);
      }
    });

    await test.step('the dock opens without covering the record', async () => {
      const dock = page.locator(DOCK);
      await expect(dock).toBeVisible({ timeout: 15_000 });
      await expect(dock.getByRole('heading', { name: 'Lead briefing' })).toBeVisible();

      // Layout, not overlay: the dock must not be position: fixed, and the
      // record and dock must not overlap.
      const position = await dock.evaluate((el) => getComputedStyle(el.closest('div') || el).position);
      expect(position).not.toBe('fixed');

      const paneBox = await page.locator(DETAIL_PANE).boundingBox();
      const dockBox = await dock.boundingBox();
      expect(dockBox.x).toBeGreaterThanOrEqual(paneBox.x + paneBox.width - 1);

      // The operator-scoped preference persists at `xl` and wider.
      const visibility = await page.evaluate(() =>
        Object.entries(localStorage).find(([k]) => k.endsWith(':visibility'))?.[1]
      );
      expect(visibility).toBe('open');
    });

    await test.step('a claim reveals the exact allowlisted field it cites', async () => {
      const action = page.locator(`${DOCK} button[aria-label^="Evidence:"]`).first();
      await expect(action).toBeVisible();

      // The first claim's cited field varies with whichever claims survived
      // validation, so take the field from the action's own accessible name —
      // "Lead lifecycleStatus" (deterministic) or "Lead <id> · lifecycleStatus".
      const label = (await action.getAttribute('aria-label')) ?? '';
      const field = label.replace(/^Evidence:\s*/, '').split(/[·\s]+/).filter(Boolean).pop();
      expect(field).toBeTruthy();

      await action.click();

      const citedField = page.locator(`[data-copilot-evidence-id="lead:${createdLeadId}:${field}"]`);
      await expect(citedField).toHaveClass(/copilot-evidence-pinned/);
      await expect(citedField).toBeFocused();
    });

    await test.step('collapsing persists across a reload', async () => {
      await page.locator(`${DOCK} button[aria-label="Collapse copilot"]`).click();
      await expect(page.locator(DOCK)).toHaveCount(0);
      await expect(page.getByRole('button', { name: /open copilot/i })).toBeVisible();

      await page.reload();
      await expect(page.getByRole('button', { name: /open copilot/i })).toBeVisible();
      await expect(page.locator(DOCK)).toHaveCount(0);
    });

    await test.step('below xl the same body renders in a focus-managed drawer', async () => {
      await page.setViewportSize({ width: 1279, height: 900 });

      // The reload above dropped the React-held selection, so re-select the
      // lead the drawer should be briefing.
      await leadRowByName(page, leadName).getByText(leadName, { exact: true }).click();

      // The rail and the drawer trigger share the "Open copilot" name, so wait
      // for the media query to drop the desktop surface before clicking —
      // otherwise the click lands on the rail's expand control, which only
      // persists visibility and never opens the drawer.
      await expect(page.locator('[data-copilot-surface="dock"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /open copilot/i })).toHaveCount(1);

      const trigger = page.getByRole('button', { name: /open copilot/i });
      await trigger.click();

      const drawer = page.locator(`[role="dialog"] ${DOCK}`);
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('heading', { name: 'Lead briefing' })).toBeVisible();

      // The modal makes the record inert, so the same action falls back to the
      // inline evidence detail rather than moving focus behind the drawer.
      const action = drawer.locator('button[aria-label^="Evidence:"]').first();
      await expect(action).toBeVisible();
      await action.click();

      const detail = page.getByRole('region', { name: 'Evidence detail' });
      await expect(detail).toBeVisible();
      await expect(detail).toContainText('not captured');
    });

    await test.step('clearing the selection leaks no previous session content', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.keyboard.press('Escape');
      await page.locator(`${DETAIL_PANE} button[aria-label="Close lead detail"]`).click();

      // T1's core guarantee: no scope means the session unmounts and renders
      // guidance — never the previous lead's claims or a usable composer.
      const dock = page.locator(DOCK);
      await expect(dock).toContainText('Select a lead to generate its situation briefing.');
      await expect(dock.locator('button[aria-label^="Evidence:"]')).toHaveCount(0);
      await expect(page.locator(DETAIL_PANE)).toContainText('Select a lead to see its details and evidence.');
    });
  });
});
