import { test, expect } from '@playwright/test';
import { SEED_USERS } from '../fixtures/test-data.js';

// The one spec that must drive the real login form rather than shortcut via
// storageState — everywhere else uses fixtures/auth.fixture.js instead.
test.describe('Login', () => {
  test('logs in an admin-tier user and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(SEED_USERS.admin.email);
    await page.getByLabel('Password').fill(SEED_USERS.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/');
    // Organization Settings is admin/superAdmin-only and role-gated (not
    // permission-gated), so it's a deterministic signal the admin session took.
    await expect(page.getByRole('button', { name: 'Organization Settings' })).toBeVisible();
  });

  test('logs in a salesRep-tier user and sees Lead Management', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(SEED_USERS.salesRep.email);
    await page.getByLabel('Password').fill(SEED_USERS.salesRep.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: 'Lead Management' })).toBeVisible();
  });

  test('shows an error and stays on /login for invalid credentials', async ({ page }) => {
    await page.goto('/login');
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
