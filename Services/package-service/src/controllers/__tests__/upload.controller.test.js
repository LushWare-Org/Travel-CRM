import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockDestroy } = vi.hoisted(() => ({ mockDestroy: vi.fn() }));

vi.mock('../../utils/cloudinary.js', () => ({
  default: { uploader: { destroy: mockDestroy } },
  configureCloudinary: vi.fn(),
}));

// app.js pulls in package.routes.js → db/client.js, which constructs a real
// PrismaClient at import time; mock it so this suite doesn't need DATABASE_URL.
vi.mock('../../db/client.js', () => ({ default: {} }));

const { default: app } = await import('../../app.js');

function authHeaders() {
  return {
    'x-user-id': 'agent-1',
    'x-user-role': 'admin',
    'x-user-email': 'agent@test.com',
    'x-user-name': 'Test Agent',
    'x-user-permissions': '[]',
    'x-user-is-super-admin': 'false',
  };
}

describe('DELETE /api/v1/upload/:publicId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('destroys the Cloudinary asset identified by the path param', async () => {
    mockDestroy.mockResolvedValue({ result: 'ok' });

    const res = await request(app)
      .delete('/api/v1/upload/travel-crm%2Fpackages%2Fabc123')
      .set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockDestroy).toHaveBeenCalledWith('travel-crm/packages/abc123');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete('/api/v1/upload/abc123');
    expect(res.status).toBe(401);
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/upload/delete-multiple', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('destroys every publicId in the batch', async () => {
    mockDestroy.mockResolvedValue({ result: 'ok' });

    const res = await request(app)
      .post('/api/v1/upload/delete-multiple')
      .set(authHeaders())
      .send({ publicIds: ['a', 'b', 'c'] });

    expect(res.status).toBe(200);
    expect(mockDestroy).toHaveBeenCalledTimes(3);
  });

  it('rejects an empty publicIds array', async () => {
    const res = await request(app)
      .post('/api/v1/upload/delete-multiple')
      .set(authHeaders())
      .send({ publicIds: [] });

    expect(res.status).toBe(400);
    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
