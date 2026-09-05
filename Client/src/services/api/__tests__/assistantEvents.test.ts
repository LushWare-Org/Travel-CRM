import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { sendAssistantEvent } from '../assistantEvents';

const PAYLOAD = { sessionId: 'sess-1', eventType: 'impression' as const, tool: null, route: null };

beforeEach(() => {
  mockPost.mockReset();
});

describe('sendAssistantEvent', () => {
  it('posts the event payload to /assistant/events', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    await sendAssistantEvent(PAYLOAD);

    expect(mockPost).toHaveBeenCalledWith('/assistant/events', PAYLOAD);
  });

  it('never throws when the post fails (fire-and-forget telemetry)', async () => {
    mockPost.mockRejectedValue(new Error('network down'));

    await expect(sendAssistantEvent(PAYLOAD)).resolves.toBeUndefined();
  });

  it('resolves even on a non-2xx response (no envelope validation)', async () => {
    mockPost.mockRejectedValue(Object.assign(new Error('Request failed with status code 503'), { status: 503 }));

    await expect(sendAssistantEvent(PAYLOAD)).resolves.toBeUndefined();
  });
});
