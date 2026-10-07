import { useState } from 'react';
import Swal from 'sweetalert2';
import { generateItineraryPreview, type AIItineraryDay } from '../../../services/api/aiItinerary';
import { apiErrorMessage } from '@/services/http/apiErrorMessage';

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

  /** Resolves to what happened, so a caller that is not a button — the
   * assistant's page action — can say which of the three it was. `error` still
   * carries the message for the page's own banner. */
  const generate = async (params: GenerateParams): Promise<'generated' | 'cancelled' | 'failed'> => {
    if (hasExistingDays()) {
      const confirmed = await Swal.fire({
        icon: 'warning',
        title: 'Replace itinerary?',
        text: 'Generating a new AI itinerary will replace all planned days. Continue?',
        showCancelButton: true,
        confirmButtonText: 'Replace',
        cancelButtonText: 'Cancel',
      });
      if (!confirmed.isConfirmed) return 'cancelled';
    }
    setError('');
    setIsGenerating(true);
    try {
      const { days } = await generateItineraryPreview(params);
      onGenerated(days.map(mapDay));
      return 'generated';
    } catch (err) {
      setError(apiErrorMessage(err));
      return 'failed';
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, error, generate };
}
