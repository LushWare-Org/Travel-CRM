import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendAssistantTurn = vi.hoisted(() => vi.fn());
const mockSendAssistantEvent = vi.hoisted(() => vi.fn());
// What the mounted page reports this turn. Mocked rather than provided so the
// hook can be exercised with and without a page, which is the difference that
// decides whether a turn carries a capability manifest at all.
const mockPageRegistration = vi.hoisted(() => ({ current: null as unknown }));
// What the mounted page reported is on screen. Mocked for the same reason the
// registration is: a test can then exercise a page that counts, a page that only
// knows where it is, and no page at all.
const mockCurrentView = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../capabilities/AssistantCapabilityProvider', () => ({
  useAssistantCapabilities: () => () => mockPageRegistration.current,
  useAssistantPageRegistration: vi.fn(),
  useAssistantCurrentView: () => () => mockCurrentView.current,
}));
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
  // No page mounted unless a test says so — the state every pre-existing case in
  // this file was written against.
  mockPageRegistration.current = null;
  mockCurrentView.current = null;
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

  it('reports where the browser is on every turn, even with no page reporting counts', async () => {
    mockSendAssistantTurn.mockResolvedValue(NAVIGATE_RESULT);

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('Take me to the packages page');
    });

    // The baseline every page contributes: without it the assistant has no idea
    // what the visitor is looking at, which is the state this channel exists for.
    expect(mockSendAssistantTurn.mock.calls[0][0].currentView).toEqual({ path: '/' });
  });

  it('sends the counts a page reported, sanitised to what the wire accepts', async () => {
    mockSendAssistantTurn.mockResolvedValue(NAVIGATE_RESULT);
    mockCurrentView.current = {
      path: '/packages',
      params: { destination: 'uae', 'not a key': 'x', priceMax: '1500' },
      filteredCount: 3,
      // Fractional and absurd values must not reach a request field the schema
      // rejects: a rejected request costs the visitor the whole turn, not one
      // number.
      renderedCount: 2.7,
      catalogueTotal: 10 ** 9,
    };

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('how many are showing?');
    });

    expect(mockSendAssistantTurn.mock.calls[0][0].currentView).toEqual({
      path: '/packages',
      params: { destination: 'uae', priceMax: '1500' },
      filteredCount: 3,
      renderedCount: 2,
      catalogueTotal: 100000,
    });
  });

  it('maps a view answer onto the summary data, relaying the page\u2019s own numbers', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_current_view', args: {} },
      serverResult: {
        view: {
          path: '/packages',
          params: { destination: 'uae', priceMax: '1500' },
          filteredCount: 3,
          renderedCount: 2,
          catalogueTotal: 25,
        },
      },
      message: 'There are 3 trips matching the filters on this page. 2 are shown so far.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('how many are showing?');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_current_view',
      view: {
        count: 3,
        renderedCount: 2,
        params: [
          { key: 'destination', value: 'uae' },
          { key: 'priceMax', value: '1500' },
        ],
      },
    });
  });

  it('renders no summary data when the answer carries no report at all', async () => {
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'answer_current_view', args: {} },
      serverResult: { view: null },
      message: "I can't see the page you're on right now.",
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('what am I looking at?');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'answer_current_view',
      view: { count: null, renderedCount: null, params: [] },
    });
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

