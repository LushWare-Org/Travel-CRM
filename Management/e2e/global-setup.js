const GATEWAY_HEALTH_URL = process.env.E2E_GATEWAY_HEALTH_URL || 'http://localhost:3000/health';

// The whole suite talks to a real running Gateway + microservices stack (no
// mocks) — fail fast with an actionable message instead of letting every spec
// time out individually if the backend isn't up.
export default async function globalSetup() {
  try {
    // The Gateway's global JWT-auth middleware runs before its own `/health`
    // route (see Services/gateway/src/index.js), so an unauthenticated check
    // gets a 401 even when the process is fully up — a real gap in the
    // gateway itself. Any response (not a connection failure) confirms it's
    // listening, which is all this check needs.
    const res = await fetch(GATEWAY_HEALTH_URL);
    if (res.status >= 500) throw new Error(`Gateway returned status ${res.status}`);
  } catch (err) {
    throw new Error(
      `Gateway is not reachable at ${GATEWAY_HEALTH_URL} (${err.message}).\n\n` +
        'Start the backend stack first:\n' +
        '  cd ../../Services && npm run dev\n\n' +
        'Then re-run:\n' +
        '  npm run test:e2e'
    );
  }
}
