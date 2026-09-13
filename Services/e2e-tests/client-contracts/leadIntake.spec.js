import { describe, it, expect } from 'vitest';
import { apiClient } from '../helpers/api-client.js';

// The inverse of every "genuinely public" contract spec in this directory:
// POST /leads/internal/intake is deliberately NOT in the gateway's
// PUBLIC_PATTERNS allowlist (docs/designs/chatbot-inbound-lead-intake.md,
// Success Criteria) — it is reachable only service-to-service, directly on
// lead-service's internal network address, gated by internalTokenAuth
// (x-internal-token). An unauthenticated request through the live gateway
// must never reach that handler at all; the gateway's own JWT-required
// middleware should reject it first with 401, the same failure mode as
// hitting any other protected route with no Authorization header.
describe.sequential('client contract: lead intake is NOT public', () => {
  it('POST /leads/internal/intake (no auth, through the gateway) is rejected before reaching lead-service', async () => {
    const res = await apiClient.post('/leads/internal/intake', {
      body: {
        channel: 'chatbot',
        sessionId: 'e2e-should-never-succeed',
        contact: { email: 'e2e-guard@example.com' },
        transcript: [{ id: 'm1', role: 'user', content: 'probe', at: new Date().toISOString() }],
      },
    });

    expect(res.status).toBe(401);
  });

  it('POST /leads/internal/intake (no auth, x-internal-token header set but no JWT) is still rejected by the gateway', async () => {
    // Even carrying the correct internal secret, the gateway's JWT check runs
    // first — the header alone must not be a public bypass through the
    // gateway. The internal token only matters once a caller is already
    // inside the private network calling lead-service directly.
    const res = await apiClient.post('/leads/internal/intake', {
      headers: { 'x-internal-token': process.env.INTERNAL_EVENTS_TOKEN || 'shared_internal_service_token' },
      body: {
        channel: 'chatbot',
        sessionId: 'e2e-should-never-succeed-2',
        contact: { email: 'e2e-guard-2@example.com' },
        transcript: [{ id: 'm1', role: 'user', content: 'probe', at: new Date().toISOString() }],
      },
    });

    expect(res.status).toBe(401);
  });
});
