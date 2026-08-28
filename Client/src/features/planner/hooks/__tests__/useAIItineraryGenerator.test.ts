import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockGenerateItineraryPreview = vi.hoisted(() => vi.fn());
const mockSwalFire = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/api/aiItinerary', () => ({
  generateItineraryPreview: mockGenerateItineraryPreview,
}));

vi.mock('sweetalert2', () => ({
  default: { fire: mockSwalFire },
}));

import { useAIItineraryGenerator } from '../useAIItineraryGenerator';

beforeEach(() => {
  mockGenerateItineraryPreview.mockReset();
  mockSwalFire.mockReset();
});

const aiDays = [
  { dayNumber: 1, title: 'Arrival', locations: ['Kandy'], activities: ['Temple visit'] },
];

describe('useAIItineraryGenerator', () => {
  it('calling generate() with no existing days skips the confirm dialog and calls onGenerated with mapped days on success', async () => {
    mockGenerateItineraryPreview.mockResolvedValue({ days: aiDays });
    const mapDay = vi.fn((day, index) => ({ mapped: true, index, day }));
    const onGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIItineraryGenerator({ hasExistingDays: () => false, mapDay, onGenerated }),
    );

    await act(async () => {
      await result.current.generate({ destination: 'Kandy', duration: 1 });
    });

    expect(mockSwalFire).not.toHaveBeenCalled();
    expect(onGenerated).toHaveBeenCalledWith([{ mapped: true, index: 0, day: aiDays[0] }]);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('with existing days present, confirms via Swal.fire — canceling never calls onGenerated', async () => {
    mockSwalFire.mockResolvedValue({ isConfirmed: false });
    const mapDay = vi.fn((day) => day);
    const onGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIItineraryGenerator({ hasExistingDays: () => true, mapDay, onGenerated }),
    );

    await act(async () => {
      await result.current.generate({ destination: 'Kandy', duration: 1 });
    });

    expect(mockSwalFire).toHaveBeenCalledTimes(1);
    expect(mockGenerateItineraryPreview).not.toHaveBeenCalled();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('a rejected generateItineraryPreview call sets error and never calls onGenerated', async () => {
    mockGenerateItineraryPreview.mockRejectedValue(new Error('AI generation failed'));
    const mapDay = vi.fn((day) => day);
    const onGenerated = vi.fn();

    const { result } = renderHook(() =>
      useAIItineraryGenerator({ hasExistingDays: () => false, mapDay, onGenerated }),
    );

    await act(async () => {
      await result.current.generate({ destination: 'Kandy', duration: 1 });
    });

    await waitFor(() => expect(result.current.error).toBe('AI generation failed'));
    expect(onGenerated).not.toHaveBeenCalled();
    expect(result.current.isGenerating).toBe(false);
  });
});
