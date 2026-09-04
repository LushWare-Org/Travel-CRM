import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockGenerateDayPreview = vi.hoisted(() => vi.fn());
const mockGenerateDaysRangePreview = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/aiDayGeneration', () => ({
  generateDayPreview: mockGenerateDayPreview,
  generateDaysRangePreview: mockGenerateDaysRangePreview,
}));

import { useAIDayGenerator } from '../useAIDayGenerator';

beforeEach(() => {
  mockGenerateDayPreview.mockReset();
  mockGenerateDaysRangePreview.mockReset();
});

const baseContext = () => ({
  destination: 'Kandy',
  totalDuration: 5,
  travelers: 2,
  preferences: undefined,
  existingDays: [],
});

describe('useAIDayGenerator', () => {
  it('generateDay(n) calls generateDayPreview with the context and maps+applies the result via onDayGenerated', async () => {
    mockGenerateDayPreview.mockResolvedValue({ day: { dayNumber: 3, title: 'Waterfalls', locations: [], activities: [] } });
    const mapDay = vi.fn((day, dayNumber) => ({ mapped: true, dayNumber, day }));
    const onDayGenerated = vi.fn();
    const onDaysGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay, onDayGenerated, onDaysGenerated }),
    );

    await act(async () => {
      await result.current.generateDay(3);
    });

    expect(mockGenerateDayPreview).toHaveBeenCalledWith({
      destination: 'Kandy',
      dayNumber: 3,
      totalDuration: 5,
      travelers: 2,
      preferences: undefined,
      existingDays: [],
    });
    expect(mapDay).toHaveBeenCalledWith({ dayNumber: 3, title: 'Waterfalls', locations: [], activities: [] }, 3);
    expect(onDayGenerated).toHaveBeenCalledWith({ mapped: true, dayNumber: 3, day: expect.any(Object) }, 3);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatingDayNumber).toBe(null);
    expect(result.current.error).toBe('');
  });

  it('generateDay(n) sets generatingDayNumber to n while in flight', async () => {
    // Executor form (not Promise.withResolvers) — this project's tsconfig
    // targets ES2020/lib ES2020, which predates withResolvers.
    let resolvePromise: (value: unknown) => void = () => {};
    mockGenerateDayPreview.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    const onDayGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay: (day) => day, onDayGenerated, onDaysGenerated: vi.fn() }),
    );

    let generatePromise!: Promise<void>;
    act(() => {
      generatePromise = result.current.generateDay(2);
    });
    expect(result.current.isGenerating).toBe(true);
    expect(result.current.generatingDayNumber).toBe(2);

    await act(async () => {
      resolvePromise({ day: { dayNumber: 2, title: 'X', locations: [], activities: [] } });
      await generatePromise;
    });
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generatingDayNumber).toBe(null);
  });

  it('a rejected generateDayPreview call sets error and never calls onDayGenerated', async () => {
    mockGenerateDayPreview.mockRejectedValue(new Error('AI generation failed'));
    const onDayGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay: (day) => day, onDayGenerated, onDaysGenerated: vi.fn() }),
    );

    await act(async () => {
      await result.current.generateDay(1);
    });

    expect(result.current.error).toBe('AI generation failed');
    expect(onDayGenerated).not.toHaveBeenCalled();
  });

  it('generateDays(dayNumbers) maps each returned day positionally and calls onDaysGenerated once', async () => {
    mockGenerateDaysRangePreview.mockResolvedValue({
      days: [
        { dayNumber: 4, title: 'Beach', locations: [], activities: [] },
        { dayNumber: 5, title: 'Departure', locations: [], activities: [] },
      ],
    });
    const mapDay = vi.fn((day, dayNumber) => ({ dayNumber, title: day.title }));
    const onDaysGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay, onDayGenerated: vi.fn(), onDaysGenerated }),
    );

    await act(async () => {
      await result.current.generateDays([4, 5]);
    });

    expect(onDaysGenerated).toHaveBeenCalledTimes(1);
    expect(onDaysGenerated).toHaveBeenCalledWith(
      [{ dayNumber: 4, title: 'Beach' }, { dayNumber: 5, title: 'Departure' }],
      [4, 5],
    );
    expect(result.current.error).toBe('');
  });

  it('generateDays: on partial shortfall, still applies the returned days and sets a "N of M" error', async () => {
    mockGenerateDaysRangePreview.mockResolvedValue({
      days: [{ dayNumber: 4, title: 'Beach', locations: [], activities: [] }],
    });
    const onDaysGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay: (day) => day, onDayGenerated: vi.fn(), onDaysGenerated }),
    );

    await act(async () => {
      await result.current.generateDays([4, 5]);
    });

    expect(onDaysGenerated).toHaveBeenCalledWith([{ dayNumber: 4, title: 'Beach', locations: [], activities: [] }], [4, 5]);
    expect(result.current.error).toBe('1 of 2 days generated. Click again to fill the rest.');
  });

  it('generateDays([]) is a no-op — never calls the API', async () => {
    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay: (day) => day, onDayGenerated: vi.fn(), onDaysGenerated: vi.fn() }),
    );

    await act(async () => {
      await result.current.generateDays([]);
    });

    expect(mockGenerateDaysRangePreview).not.toHaveBeenCalled();
  });

  it('a rejected generateDaysRangePreview call sets error and never calls onDaysGenerated', async () => {
    mockGenerateDaysRangePreview.mockRejectedValue(new Error('Range generation failed'));
    const onDaysGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIDayGenerator({ getContext: baseContext, mapDay: (day) => day, onDayGenerated: vi.fn(), onDaysGenerated }),
    );

    await act(async () => {
      await result.current.generateDays([4, 5]);
    });

    expect(result.current.error).toBe('Range generation failed');
    expect(onDaysGenerated).not.toHaveBeenCalled();
  });
});
