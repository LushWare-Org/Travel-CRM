import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockGet = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost, get: mockGet } }));

import { submitManualItineraryRequest, fetchUserManualItineraries } from '../manualItinerary';

beforeEach(() => {
  mockPost.mockReset();
  mockGet.mockReset();
});

const validDay = {
  dayNumber: 1,
  title: 'Arrival',
  locations: [],
  activities: [],
  accommodation: { name: '', type: 'hotel' as const, rating: 4, address: '', contactNumber: '' },
  meals: { breakfast: true, lunch: false, dinner: false },
  places: [],
  notes: '',
};

describe('submitManualItineraryRequest', () => {
  it('resolves with the parsed result, accepting real-shaped days (string places, accommodation.rating)', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { leadId: 'lead-1', manualItineraryId: 'mi-1' } },
    });
    const result = await submitManualItineraryRequest({
      email: 'jane@example.com', days: [validDay],
    });
    expect(result).toEqual({ leadId: 'lead-1', manualItineraryId: 'mi-1' });
  });

  it('rejects an empty days array before sending', async () => {
    await expect(
      submitManualItineraryRequest({ email: 'jane@example.com', days: [] }),
    ).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects a day with a places array of objects (the pre-fix shape) since real places are strings', async () => {
    await expect(
      submitManualItineraryRequest({
        email: 'jane@example.com',
        days: [{ ...validDay, places: [{ name: 'Galle Face Green' }] as never }],
      }),
    ).rejects.toThrow();
  });
});

describe('fetchUserManualItineraries', () => {
  it('resolves with the parsed array on a well-formed response', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, data: [{ days: [validDay], status: 'pending' }] },
    });
    const result = await fetchUserManualItineraries();
    expect(result).toEqual([{ days: [validDay], status: 'pending' }]);
  });
});
