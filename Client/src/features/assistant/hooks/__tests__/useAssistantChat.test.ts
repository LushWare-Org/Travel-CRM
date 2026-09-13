import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendAssistantTurn = vi.hoisted(() => vi.fn());
const mockSendAssistantEvent = vi.hoisted(() => vi.fn());
const mockLoadAssistantParamValues = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/assistantTurn', () => ({
  sendAssistantTurn: mockSendAssistantTurn,
}));

vi.mock('../../../../services/api/assistantEvents', () => ({
  sendAssistantEvent: mockSendAssistantEvent,
}));

// Mocked rather than exercised: the real one fetches the catalogue. Its own
// derivation is covered in features/assistant/__tests__/assistantParamValues.
vi.mock('../../assistantParamValues', () => ({
  loadAssistantParamValues: mockLoadAssistantParamValues,
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
  mockLoadAssistantParamValues.mockReset();
  mockLoadAssistantParamValues.mockResolvedValue({
    packages: { destination: [{ value: 'uae', label: 'Dubai' }] },
  });
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
    expect(sentPayload.availableRoutes).toContainEqual(
      expect.objectContaining({ name: 'packages', path: '/packages', params: expect.any(Array) }),
    );
    expect(
      sentPayload.availableRoutes.every(
        (route: { name: string; path: string; params: string[] }) =>
          'name' in route && 'path' in route && Array.isArray(route.params),
      ),
    ).toBe(true);

    // The vocabulary rides only on the route that has one, so the server can
    // tell "no destinations declared" from "destinations declared as none".
    const packagesRoute = sentPayload.availableRoutes.find((route: { name: string }) => route.name === 'packages');
    expect(packagesRoute.paramValues).toEqual({ destination: [{ value: 'uae', label: 'Dubai' }] });
    expect(
      sentPayload.availableRoutes
        .filter((route: { name: string }) => route.name !== 'packages')
        .every((route: { paramValues?: unknown }) => route.paramValues === undefined),
    ).toBe(true);

    expect(mockSendAssistantEvent.mock.calls.map(([payload]) => payload.eventType)).toEqual(['turn', 'response']);
    expect(mockSendAssistantEvent.mock.calls[0][0]).toMatchObject({
      eventType: 'turn',
      turnId: sentPayload.messages[0].id,
      tool: null,
      route: null,
      sessionId: result.current.sessionId,
    });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'response',
      turnId: sentPayload.messages[0].id,
      tool: 'navigate',
      route: 'packages',
    });
  });

  it('sendMessage hand_off maps a booking handoff into chip data', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'hand_off', args: { kind: 'booking', packageId: 'p-bali', message: 'On the way.' } },
      serverResult: { handoff: { kind: 'booking', packageId: 'p-bali', title: 'Bali Honeymoon Bliss' } },
      message: 'I can take you to the booking form for Bali Honeymoon Bliss.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('book it');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'hand_off',
      handoff: { kind: 'booking', packageId: 'p-bali', title: 'Bali Honeymoon Bliss' },
    });
  });

  it('sendMessage request_booking maps the server status onto the chip data', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'request_booking', args: { packageId: 'p-bali', message: 'Ready.' } },
      serverResult: { booking: { status: 'awaiting_confirmation' } },
      message: 'Ready to send a booking request: Bali Honeymoon Bliss.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('book it');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'request_booking',
      booking: { status: 'awaiting_confirmation' },
    });
  });

  it('sendMessage request_booking treats a status it does not recognise as needing details', async () => {
    // The conservative direction: `needs_details` renders no chip, so a status
    // this build has never heard of can never look like a confirmation and
    // invite a booking the server is not expecting.
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'request_booking', args: { packageId: 'p-bali' } },
      serverResult: { booking: { status: 'awaiting_something_new' } },
      message: 'One moment.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('book it');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'request_booking',
      booking: { status: 'needs_details', missing: undefined },
    });
  });

  it('sendMessage hand_off falls back to the human handoff when no package resolves', async () => {
    // The server degrades a booking it cannot resolve into a person, but the
    // client must not depend on that: an unrenderable booking payload has to
    // become the one chip that always works rather than no chip at all.
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'hand_off', args: { kind: 'booking' } },
      serverResult: { handoff: { kind: 'booking' } },
      message: 'Our team can help with that.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('book it');
    });

    expect(result.current.turns[0].data).toEqual({ tool: 'hand_off', handoff: { kind: 'human' } });
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

  it('sendMessage answer_packages maps the returned records into cards', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_packages', args: { packageIds: ['p-1'], message: 'Nine days of temples.' } },
      serverResult: {
        present: true,
        packages: [
          {
            id: 'p-1',
            title: 'Japan Cultural Journey',
            destination: 'Japan',
            durationDays: 9,
            price: 4485,
            currency: 'USD',
            rating: 4.7,
            numReviews: 16,
          },
        ],
      },
      message: 'The Japan Cultural Journey runs nine days.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('tell me about the cultural journey package');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_packages',
      packages: [
        {
          id: 'p-1',
          title: 'Japan Cultural Journey',
          destination: 'Japan',
          durationDays: 9,
          price: 4485,
          currency: 'USD',
          rating: 4.7,
          numReviews: 16,
        },
      ],
    });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'response',
      tool: 'answer_packages',
      route: null,
    });
  });

  it('sendMessage answer_packages keeps the records but draws no card when the turn is not presenting', async () => {
    // A follow-up about a package the visitor has already been shown. The
    // records still travel — they are what the answer was grounded in — but an
    // empty card list is the ordinary no-card turn, not a malformed payload, so
    // it must not render the fallback panel either.
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_packages', args: { packageIds: ['p-1'], message: 'It is $618.' } },
      serverResult: {
        present: false,
        packages: [
          { id: 'p-1', title: 'Bali Honeymoon Bliss', destination: 'Bali, Indonesia', durationDays: 5, price: 618, currency: 'USD', rating: 4.9, numReviews: 29 },
        ],
      },
      message: 'It is $618.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('how about prices');
    });

    expect(result.current.turns[0].data).toEqual({ tool: 'answer_packages', packages: [] });
  });

  it('sendMessage answer_packages drops records with no id or title, and falls back when none survive', async () => {
    // A presenting turn with nothing renderable is a malformed payload, so it
    // degrades to the server's own fallback line rather than an empty panel.
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_packages', args: { packageIds: [] } },
      serverResult: { present: true, packages: [{ id: 'p-1' }, { title: 'No id' }, null] },
      message: 'Server copy.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('tell me about something');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_faq_policy',
      answered: false,
      fallbackMessage: '',
    });
  });

  it('sendMessage reports the package ids it has already drawn a card for', async () => {
    mockSendAssistantTurn
      .mockResolvedValueOnce({
        toolCall: { tool: 'answer_packages', args: { packageIds: ['p-1'] } },
        serverResult: { present: true, packages: [{ id: 'p-1', title: 'Bali Honeymoon Bliss' }] },
        message: 'Here it is.',
      })
      .mockResolvedValueOnce({
        toolCall: { tool: 'answer_packages', args: { packageIds: ['p-1'] } },
        serverResult: { present: false, packages: [{ id: 'p-1', title: 'Bali Honeymoon Bliss' }] },
        message: 'It is $618.',
      });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('tell me about bali');
    });
    // Nothing drawn yet on the first turn, so nothing is claimed as shown.
    expect(mockSendAssistantTurn.mock.calls[0][0].shownPackageIds).toEqual([]);

    await act(async () => {
      await result.current.sendMessage('how about prices');
    });
    // The card drawn on the first turn is now reported, which is how the server
    // knows not to draw it again.
    expect(mockSendAssistantTurn.mock.calls[1][0].shownPackageIds).toEqual(['p-1']);
  });

  it('sendMessage conversational path produces bubble-only turn data and reports the tool', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'respond_conversationally', args: { mode: 'social', socialSubtype: 'greeting' } },
      serverResult: { mode: 'social', source: 'resolver' },
      message: 'Hi! I can help with your trip.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    expect(result.current.turns[0].data).toEqual({ tool: 'respond_conversationally', mode: 'social' });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'response',
      tool: 'respond_conversationally',
      route: null,
    });
  });

  it('preserves the resolver-owned travel_general mode for bubble-only turns', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'respond_conversationally', args: { mode: 'travel_general', message: 'Leave one flexible day.' } },
      serverResult: { mode: 'travel_general', source: 'resolver' },
      message: 'Leave one flexible day.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('How should I structure a relaxed trip?');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'respond_conversationally',
      mode: 'travel_general',
    });
  });

  it('sendMessage off-topic path produces bubble-only redirect data and reports the tool', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'redirect_off_topic', args: {} },
      serverResult: { redirected: true, source: 'resolver' },
      message: 'I can help with travel and LushWare trips.',
    });

    const { result } = renderHook(() => useAssistantChat());

    await act(async () => {
      await result.current.sendMessage('Write a sorting algorithm');
    });

    expect(result.current.turns[0].data).toEqual({ tool: 'redirect_off_topic', redirected: true });
    expect(mockSendAssistantEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'response',
      tool: 'redirect_off_topic',
      route: null,
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
