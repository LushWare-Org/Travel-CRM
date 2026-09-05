import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendAssistantTurn = vi.hoisted(() => vi.fn());
const mockSendAssistantEvent = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/assistantTurn', () => ({
  sendAssistantTurn: mockSendAssistantTurn,
}));

vi.mock('../../../../services/api/assistantEvents', () => ({
  sendAssistantEvent: mockSendAssistantEvent,
}));

import { useAssistantChat } from '../useAssistantChat';

const SESSION_KEY = 'travel-crm.assistantSessionId';
const ERROR_MESSAGE = 'Failed to reach the assistant. Please try again.';

const NAVIGATE_RESULT = {
  toolCall: { tool: 'navigate', args: { route: 'packages' } },
  serverResult: { route: 'packages', path: '/packages' },
  message: "Sure — I can take you to the packages page.",
};

beforeEach(() => {
  mockSendAssistantTurn.mockReset();
  mockSendAssistantEvent.mockReset();
  localStorage.clear();
});

describe('useAssistantChat', () => {
  it('generates a sessionId once, persists it to localStorage, and reuses it across re-renders and remounts', () => {
    const { result, rerender, unmount } = renderHook(() => useAssistantChat());
    const firstId = result.current.sessionId;

    expect(firstId).toBeTruthy();
    expect(localStorage.getItem(SESSION_KEY)).toBe(firstId);

    rerender();
    expect(result.current.sessionId).toBe(firstId);

    unmount();
    const remounted = renderHook(() => useAssistantChat());
    expect(remounted.result.current.sessionId).toBe(firstId);
  });

  it('falls back to a fresh in-memory id (never throws) when localStorage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    let sessionId = '';
    expect(() => {
      const { result } = renderHook(() => useAssistantChat());
      sessionId = result.current.sessionId;
    }).not.toThrow();
    expect(sessionId).toBeTruthy();

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('sendMessage navigate happy path appends the user message and the assistant reply, resolves nav data, and fires turn then response events', async () => {
    mockSendAssistantTurn.mockResolvedValue(NAVIGATE_RESULT);

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Take me to the packages page');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual(expect.objectContaining({ role: 'user', content: 'Take me to the packages page' }));
    expect(result.current.messages[1]).toEqual(expect.objectContaining({ role: 'assistant', content: 'Sure — I can take you to the packages page.' }));
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0]).toEqual({
      assistantMessageId: result.current.messages[1].id,
      data: { tool: 'navigate', route: 'packages', path: '/packages' },
    });
    expect(result.current.error).toBe('');

    const sentPayload = mockSendAssistantTurn.mock.calls[0][0];
    expect(sentPayload.sessionId).toBe(result.current.sessionId);
    expect(sentPayload.availableRoutes).toContainEqual({ name: 'packages', path: '/packages' });
    expect(sentPayload.availableRoutes.every((route: { name: string; path: string }) => 'name' in route && 'path' in route)).toBe(true);

    expect(mockSendAssistantEvent.mock.calls.map(([payload]) => payload.eventType)).toEqual(['turn', 'response']);
    expect(mockSendAssistantEvent.mock.calls[0][0]).toMatchObject({ eventType: 'turn', tool: null, route: null, sessionId: result.current.sessionId });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({ eventType: 'response', tool: 'navigate', route: 'packages' });
  });

  it('sendMessage answer_faq_policy matched path resolves the snippet data and reports the faq tool on the response event', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_faq_policy', args: { question: 'refund policy' } },
      serverResult: {
        answered: true,
        snippets: [{ docId: 'doc-1', title: 'Refunds', quote: 'Full refund within 24 hours of booking.' }],
      },
      message: 'Here is what our policy says about refunds.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('What is your refund policy?');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_faq_policy',
      answered: true,
      snippets: [{ docId: 'doc-1', title: 'Refunds', quote: 'Full refund within 24 hours of booking.' }],
    });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({ eventType: 'response', tool: 'answer_faq_policy', route: null });
  });

  it('sendMessage answer_faq_policy no-match path resolves the server fallback message', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_faq_policy', args: { question: 'something unknown' } },
      serverResult: { answered: false, fallbackMessage: "I don't have a confirmed answer to that — please contact support." },
      message: "I don't have a confirmed answer to that — please contact support.",
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Do you offer llama trekking?');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_faq_policy',
      answered: false,
      fallbackMessage: "I don't have a confirmed answer to that — please contact support.",
    });
  });

  it('a rejected call sets the exact error string, keeps the user message, appends no reply, fires an error event, and does not throw', async () => {
    mockSendAssistantTurn.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Hello?');
    });

    expect(result.current.error).toBe(ERROR_MESSAGE);
    expect(result.current.messages).toEqual([expect.objectContaining({ role: 'user', content: 'Hello?' })]);
    expect(result.current.turns).toHaveLength(0);
    expect(mockSendAssistantEvent.mock.calls.map(([payload]) => payload.eventType)).toEqual(['turn', 'error']);
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({ eventType: 'error', tool: null, route: null });
  });

  it('sendMessage with blank or whitespace-only input is a no-op: no API call, no message, no events', async () => {
    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('');
      await result.current.sendMessage('   ');
    });

    expect(mockSendAssistantTurn).not.toHaveBeenCalled();
    expect(mockSendAssistantEvent).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.error).toBe('');
  });
});
