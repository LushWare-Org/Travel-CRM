// Health-check targets. Ports/prefixes must match Services/gateway/src/index.js's
// SERVICES map — if that map changes, update this list too (nothing enforces
// the two staying in sync automatically).
const GATEWAY_HEALTH_URL = process.env.GATEWAY_HEALTH_URL || 'http://localhost:3000/health';

const SERVICE_HEALTH_URLS = {
  gateway: GATEWAY_HEALTH_URL,
  auth: process.env.AUTH_SERVICE_URL ? `${process.env.AUTH_SERVICE_URL}/health` : 'http://localhost:3001/health',
  user: process.env.USER_SERVICE_URL ? `${process.env.USER_SERVICE_URL}/health` : 'http://localhost:3002/health',
  package: process.env.PACKAGE_SERVICE_URL ? `${process.env.PACKAGE_SERVICE_URL}/health` : 'http://localhost:3003/health',
  lead: process.env.LEAD_SERVICE_URL ? `${process.env.LEAD_SERVICE_URL}/health` : 'http://localhost:3004/health',
  booking: process.env.BOOKING_SERVICE_URL ? `${process.env.BOOKING_SERVICE_URL}/health` : 'http://localhost:3005/health',
  billing: process.env.BILLING_SERVICE_URL ? `${process.env.BILLING_SERVICE_URL}/health` : 'http://localhost:3006/health',
  career: process.env.CAREER_SERVICE_URL ? `${process.env.CAREER_SERVICE_URL}/health` : 'http://localhost:3007/health',
  notification: process.env.NOTIFICATION_SERVICE_URL ? `${process.env.NOTIFICATION_SERVICE_URL}/health` : 'http://localhost:3008/health',
  analytics: process.env.ANALYTICS_SERVICE_URL ? `${process.env.ANALYTICS_SERVICE_URL}/health` : 'http://localhost:3009/health',
  flight: process.env.FLIGHT_SERVICE_URL ? `${process.env.FLIGHT_SERVICE_URL}/health` : 'http://localhost:3010/health',
};

async function pingOnce(url) {
  try {
    // The Gateway's global JWT-auth middleware is registered before its own
    // `/health` route (see Services/gateway/src/index.js), so an unauthenticated
    // health check gets a 401 there even though the process is fully up — a
    // real gap in the gateway itself, not something this suite works around
    // by skipping the check. Any response (not a connection failure) means
    // the process is alive and listening, which is all this check needs.
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function waitForAllServices({ timeoutMs = 30_000, intervalMs = 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(Object.keys(SERVICE_HEALTH_URLS));

  while (pending.size > 0 && Date.now() < deadline) {
    await Promise.all(
      [...pending].map(async (name) => {
        if (await pingOnce(SERVICE_HEALTH_URLS[name])) pending.delete(name);
      })
    );
    if (pending.size > 0) await new Promise((r) => setTimeout(r, intervalMs));
  }

  if (pending.size > 0) {
    throw new Error(
      `Backend E2E: these services never became healthy within ${timeoutMs}ms: ${[...pending].join(', ')}.\n` +
      `Start the full stack first: cd Services && npm run dev\n` +
      `(checked: ${[...pending].map((n) => SERVICE_HEALTH_URLS[n]).join(', ')})`
    );
  }
}

// Standalone CLI use (e.g. `node helpers/wait-for-services.js`) — not wired
// into package.json's pretest since vitest's globalSetup already calls
// waitForAllServices() once; keeping both would just double the wait.
if (import.meta.url === `file://${process.argv[1]}`) {
  waitForAllServices()
    .then(() => console.log('All services healthy.'))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