describe('useAssistantChat — page capabilities', () => {
  const REGISTRATION = {
    surface: 'planner' as const,
    revision: 'planner',
    pageContext: { surface: 'planner' as const, revision: 'planner', step: 3, destination: 'Kandy', duration: 3 },
    actions: ['edit_day' as const],
    runAction: vi.fn(async () => 'Updated Day 3: activities.'),
  };

  const EDIT_DAY_RESULT = {
    toolCall: { tool: 'edit_day', args: { dayNumber: 3, operation: 'add_activities', values: ['whale watching'] } },
    serverResult: {
      action: { tool: 'edit_day', dayNumber: 3, operation: 'add_activities', values: ['whale watching'] },
      revision: 'planner',
      surface: 'planner',
    },
    message: 'Updating that day now.',
  };

  it('sends the page manifest and its state on every turn while a page is mounted', async () => {
    mockPageRegistration.current = REGISTRATION;
    mockSendAssistantTurn.mockResolvedValue(NAVIGATE_RESULT);

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('redo day 2');
    });

    expect(mockSendAssistantTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: { version: 1, surface: 'planner', actions: ['edit_day'] },
        pageContext: expect.objectContaining({ revision: 'planner', step: 3, destination: 'Kandy' }),
      }),
    );
  });

  it('sends no manifest at all on a page that registers nothing', async () => {
    mockPageRegistration.current = null;
    mockSendAssistantTurn.mockResolvedValue(NAVIGATE_RESULT);

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('show me packages');
    });

    const payload = mockSendAssistantTurn.mock.calls[0][0];
    expect(payload.capabilities).toBeUndefined();
    expect(payload.pageContext).toBeUndefined();
  });

  it('runs the page action and reports what the page did under the reply', async () => {
    const runAction = vi.fn(async () => 'Updated Day 3: activities.');
    mockPageRegistration.current = { ...REGISTRATION, runAction };
    mockSendAssistantTurn.mockResolvedValue(EDIT_DAY_RESULT);

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('add whale watching to day 3');
    });

    expect(runAction).toHaveBeenCalledWith({
      tool: 'edit_day',
      dayNumber: 3,
      operation: 'add_activities',
      values: ['whale watching'],
    });
    expect(result.current.turns[0].data).toEqual({
      tool: 'page_action',
      pending: null,
      revision: 'planner',
      announcement: 'Updated Day 3: activities.',
    });
    // The announcement belongs to the turn, not to the transcript: a second
    // message would otherwise carry it back to the server as something the
    // assistant said.
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: 'user' }),
      expect.objectContaining({ role: 'assistant', content: 'Updating that day now.' }),
    ]);
  });

  it('refuses an action chosen against a page that has since been replaced', async () => {
    const runAction = vi.fn(async () => 'never');
    mockPageRegistration.current = { ...REGISTRATION, revision: 'customize:p2', runAction };
    mockSendAssistantTurn.mockResolvedValue({
      ...EDIT_DAY_RESULT,
      serverResult: { ...EDIT_DAY_RESULT.serverResult, revision: 'customize:p1' },
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('add whale watching to day 3');
    });

    expect(runAction).not.toHaveBeenCalled();
    expect(result.current.turns[0].data).toEqual({
      tool: 'page_action',
      pending: null,
      revision: 'customize:p1',
      announcement: 'The page changed, so I did not touch it — ask me again.',
    });
  });

  it('gives a grounded answer its sources, dropping anything that is not a link', async () => {
    mockPageRegistration.current = null;
    mockSendAssistantTurn.mockResolvedValue({
      toolCall: { tool: 'search_travel_info', args: { query: 'best time to visit Kandy' } },
      serverResult: {
        searched: true,
        query: 'best time to visit Kandy',
        citations: [
          { title: 'example.com', uri: 'https://example.com/kandy' },
          { title: 'bad', uri: 'javascript:alert(1)' },
          { title: 'travel.state.gov', uri: 'https://travel.state.gov/kandy' },
        ],
      },
      message: 'December to March is driest.',
    });

    const { result } = renderHook(() => useAssistantChat());
    await act(async () => {
      await result.current.sendMessage('what is the best time to visit Kandy');
    });

    expect(result.current.turns[0].data).toEqual({
      tool: 'search_travel_info',
      citations: [
        { title: 'example.com', uri: 'https://example.com/kandy' },
        { title: 'travel.state.gov', uri: 'https://travel.state.gov/kandy' },
      ],
    });
  });
});
