import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockSendItineraryChatMessage = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/itineraryChat', () => ({
  sendItineraryChatMessage: mockSendItineraryChatMessage,
}));

import { useItineraryChat } from '../useItineraryChat';

beforeEach(() => {
  mockSendItineraryChatMessage.mockReset();
});

describe('useItineraryChat', () => {
  it('send() appends the user message immediately, then the assistant reply and updated slots/readyToGenerate on success', async () => {
    mockSendItineraryChatMessage.mockResolvedValue({
      reply: 'Great, 3 days in Kandy!',
      slots: { destination: 'Kandy', duration: 3 },
      readyToGenerate: true,
    });

    const { result } = renderHook(() => useItineraryChat());

    await act(async () => {
      await result.current.send('3 day trip to Kandy');
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: '3 day trip to Kandy' },
      { role: 'assistant', content: 'Great, 3 days in Kandy!' },
    ]);
    expect(result.current.slots).toEqual({ destination: 'Kandy', duration: 3 });
    expect(result.current.readyToGenerate).toBe(true);
    expect(result.current.error).toBe('');
  });

  it('a rejected call keeps the user message in messages, sets error, and appends no assistant reply', async () => {
    mockSendItineraryChatMessage.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useItineraryChat());

    await act(async () => {
      await result.current.send('Hi');
    });

    expect(result.current.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    expect(result.current.error).toBe('network down');
  });

  it('retry() after a failure re-sends without duplicating the user message, and clears error on success', async () => {
    mockSendItineraryChatMessage.mockRejectedValueOnce(new Error('network down'));
    mockSendItineraryChatMessage.mockResolvedValueOnce({ reply: 'Got it!', slots: {}, readyToGenerate: false });

    const { result } = renderHook(() => useItineraryChat());

    await act(async () => {
      await result.current.send('Hi');
    });
    expect(result.current.error).toBe('network down');

    await act(async () => {
      result.current.retry();
    });

    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Got it!' },
    ]);
    expect(result.current.error).toBe('');
    expect(mockSendItineraryChatMessage).toHaveBeenCalledTimes(2);
  });

  it('sending 25 messages in sequence results in the final call payload having only the 20 most recent entries', async () => {
    mockSendItineraryChatMessage.mockResolvedValue({ reply: 'ok', slots: {}, readyToGenerate: false });

    const { result } = renderHook(() => useItineraryChat());

    for (let i = 0; i < 25; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        await result.current.send(`message ${i}`);
      });
    }

    const lastCallPayload = mockSendItineraryChatMessage.mock.calls[24][0];
    expect(lastCallPayload.messages).toHaveLength(20);
  });
});
