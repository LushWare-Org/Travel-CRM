import { test, expect } from '@playwright/test';
import { SEED_USERS } from '../fixtures/test-data.js';

// The one spec that must drive the real login form rather than shortcut via
// storageState — everywhere else uses fixtures/auth.fixture.js instead.

/**
 * Wait for the form to mount before filling it.
 *
 * `goto('/login')` resolves on load, not on first paint of the SPA, and the
 * suite's first spec file hits a cold Vite dev server that has to transform the
 * app. Relying on Playwright's 10s actionTimeout made this a coin flip: the
 * fill intermittently timed out with the form simply not there yet. This is a
 * readiness wait, not an assertion — the login itself is still asserted below.
 */
async function waitForLoginForm(page) {
  await expect(page.getByLabel('Email Address')).toBeVisible({ timeout: 30_000 });
}

test.describe('Login', () => {
  // The suite's first spec file hits a cold Vite dev server that still has to
  // transform the app, and under a full-suite run that first paint has taken
  // longer than Playwright's 30s default test budget — which killed the test
  // before the readiness wait below could finish, so a 30s wait inside a 30s
  // test could never help. Same reasoning as copilot.spec.js, which takes 120s.
  test.describe.configure({ timeout: 60_000 });

  test('logs in an admin-tier user and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await waitForLoginForm(page);
    await page.getByLabel('Email Address').fill(SEED_USERS.admin.email);
    await page.getByLabel('Password').fill(SEED_USERS.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/');
    // Settings is admin/superAdmin-only and role-gated (not
    // permission-gated), so it's a deterministic signal the admin session took.
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
  });

  test('logs in a salesRep-tier user and sees Leads', async ({ page }) => {
    await page.goto('/login');
    await waitForLoginForm(page);
    await page.getByLabel('Email Address').fill(SEED_USERS.salesRep.email);
    await page.getByLabel('Password').fill(SEED_USERS.salesRep.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // A salesRep lands on /leads, not the dashboard: HomeRoute is role-aware and
    // sends agents to where their sidebar starts, because the Dashboard entry is
    // admin/superAdmin-only (ce651b2 "hide the Dashboard from agents and land
    // them on Leads"). The old expectation of "/" predated that redirect.
    await expect(page).toHaveURL('/leads');
    await expect(page.getByRole('button', { name: 'Leads' })).toBeVisible();
  });

  test('shows an error and stays on /login for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await waitForLoginForm(page);
    await page.getByLabel('Email Address').fill(SEED_USERS.admin.email);
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials|login failed/i)).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('logs out and redirects to /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(SEED_USERS.admin.email);
    await page.getByLabel('Password').fill(SEED_USERS.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL('/login');
  });
});
