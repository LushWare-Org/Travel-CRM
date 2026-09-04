import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
vi.mock('../../http/client', () => ({ default: { post: mockPost } }));

import { generateDayPreview, generateDaysRangePreview } from '../aiDayGeneration';

beforeEach(() => {
  mockPost.mockReset();
});

const validDay = {
  dayNumber: 3,
  title: 'Waterfalls',
  locations: ['Tegenungan Waterfall'],
  activities: ['Waterfall hike'],
};

describe('generateDayPreview', () => {
  it('resolves with the parsed {day} on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { day: validDay } },
    });

    const result = await generateDayPreview({ destination: 'Bali', dayNumber: 3, totalDuration: 7 });

    expect(result).toEqual({ day: validDay });
    expect(mockPost).toHaveBeenCalledWith('/packages/generate-day-preview', {
      destination: 'Bali',
      dayNumber: 3,
      totalDuration: 7,
    });
  });

  it('rejects before calling httpClient.post when destination is empty', async () => {
    await expect(
      generateDayPreview({ destination: '', dayNumber: 3, totalDuration: 7 }),
    ).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects when the response day fails ManualItineraryDay validation', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { day: { title: 'Waterfalls' } } }, // missing dayNumber
    });

    await expect(
      generateDayPreview({ destination: 'Bali', dayNumber: 3, totalDuration: 7 }),
    ).rejects.toThrow();
  });
});

describe('generateDaysRangePreview', () => {
  const rangeDays = [
    validDay,
    { dayNumber: 4, title: 'Beach Day', locations: ['Seminyak Beach'], activities: ['Surfing lesson'] },
  ];

  it('resolves with parsed {days} on a well-formed response', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { days: rangeDays } },
    });

    const result = await generateDaysRangePreview({ destination: 'Bali', dayNumbers: [3, 4], totalDuration: 7 });

    expect(result).toEqual({ days: rangeDays });
    expect(mockPost).toHaveBeenCalledWith('/packages/generate-days-preview', {
      destination: 'Bali',
      dayNumbers: [3, 4],
      totalDuration: 7,
    });
  });

  it('resolves with an empty days array on a partial shortfall (no min-length requirement)', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, data: { days: [] } },
    });

    const result = await generateDaysRangePreview({ destination: 'Bali', dayNumbers: [3, 4], totalDuration: 7 });

    expect(result).toEqual({ days: [] });
  });

  it('rejects before calling httpClient.post when dayNumbers is empty', async () => {
    await expect(
      generateDaysRangePreview({ destination: 'Bali', dayNumbers: [], totalDuration: 7 }),
    ).rejects.toThrow();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
