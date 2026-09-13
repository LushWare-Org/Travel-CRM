import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { generateItineraryPreview } from '../aiItinerary';

beforeEach(() => {
  mockPost.mockReset();
});

const validDay = {
  dayNumber: 1,
  title: 'Arrival',
  locations: ['Kandy'],
  activities: ['Temple visit'],
};

describe('generateItineraryPreview', () => {
  it('resolves with parsed {days} on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { days: [validDay] } },
    });

    const result = await generateItineraryPreview({ destination: 'Kandy, Sri Lanka', duration: 1 });

    expect(result).toEqual({ days: [validDay] });
    expect(mockPost).toHaveBeenCalledWith('/packages/generate-itinerary-preview', {
      destination: 'Kandy, Sri Lanka',
      duration: 1,
    });
  });

  it('rejects before calling httpClient.post when destination is empty', async () => {
    await expect(
      generateItineraryPreview({ destination: '', duration: 1 }),
    ).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the response days fail ManualItineraryDay validation', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { days: [{ title: 'Arrival' }] } }, // missing dayNumber
    });

    await expect(
      generateItineraryPreview({ destination: 'Kandy, Sri Lanka', duration: 1 }),
    ).rejects.toThrow();
  });
});
