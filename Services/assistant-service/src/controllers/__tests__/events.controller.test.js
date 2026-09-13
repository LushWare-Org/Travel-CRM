import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    assistantEvent: { create: vi.fn() },
  },
}));

// app.js pulls in routes → db/client.js, which constructs a real
// PrismaClient at import time; mock it so this suite doesn't need DATABASE_URL.
vi.mock('../../db/client.js', () => ({ default: mockPrisma }));

const { default: app } = await import('../../app.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/assistant/events', () => {
  it('persists a valid impression event with null tool/route', async () => {
    mockPrisma.assistantEvent.create.mockResolvedValue({ id: 'evt-1' });

    const res = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'impression' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledWith({
      data: { sessionId: 'session-1', turnId: null, eventType: 'impression', tool: null, route: null, metadata: null },
    });
  });

  it('persists a nav_click event with tool and route', async () => {
    mockPrisma.assistantEvent.create.mockResolvedValue({ id: 'evt-2' });

    const res = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'nav_click', tool: 'navigate', route: 'packages' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        turnId: null,
        eventType: 'nav_click',
        tool: 'navigate',
        route: 'packages',
        metadata: null,
      },
    });
  });

  it.each(['respond_conversationally', 'redirect_off_topic'])(
    'persists response events for the %s outcome',
    async (tool) => {
      mockPrisma.assistantEvent.create.mockResolvedValue({ id: 'evt-3' });

      const res = await request(app)
        .post('/api/v1/assistant/events')
        .send({ sessionId: 'session-1', eventType: 'response', tool });

      expect(res.status).toBe(200);
      expect(mockPrisma.assistantEvent.create).toHaveBeenCalledWith({
        data: { sessionId: 'session-1', turnId: null, eventType: 'response', tool, route: null, metadata: null },
      });
    },
  );

  it('rejects an invalid eventType with a 400 and never touches the DB', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'banana' });

    expect(res.status).toBe(400);
    expect(mockPrisma.assistantEvent.create).not.toHaveBeenCalled();
  });

  it('rejects an oversized route with a 400 and never touches the DB', async () => {
    const res = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'nav_click', tool: 'navigate', route: 'x'.repeat(1000) });

    expect(res.status).toBe(400);
    expect(mockPrisma.assistantEvent.create).not.toHaveBeenCalled();
  });

  it('persists the optional turnId without accepting server-only metadata', async () => {
    mockPrisma.assistantEvent.create.mockResolvedValue({ id: 'evt-turn' });

    const accepted = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', turnId: 'message-1', eventType: 'response', tool: 'navigate' });
    expect(accepted.status).toBe(200);
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        turnId: 'message-1',
        eventType: 'response',
        tool: 'navigate',
        route: null,
        metadata: null,
      },
    });

    vi.clearAllMocks();
    const rejected = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'response', metadata: { predictedIntent: 'social' } });
    expect(rejected.status).toBe(400);
    expect(mockPrisma.assistantEvent.create).not.toHaveBeenCalled();
  });

  it('still responds { success: true } when the DB write fails (telemetry loss is acceptable)', async () => {
    mockPrisma.assistantEvent.create.mockRejectedValue(new Error('connection reset'));

    const res = await request(app)
      .post('/api/v1/assistant/events')
      .send({ sessionId: 'session-1', eventType: 'opened' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledTimes(1);
  });
});
