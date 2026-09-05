import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { sendAssistantTurn } from '../assistantTurn';

const MESSAGE = { id: 'msg-1', role: 'user' as const, content: 'Where are the refund rules?', at: '2026-01-01T00:00:00.000Z' };
const AVAILABLE_ROUTES = [{ name: 'packages', path: '/packages' }];

beforeEach(() => {
  mockPost.mockReset();
});

describe('sendAssistantTurn', () => {
  it('resolves with the parsed turn envelope on a well-formed navigate response', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: 'navigate', args: { route: 'packages' } },
          serverResult: { route: 'packages', path: '/packages' },
          message: "I can take you to our packages page.",
        },
      },
    });

    const result = await sendAssistantTurn({ sessionId: 'sess-1', messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES });

    expect(result.toolCall.tool).toBe('navigate');
    expect(result.serverResult).toEqual({ route: 'packages', path: '/packages' });
    expect(result.message).toBe("I can take you to our packages page.");
    expect(mockPost).toHaveBeenCalledWith(
      '/assistant/turn',
      {
        sessionId: 'sess-1',
        messages: [MESSAGE],
        availableRoutes: AVAILABLE_ROUTES,
      },
      { retry: false },
    );
  });

  it('rejects before calling httpClient.post when messages is []', async () => {
    await expect(sendAssistantTurn({ sessionId: 'sess-1', messages: [], availableRoutes: AVAILABLE_ROUTES })).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects before calling httpClient.post when sessionId is missing', async () => {
    // Deliberately malformed payload: the cast defeats compile-time param
    // typing so the runtime zod guard (sessionId is required) is exercised.
    await expect(sendAssistantTurn({ messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES } as never)).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the response fails AssistantTurnResult validation (missing message)', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: 'navigate', args: { route: 'packages' } },
          serverResult: { route: 'packages', path: '/packages' },
        },
      },
    });

    await expect(sendAssistantTurn({ sessionId: 'sess-1', messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES })).rejects.toThrow();
  });
});
