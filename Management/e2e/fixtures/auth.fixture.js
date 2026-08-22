import { test as base, expect } from '@playwright/test';
import { SEED_USERS } from './test-data.js';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// AuthContext.jsx writes the JWT + user object to both localStorage and
// sessionStorage on login (see Management/src/contexts/AuthContext.jsx). We
// replicate that directly via a real /auth/login call instead of driving the
// login UI for every test — cheaper, and keeps auth/login.spec.js the only
// place that actually exercises the login form.
//
// The Gateway's authLimiter allows only 10 /auth/login requests per 15min
// per IP (Services/gateway/src/index.js) — shared across every role and
// every UI-driven login in auth/login.spec.js. Logging in fresh per test
// blows through that budget almost immediately, so cache each role's
// {token, user} for the whole worker process and reuse it.
const sessionCache = {};

async function getSession(userKey) {
  if (sessionCache[userKey]) return sessionCache[userKey];

  const { email, password } = SEED_USERS[userKey];
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(
      `Seed login failed for ${email} (${res.status}): ${await res.text()}\n` +
        'Confirm Services/update-passwords.mjs has been run against the local stack.'
    );
  }
  const body = await res.json();
  sessionCache[userKey] = body.data;
  return sessionCache[userKey];
}

async function loginAs(page, userKey) {
  const { token, user } = await getSession(userKey);

  // Storage is scoped per-origin — navigate there first so it lands on the
  // app's own localStorage/sessionStorage, not about:blank's.
  await page.goto('/login');
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(user));
    },
    { token, user }
  );
  await page.goto('/');
}

// Exposed so specs that create real data via the UI can clean it up
// themselves afterward (e.g. deleting a lead through the API rather than
// leaving it in the shared DB) without doing a redundant extra login.
export async function getToken(userKey) {
  const { token } = await getSession(userKey);
  return token;
}

// Playwright's fixture callback takes a second parameter conventionally
// named `use` — but eslint-plugin-react-hooks treats any call to something
// named `use` as the React 19 `use()` hook and flags it as a rules-of-hooks
// violation outside a component. Renamed to sidestep that false positive;
// it's the same Playwright fixture API either way.
export const test = base.extend({
  superAdminPage: async ({ page }, runTest) => {
    await loginAs(page, 'superAdmin');
    await runTest(page);
  },
  adminPage: async ({ page }, runTest) => {
    await loginAs(page, 'admin');
    await runTest(page);
  },
  salesRepPage: async ({ page }, runTest) => {
    await loginAs(page, 'salesRep');
    await runTest(page);
  },
});

export { expect };
