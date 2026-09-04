import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendWizardTurn = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/wizardTurn', () => ({
  sendWizardTurn: mockSendWizardTurn,
}));

import { useTripWizard } from '../useTripWizard';

const SESSION_KEY = 'travel-crm.wizardSessionId';

beforeEach(() => {
  mockSendWizardTurn.mockReset();
  localStorage.clear();
});

describe('useTripWizard', () => {
  it('send() appends the user message, then the assistant message and updated wizardState on success', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: { slots: { destination: 'Bali' } },
      uiComponent: 'slotPrompt',
      message: 'How long is your trip?',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.send('Bali');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual(expect.objectContaining({ role: 'user', content: 'Bali' }));
    expect(result.current.messages[1]).toEqual(expect.objectContaining({ role: 'assistant', content: 'How long is your trip?' }));
    expect(result.current.wizardState).toEqual({ slots: { destination: 'Bali' } });
  });

  it('propose_packages response populates packages from serverResult', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'propose_packages', args: {} },
      serverResult: { packages: [{ id: 'pkg-1', title: 'Bali Beach Escape' }] },
      updatedWizardState: {},
      uiComponent: 'packageCards',
      message: 'Here are some options!',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.send('Show me options');
    });

    expect(result.current.packages).toEqual([{ id: 'pkg-1', title: 'Bali Beach Escape' }]);
  });

  it('answer_policy_question response populates policyAnswer', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'answer_policy_question', args: {} },
      serverResult: { answered: true, snippets: [{ docId: 'doc-1', title: 'Refunds', quote: 'Full refund within 24h.' }] },
      updatedWizardState: {},
      uiComponent: 'policyAnswer',
      message: "Here's what our policy says:",
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.send('What is your refund policy?');
    });

    expect(result.current.policyAnswer?.answered).toBe(true);
    expect(result.current.policyAnswer?.snippets?.[0].quote).toBe('Full refund within 24h.');
  });

  it('selectPackage() sets wizardState.selectedPackageId and completedPackage on a complete response', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'complete_wizard', args: {} },
      serverResult: { package: { id: 'pkg-1', title: 'Bali Beach Escape' } },
      updatedWizardState: { selectedPackageId: 'pkg-1' },
      uiComponent: 'complete',
      message: 'Great choice!',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.selectPackage({ id: 'pkg-1', title: 'Bali Beach Escape' } as never);
    });

    expect(mockSendWizardTurn).toHaveBeenCalledWith(expect.objectContaining({
      wizardState: expect.objectContaining({ selectedPackageId: 'pkg-1' }),
    }));
    expect(result.current.completedPackage).toEqual({ id: 'pkg-1', title: 'Bali Beach Escape' });
  });

  it('an error uiComponent sets wizardError without throwing', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'complete_wizard', args: {} },
      serverResult: { error: 'PACKAGE_NOT_FOUND' },
      updatedWizardState: {},
      uiComponent: 'error',
      message: '',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.selectPackage({ id: 'gone', title: 'Gone' } as never);
    });

    expect(result.current.wizardError).toMatch(/no longer available/);
  });

  it('a rejected call keeps the user message, sets error, and retry() re-sends', async () => {
    mockSendWizardTurn.mockRejectedValueOnce(new Error('offline'));
    mockSendWizardTurn.mockResolvedValueOnce({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'Got it!',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.send('Hi');
    });
    expect(result.current.error).toBe('offline');

    await act(async () => {
      result.current.retry();
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual(expect.objectContaining({ role: 'user', content: 'Hi' }));
    expect(result.current.messages[1]).toEqual(expect.objectContaining({ role: 'assistant', content: 'Got it!' }));
    expect(result.current.error).toBe('');
  });

  it('generates a sessionId once, persists it to localStorage, and reuses it across sends', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'ok',
    });

    const { result } = renderHook(() => useTripWizard());

    await act(async () => {
      await result.current.send('Bali');
    });
    await act(async () => {
      await result.current.send('Paris');
    });

    const sessionIds = mockSendWizardTurn.mock.calls.map((c) => c[0].sessionId);
    expect(sessionIds).toHaveLength(2);
    expect(typeof sessionIds[0]).toBe('string');
    expect(sessionIds[0]).toBe(sessionIds[1]);
    expect(sessionIds[0]).toBe(localStorage.getItem(SESSION_KEY));
  });

  it('reads an existing sessionId from localStorage instead of generating a new one', async () => {
    localStorage.setItem(SESSION_KEY, 'seeded-session');
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'ok',
    });

    const { result } = renderHook(() => useTripWizard());
    await act(async () => {
      await result.current.send('Bali');
    });

    expect(mockSendWizardTurn).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'seeded-session' }));
    expect(localStorage.getItem(SESSION_KEY)).toBe('seeded-session');
  });

  it('gives every message a stable id and ISO at timestamp', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'Got it',
    });

    const { result } = renderHook(() => useTripWizard());
    await act(async () => {
      await result.current.send('Bali');
    });

    const sent = mockSendWizardTurn.mock.calls[0][0].messages;
    expect(sent[0]).toEqual(expect.objectContaining({ role: 'user', content: 'Bali' }));
    expect(typeof sent[0].id).toBe('string');
    expect(sent[0].id.length).toBeGreaterThan(0);
    expect(sent[0].at).toMatch(/Z$/);
    expect(new Date(sent[0].at).toISOString()).toBe(sent[0].at);

    const assistant = result.current.messages[1];
    expect(assistant).toEqual(expect.objectContaining({ role: 'assistant', content: 'Got it' }));
    expect(typeof assistant.id).toBe('string');
    expect(typeof assistant.at).toBe('string');
  });

  it('resends the same earlier message with its original id in a later turn window', async () => {
    mockSendWizardTurn.mockResolvedValue({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: {},
      uiComponent: 'slotPrompt',
      message: 'ok',
    });

    const { result } = renderHook(() => useTripWizard());
    await act(async () => {
      await result.current.send('Bali');
    });
    const firstUser = mockSendWizardTurn.mock.calls[0][0].messages[0];

    await act(async () => {
      await result.current.send('Paris');
    });
    const secondWindow = mockSendWizardTurn.mock.calls[1][0].messages;

    expect(secondWindow.map((m: { id: string }) => m.id)).toContain(firstUser.id);
    const resent = secondWindow.find((m: { id: string }) => m.id === firstUser.id);
    expect(resent?.at).toBe(firstUser.at);
    expect(resent?.content).toBe('Bali');

    expect(result.current.messages[1]).toEqual(expect.objectContaining({ role: 'assistant', content: 'ok' }));
  });

  it('a contactPrompt response sets contactPrompt state and clears it on the next turn', async () => {
    mockSendWizardTurn.mockResolvedValueOnce({
      toolCall: { tool: 'capture_contact', args: {} },
      serverResult: null,
      updatedWizardState: { contact: { email: 'a@b.com' } },
      uiComponent: 'contactPrompt',
      message: 'How can we reach you?',
    });
    mockSendWizardTurn.mockResolvedValueOnce({
      toolCall: { tool: 'set_slot', args: {} },
      serverResult: null,
      updatedWizardState: { contact: { email: 'a@b.com' } },
      uiComponent: 'slotPrompt',
      message: 'Thanks!',
    });

    const { result } = renderHook(() => useTripWizard());
    await act(async () => {
      await result.current.send('Bali');
    });
    expect(result.current.contactPrompt).toBe(true);
    expect(result.current.wizardState.contact).toEqual({ email: 'a@b.com' });

    await act(async () => {
      await result.current.send('Here is my contact info');
    });
    expect(result.current.contactPrompt).toBe(false);
  });
});
