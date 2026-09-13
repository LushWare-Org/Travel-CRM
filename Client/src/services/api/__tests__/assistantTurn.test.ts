import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { ASSISTANT_PAGE_ACTIONS, ASSISTANT_SEARCH_TOOL, ASSISTANT_VIEW_TOOL } from '@travel-crm/contracts';
import { ASSISTANT_TURN_TIMEOUT_MS, sendAssistantTurn } from '../assistantTurn';

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
      { retry: false, timeout: ASSISTANT_TURN_TIMEOUT_MS },
    );
  });

  it.each([
    [
      'respond_conversationally',
      { mode: 'social', socialSubtype: 'greeting' },
      { mode: 'social', source: 'resolver' },
    ],
    [
      'redirect_off_topic',
      {},
      { redirected: true, source: 'resolver' },
    ],
  ])('parses the %s response envelope', async (tool, args, serverResult) => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { toolCall: { tool, args }, serverResult, message: 'Reviewed server copy' },
      },
    });

    const result = await sendAssistantTurn({
      sessionId: 'sess-1',
      messages: [MESSAGE],
      availableRoutes: AVAILABLE_ROUTES,
    });

    expect(result).toMatchObject({
      toolCall: { tool, args },
      serverResult,
      message: 'Reviewed server copy',
    });
  });

  it('carries each route filter list through the outgoing parse', async () => {
    // The request schema parses the payload before it is posted and zod strips
    // unknown keys, so an omitted `params` field would silently delete the
    // client's filter vocabulary and the server would navigate unfiltered.
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { toolCall: { tool: 'navigate', args: {} }, serverResult: null, message: 'ok' },
      },
    });

    await sendAssistantTurn({
      sessionId: 'sess-1',
      messages: [MESSAGE],
      availableRoutes: [{ name: 'packages', path: '/packages', params: ['destination', 'priceMax'] }],
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/assistant/turn',
      expect.objectContaining({
        availableRoutes: [{ name: 'packages', path: '/packages', params: ['destination', 'priceMax'] }],
      }),
      { retry: false, timeout: ASSISTANT_TURN_TIMEOUT_MS },
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

  it.each(ASSISTANT_PAGE_ACTIONS)('accepts %s as a tool the server can return', async (tool) => {
    // The regression this exists for: the vocabulary was split into one tool per
    // trip detail, the server and its contract were updated, and the client's
    // enum was not — so every one of those turns came back 200 and the client
    // rejected the response, showing "Failed to reach the assistant".
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool, args: { message: 'On it.' } },
          serverResult: { action: { tool }, revision: 'planner', surface: 'planner' },
          message: 'On it.',
        },
      },
    });

    const result = await sendAssistantTurn({ sessionId: 'sess-1', messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES });

    expect(result.toolCall.tool).toBe(tool);
  });

  it('accepts the grounded search tool the server can return', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: ASSISTANT_SEARCH_TOOL, args: { query: 'weather in Bali' } },
          serverResult: { searched: true, query: 'weather in Bali', citations: [] },
          message: 'Here is what I found.',
        },
      },
    });

    const result = await sendAssistantTurn({ sessionId: 'sess-1', messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES });

    expect(result.toolCall.tool).toBe('search_travel_info');
  });

  it('accepts the server-composed view answer as a tool the server can return', async () => {
    // Same class of regression the page-action loop above guards: the outcome is
    // new, the client enum is hand-written, and a name missing from it rejects a
    // response the server answered correctly.
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: ASSISTANT_VIEW_TOOL, args: {} },
          serverResult: { view: { path: '/packages', filteredCount: 3 } },
          message: 'There are 3 trips on this page.',
        },
      },
    });

    const result = await sendAssistantTurn({ sessionId: 'sess-1', messages: [MESSAGE], availableRoutes: AVAILABLE_ROUTES });

    expect(result.toolCall.tool).toBe(ASSISTANT_VIEW_TOOL);
  });

  it('carries what the page reports about the screen through the outgoing parse', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: 'navigate', args: { route: 'packages' } },
          serverResult: { route: 'packages', path: '/packages' },
          message: 'Sure.',
        },
      },
    });

    await sendAssistantTurn({
      sessionId: 'sess-1',
      messages: [MESSAGE],
      availableRoutes: AVAILABLE_ROUTES,
      currentView: {
        path: '/packages',
        params: { destination: 'uae', priceMax: '1500' },
        filteredCount: 3,
        renderedCount: 2,
        catalogueTotal: 25,
      },
    });

    // Read off the outgoing body rather than a positional argument, so this does
    // not break the next time the client's call shape changes.
    const body = mockPost.mock.calls[0].find(
      (arg): arg is Record<string, unknown> => !!arg && typeof arg === 'object' && 'sessionId' in (arg as object),
    );
    expect(body?.currentView).toEqual({
      path: '/packages',
      params: { destination: 'uae', priceMax: '1500' },
      filteredCount: 3,
      renderedCount: 2,
      catalogueTotal: 25,
    });
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
