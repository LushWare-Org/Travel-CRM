import { useState } from 'react';
import { generateDayPreview, generateDaysRangePreview, type AIGeneratedDay } from '../../../services/api/aiDayGeneration';
import { apiErrorMessage } from '@/services/http/apiErrorMessage';
import type { ExistingDayContext } from '../utils/formHelpers';

interface DayGenerationContext {
  destination: string;
  totalDuration: number;
  travelers?: number;
  preferences?: string;
  existingDays: ExistingDayContext[];
}

interface UseAIDayGeneratorOptions<TDay> {
  /** Trip-level params + the other days, read fresh at call time (mirrors
   * useAIItineraryGenerator's hasExistingDays()) so a stale closure never
   * ships outdated form state. */
  getContext: () => DayGenerationContext;
  /** Maps an AI day onto the container's day-state shape. `dayNumber` is
   * always the requested slot (already forced server-side), so containers
   * reuse their existing buildItineraryDayFromAIDay/buildDayState mappers by
   * passing `dayNumber - 1` as the index argument. */
  mapDay: (aiDay: AIGeneratedDay, dayNumber: number) => TDay;
  onDayGenerated: (day: TDay, dayNumber: number) => void;
  onDaysGenerated: (days: TDay[], requestedDayNumbers: number[]) => void;
}

/** Per-day / bulk-range counterpart to useAIItineraryGenerator: regenerates
 * or fills specific days in place instead of replacing the whole trip. */
export function useAIDayGenerator<TDay>({ getContext, mapDay, onDayGenerated, onDaysGenerated }: UseAIDayGeneratorOptions<TDay>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDayNumber, setGeneratingDayNumber] = useState<number | null>(null);
  const [error, setError] = useState('');

  /** Resolves to what happened, for the assistant's page action; `error` still
   * carries the message the page renders. */
  const generateDay = async (dayNumber: number): Promise<'generated' | 'failed'> => {
    const context = getContext();
    setError('');
    setIsGenerating(true);
    setGeneratingDayNumber(dayNumber);
    try {
      const { day } = await generateDayPreview({
        destination: context.destination,
        dayNumber,
        totalDuration: context.totalDuration,
        travelers: context.travelers,
        preferences: context.preferences,
        existingDays: context.existingDays,
      });
      onDayGenerated(mapDay(day, dayNumber), dayNumber);
      return 'generated';
    } catch (err) {
      setError(apiErrorMessage(err));
      return 'failed';
    } finally {
      setIsGenerating(false);
      setGeneratingDayNumber(null);
    }
  };

  /** `partial` is the existing shortfall outcome — some days came back, the rest
   * are named in `error`. */
  const generateDays = async (dayNumbers: number[]): Promise<'generated' | 'partial' | 'failed'> => {
    if (dayNumbers.length === 0) return 'generated';
    const context = getContext();
    setError('');
    setIsGenerating(true);
    try {
      const { days } = await generateDaysRangePreview({
        destination: context.destination,
        dayNumbers,
        totalDuration: context.totalDuration,
        travelers: context.travelers,
        preferences: context.preferences,
        existingDays: context.existingDays,
      });
      const returnedByDayNumber = new Map(days.map((d) => [d.dayNumber, d]));
      const mapped = dayNumbers
        .filter((n) => returnedByDayNumber.has(n))
        .map((n) => mapDay(returnedByDayNumber.get(n) as AIGeneratedDay, n));
      if (mapped.length > 0) onDaysGenerated(mapped, dayNumbers);
      if (mapped.length < dayNumbers.length) {
        setError(`${mapped.length} of ${dayNumbers.length} days generated. Click again to fill the rest.`);
        return 'partial';
      }
      return 'generated';
    } catch (err) {
      setError(apiErrorMessage(err));
      return 'failed';
    } finally {
      setIsGenerating(false);
    }
  };

  return { isGenerating, generatingDayNumber, error, generateDay, generateDays };
}
