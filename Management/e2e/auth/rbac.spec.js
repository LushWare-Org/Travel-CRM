import { test, expect } from '../fixtures/auth.fixture.js';

// Only asserting role-gated nav items here (allowedRoles / customCheck by
// role), not permission-gated ones (Billing, Users, Packages-for-
// admin) — those depend on seeded permission grants that can drift
// independently of role and would make this spec flaky for the wrong reason.
test.describe('Role-based navigation', () => {
  test('superAdmin sees Career but not Lead Management', async ({ superAdminPage }) => {
    await expect(superAdminPage.getByRole('button', { name: 'Career' })).toBeVisible();
    await expect(superAdminPage.getByRole('button', { name: 'Lead Management' })).toHaveCount(0);
  });

  test('admin sees Settings but not Lead Management or Career', async ({ adminPage }) => {
    await expect(adminPage.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Lead Management' })).toHaveCount(0);
    await expect(adminPage.getByRole('button', { name: 'Career' })).toHaveCount(0);
  });

  test('salesRep sees Lead Management but not Settings or Career', async ({ salesRepPage }) => {
    await expect(salesRepPage.getByRole('button', { name: 'Lead Management' })).toBeVisible();
    await expect(salesRepPage.getByRole('button', { name: 'Settings' })).toHaveCount(0);
    await expect(salesRepPage.getByRole('button', { name: 'Career' })).toHaveCount(0);
  });
});

test.describe('Route guards', () => {
  test('salesRep is denied direct access to /settings', async ({ salesRepPage }) => {
    await salesRepPage.goto('/settings');
    await expect(salesRepPage.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  });

  test('salesRep is denied direct access to /users', async ({ salesRepPage }) => {
    await salesRepPage.goto('/users');
    await expect(salesRepPage.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
  });

  test('admin can access /settings directly', async ({ adminPage }) => {
    await adminPage.goto('/settings');
    await expect(adminPage.getByRole('heading', { name: 'Access Denied' })).toHaveCount(0);
  });
});
