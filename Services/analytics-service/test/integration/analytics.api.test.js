import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockPool } = vi.hoisted(() => ({ mockPool: { query: vi.fn() } }));
vi.mock('../../src/db/pool.js', () => ({ default: mockPool }));

const { default: app } = await import('../../src/app.js');

function authHeaders(overrides = {}) {
  return {
    'x-user-id': overrides.id || 'user-1',
    'x-user-role': overrides.role || 'admin',
    'x-user-email': overrides.email || 'user@test.com',
    'x-user-name': overrides.name || 'Test User',
    'x-user-permissions': JSON.stringify(overrides.permissions || []),
    'x-user-is-super-admin': String(overrides.isSuperAdmin ?? false),
  };
}

// A single placeholder row satisfies both shapes controllers expect: plain
// aggregate queries (`SELECT COUNT(*) ...` with no GROUP BY) always return
// exactly one row in real Postgres, while GROUP BY queries tolerate a
// nonsense row just as well as an empty one for these auth-focused tests —
// neither crashes the handler, since every field read is `Number(x) || 0`
// or has an equivalent fallback.
function stubAllQueriesEmpty() {
  mockPool.query.mockResolvedValue({ rows: [{}] });
}

describe('GET /api/v1/analytics/leads/overview', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('returns 401 with no auth headers at all', async () => {
    const res = await request(app).get('/api/v1/analytics/leads/overview');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a role outside admin/salesRep', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/leads/overview').set(authHeaders({ role: 'customer' }));
    expect(res.status).toBe(403);
  });

  it('returns 200 for an admin', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/leads/overview').set(authHeaders({ role: 'admin' }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 200 for a salesRep', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/leads/overview').set(authHeaders({ role: 'salesRep' }));
    expect(res.status).toBe(200);
  });

  it('returns 400 with a validation error for an invalid timeRange', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/leads/overview?timeRange=lifetime')
      .set(authHeaders({ role: 'admin' }));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(mockPool.query).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/analytics/users/overview', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('is admin-only — a salesRep gets 403', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/users/overview').set(authHeaders({ role: 'salesRep' }));
    expect(res.status).toBe(403);
  });

  it('allows a superAdmin regardless of role list', async () => {
    stubAllQueriesEmpty();
    const res = await request(app)
      .get('/api/v1/analytics/users/overview')
      .set(authHeaders({ role: 'customer', isSuperAdmin: true }));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/analytics/salesreps/me/performance', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('is salesRep-only — an admin gets 403', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/salesreps/me/performance').set(authHeaders({ role: 'admin' }));
    expect(res.status).toBe(403);
  });

  it('allows a salesRep and returns performance data scoped to their own id', async () => {
    stubAllQueriesEmpty();
    const res = await request(app)
      .get('/api/v1/analytics/salesreps/me/performance')
      .set(authHeaders({ role: 'salesRep', id: 'rep-7' }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('performance');
  });
});

describe('GET /api/v1/analytics/salesreps/performance (new admin-only endpoint)', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('rejects a salesRep (must be admin, unlike the "me" variant)', async () => {
    stubAllQueriesEmpty();
    const res = await request(app).get('/api/v1/analytics/salesreps/performance').set(authHeaders({ role: 'salesRep' }));
    expect(res.status).toBe(403);
  });

  it('returns an array for an admin', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ rep: 'Jane', sales: '2', conversion: '50.0' }] });
    const res = await request(app).get('/api/v1/analytics/salesreps/performance').set(authHeaders({ role: 'admin' }));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ rep: 'Jane', sales: 2, conversion: 50 }]);
  });
});

describe('POST /api/v1/analytics/leads/export-pdf', () => {
  it('responds with the not-yet-implemented stub message rather than a fake success', async () => {
    const res = await request(app).post('/api/v1/analytics/leads/export-pdf').set(authHeaders({ role: 'admin' }));
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/not yet implemented/i);
  });
});

describe('GET /api/v1/dashboard', () => {
  beforeEach(() => mockPool.query.mockReset());

  it('requires auth and an allowed role', async () => {
    stubAllQueriesEmpty();
    const unauth = await request(app).get('/api/v1/dashboard');
    expect(unauth.status).toBe(401);

    const forbidden = await request(app).get('/api/v1/dashboard').set(authHeaders({ role: 'customer' }));
    expect(forbidden.status).toBe(403);

    const ok = await request(app).get('/api/v1/dashboard').set(authHeaders({ role: 'admin' }));
    expect(ok.status).toBe(200);
  });
});

describe('GET /health', () => {
  it('is reachable without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'analytics-service' });
  });
});
