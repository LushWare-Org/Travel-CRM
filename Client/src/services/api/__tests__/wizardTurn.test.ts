import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { sendWizardTurn } from '../wizardTurn';

beforeEach(() => {
  mockPost.mockReset();
});

describe('sendWizardTurn', () => {
  it('resolves with the parsed turn envelope on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          toolCall: { tool: 'set_slot', args: { slots: { destination: 'Bali' } } },
          serverResult: null,
          updatedWizardState: { slots: { destination: 'Bali' } },
          uiComponent: 'slotPrompt',
          message: 'How long is your trip?',
        },
      },
    });

    const result = await sendWizardTurn({ messages: [{ role: 'user', content: 'Bali' }] });

    expect(result.uiComponent).toBe('slotPrompt');
    expect(result.updatedWizardState.slots?.destination).toBe('Bali');
    expect(mockPost).toHaveBeenCalledWith('/packages/wizard-turn', {
      messages: [{ role: 'user', content: 'Bali' }],
    });
  });

  it('rejects before calling httpClient.post when messages is []', async () => {
    await expect(sendWizardTurn({ messages: [] })).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the response fails WizardTurnResult validation (missing uiComponent)', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { toolCall: { tool: 'set_slot', args: {} }, serverResult: null, updatedWizardState: {}, message: '' },
      },
    });

    await expect(sendWizardTurn({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow();
  });
});
