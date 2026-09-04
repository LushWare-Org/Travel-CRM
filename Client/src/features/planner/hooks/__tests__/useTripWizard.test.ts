import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendWizardTurn = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/wizardTurn', () => ({
  sendWizardTurn: mockSendWizardTurn,
}));

import { useTripWizard } from '../useTripWizard';

beforeEach(() => {
  mockSendWizardTurn.mockReset();
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

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Bali' },
      { role: 'assistant', content: 'How long is your trip?' },
    ]);
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

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Got it!' },
    ]);
    expect(result.current.error).toBe('');
  });
});
