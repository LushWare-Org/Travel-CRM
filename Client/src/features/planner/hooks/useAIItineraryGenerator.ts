import { useState } from 'react';
import Swal from 'sweetalert2';
import { generateItineraryPreview, type AIItineraryDay } from '../../../services/api/aiItinerary';

interface GenerateParams {
  destination: string;
  duration: number;
  travelers?: number;
  preferences?: string;
}

interface UseAIItineraryGeneratorOptions<TDay> {
  hasExistingDays: () => boolean;
  mapDay: (aiDay: AIItineraryDay, index: number) => TDay;
  onGenerated: (days: TDay[]) => void;
}

export function useAIItineraryGenerator<TDay>({ hasExistingDays, mapDay, onGenerated }: UseAIItineraryGeneratorOptions<TDay>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generate = async (params: GenerateParams) => {
    if (hasExistingDays()) {
      const confirmed = await Swal.fire({
        icon: 'warning',
        title: 'Replace itinerary?',
        text: 'Generating a new AI itinerary will replace all planned days. Continue?',
        showCancelButton: true,
        confirmButtonText: 'Replace',
        cancelButtonText: 'Cancel',
      });
      if (!confirmed.isConfirmed) return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const { days } = await generateItineraryPreview(params);
      onGenerated(days.map(mapDay));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again or plan manually.');
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, error, generate };
}
