import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { sendItineraryChatMessage } from '../itineraryChat';

beforeEach(() => {
  mockPost.mockReset();
});

describe('sendItineraryChatMessage', () => {
  it('resolves with parsed {reply, slots, readyToGenerate} on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { reply: 'Great!', slots: { destination: 'Kandy', duration: 3 }, readyToGenerate: true } },
    });

    const result = await sendItineraryChatMessage({ messages: [{ role: 'user', content: 'Kandy, 3 days' }] });

    expect(result).toEqual({ reply: 'Great!', slots: { destination: 'Kandy', duration: 3 }, readyToGenerate: true });
    expect(mockPost).toHaveBeenCalledWith('/packages/itinerary-chat', {
      messages: [{ role: 'user', content: 'Kandy, 3 days' }],
    });
  });

  it('rejects before calling httpClient.post when messages is []', async () => {
    await expect(sendItineraryChatMessage({ messages: [] })).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the response fails ItineraryChatResult validation (missing reply)', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { slots: {}, readyToGenerate: false } },
    });

    await expect(
      sendItineraryChatMessage({ messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toThrow();
  });
});
