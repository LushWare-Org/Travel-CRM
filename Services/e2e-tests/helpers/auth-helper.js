// Reuses the repo's stable seed accounts (Services/update-passwords.mjs) as
// the actors for every flow. Registering brand-new users per run was
// considered, but logging in as a seeded, known-good user is more stable
// (no dependency on auth-service's register/verification-email path) and
// the login endpoint itself is already exercised directly by this test).
const SEED_USERS = {
  superAdmin: { email: 'superadmin@travelcrm.com', password: 'SuperAdmin@123' },
  admin: { email: 'alice.admin@travelcrm.com', password: 'Admin@123' },
  salesRep: { email: 'bob.sales@travelcrm.com', password: 'Sales@123' },
};

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000/api/v1';

// Gateway's authLimiter allows only 10 requests/15min on /auth/login — log
// in once per role and cache the token for the whole run rather than
// re-authenticating per test.
const sessionCache = new Map(); // role -> { token, userId }

async function loginAs(role) {
  if (sessionCache.has(role)) return sessionCache.get(role);

  const creds = SEED_USERS[role];
  if (!creds) throw new Error(`No seed user configured for role "${role}"`);

  const res = await fetch(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Seed login failed for ${creds.email} (role=${role}): ${res.status} ${JSON.stringify(body)}`
    );
  }

  const token = body?.data?.token;
  const userId = body?.data?.user?.id;
  if (!token || !userId) {
    throw new Error(`Login response for ${creds.email} missing token/user.id: ${JSON.stringify(body)}`);
  }

  const session = { token, userId };
  sessionCache.set(role, session);
  return session;
}

export async function getToken(role) {
  return (await loginAs(role)).token;
}

export async function getUserId(role) {
  return (await loginAs(role)).userId;
}
