import { test, expect, getToken } from '../fixtures/auth.fixture.js';
import { inputByTestId, phoneInputByTestId, leadRowByName } from '../utils/selectors.js';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// One linear journey rather than separate spec files — each stage depends on
// the lead created in the first step. Stops where the real UI's own data
// preconditions stop it (see the TODO below) rather than faking data we can't
// know is seeded.
//
// This test creates a real lead in the shared DB via the actual UI (not a
// tagged/cleaned-up API call like the backend suite) — capture its id from
// the create response and delete it via the API afterward so repeated runs
// don't accumulate rows.
let createdLeadId;

test.afterAll(async () => {
  if (!createdLeadId) return;
  const token = await getToken('superAdmin');
  await fetch(`${API_URL}/leads/${createdLeadId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
});

test.describe('Lead lifecycle', () => {
  test('create a lead and open its generated-document dialogs', async ({ salesRepPage: page }) => {
    const leadName = `E2E Test Lead ${Date.now()}`;

    await test.step('Create a lead with a manual itinerary', async () => {
      await page.goto('/leads');
      await page.getByRole('button', { name: 'New Lead' }).click();

      // data-testid is unique to the one dialog open at a time, so — unlike
      // the old div.space-y-2 lookup — no need to scope to a "dialog"
      // container first.
      await inputByTestId(page, 'new-lead-name').fill(leadName);
      await phoneInputByTestId(page, 'new-lead-phone').fill('712345678');
      // Manual itinerary (no real package needed) still creates a package
      // selection on the lead — required for the Quotation dialog below to
      // show anything other than its "no packages attached" empty state.
      await inputByTestId(page, 'new-lead-package').selectOption({ label: 'Manual Itinerary (No Package)' });

      // NewLeadDialog also fires a POST to /leads/pricing/preview while the
      // form is filled in — matching on '/leads' broadly would race against
      // that and grab the wrong response, silently leaving createdLeadId
      // unset. Match the exact create-lead endpoint only.
      const [response] = await Promise.all([
        page.waitForResponse((res) => res.request().method() === 'POST' && /\/api\/v1\/leads$/.test(new URL(res.url()).pathname)),
        page.getByRole('button', { name: 'Create Lead' }).click(),
      ]);
      createdLeadId = (await response.json())?.data?.id;
      await expect(page.getByText('Create New Lead')).toHaveCount(0, { timeout: 15_000 });
    });

    const leadRow = leadRowByName(page, leadName);

    await test.step('Lead appears in the list', async () => {
      await expect(leadRow).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Quotation dialog opens with the manual selection attached', async () => {
      await leadRow.getByRole('button', { name: 'Quotation' }).click();
      await expect(page.getByRole('heading', { name: 'Send Quotation' })).toBeVisible();
      // The lead's name is also still in the table cell behind the modal
      // overlay — .first() picks the modal's own copy.
      await expect(page.getByText(leadName).first()).toBeVisible();
      await expect(page.getByText('No packages attached to this lead yet.')).toHaveCount(0);
      // TODO(e2e): generating an actual quotation requires pricing to be set
      // on the selection first (via "Edit details" -> PricingSection's
      // calculate/apply endpoints), which is its own precondition chain.
      // Extend this once that flow has its own verified selectors, then
      // continue into accept -> convert to invoice -> receipt -> voucher.
      // getByRole name-matching is substring-based by default, so an
      // unqualified 'Close' also matches the unrelated 'Closed Lost' status
      // badge sitting in a table row behind the modal overlay — exact:true
      // rules that out. QuotationModal itself still has two elements
      // exactly named "Close" (an icon button and a footer text button),
      // hence .first().
      await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    });

    await test.step('Invoice dialog opens for the lead', async () => {
      await leadRow.getByRole('button', { name: 'Invoice' }).click();
      await expect(page.getByRole('heading', { name: 'New Invoice' })).toBeVisible();
      await expect(page.getByText(leadName).first()).toBeVisible();
      await page.getByRole('button', { name: 'Close', exact: true }).first().click();
    });

    await test.step('Receipt dialog opens for the lead', async () => {
      await leadRow.getByRole('button', { name: 'Payment Receipt' }).click();
      await expect(page.getByRole('heading', { name: 'Create Payment Receipt' })).toBeVisible();
      // ReceiptDialog's close button is icon-only with no accessible name
      // (no aria-label, no visible text) — reload instead of trying to close it.
      await page.goto('/leads');
    });

    await test.step('Voucher dialog opens for the lead', async () => {
      await leadRowByName(page, leadName).getByRole('button', { name: 'Travel Voucher' }).click();
      await expect(page.getByRole('heading', { name: 'Voucher', exact: true })).toBeVisible();
    });
  });
});
