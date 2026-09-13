import { test, expect, getToken } from './fixtures/auth.fixture.js';
import { inputByTestId, phoneInputByTestId, leadRowByName } from './utils/selectors.js';
import { SURFACE_SELECTOR, UNBREAKABLE_TOKEN, surfacesWithHorizontalOverflow } from './utils/copilot.js';

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
// the breakpoint flip changes the surface, and a 120-character token wraps
// inside the panel instead of widening it.

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const DOCK = 'section[aria-labelledby="copilot-insights-heading"]';
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

// `@requires-model` marks this block as needing a real Gemini round trip. CI
// excludes it with --grep-invert when no GEMINI_API_KEY secret is configured,
// because without a key the assistant service answers 503 on its model paths and
// the failure would say nothing about the change under test.
test.describe('Management copilot — Evidence Lens @requires-model', () => {
  // One journey across lead creation, two model round-trips, a reload, and a
  // breakpoint flip — well past Playwright's 30s default.
  test.describe.configure({ timeout: 120_000 });

  test('selecting a lead opens the insights and reveals the field a claim cites', async ({ adminPage: page }) => {
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
      await expect(dock.getByRole('heading', { name: 'Insights' })).toBeVisible();

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

    await test.step('a 120-character token wraps inside the dock instead of widening it', async () => {
      // One unbreakable token is the reported defect: a lead id or a URL inside
      // model prose used to widen the panel's scroll area by its full length.
      // The composer is the deterministic driver — the user turn is committed
      // before the request starts, so the transcript holds the token without
      // waiting on model output.
      const surface = page.locator(SURFACE_SELECTOR);
      await expect(surface).toHaveCount(1);
      await surface.getByRole('textbox', { name: /^Ask about / }).fill(UNBREAKABLE_TOKEN);
      await surface.getByRole('button', { name: 'Ask' }).click();
      await expect(surface.getByText(UNBREAKABLE_TOKEN, { exact: true }).first()).toBeVisible();

      expect(await surfacesWithHorizontalOverflow(page)).toEqual([]);
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
      // lead the drawer should be showing insights for.
      await leadRowByName(page, leadName).getByText(leadName, { exact: true }).click();

      // Wait for the below-`xl` media query to swap the desktop dock for the
      // drawer. The rail is "Expand copilot panel" and the floating trigger is
      // "Open copilot", so the two no longer share a name — but the dock must
      // still be gone before the click, since the rail's expand control only
      // persists visibility and never opens the drawer.
      await expect(page.locator('[data-copilot-surface="dock"]')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /open copilot/i })).toHaveCount(1);

      const trigger = page.getByRole('button', { name: /open copilot/i });
      await trigger.click();

      const drawer = page.locator(`[role="dialog"] ${DOCK}`);
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('heading', { name: 'Insights' })).toBeVisible();

      // The modal makes the record inert, so the same action falls back to the
      // inline evidence detail rather than moving focus behind the drawer.
      const action = drawer.locator('button[aria-label^="Evidence:"]').first();
      await expect(action).toBeVisible();
      await action.click();

      const detail = page.getByRole('region', { name: 'Evidence detail' });
      await expect(detail).toBeVisible();
      // What this step owns is the fallback itself: the modal makes the record
      // inert, so the evidence action opens the inline detail instead of moving
      // focus behind the drawer. It asserts the detail reports a source and a
      // value row, and deliberately not WHICH value — that depends on the phase
      // that produced the cited source. The deterministic phase ships the
      // allowlisted field values, so `Value <iso>` is the normal rendering and
      // "not captured" is the other valid one; asserting "not captured"
      // specifically made the test depend on which phase won, which is why it
      // was red on microservices before this branch existed.
      await expect(detail).toContainText('Source');
      await expect(detail).toContainText('Value');
    });

    await test.step('a 120-character token wraps inside the drawer instead of widening it', async () => {
      // The drawer hosts the same CopilotSurface below `xl`, so the same token
      // must wrap there too — asserted on the scroller, never on the dialog.
      const drawerSurface = page.locator(`[role="dialog"] ${SURFACE_SELECTOR}`);
      await expect(drawerSurface).toHaveCount(1);
      await drawerSurface.getByRole('textbox', { name: /^Ask about / }).fill(UNBREAKABLE_TOKEN);
      await drawerSurface.getByRole('button', { name: 'Ask' }).click();
      await expect(drawerSurface.getByText(UNBREAKABLE_TOKEN, { exact: true }).first()).toBeVisible();

      expect(await surfacesWithHorizontalOverflow(page)).toEqual([]);
    });

    await test.step('clearing the selection leaks no previous session content', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.keyboard.press('Escape');
      await page.locator(`${DETAIL_PANE} button[aria-label="Close lead detail"]`).click();

      // T1's core guarantee: the closed lead's session is gone. On `/leads` a
      // cleared selection is no longer "no scope" — the all-pages work made `{}`
      // a real collection scope, so the panel swaps the record panel for the
      // collection panel instead of unmounting to record-scope guidance. The
      // guarantee is therefore asserted as a swap plus a leak check against the
      // closed lead's ID: the previous lead's insights are gone, the collection
      // panel has taken their place, and no evidence action anywhere in the
      // panel still resolves to that lead.
      //
      // The swap is asserted on `data-copilot-panel`, not on the heading: both
      // panels are now titled "Insights", so a copy assertion could not tell them
      // apart and would prove nothing.
      const dock = page.locator(DOCK);
      await expect(dock.locator('[data-copilot-panel="collection"]')).toHaveCount(1);
      await expect(dock.locator('[data-copilot-panel="record"]')).toHaveCount(0);
      await expect(dock.locator(`button[aria-label*="${createdLeadId}"]`)).toHaveCount(0);
      await expect(page.locator(DETAIL_PANE)).toContainText('Select a lead to see its details and evidence.');
    });
  });
});
