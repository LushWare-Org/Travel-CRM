import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

// Server-side gate + scoped auth for the Management copilot route. These
// assertions verify the two load-bearing boundaries: the feature is off until
// enabled (404, no existence leak), and the route is NOT globally authed
// (public routes stay public; this route alone requires the actor context).

const authHeaders = {
  'x-user-id': 'rep-1',
  'x-user-role': 'salesRep',
  'x-user-permissions': '[]',
  'x-user-is-super-admin': 'false',
};

const validBody = { mode: 'deterministic', page: { key: 'leads', scope: { leadId: 'lead-1' }, since: '7_days' } };

describe('management copilot server-side gate', () => {
  afterEach(() => {
    delete process.env.MANAGEMENT_COPILOT_ENABLED;
    delete process.env.MANAGEMENT_COPILOT_PAGE_KEYS;
  });

  it('returns 404 when MANAGEMENT_COPILOT_ENABLED is off', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'false';
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(validBody);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the page key is not in the allowlist', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
    process.env.MANAGEMENT_COPILOT_PAGE_KEYS = 'packages';
    const res = await request(app).post('/api/v1/assistant/management/turn').set(authHeaders).send(validBody);
    expect(res.status).toBe(404);
  });

  it('returns 401 without actor context (scoped auth, not global)', async () => {
    process.env.MANAGEMENT_COPILOT_ENABLED = 'true';
    const res = await request(app).post('/api/v1/assistant/management/turn').send(validBody);
    expect(res.status).toBe(401);
  });
});
