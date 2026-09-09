import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { assistantEvent: { create: vi.fn() } },
}));

vi.mock('../../db/client.js', () => ({ default: mockPrisma }));

const { recordAssistantResolution } = await import('../assistantEvents.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recordAssistantResolution', () => {
  it('persists an allowlisted server-owned resolution event', async () => {
    mockPrisma.assistantEvent.create.mockResolvedValue({ id: 'event-1' });

    await recordAssistantResolution({
      sessionId: 'session-1',
      turnId: 'message-1',
      tool: 'navigate',
      route: 'packages',
      metadata: {
        finalStageTwoTool: 'navigate',
        stageTwoLatencyMs: 42,
        fallbackUsed: false,
      },
    });

    expect(mockPrisma.assistantEvent.create).toHaveBeenCalledWith({
      data: {
        sessionId: 'session-1',
        turnId: 'message-1',
        eventType: 'resolution',
        tool: 'navigate',
        route: 'packages',
        metadata: {
          finalStageTwoTool: 'navigate',
          stageTwoLatencyMs: 42,
          fallbackUsed: false,
        },
      },
    });
  });

  it('rejects unknown metadata keys before persistence', async () => {
    await recordAssistantResolution({
      sessionId: 'session-1',
      turnId: 'message-1',
      tool: null,
      route: null,
      metadata: { rawMessage: 'must never be persisted' },
    });

    expect(mockPrisma.assistantEvent.create).not.toHaveBeenCalled();
  });

  it('swallows persistence failures', async () => {
    mockPrisma.assistantEvent.create.mockRejectedValue(new Error('database unavailable'));

    await expect(
      recordAssistantResolution({
        sessionId: 'session-1',
        turnId: 'message-1',
        tool: null,
        route: null,
        metadata: { failureCategory: 'provider', fallbackUsed: false },
      }),
    ).resolves.toBeUndefined();
  });
});
